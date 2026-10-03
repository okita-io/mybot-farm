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
 * Profile join reads profile.yaml through the file bridge. Click a sprite to
 * open that agent's Bot Chat in a bubble (session.list / history / submit).
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
const BOT_CHAT_TITLE = 'Bot Chat'

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
 * Occupancy is roster.json when that file exists. Otherwise the pack cast
 * is shown (older plants). The page lists ~/.hermes/profiles so the user
 * can add agents they already have.
 */
const ROSTER_SCHEMA = 'worlds/roster/v1'

function profilesRootFromWorlds(worldsRoot) {
  const norm = String(worldsRoot || '').replace(/\/+$/, '')
  if (!norm.endsWith('/worlds')) return null
  return norm.slice(0, -'/worlds'.length) + '/profiles'
}

async function listProfiles(worldsRoot) {
  const root = profilesRootFromWorlds(worldsRoot)
  if (!root) return []
  const dir = await bridge().readDir(root)
  const entries = (dir && dir.entries) || []
  const names = []
  for (const entry of entries) {
    if (!entry.isDirectory) continue
    const name = entry.name
    if (!name || name.charAt(0) === '.' || name.indexOf('/') !== -1) continue
    names.push(name)
  }
  names.sort()
  return names
}

async function readRoster(worldDir) {
  const res = await bridge().readFileText(worldDir + '/roster.json')
  if (!res || res.ok === false) return null
  if (res.truncated) return null
  let data
  try {
    data = JSON.parse(res.text)
  } catch {
    return null
  }
  if (!data || data.schema !== ROSTER_SCHEMA || !Array.isArray(data.members)) return null
  return data.members
}

/**
 * Minimal profile.yaml parse — `ui_meta.hermes-bots.title` only (no PyYAML).
 *
 * This MUST agree with the dashboard's PyYAML read (`_hermes_bots_titles` in
 * dashboard/plugin_api.py), which resolves the full `ui_meta: -> hermes-bots:
 * -> title:` path. So this walker is path-aware, not a flat "last title: wins"
 * scan (G1): it enters `hermes-bots:` only while already inside `ui_meta:`, and
 * accepts `title:` ONLY as a direct child of `hermes-bots:` (exactly one indent
 * step in). A deeper nested mapping that carries its own `title:` — e.g.
 * `hermes-bots.theme.title` — is ignored, so it can no longer clobber the real
 * bot title. First direct-child `title:` wins; later siblings do not override.
 */
function indentOf(line) {
  return (line.match(/^(\s*)/) || ['', ''])[1].length
}

function parseProfileYaml(text) {
  if (!text || typeof text !== 'string') return { botTitle: null }
  let botTitle = null
  let inUiMeta = false
  let uiMetaIndent = -1
  let inBots = false
  let botsIndent = -1
  let botsChildIndent = -1 // the one indent level whose title: we accept
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const indent = indentOf(line)

    // Leaving a block the moment a line de-indents to or past its key.
    if (inBots && indent <= botsIndent) {
      inBots = false
      botsChildIndent = -1
    }
    if (inUiMeta && indent <= uiMetaIndent) {
      inUiMeta = false
    }

    if (!inUiMeta && /^\s*ui_meta:\s*(\{\}|)?\s*$/.test(line)) {
      inUiMeta = true
      uiMetaIndent = indent
      inBots = false
      botsChildIndent = -1
      continue
    }
    if (inUiMeta && !inBots && indent > uiMetaIndent &&
        /^\s*hermes-bots:\s*(\{\}|)?\s*$/.test(line)) {
      inBots = true
      botsIndent = indent
      botsChildIndent = -1
      continue
    }
    if (!inBots) continue

    // Pin the direct-child indent on the first key seen inside hermes-bots;
    // only that depth's `title:` counts. Deeper keys (a nested mapping) are
    // skipped so they cannot overwrite the real title.
    if (botsChildIndent === -1 && indent > botsIndent) {
      botsChildIndent = indent
    }
    if (indent !== botsChildIndent) continue

    const tm = line.match(/^\s*title:\s*(.+?)\s*$/)
    if (tm && botTitle === null) {
      botTitle = tm[1].replace(/^['"]|['"]$/g, '').trim()
    }
  }
  return { botTitle: botTitle || null }
}

async function readProfileMeta(profileDir) {
  const res = await bridge().readFileText(profileDir + '/profile.yaml')
  if (!res || res.ok === false || res.truncated) return { botTitle: null }
  return parseProfileYaml(res.text)
}

/**
 * Index profile dirs + hermes-bots titles for cast join (mirrors
 * dashboard/plugin_api.py _profile_names + _hermes_bots_titles).
 */
async function buildProfileIndex(profilesRoot) {
  const byDir = {}
  const byTitle = {}
  const meta = {}
  if (!profilesRoot) return { byDir, byTitle, meta }
  const dir = await bridge().readDir(profilesRoot)
  const entries = (dir && dir.entries) || []
  for (const entry of entries) {
    if (!entry.isDirectory) continue
    const name = entry.name
    if (!name || name.charAt(0) === '.' || name.indexOf('/') !== -1) continue
    byDir[name.toLowerCase()] = name
    const parsed = await readProfileMeta(entry.path)
    meta[name] = parsed
    if (parsed.botTitle) byTitle[parsed.botTitle.toLowerCase()] = name
  }
  return { byDir, byTitle, meta }
}

function resolveProfileName(castName, castRole, castId, index, rosterOwned) {
  if (rosterOwned) return castId
  const { byDir, byTitle } = index
  if (castName && byDir[castName.toLowerCase()]) return byDir[castName.toLowerCase()]
  for (const key of [castRole, castName, castId]) {
    if (key && byTitle[key.toLowerCase()]) return byTitle[key.toLowerCase()]
  }
  return null
}

function displayNameFor(profileName, fallbackName, index) {
  if (profileName && index.meta[profileName] && index.meta[profileName].botTitle) {
    return index.meta[profileName].botTitle
  }
  return fallbackName || profileName || ''
}

async function enrichCast(cast, profilesRoot, rosterOwned) {
  const index = await buildProfileIndex(profilesRoot)
  return cast.map(c => {
    const profileName =
      c.profileName ||
      resolveProfileName(c.name, c.role || c.id, c.id, index, rosterOwned)
    const name = displayNameFor(profileName, c.name || c.id, index)
    return { ...c, name, profileName: profileName || null }
  })
}

async function writeRoster(worldDir, members) {
  const b = bridge()
  if (!b || typeof b.writeTextFile !== 'function') {
    throw new Error('This Desktop build cannot save the roster')
  }
  const body =
    JSON.stringify({ schema: ROSTER_SCHEMA, members: members }, null, 2) + '\n'
  await b.writeTextFile(worldDir + '/roster.json', body)
}

/**
 * Read the raw state.json for a world, or null when it is absent / unreadable
 * / the wrong schema. This returns the WHOLE parsed object (not the reshaped
 * `state` view readWorld builds), so a writer can merge onto it and preserve
 * fields this pane does not own — `recent`, the `chatId` todo 4 adds, and any
 * future key (G7). A read failure returns null so the writer starts from a
 * clean default rather than throwing.
 */
async function readRawState(worldDir) {
  const b = bridge()
  if (!b) return null
  const sres = await b.readFileText(worldDir + '/state.json')
  if (!sres || sres.ok === false || sres.truncated || sres.text == null) return null
  let data
  try {
    data = JSON.parse(sres.text)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object' || data.schema !== STATE_SCHEMA) return null
  return data
}

/**
 * Merge `patch` onto the current state.json and persist it (todo 3 + G7).
 *
 * Read-modify-write: start from the existing file (readRawState) so `place`,
 * `recent`, `chatId`, and any key this pane does not know are preserved; only
 * the keys in `patch` change. `where` is replaced wholesale by the caller
 * (it hands a complete map), everything else is kept.
 *
 * Write door: the desktop preload exposes `writeTextFile` (in-place) and a
 * `renamePath` that REFUSES to overwrite an existing file (hermes:fs:rename
 * throws "...already exists"), and no unlink. So the tmp-write + rename-over
 * dance the handoff sketched is not actually available through this bridge —
 * rename cannot clobber the live state.json. We therefore write in place with
 * a single `writeTextFile` call: state.json is a small (<1 MB) document and
 * the main process writes it with one `fs.promises.writeFile`, so a reader
 * never sees a half-file at this size. If a future bridge adds an atomic
 * replace, swap it in here — callers do not change.
 */
async function writeState(worldDir, patch) {
  const b = bridge()
  if (!b || typeof b.writeTextFile !== 'function') {
    throw new Error('This Desktop build cannot save world state')
  }
  const prior = (await readRawState(worldDir)) || {}
  const next = { ...prior, ...patch, schema: STATE_SCHEMA }
  const body = JSON.stringify(next, null, 2) + '\n'
  await b.writeTextFile(worldDir + '/state.json', body)
  return next
}

const RECENT_MAX = 20

/**
 * Move one character to a place and persist it (todo 3). `where` is the
 * authoritative presence map the scene reads; we rewrite it with the single
 * changed entry and append a bounded `recent[]` event so the move shows in the
 * world's own log. `place` (the active view), `chatId`, and other fields are
 * preserved by writeState. No-op when the character is already there.
 */
async function moveCharacter(worldDir, currentWhere, castId, placeId) {
  if (!castId || !placeId) return null
  const where = { ...(currentWhere || {}) }
  if (where[castId] === placeId) return null
  where[castId] = placeId
  const prior = (await readRawState(worldDir)) || {}
  const recent = Array.isArray(prior.recent) ? prior.recent.slice() : []
  recent.push({ t: Date.now(), kind: 'move', who: castId, place: placeId })
  return writeState(worldDir, { where, recent: recent.slice(-RECENT_MAX) })
}

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
      role: role || charId,
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

  const rosterMembers = await readRoster(worldDir)
  let shownCast = cast
  let rosterOwned = false
  if (rosterMembers) {
    rosterOwned = true
    const placeIds = places.map(p => p.id)
    shownCast = []
    const where = {}
    const seen = {}
    for (const item of rosterMembers) {
      if (!item || typeof item.profile !== 'string') continue
      const profile = item.profile.trim()
      if (!profile || seen[profile] || placeIds.indexOf(item.place) === -1) continue
      seen[profile] = true
      shownCast.push({
        id: profile,
        name: profile,
        home: item.place,
        avatar: null,
        isGreeter: false,
        memoryScope: null,
        capabilities: [],
        relationships: {},
        profileName: profile
      })
      where[profile] = item.place
    }
    state = {
      place: state.place,
      where: where,
      recent: state.recent || []
    }
  }

  const profilesRoot = profilesRootFromWorlds(await getWorldsRoot())
  shownCast = await enrichCast(shownCast, profilesRoot, rosterOwned)

  return {
    id: world.id || id,
    title: title,
    worldDir: worldDir,
    rosterOwned: rosterOwned,
    entrypoint: { place: entrypoint.place, greeter: rosterOwned ? null : greeter },
    theme: {
      palette: theme.palette,
      backdrop: theme.backdrop || null,
      mood: theme.mood
    },
    places: places,
    cast: shownCast,
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
const BUBBLE = {
  position: 'absolute',
  left: 12,
  right: 12,
  bottom: 88,
  maxHeight: 160,
  overflow: 'auto',
  borderRadius: 10,
  border: '1px solid var(--color-border, #444)',
  background: 'rgba(8, 12, 24, 0.92)',
  padding: '10px 12px',
  fontSize: 12,
  zIndex: 4,
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)'
}
const BUBBLE_MSG = { marginBottom: 6, lineHeight: 1.35, whiteSpace: 'pre-wrap' }
const BUBBLE_INPUT = {
  width: '100%',
  marginTop: 8,
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid var(--color-border, #444)',
  background: 'rgba(0,0,0,0.35)',
  color: 'inherit',
  fontFamily: 'inherit',
  fontSize: 12
}

function messageText(msg) {
  if (!msg || typeof msg !== 'object') return ''
  const c = msg.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c
      .map(part => (part && typeof part === 'object' && typeof part.text === 'string' ? part.text : ''))
      .join('')
  }
  return ''
}

function previewMessages(messages) {
  if (!Array.isArray(messages)) return []
  const rows = []
  for (const msg of messages) {
    const role = msg && msg.role
    if (role !== 'user' && role !== 'assistant') continue
    const text = messageText(msg).trim()
    if (!text) continue
    rows.push({ role, text })
  }
  return rows.slice(-6)
}

/**
 * Resolve (or mint) the ONE canonical "Bot Chat" session for a profile.
 *
 * Gateway contract (tui_gateway/methods_session.py `_session_list_by_title`):
 * a `session.list` call carrying `title` is an EXACT-title identity lookup. It
 * returns at most ONE row — the canonical chat — already resurrecting a
 * recoverable archived Bot Chat and following the compression tip into
 * `resolved_id`. An empty `sessions` array means there is no usable canonical
 * row (none exists, or it was deliberately archived).
 *
 * So we never index into a list of candidates (G2): we take the single row,
 * and defensively confirm its title really is "Bot Chat" before adopting it,
 * so a future change that made the by-title lookup fuzzy could not silently
 * hand us an unrelated session to submit into. Prefer `resolved_id` (the live
 * tip) over `id`. Only when the lookup yields nothing do we create the
 * canonical hidden chat — the one title the Bot Mode protocol is injected into.
 */
async function ensureBotChatSession(profile) {
  // Each step is labeled so a failure in the bubble names the exact RPC that
  // failed (the earlier generic "session not found" hid which call it was).
  const step = async (label, p) => {
    try {
      return await p
    } catch (err) {
      throw new Error(`${label}: ${(err && err.message) || err}`)
    }
  }
  if (typeof host.ensureAgent === 'function') {
    await step('ensureAgent', host.ensureAgent(null, profile))
  }
  const listed = await step('session.list', host.request('session.list', {
    profile,
    title: BOT_CHAT_TITLE
  }))
  const sessions = (listed && listed.sessions) || []
  const row = sessions[0]
  if (row) {
    // Title lookup is exact server-side; verify client-side anyway so a
    // relaxed future contract can't redirect the user's line elsewhere.
    if (row.title != null && row.title !== BOT_CHAT_TITLE) {
      throw new Error('Bot Chat lookup returned an unexpected session')
    }
    const foundId = row.resolved_id || row.id
    if (foundId) {
      // The row is on disk but NOT necessarily live in memory, and both
      // session.history and prompt.submit resolve the session from live
      // memory (`_sess` / `_sess_nowait`) — a stored-only session 4007s. So
      // RESUME it, which loads it into memory AND returns the LIVE session id
      // (compression tip / freshly-bound id) plus its history. Everything
      // after must use THAT id, not foundId, or the submit misses the live
      // session (the "prompt.submit: session not found" we saw).
      //
      // CRITICAL: the desktop app's own resume calls pass `source:"desktop"` +
      // `omit_messages:true`, which take the DEFERRED path — messages:[] while
      // the transcript hydrates over REST pages the plugin host cannot read.
      // That is why the bubble stayed empty. We want the COLD path instead,
      // which restores the full transcript INLINE under `messages`. So pass
      // omit_messages:false + defer_history:false explicitly and DO NOT send
      // source:"desktop".
      const resumed = await step('session.resume', host.request('session.resume', {
        session_id: foundId,
        profile,
        omit_messages: false,
        defer_history: false
      }))
      const liveId = (resumed && (resumed.session_id || resumed.resolved_id)) || foundId
      // Cold resume returns the full transcript inline under `messages`. (A
      // deferred resume would return [] + hydrating; we keep the messageCount
      // fallback + hydrate poll below as a belt-and-braces path in case a
      // future gateway still defers.)
      // NON-empty messages array here; otherwise signal the caller to poll
      // session.history up to `messageCount` until it populates.
      const msgs = resumed && Array.isArray(resumed.messages) ? resumed.messages : []
      const messageCount = Number(resumed && resumed.message_count) || 0
      return {
        sessionId: liveId,
        created: false,
        messages: msgs.length ? previewMessages(msgs) : null,
        messageCount
      }
    }
  }
  const created = await step('session.create', host.request('session.create', {
    profile,
    title: BOT_CHAT_TITLE,
    hidden: true
  }))
  if (!created || !created.session_id) {
    throw new Error('session.create returned no session_id')
  }
  // A freshly created session is already live in memory (session.create binds
  // it), so a submit works directly; it has no history yet.
  return { sessionId: created.session_id, created: true, messages: [] }
}

async function loadBotChatHistory(sessionId, profile) {
  // One session.history read on a LIVE session. Returns the preview rows plus
  // the raw total count (used to detect hydration / a new reply).
  let hist
  try {
    hist = await host.request('session.history', { session_id: sessionId, profile })
  } catch (err) {
    throw new Error(`session.history: ${(err && err.message) || err}`)
  }
  const raw = (hist && hist.messages) || []
  const count = Number(hist && hist.count)
  return { messages: previewMessages(raw), count: Number.isFinite(count) ? count : raw.length }
}

/**
 * A desktop/deferred resume returns messages:[] with the real message_count
 * while the transcript hydrates in the background. Poll session.history until
 * it reports at least `wantCount` rows (or the budget runs out), so the bubble
 * fills in instead of showing "No messages yet." for a chat that has history.
 * `alive()` lets the caller abort when the user closes/switches the bubble.
 */
async function hydrateHistory(sessionId, profile, wantCount, alive) {
  const delays = [150, 300, 600, 1000, 1500, 2000]
  let last = { messages: [], count: 0 }
  for (let i = 0; i < delays.length; i++) {
    if (alive && !alive()) return last
    let res
    try {
      res = await loadBotChatHistory(sessionId, profile)
    } catch {
      await new Promise(r => setTimeout(r, delays[i]))
      continue
    }
    last = res
    if (res.count >= wantCount || res.messages.length) return res
    await new Promise(r => setTimeout(r, delays[i]))
  }
  return last
}

async function submitBotChatLine(sessionId, profile, text) {
  try {
    await host.request('prompt.submit', { session_id: sessionId, profile, text })
  } catch (err) {
    throw new Error(`prompt.submit: ${(err && err.message) || err}`)
  }
}

// ---------------------------------------------------------------------------
// Sprite
// ---------------------------------------------------------------------------

function Sprite({ c, worldDir, selected, onSelect }) {
  const avatar = useAsset(c.avatar, worldDir)
  const name = c.name || c.id
  const canChat = !!(c.profileName && typeof host.request === 'function')
  const spriteStyle = {
    ...SPRITE,
    pointerEvents: canChat ? 'auto' : 'none',
    cursor: canChat ? 'pointer' : 'default',
    opacity: selected ? 1 : canChat ? 0.95 : 1,
    transform: selected ? 'translateY(-4px)' : undefined
  }
  return jsxs('div', {
    style: spriteStyle,
    title: canChat
      ? `${name} — click to chat`
      : `${name} (no profile join)`,
    onClick: canChat ? () => onSelect(c) : undefined,
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
  const [profiles, setProfiles] = useState([])
  const [pick, setPick] = useState('')
  const [moveTarget, setMoveTarget] = useState('')
  const [rosterNote, setRosterNote] = useState(null)
  const [chat, setChat] = useState(null)
  const [chatDraft, setChatDraft] = useState('')
  const selRef = useRef(null)
  // Mirror of `chat` for async callbacks (the reply poll) that must read the
  // LIVE bubble, not the stale closure value — otherwise it can't tell the
  // user closed the bubble or switched characters mid-poll.
  const chatRef = useRef(null)
  chatRef.current = chat

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
    setChat(null)
    setChatDraft('')
    loadView(id, null)
  }

  async function openChat(c) {
    const profile = c.profileName
    if (!profile || typeof host.request !== 'function') return
    setChat({
      castId: c.id,
      profile,
      name: c.name || c.id,
      sessionId: null,
      messages: [],
      loading: true,
      sending: false,
      error: null
    })
    setChatDraft('')
    try {
      const { sessionId, messages: initial, messageCount } =
        await ensureBotChatSession(profile)
      const live = () => selRef.current === selectedId && chatRef.current &&
        chatRef.current.profile === profile
      let messages = Array.isArray(initial) ? initial : []
      let count = messageCount || messages.length
      // Resume returned no inline transcript (desktop/deferred hydration) but
      // the session has history — poll session.history until it fills in.
      if (!messages.length && messageCount > 0) {
        const res = await hydrateHistory(sessionId, profile, messageCount, live)
        messages = res.messages
        count = res.count || count
      }
      if (!live()) return
      // Merge, don't replace: the hydration poll above can take seconds, and
      // the user may have already typed + sent in that window (optimistic echo
      // + sending=true). Overwriting with a fresh object clobbered that echo
      // (the "message went away" bug). Only fill history/sessionId; never
      // stomp an in-flight send or messages the send already appended.
      setChat(prev => {
        if (!prev || prev.castId !== c.id || prev.profile !== profile) return prev
        if (prev.sending || prev.messages.length > messages.length) {
          // A send is in flight or already added rows — keep the user's view,
          // just make sure the live sessionId/count are set for the poll.
          return { ...prev, sessionId, messageCount: count, loading: false, error: null }
        }
        return {
          ...prev,
          sessionId,
          messages,
          messageCount: count,
          loading: false,
          error: null
        }
      })
    } catch (err) {
      setChat({
        castId: c.id,
        profile,
        name: c.name || c.id,
        sessionId: null,
        messages: [],
        loading: false,
        sending: false,
        error: String((err && err.message) || err)
      })
    }
  }

  async function sendChatLine() {
    if (!chat || !chat.sessionId || chat.sending) return
    const text = chatDraft.trim()
    if (!text) return
    const sessionId = chat.sessionId
    const profile = chat.profile
    // G4: optimistic echo — show the user's line immediately so it never
    // vanishes while the submit + reply are in flight. `baseCount` is the
    // RAW server message count before this send (preview rows are capped at 6,
    // so comparing preview length can't detect growth on a long chat).
    const baseCount = Number.isFinite(chat.messageCount) ? chat.messageCount : chat.messages.length
    const optimistic = chat.messages.concat([{ role: 'user', text }])
    setChat(prev =>
      prev && prev.sessionId === sessionId
        ? { ...prev, messages: optimistic, sending: true, error: null }
        : prev
    )
    setChatDraft('')
    // True when the user is still looking at this same bubble.
    const stillHere = () => selRef.current === selectedId && chatRef.current &&
      chatRef.current.sessionId === sessionId
    try {
      await submitBotChatLine(sessionId, profile, text)
    } catch (err) {
      setChat(prev =>
        prev && prev.sessionId === sessionId
          ? { ...prev, sending: false, error: String((err && err.message) || err) }
          : prev
      )
      return
    }
    // G4: bounded reply poll. Re-read history until the RAW count grows by at
    // least 2 (our user turn + the assistant reply) with an assistant tail, or
    // the budget runs out. Same host.request path — never the 9119 port.
    // Budget is generous: a local model (LM Studio) can stream for a while, and
    // the reply only appears in model-history AFTER the stream finishes.
    const delays = [500, 1000, 1500, 2500, 4000, 6000, 8000, 10000, 12000]
    for (let i = 0; i < delays.length; i++) {
      if (!stillHere()) return
      await new Promise(r => setTimeout(r, delays[i]))
      if (!stillHere()) return
      let res
      try {
        res = await loadBotChatHistory(sessionId, profile)
      } catch {
        continue // transient; keep trying within the budget
      }
      const messages = res.messages
      const grew = res.count >= baseCount + 2 // our turn + a reply
      const last = messages[messages.length - 1]
      const gotReply = grew && last && last.role === 'assistant' && messages.length > 0
      if (gotReply) {
        // Real reply landed — show the fresh transcript.
        setChat(prev =>
          prev && prev.sessionId === sessionId
            ? { ...prev, messages, sending: false, messageCount: res.count }
            : prev
        )
        return
      }
      // NEVER regress: a read that is empty or hasn't grown must not overwrite
      // the optimistic echo (the "reverted to No messages yet" bug — the final
      // poll was writing an empty read over the user's turn).
    }
    // Budget spent with no visible reply: keep the echo, just stop the spinner.
    // The reply exists in the agent's own session; the bubble simply did not
    // see it land within the window.
    if (!stillHere()) return
    setChat(prev =>
      prev && prev.sessionId === sessionId ? { ...prev, sending: false } : prev
    )
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
    getWorldsRoot().then(root => {
      setRootDir(root)
      listProfiles(root).then(setProfiles).catch(() => setProfiles([]))
    }).catch(() => {})
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

  const taken = {}
  cast.forEach(c => {
    taken[c.id] = true
  })
  const available = profiles.filter(name => !taken[name])
  const here = cur
    ? cast.filter(c => (state.where || {})[c.id] === cur.id || (!Object.keys(state.where || {}).length && c.home === cur.id))
    : []

  async function commitRoster(next) {
    const dir = world && world.worldDir
    if (!dir || !world) return
    try {
      await writeRoster(dir, next)
      setRosterNote(null)
      loadView(world.id, null)
    } catch (err) {
      setRosterNote(String((err && err.message) || err))
    }
  }

  // Move a character into the active place and persist it (todo 3). Honours
  // rules.maxPresent against who is already standing there, so a move cannot
  // overfill a place any more than an add can.
  async function commitMove(castId, placeId) {
    const dir = world && world.worldDir
    if (!dir || !world || !castId || !placeId) return
    const w = state.where || {}
    if (w[castId] === placeId) return
    let max = Number(rules.maxPresent)
    if (!Number.isInteger(max) || max <= 0) max = Infinity
    const occupancy = cast.filter(c => c.id !== castId && w[c.id] === placeId).length
    if (occupancy >= max) {
      setRosterNote('This place is full.')
      return
    }
    try {
      await moveCharacter(dir, w, castId, placeId)
      setRosterNote(null)
      loadView(world.id, null)
    } catch (err) {
      setRosterNote(String((err && err.message) || err))
    }
  }

  function addAgent() {
    const place = cur && cur.id
    if (!pick || !place) return
    const existing = world && world.rosterOwned
      ? cast.map(c => ({ profile: c.id, place: (state.where && state.where[c.id]) || c.home }))
      : []
    let max = Number(rules.maxPresent)
    if (!Number.isInteger(max) || max <= 0) max = 6
    if (existing.filter(m => m.place === place).length >= max) {
      setRosterNote('This place is full.')
      return
    }
    commitRoster(existing.concat([{ profile: pick, place: place }]))
  }

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
          chat
            ? jsxs('div', {
                style: BUBBLE,
                children: [
                  jsxs('div', {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6
                    },
                    children: [
                      jsx('strong', { children: chat.name }),
                      jsx('button', {
                        type: 'button',
                        style: CHIP,
                        onClick: () => {
                          setChat(null)
                          setChatDraft('')
                        },
                        children: 'Close'
                      })
                    ]
                  }),
                  chat.loading
                    ? jsx('div', { style: MUTED, children: 'Loading chat…' })
                    : null,
                  chat.error
                    ? jsx('div', { style: { color: '#f88', marginBottom: 6 }, children: chat.error })
                    : null,
                  !chat.loading && !chat.messages.length && !chat.error
                    ? jsx('div', { style: MUTED, children: 'No messages yet.' })
                    : null,
                  chat.messages.map((m, i) =>
                    jsx('div', {
                      key: i,
                      style: BUBBLE_MSG,
                      children: `${m.role === 'user' ? 'You' : chat.name}: ${m.text}`
                    })
                  ),
                  chat.sessionId
                    ? jsxs('div', {
                        children: [
                          jsx('input', {
                            type: 'text',
                            value: chatDraft,
                            disabled: chat.sending,
                            placeholder: 'Say something…',
                            style: BUBBLE_INPUT,
                            onChange: e => setChatDraft(e.target.value),
                            onKeyDown: e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                sendChatLine()
                              }
                            }
                          }),
                          jsx('button', {
                            type: 'button',
                            style: { ...CHIP_ACTIVE, marginTop: 6 },
                            disabled: chat.sending || !chatDraft.trim(),
                            onClick: sendChatLine,
                            children: chat.sending ? 'Sending…' : 'Send'
                          })
                        ]
                      })
                    : null
                ]
              })
            : null,
          jsx('div', {
            style: SPRITE_ROW,
            children: visible.map(c =>
              jsx(Sprite, {
                key: c.id,
                c: c,
                worldDir: worldDir,
                selected: chat && chat.castId === c.id,
                onSelect: openChat
              })
            )
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

      jsxs('div', {
        style: NOTE,
        children: [
          jsx('div', {
            style: { fontWeight: 600, marginBottom: 6 },
            children: cur ? `Agents in ${cur.name || cur.id}` : 'Agents'
          }),
          world && !world.rosterOwned && cast.length
            ? jsx('div', {
                style: { marginBottom: 6 },
                children:
                  'This scene still shows the pack sample. Adding an agent, or clearing the stage, replaces that sample with your own roster.'
              })
            : null,
          here.map(c =>
            jsxs('div', {
              key: c.id,
              style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 },
              children: [
                jsx('span', { children: c.name || c.id }),
                world && world.rosterOwned
                  ? jsx('button', {
                      type: 'button',
                      style: CHIP,
                      onClick: () =>
                        commitRoster(
                          cast
                            .filter(other => other.id !== c.id)
                            .map(other => ({
                              profile: other.id,
                              place: (state.where && state.where[other.id]) || other.home
                            }))
                        ),
                      children: 'Remove'
                    })
                  : null
              ]
            })
          ),
          !here.length ? jsx('div', { style: MUTED, children: 'No agents in this place.' }) : null,
          jsxs('div', {
            style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
            children: [
              jsx('select', {
                value: pick,
                onChange: e => setPick(e.target.value),
                style: { ...CHIP, background: 'transparent' },
                children: [
                  jsx('option', { value: '', children: 'Add an agent you already have' }),
                  available.map(name => jsx('option', { key: name, value: name, children: name }))
                ]
              }),
              jsx('button', {
                type: 'button',
                style: CHIP_ACTIVE,
                onClick: addAgent,
                children: 'Add'
              }),
              world && !world.rosterOwned && cast.length
                ? jsx('button', {
                    type: 'button',
                    style: CHIP,
                    onClick: () => commitRoster([]),
                    children: 'Clear stage'
                  })
                : null
            ]
          }),
          // Move an agent who is in another place into this one (todo 3).
          // Roster-owned worlds only; the pack sample is view-only.
          world && world.rosterOwned && cur
            ? (() => {
                const elsewhere = cast.filter(
                  c => ((state.where || {})[c.id] || c.home) !== cur.id
                )
                if (!elsewhere.length) return null
                return jsxs('div', {
                  style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
                  children: [
                    jsx('select', {
                      value: moveTarget,
                      onChange: e => setMoveTarget(e.target.value),
                      style: { ...CHIP, background: 'transparent' },
                      children: [
                        jsx('option', { value: '', children: `Move someone to ${cur.name || cur.id}` }),
                        elsewhere.map(c =>
                          jsx('option', { key: c.id, value: c.id, children: c.name || c.id })
                        )
                      ]
                    }),
                    jsx('button', {
                      type: 'button',
                      style: CHIP_ACTIVE,
                      onClick: () => {
                        if (moveTarget) {
                          commitMove(moveTarget, cur.id)
                          setMoveTarget('')
                        }
                      },
                      children: 'Move here'
                    })
                  ]
                })
              })()
            : null,
          rosterNote ? jsx('div', { style: { marginTop: 6 }, children: rosterNote }) : null
        ]
      }),

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
