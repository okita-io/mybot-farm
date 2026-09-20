/**
 * mybot.farm desktop UI — browse the farm catalog, hand Plant/Reinstall to the agent.
 *
 * Live door: ~/.hermes/desktop-plugins/mybot-farm/plugin.js  (hot-reloads on save;
 * fallback: ⌘K → "Reload desktop plugins").
 *
 * Plain ESM, loaded UNCOMPILED — UI is jsx() calls, not JSX syntax.
 * Only these imports resolve: @hermes/plugin-sdk, react, react/jsx-runtime.
 *
 * Repo mirror: packages/hermes-mybot-farm/desktop/plugin.js (this file).
 * The unified-package door (plugins/<id>/desktop/plugin.js) does NOT auto-materialize
 * while ~/.hermes/plugins/mybot-farm is a SYMLINK: the materializer filters
 * fs.readdir(withFileTypes) on isDirectory() and Node reports symlink entries as
 * non-dirs (confirmed against desktop-plugins-root.ts). The standalone door below
 * is the live one; keep both copies in sync. Uncommitted — for the Cursor sync.
 */

import {
  PALETTE_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  Badge,
  Button,
  EmptyState,
  GlyphSpinner,
  SegmentedControl,
  SearchField,
  cn,
  host,
  usePluginI18n,
  useQuery
} from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useState } from 'react'

const ID = 'mybot-farm'
const FARM = 'https://mybot.farm'
const ROUTE = '/mybot-farm'

// ctx is only in scope inside register(); park the OS door in module scope so
// the page components can open the farm site / a stall page externally.
let ctxOs = null

function stallsQuery(query, kind) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (kind && kind !== 'all') params.set('kind', kind)
  const suffix = params.toString()
  return fetch(`${FARM}/api/stalls${suffix ? `?${suffix}` : ''}`).then(r => {
    if (!r.ok) throw new Error(`farm API ${r.status}`)
    return r.json()
  })
}

function StallRow({ stall, selected, onOpen, t }) {
  const members = Array.isArray(stall.members) ? stall.members.length : null

  return jsx('button', {
    type: 'button',
    onClick: () => onOpen(stall.slug),
    className: cn(
      'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
      'text-(--ui-text-secondary) hover:bg-(--chrome-action-hover)',
      selected ? 'border-(--ui-accent) bg-(--chrome-action-hover)' : 'border-transparent'
    ),
    children: [
      jsx(Badge, {
        variant: stall.kind === 'team' ? 'secondary' : 'default',
        className: 'shrink-0',
        children: stall.kind === 'team' ? 'team' : 'agent'
      }),
      jsx('span', { className: 'min-w-0 flex-1 truncate font-medium text-foreground', children: stall.name }),
      members != null
        ? jsx('span', {
            className: 'shrink-0 text-xs text-(--ui-text-quaternary)',
            children: `${members} ${t('membersLabel')}`
          })
        : null,
      stall.category ? jsx('span', { className: 'shrink-0 text-xs text-(--ui-text-quaternary)', children: stall.category }) : null
    ]
  })
}

function DetailCard({ stall, onPlant, onRecruit, onReinstall, onOpenPage }) {
  const t = usePluginI18n(ID)

  return jsxs('div', {
    className: 'flex flex-col gap-2 rounded-lg border border-(--ui-stroke-secondary) p-3',
    children: [
      jsxs('div', {
        className: 'flex items-start justify-between gap-3',
        children: [
          jsxs('div', {
            children: [
              jsx('div', { className: 'text-sm font-semibold text-foreground', children: stall.name }),
              jsxs('div', {
                className: 'text-xs text-(--ui-text-quaternary)',
                children: [
                  stall.slug,
                  ' · v',
                  String(stall.packVersion ?? 1),
                  stall.category ? ` · ${stall.category}` : ''
                ]
              })
            ]
          }),
          jsxs('div', {
            className: 'flex shrink-0 gap-2',
            children: [
              jsx(Button, {
                variant: 'ghost',
                onClick: onOpenPage,
                children: t('openPage')
              }),
              jsx(Button, {
                variant: 'outline',
                onClick: onReinstall,
                children: t('reinstall')
              }),
              onRecruit
                ? jsx(Button, { variant: 'secondary', onClick: onRecruit, children: t('recruit') })
                : null,
              jsx(Button, { onClick: onPlant, children: t('plant') })
            ]
          })
        ]
      }),

      stall.description && stall.description !== stall.title
        ? jsx('p', { className: 'text-xs leading-relaxed text-(--ui-text-secondary)', children: stall.description })
        : null,

      Array.isArray(stall.members) && stall.members.length > 0
        ? jsxs('div', {
            className: 'flex flex-col gap-1',
            children: [
              jsx('div', { className: 'text-xs font-medium text-(--ui-text-tertiary)', children: t('membersLabel') }),
              stall.members.map(member =>
                jsx('div', {
                  key: member.name,
                  className: 'truncate text-xs text-(--ui-text-quaternary)',
                  children: `• ${member.name}`
                })
              )
            ]
          })
        : null,

      jsx('div', {
        className: 'text-[0.6875rem] text-(--ui-text-quaternary)',
        children: t('plantHint', stall.kind === 'team')
      })
    ]
  })
}

function openExternal(url) {
  if (ctxOs && typeof ctxOs.openExternal === 'function' && url) {
    void ctxOs.openExternal(url)
    return
  }
  host.notify({ kind: 'info', message: `mybot.farm: ${url || 'https://mybot.farm'}` })
}

async function plantViaAgent(slug, name, kind, recruit) {
  const created = await host.request('session.create', { title: `Farm · ${slug}` })
  // session.create returns BOTH ids: `session_id` is the RUNTIME id prompt.submit
  // keys off, `stored_session_id` is the durable id host.openSession navigates to.
  const runtimeId = created && created.session_id
  const storedId = created && created.stored_session_id

  if (!runtimeId) {
    host.notify({ kind: 'error', message: 'Farm: could not start a chat to plant this stall.' })
    return
  }

  const prompt =
    kind === 'team'
      ? `Use the farm_plant tool to plant the mybot.farm team "${slug}" (${name}). Confirm when the profiles, team dir, and group-chat fallback note are done.`
      : recruit
        ? `Use the farm_plant tool to plant the mybot.farm agent "${slug}" (${name}) with recruit: true, so the imported profile is stamped ui_meta.hermes-bots and lands in the Desktop Bots roster. Confirm the profile imported and the marker is present in its profile.yaml.`
        : `Use the farm_plant tool to plant the mybot.farm agent "${slug}" (${name}).`

  try {
    await host.request('prompt.submit', { session_id: runtimeId, text: prompt })
  } catch (error) {
    host.notify({
      kind: 'error',
      message: `Farm: chat started but the plant request failed — ${String((error && error.message) || error)}`
    })
    return
  }

  if (storedId && typeof host.openSession === 'function') {
    try {
      await host.openSession(storedId, { intent: 'in-place' })
    } catch {
      // Navigation best-effort; the turn already runs.
    }
  }

  host.notify({ kind: 'info', message: `Farm: planting ${slug} — watch the new chat.` })
}

async function reinstallViaAgent(slug, name, kind) {
  const created = await host.request('session.create', { title: `Farm · ${slug} (reinstall)` })
  const runtimeId = created && created.session_id
  const storedId = created && created.stored_session_id

  if (!runtimeId) {
    host.notify({ kind: 'error', message: 'Farm: could not start a chat to reinstall this stall.' })
    return
  }

  const prompt =
    kind === 'team'
      ? `Use the farm_reinstall tool to reinstall the mybot.farm team "${slug}" (${name}). Clear tombstones and any old profile/team/board state, then plant again and verify with \`hermes profile list\`.`
      : `Use the farm_reinstall tool to reinstall the mybot.farm agent "${slug}" (${name}). Clear tombstones, then plant again and verify.`

  try {
    await host.request('prompt.submit', { session_id: runtimeId, text: prompt })
  } catch (error) {
    host.notify({
      kind: 'error',
      message: `Farm: chat started but the reinstall request failed — ${String((error && error.message) || error)}`
    })
    return
  }

  if (storedId && typeof host.openSession === 'function') {
    try {
      await host.openSession(storedId, { intent: 'in-place' })
    } catch {
      // best-effort navigation
    }
  }

  host.notify({ kind: 'info', message: `Farm: reinstalling ${slug} — watch the new chat.` })
}

function FarmPage() {
  const t = usePluginI18n(ID)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [selected, setSelected] = useState(null)

  const list = useQuery({
    queryKey: ['farm-stalls', query, kind],
    queryFn: () => stallsQuery(query, kind),
    staleTime: 5 * 60 * 1000
  })

  const detail = useQuery({
    queryKey: ['farm-stall', selected],
    queryFn: async () => {
      const r = await fetch(`${FARM}/api/stalls/${selected}`)
      if (!r.ok) throw new Error(`farm API ${r.status}`)
      return r.json()
    },
    enabled: !!selected
  })

  const stalls = (list.data && list.data.stalls) || []
  const stall = detail.data

  return jsxs('div', {
    className: 'flex h-full min-h-0 flex-col gap-3 p-4',
    children: [
      jsxs('div', {
        className: 'flex items-center justify-between gap-3',
        children: [
          jsxs('div', {
            children: [
              jsx('div', { className: 'text-sm font-semibold text-foreground', children: t('title') }),
              jsxs('div', {
                className: 'text-xs text-(--ui-text-quaternary)',
                children: ['mybot.farm · ', String(stalls.length), ' stalls']
              })
            ]
          }),
          jsxs('div', {
            className: 'flex shrink-0 items-center gap-2',
            children: [
              jsx('div', { className: 'text-[0.6875rem] text-(--ui-text-quaternary)', children: t('hint') }),
              jsx(Button, {
                variant: 'ghost',
                onClick: () => openExternal(FARM),
                children: t('openSite')
              })
            ]
          })
        ]
      }),

      jsx(SearchField, {
        placeholder: t('searchPlaceholder'),
        value: query,
        onChange: setQuery
      }),

      jsx(SegmentedControl, {
        options: [
          { id: 'all', label: t('allLabel') },
          { id: 'agent', label: t('agentsLabel') },
          { id: 'team', label: t('teamsLabel') }
        ],
        value: kind,
        onChange: setKind
      }),

      list.isLoading
        ? jsxs('div', {
            className: 'flex items-center gap-2 text-sm text-(--ui-text-tertiary)',
            children: [jsx(GlyphSpinner, {}), t('loading')]
          })
        : null,

      list.isError
        ? jsxs('div', {
            className: 'rounded-md border border-(--ui-stroke-secondary) p-3 text-xs text-(--ui-text-secondary)',
            children: [
              t('errorTitle'),
              ' ',
              String((list.error && list.error.message) || list.error),
              ' — ',
              jsx('button', {
                type: 'button',
                className: 'text-(--ui-accent) underline',
                onClick: () => list.refetch(),
                children: t('retry')
              })
            ]
          })
        : null,

      list.isSuccess && stalls.length === 0
        ? jsx(EmptyState, { title: t('empty') })
        : null,

      jsxs(
        'div',
        {
          className: 'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1',
          children: [
            ...stalls.map(stall =>
              jsx(StallRow, {
                key: stall.slug,
                stall: stall,
                selected: selected === stall.slug,
                onOpen: slug => setSelected(slug),
                t: t
              })
            ),

            selected && detail.isLoading
              ? jsxs('div', {
                  className: 'flex items-center gap-2 text-sm text-(--ui-text-tertiary)',
                  children: [jsx(GlyphSpinner, {}), t('loadingDetail')]
                })
              : null,

            selected && detail.isError
              ? jsxs('div', {
                  className: 'rounded-md border border-(--ui-stroke-secondary) p-3 text-xs text-(--ui-text-secondary)',
                  children: [
                    String((detail.error && detail.error.message) || detail.error),
                    ' — ',
                    jsx('button', {
                      type: 'button',
                      className: 'text-(--ui-accent) underline',
                      onClick: () => detail.refetch(),
                      children: t('retry')
                    })
                  ]
                })
              : null,

            stall
              ? jsx(DetailCard, {
                  stall: stall,
                  onPlant: () => plantViaAgent(stall.slug, stall.name || stall.slug, stall.kind || 'agent'),
                  onRecruit:
                    stall.kind === 'agent'
                      ? () => plantViaAgent(stall.slug, stall.name || stall.slug, 'agent', true)
                      : null,
                  onReinstall: () =>
                    reinstallViaAgent(stall.slug, stall.name || stall.slug, stall.kind || 'agent'),
                  onOpenPage: () => openExternal(stall.pageUrl)
                })
              : null
          ]
        }
      )
    ]
  })
}

export default {
  id: ID,
  name: 'mybot.farm',
  register(ctx) {
    ctxOs = ctx.os || null

    ctx.i18n.register({
      en: {
        title: 'mybot.farm',
        searchPlaceholder: 'Search the farm — agents, teams, categories…',
        allLabel: 'All',
        agentsLabel: 'Agents',
        teamsLabel: 'Teams',
        loading: 'Loading stalls…',
        loadingDetail: 'Loading detail…',
        empty: 'No stalls matched.',
        errorTitle: 'Could not reach the farm',
        retry: 'retry',
        openSite: 'Open site',
        openPage: 'Page',
        plant: 'Plant',
        recruit: 'Recruit',
        reinstall: 'Replant',
        membersLabel: 'members',
        hint: 'Plant hands the request to the active profile’s agent.',
        plantHint: isTeam =>
          isTeam
            ? 'Plant seeds this team into this profile as Bots — team dir, TEAM.md, and a group-chat setup note. Team members always land in the Bots roster. Recruit applies to single agents only.'
            : 'Plant seeds this agent into this profile — tombstones cleared, then imported. Recruit imports it AND stamps it as a Bot, so it lands in the Desktop Bots roster.'
      }
    })

    ctx.register({
      id: 'page',
      area: ROUTES_AREA,
      data: { path: ROUTE },
      render: () => jsx(FarmPage, {})
    })

    ctx.register({
      id: 'nav',
      area: SIDEBAR_NAV_AREA,
      order: 40,
      data: { codicon: 'repo', label: 'Farm', path: ROUTE }
    })

    ctx.register({
      id: 'open',
      area: PALETTE_AREA,
      data: {
        id: 'mybot-farm.open',
        label: 'mybot.farm: Open catalog',
        keywords: ['farm', 'mybot', 'plant', 'agents', 'teams'],
        run: () => host.navigate(ROUTE)
      }
    })
  }
}
