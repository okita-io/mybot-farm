/**
 * Hermes Desktop — "Worlds" page for planted GAF worlds.
 *
 * A second surface beside the web dashboard pane (dashboard/dist/index.js).
 * Spec: docs/desktop-plugin-spec.md; data layer per docs/desktop-file-handoff.md.
 * Visual benchmark: a drawn room with cast standing in it — a picture, not a
 * grid of cards.
 *
 * Live door: ~/.hermes/desktop-plugins/hermes-worlds/plugin.js (hot-reloads
 * on save; fallback: command palette -> "Reload desktop plugins").
 *
 * Plain ESM, loaded UNCOMPILED — UI is jsx()/jsxs() calls, not JSX.
 * Only these imports resolve: @hermes/plugin-sdk, react, react/jsx-runtime.
 * No fs / node:fs — the loader rejects those.
 *
 * Data: planted files under $HERMES_HOME/worlds/, read through the Electron
 * preload bridge (window.hermesDesktop: readDir / readFileText /
 * readFileDataUrl). The dashboard at 127.0.0.1:9119 is cross-origin to this
 * renderer, so the page never fetches it. On bridge failure the page shows
 * an error, never a roster of profiles. Missing images are omitted.
 * No session pulse: the desktop SDK exposes no sessions query.
 */

import {
  PALETTE_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  host
} from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useEffect, useRef, useState } from 'react'

const ID = 'hermes-worlds'
const ROUTE = '/hermes-worlds'
const POLL_MS = 15000
const WORLD_SCHEMA = 'worlds/v1'
const STATE_SCHEMA = 'worlds/state/v1'

// ---------------------------------------------------------------------------
// Data: the Desktop file bridge (window.hermesDesktop preload)
// ---------------------------------------------------------------------------

function bridge() {
  const d = typeof window !== 'undefined' ? window.hermesDesktop : null
  if (!d || typeof d.desktopPluginsRoot !== 'function') return null
  return d
}

let worldsRootCache = null

/** $HERMES_HOME/worlds — the parent of the desktop-plugins root. */
async function getWorldsRoot() {
  if (worldsRootCache) return worldsRootCache
  const b = bridge()
  if (!b) throw new Error('Desktop file bridge unavailable')
  const root = await b.desktopPluginsRoot()
  const norm = String(root).replace(/\\/g, '/').replace(/\/+$/, '')
  if (!norm.endsWith('/desktop-plugins')) {
    throw new Error('desktop plugins root is not under HERMES_HOME')
  }
  worldsRootCache = norm.slice(0, -'/desktop-plugins'.length) + '/worlds'
  return worldsRootCache
}

/** Same rules as _safe_world_id in dashboard/plugin_api.py. */
function isValidWorldId(name) {
  if (!name || name.length > 128) return false
  if (name === '.' || name === '..') return false
  if (name.startsWith('.')) return false
  if (
    name.indexOf('/') !== -1 ||
    name.indexOf('\\') !== -1 ||
    name.indexOf('\u0000') !== -1
  ) {
    return false
  }
  return true
}

/** readFileText -> parsed JSON, or null (missing / truncated / bad JSON). */
async function readJsonFile(file) {
  const res = await bridge().readFileText(file)
  if (!res || res.ok === false || res.truncated) return null
  try {
    return JSON.parse(res.text)
  } catch {
    return null
  }
}

/**
 * List: { worlds: [{ id, title, entrypoint: { place, greeter } }] },
 * sorted by id. A missing worlds dir is an empty list; a bad world.json is
 * skipped.
 */
async function listWorlds() {
  const root = await getWorldsRoot()
  const dir = await bridge().readDir(root)
  const entries = (dir && dir.entries) || []
  const worlds = []
  for (const entry of entries) {
    if (!entry.isDirectory || !isValidWorldId(entry.name)) continue
    const world = await readJsonFile(entry.path + '/world.json')
    if (!world || world.schema !== WORLD_SCHEMA) continue
    const title =
      typeof world.title === 'string' && world.title.trim() ? world.title : entry.name
    const ep = world.entrypoint || {}
    worlds.push({
      id: entry.name,
      title: title,
      entrypoint: { place: ep.place, greeter: ep.greeter }
    })
  }
  worlds.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { worlds: worlds }
}

/**
 * One world: the same object read_world returns, with art / backdrop /
 * avatar kept as relative path strings (no /api/plugins/... URLs).
 * No profile join — this plugin never scans profiles/.
 */
async function readWorld(id) {
  if (!isValidWorldId(id)) throw new Error('invalid world id')
  const worldDir = (await getWorldsRoot()) + '/' + id
  const world = await readJsonFile(worldDir + '/world.json')
  if (!world || world.schema !== WORLD_SCHEMA) throw new Error('world.json unreadable')
  const title = world.title
  if (typeof title !== 'string' || !title.trim()) throw new Error('world.title is required')

  const places = []
  for (const p of world.places || []) {
    if (!p || typeof p !== 'object') continue
    places.push({
      id: p.id,
      name: p.name || p.id,
      art: p.art || null,
      connects: p.connects || [],
      present: p.present || []
    })
  }

  const rawCast = Array.isArray(world.cast)
    ? world.cast
    : Array.isArray(world.characters)
      ? world.characters
      : []
  const entrypoint = world.entrypoint || {}
  const greeter = entrypoint.greeter
  const cast = []
  for (const item of rawCast) {
    if (!item || typeof item !== 'object') continue
    const role = item.role || item.id || ''
    const charId = item.id || role
    cast.push({
      id: role || charId,
      name: item.name || charId,
      home: item.home,
      avatar: item.avatar || null,
      isGreeter: !!(role && role === greeter),
      memoryScope: item.memoryScope,
      capabilities: item.capabilities || [],
      relationships: item.relationships || {}
    })
  }

  // State — mirrors _default_state + _load_state in dashboard/plugin_api.py.
  const placeIds = places.map(p => p.id)
  let entryPlace = entrypoint.place
  if (placeIds.indexOf(entryPlace) === -1 && placeIds.length) entryPlace = placeIds[0]
  const defaultWhere = {}
  for (const c of cast) {
    if (c.home && placeIds.indexOf(c.home) !== -1) {
      defaultWhere[c.id] = c.home
    } else {
      for (const p of places) {
        if (p.id != null && (p.present || []).indexOf(c.id) !== -1) {
          defaultWhere[c.id] = p.id
          break
        }
      }
    }
  }
  const fallback = {
    place: entryPlace || (placeIds.length ? placeIds[0] : null),
    where: defaultWhere,
    recent: []
  }

  let state = fallback
  const sres = await bridge().readFileText(worldDir + '/state.json')
  // Missing state.json is optional -> fallback. A file that exists but is
  // unreadable (any non-ENOENT failure) is an error for that world.
  if (sres && sres.ok === false && sres.error !== 'ENOENT') {
    throw new Error('state.json unreadable')
  }
  if (sres && sres.ok !== false && sres.text != null) {
    if (sres.truncated) throw new Error('state.json unreadable')
    let data
    try {
      data = JSON.parse(sres.text)
    } catch {
      throw new Error('state.json unreadable')
    }
    if (data && typeof data === 'object' && data.schema === STATE_SCHEMA) {
      let where = data.where
      if (typeof where !== 'object' || where === null || Array.isArray(where)) where = {}
      let recent = data.recent
      if (!Array.isArray(recent)) recent = []
      state = {
        place: data.place || fallback.place,
        where: where,
        recent: recent
      }
    }
    // Parses but wrong schema -> fallback, same as the gateway.
  }

  const theme = world.theme || {}
  const rules = world.rules || {}
  const render = world.render || {}

  return {
    id: world.id || id,
    title: title,
    entrypoint: { place: entrypoint.place, greeter: greeter },
    theme: {
      palette: theme.palette,
      backdrop: theme.backdrop || null,
      mood: theme.mood
    },
    places: places,
    cast: cast,
    state: state,
    rules: {
      turnModel: rules.turnModel,
      handoff: rules.handoff,
      maxPresent: rules.maxPresent
    },
    widgetHints: render.widgetHints
  }
}

// ---------------------------------------------------------------------------
// Asset loader (readFileDataUrl -> data: URL, cached by absolute path)
// ---------------------------------------------------------------------------

const assetCache = new Map()

function isRemoteUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u)
}

/**
 * Join a relative asset path onto the world dir, confined to it. Returns
 * null when the path is unusable (leading /, null byte, `..` segment, or
 * escaping the world dir).
 */
function resolveAssetPath(rel, worldDir) {
  if (!rel || typeof rel !== 'string') return null
  if (rel.charAt(0) === '/' || rel.indexOf('\u0000') !== -1) return null
  const norm = rel.replace(/\\/g, '/')
  if (norm.split('/').indexOf('..') !== -1) return null
  const dir = String(worldDir).replace(/\/+$/, '')
  const abs = dir + '/' + norm
  if (abs.indexOf(dir + '/') !== 0) return null
  return abs
}

function useAsset(rel, worldDir) {
  const remote = isRemoteUrl(rel) ? rel : null
  const abs = !remote && worldDir ? resolveAssetPath(rel, worldDir) : null
  const [src, setSrc] = useState(remote)

  useEffect(() => {
    let alive = true
    const b = bridge()
    if (!b || !abs) {
      setSrc(remote || null)
      return () => {
        alive = false
      }
    }
    const load = () => {
      if (!alive) return
      let entry = assetCache.get(abs)
      if (entry) {
        entry.then(v => {
          if (alive) setSrc(v)
        })
        return
      }
      entry = Promise.resolve(b.readFileDataUrl(abs))
        .then(r => (typeof r === 'string' ? r : null))
        .catch(() => null)
      assetCache.set(abs, entry)
      entry.then(v => {
        if (v == null) {
          // Asset not on disk yet (planted later) — never cache the miss,
          // retry in step with the world poll until found.
          assetCache.delete(abs)
          if (alive) timer = setTimeout(load, POLL_MS)
        }
        if (alive) setSrc(v)
      })
    }
    let timer = setTimeout(load, POLL_MS)
    load()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [abs, remote])

  return src
}

// ---------------------------------------------------------------------------
// Styles (inline — desktop plugins ship no CSS file)
// ---------------------------------------------------------------------------

const PAGE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 4,
  minHeight: 320
}
const HEAD = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8
}
const CHIPS = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
const CHIP = {
  border: '1px solid var(--color-border, #333)',
  borderRadius: 999,
  padding: '3px 10px',
  fontSize: 12,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontFamily: 'inherit'
}
const CHIP_ACTIVE = {
  borderColor: 'var(--color-ring, #4a9eff)',
  color: 'var(--color-foreground, inherit)'
}
const MUTED = { opacity: 0.6, fontSize: 12 }
const CARD = {
  border: '1px solid var(--color-border, #333)',
  borderRadius: 10,
  padding: 20,
  fontSize: 13,
  opacity: 0.9
}
const STAGE = {
  position: 'relative',
  width: '100%',
  height: 300,
  overflow: 'hidden',
  borderRadius: 12
}
const COVER_IMG = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  imageRendering: 'pixelated',
  pointerEvents: 'none'
}
const TAB_ROW = { display: 'flex', gap: 6, flexWrap: 'wrap' }
const TAB = {
  border: '1px solid var(--color-border, #333)',
  borderRadius: 999,
  padding: '3px 12px',
  fontSize: 12,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontFamily: 'inherit'
}
const SPRITE_ROW = {
  position: 'absolute',
  left: 12,
  right: 12,
  bottom: 14,
  display: 'flex',
  justifyContent: 'space-evenly',
  alignItems: 'flex-end'
}
const SPRITE = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: 76,
  pointerEvents: 'none'
}
const SPRITE_CIRCLE = {
  position: 'relative',
  width: 52,
  height: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}
const AVATAR_IMG = {
  width: 50,
  height: 50,
  borderRadius: '50%',
  objectFit: 'cover',
  imageRendering: 'pixelated',
  border: '2px solid rgba(255,255,255,0.35)'
}
const INITIAL_CIRCLE = {
  width: 50,
  height: 50,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  fontWeight: 700,
  background: 'rgba(0,0,0,0.45)',
  border: '2px solid rgba(255,255,255,0.35)'
}
const GREETER = {
  position: 'absolute',
  top: -8,
  right: -6,
  fontSize: 12,
  lineHeight: 1
}
const NAME = {
  marginTop: 4,
  fontSize: 11,
  fontWeight: 600,
  textShadow: '0 1px 2px rgba(0,0,0,0.7)'
}
const CAP_NOTE = {
  position: 'absolute',
  top: 8,
  right: 10,
  fontSize: 11,
  opacity: 0.8,
  textShadow: '0 1px 2px rgba(0,0,0,0.7)'
}
const OFFSTAGE = { fontSize: 12, opacity: 0.75 }
const NOTE = {
  fontSize: 11,
  opacity: 0.7,
  border: '1px solid var(--color-border, #333)',
  borderRadius: 8,
  padding: '6px 10px'
}

// ---------------------------------------------------------------------------
// Sprite
// ---------------------------------------------------------------------------

function Sprite({ c, worldDir }) {
  const avatar = useAsset(c.avatar, worldDir)
  const name = c.name || c.id
  return jsxs('div', {
    style: SPRITE,
    title: `${name} (role: ${c.id})`,
    children: [
      jsxs('div', {
        style: SPRITE_CIRCLE,
        children: [
          avatar
            ? jsx('img', { src: avatar, alt: name, style: AVATAR_IMG })
            : jsx('div', {
                style: INITIAL_CIRCLE,
                children: name.slice(0, 1).toUpperCase()
              }),
          c.isGreeter ? jsx('span', { style: GREETER, children: '\u2605' }) : null
        ]
      }),
      jsx('div', { style: NAME, children: name })
    ]
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function WorldsPage() {
  const [list, setList] = useState([])
  const [view, setView] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [viewPlace, setViewPlace] = useState(null)
  const [rootDir, setRootDir] = useState(null)
  const selRef = useRef(null)

  function loadView(target, freshList) {
    readWorld(target).then(v => {
      // Ignore stale responses: the user picked another world mid-flight.
      if (selRef.current !== target) return
      setView(v)
      setError(null)
      if (freshList) setList(freshList)
    }).catch(e => {
      if (selRef.current !== target) return
      setError(String((e && e.message) || e))
    })
  }

  function select(id) {
    selRef.current = id
    setSelectedId(id)
    setViewPlace(null) // a place tab from world A must not stick on world B
    loadView(id, null)
  }

  useEffect(() => {
    let timer = null
    let inFlight = false
    function poll() {
      if (inFlight) return
      inFlight = true
      listWorlds()
        .then(resp => {
          inFlight = false
          const worlds = resp.worlds || []
          setList(worlds)
          const kept = selRef.current
          const target =
            worlds.find(w => w.id === kept) ? kept
            : worlds.length
              ? worlds[0].id
              : null
          if (!target) {
            selRef.current = null
            setSelectedId(null)
            setView(null)
            setError(null)
            return
          }
          selRef.current = target
          setSelectedId(target)
          loadView(target, worlds)
        })
        .catch(e => {
          inFlight = false
          setError(String((e && e.message) || e))
        })
    }
    poll()
    timer = setInterval(poll, POLL_MS)
    // Resolve the worlds root once, for joining asset paths.
    getWorldsRoot().then(setRootDir).catch(() => {})
    return () => clearInterval(timer)
  }, [])

  // Asset hooks MUST run on every render, before any early return — compute
  // their inputs from the raw view first.
  const world = view
  const cast = (world && world.cast) || []
  const places = (world && world.places) || []
  const state = (world && world.state) || {}
  const theme = (world && world.theme) || {}
  const hints = (world && world.widgetHints) || {}
  const rules = (world && world.rules) || {}
  const entrypoint = (world && world.entrypoint) || {}
  const worldDir = rootDir && world ? rootDir + '/' + world.id : null

  // Active place: user override -> state.place -> entrypoint.place.
  let current = viewPlace || state.place || entrypoint.place
  let cur = null
  if (world && places.length) {
    cur = places[0]
    for (let i = 0; i < places.length; i++) {
      if (places[i].id === current) {
        cur = places[i]
        break
      }
    }
  }
  const placeArt = useAsset(cur ? cur.art : null, worldDir)
  const backdrop = useAsset(
    hints.showBackdrop !== false && theme.backdrop ? theme.backdrop : null,
    worldDir
  )

  // Who stands in the picture: state.where is authoritative; the place's
  // static present[] is only the fallback when where is empty.
  const castById = {}
  cast.forEach(c => {
    castById[c.id] = c
  })
  const where = state.where || {}
  const haveWhere = Object.keys(where).length > 0
  let onStageRoles = []
  if (haveWhere) {
    cast.forEach(c => {
      if (where[c.id] === current) onStageRoles.push(c.id)
    })
  } else if (cur) {
    onStageRoles = cur.present || []
  }
  const onStage = onStageRoles.map(r => castById[r]).filter(Boolean)

  // Cap the picture at rules.maxPresent; overflow stays in the offstage list.
  let maxPresent = Number(rules.maxPresent)
  if (!Number.isInteger(maxPresent) || maxPresent <= 0) maxPresent = Infinity
  const visible = onStage.slice(0, maxPresent)
  const overflow = onStage.slice(maxPresent)
  const offstage = cast.filter(c => onStage.indexOf(c) === -1).concat(overflow)
  const capNote = overflow.length ? `+${overflow.length} offstage` : null

  const palette = theme.palette || {}
  const stageStyle = {
    ...STAGE,
    background: (palette && palette.bg) || 'var(--color-background, #0b1020)',
    color: (palette && palette.fg) || undefined
  }
  const accent = (palette && palette.accent) || null

  if (error && !world) {
    return jsxs('div', {
      style: PAGE,
      children: [
        jsx('div', { style: HEAD, children: jsx('strong', { children: 'Worlds' }) }),
        jsxs('div', {
          style: CARD,
          children: [
            jsxs('div', {
              style: { fontWeight: 600, marginBottom: 6 },
              children: ['Could not load planted worlds: ', error, '.']
            }),
            jsx('div', {
              style: MUTED,
              children:
                'This page reads $HERMES_HOME/worlds/ through the Desktop file bridge. ' +
                'No profiles are listed on failure.'
            })
          ]
        })
      ]
    })
  }

  if (!world) {
    return jsxs('div', {
      style: PAGE,
      children: [
        jsx('div', { style: HEAD, children: jsx('strong', { children: 'Worlds' }) }),
        jsx('div', {
          style: CARD,
          children: 'No worlds planted. farm_plant a world-pack.'
        })
      ]
    })
  }

  return jsxs('div', {
    style: PAGE,
    children: [
      jsxs('div', {
        style: HEAD,
        children: [
          jsx('strong', {
            children: `${world.title}${theme.mood ? ` \u00b7 ${theme.mood}` : ''}`
          }),
          jsxs('div', {
            style: CHIPS,
            children: [
              list.map(w =>
                jsx('button', {
                  key: w.id,
                  type: 'button',
                  onClick: () => select(w.id),
                  style: { ...CHIP, ...(w.id === selectedId ? CHIP_ACTIVE : {}) },
                  children: w.title
                })
              ),
              jsx('span', {
                style: MUTED,
                children: `live ${Math.round(POLL_MS / 1000)}s`
              })
            ]
          })
        ]
      }),

      // Place tabs.
      jsx('div', {
        style: TAB_ROW,
        children: places.map(p =>
          jsx('button', {
            key: p.id,
            type: 'button',
            onClick: () => setViewPlace(p.id),
            style: {
              ...TAB,
              ...(p.id === (cur && cur.id)
                ? {
                    background: accent || 'var(--color-ring, #4a9eff)',
                    color: '#fff',
                    borderColor: accent || 'transparent'
                  }
                : {})
            },
            children: p.name || p.id
          })
        )
      }),

      // The scene: a picture with people in it.
      jsxs('div', {
        style: stageStyle,
        children: [
          backdrop ? jsx('img', { src: backdrop, alt: '', style: COVER_IMG }) : null,
          placeArt ? jsx('img', { src: placeArt, alt: 'place', style: COVER_IMG }) : null,
          capNote ? jsx('div', { style: CAP_NOTE, children: capNote }) : null,
          jsx('div', {
            style: SPRITE_ROW,
            children: visible.map(c => jsx(Sprite, { key: c.id, c: c, worldDir: worldDir }))
          })
        ]
      }),

      // Offstage stays under the stage — not extra people in the picture.
      offstage.length
        ? jsxs('div', {
            style: OFFSTAGE,
            children: [
              jsx('strong', { children: 'Offstage \u2014 ' }),
              offstage.map((c, i) =>
                jsxs('span', {
                  key: c.id,
                  children: [`${c.name || c.id}${i < offstage.length - 1 ? ' \u00b7 ' : ''}`]
                })
              )
            ]
          })
        : null,

      rules.turnModel === 'defer'
        ? jsx('div', {
            style: NOTE,
            children:
              'turnModel: defer \u2014 Bot Mode owns turns in this world; this pane only draws.'
          })
        : null,

      error
        ? jsx('div', {
            style: NOTE,
            children: `Last refresh failed: ${error} \u2014 showing the last good world.`
          })
        : null
    ]
  })
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export default {
  id: ID,
  name: 'Worlds',
  description: 'Planted GAF worlds: places and cast in a scene.',
  register(ctx) {
    ctx.register({
      id: 'page',
      area: ROUTES_AREA,
      data: { path: ROUTE },
      render: () => jsx(WorldsPage, {})
    })
    ctx.register({
      id: 'nav',
      area: SIDEBAR_NAV_AREA,
      order: 45,
      data: { codicon: 'globe', label: 'Worlds', path: ROUTE }
    })
    ctx.register({
      id: 'open',
      area: PALETTE_AREA,
      data: {
        id: 'hermes-worlds.open',
        label: 'Worlds: Open planted world',
        keywords: ['world', 'hermes-worlds', 'cast', 'place'],
        run: () => host.navigate(ROUTE)
      }
    })
  }
}
