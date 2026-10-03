/**
 * Pure-helper tests for desktop/plugin.js (G6).
 *
 * plugin.js is loaded UNCOMPILED by the Hermes desktop plugin host and imports
 * SDK-only modules (@hermes/plugin-sdk, react) that do not resolve under plain
 * node, so the module cannot be imported here. Following the uncompiled-plugin
 * convention, the PURE helpers are mirrored below verbatim from plugin.js and
 * exercised directly. If you change a helper in plugin.js, change its twin here
 * — the parseProfileYaml copy in particular guards G1 and must stay identical.
 *
 * Run:  node --test packages/hermes-worlds/desktop/plugin.test.mjs
 */

import test from 'node:test'
import assert from 'node:assert/strict'

// --- mirrored from plugin.js (keep in sync) -------------------------------

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
  let botsChildIndent = -1
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const indent = indentOf(line)
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

// --- parseProfileYaml (G1) ------------------------------------------------

test('parseProfileYaml: full ui_meta -> hermes-bots -> title path', () => {
  const yaml = [
    'name: patch',
    'ui_meta:',
    '  hermes-bots:',
    '    title: Patch the Engineer',
    '    enabled: true'
  ].join('\n')
  assert.equal(parseProfileYaml(yaml).botTitle, 'Patch the Engineer')
})

test('parseProfileYaml: G1 regression — a nested title does NOT clobber the real one', () => {
  // The OLD flat parser took the LAST `title:` seen inside the block, so the
  // nested theme.title ("Dark") would win over the real bot title. The
  // path-aware parser must keep the direct-child title.
  const yaml = [
    'ui_meta:',
    '  hermes-bots:',
    '    title: Patch',
    '    theme:',
    '      title: Dark',
    '      accent: cyan'
  ].join('\n')
  assert.equal(parseProfileYaml(yaml).botTitle, 'Patch')
})

test('parseProfileYaml: a top-level title: outside ui_meta is ignored', () => {
  const yaml = ['title: Not The Bot Title', 'ui_meta:', '  hermes-bots: {}'].join('\n')
  assert.equal(parseProfileYaml(yaml).botTitle, null)
})

test('parseProfileYaml: hermes-bots outside ui_meta is ignored', () => {
  // A stray top-level hermes-bots is not the ui_meta path; the dashboard
  // (ui_meta.hermes-bots) would not read it either.
  const yaml = ['hermes-bots:', '  title: Stray'].join('\n')
  assert.equal(parseProfileYaml(yaml).botTitle, null)
})

test('parseProfileYaml: quotes stripped; first direct child wins', () => {
  const yaml = ['ui_meta:', '  hermes-bots:', '    title: "Probe"'].join('\n')
  assert.equal(parseProfileYaml(yaml).botTitle, 'Probe')
})

test('parseProfileYaml: empty / non-string input', () => {
  assert.equal(parseProfileYaml('').botTitle, null)
  assert.equal(parseProfileYaml(null).botTitle, null)
  assert.equal(parseProfileYaml({}).botTitle, null)
})

// --- resolveAssetPath -----------------------------------------------------

test('resolveAssetPath: joins a clean relative path under the world dir', () => {
  assert.equal(
    resolveAssetPath('assets/dock.webp', '/w/neon-harbor'),
    '/w/neon-harbor/assets/dock.webp'
  )
})

test('resolveAssetPath: rejects traversal, absolute, and null-byte paths', () => {
  assert.equal(resolveAssetPath('../secret.txt', '/w/neon-harbor'), null)
  assert.equal(resolveAssetPath('assets/../../x', '/w/neon-harbor'), null)
  assert.equal(resolveAssetPath('/etc/passwd', '/w/neon-harbor'), null)
  assert.equal(resolveAssetPath('a\u0000b', '/w/neon-harbor'), null)
  assert.equal(resolveAssetPath('', '/w/neon-harbor'), null)
})

// --- previewMessages ------------------------------------------------------

test('previewMessages: keeps only user/assistant, trims, caps at last 6', () => {
  const msgs = [
    { role: 'system', content: 'ignore me' },
    { role: 'user', content: '  hi  ' },
    { role: 'assistant', content: '' }, // empty -> dropped
    ...Array.from({ length: 8 }, (_, i) => ({ role: 'user', content: `m${i}` }))
  ]
  const out = previewMessages(msgs)
  assert.equal(out.length, 6)
  assert.deepEqual(out[0], { role: 'user', text: 'm2' })
  assert.ok(out.every(r => r.role === 'user' || r.role === 'assistant'))
})

test('previewMessages: flattens array content parts', () => {
  const out = previewMessages([
    { role: 'assistant', content: [{ text: 'a' }, { type: 'img' }, { text: 'b' }] }
  ])
  assert.deepEqual(out, [{ role: 'assistant', text: 'ab' }])
})

test('previewMessages: non-array input is empty', () => {
  assert.deepEqual(previewMessages(null), [])
  assert.deepEqual(previewMessages('nope'), [])
})

// --- state write/merge + move (task 3 / G7) -------------------------------
// Pure cores mirrored from plugin.js writeState/moveCharacter — the real
// functions wrap these in a readRawState + writeTextFile round trip through
// the Desktop bridge. The merge rules (preserve unknown fields, replace where,
// bound recent) are what matters and are tested here directly.

const STATE_SCHEMA = 'worlds/state/v1'
const RECENT_MAX = 20

function mergeState(prior, patch) {
  return { ...(prior || {}), ...patch, schema: STATE_SCHEMA }
}

function applyMove(prior, castId, placeId) {
  const where = { ...((prior && prior.where) || {}) }
  if (!castId || !placeId || where[castId] === placeId) return null // no-op
  where[castId] = placeId
  const recent = Array.isArray(prior && prior.recent) ? prior.recent.slice() : []
  recent.push({ t: 1, kind: 'move', who: castId, place: placeId })
  return mergeState(prior, { where, recent: recent.slice(-RECENT_MAX) })
}

test('mergeState: preserves fields the pane does not own (G7)', () => {
  const prior = {
    schema: STATE_SCHEMA,
    place: 'dock',
    where: { patch: 'workshop' },
    recent: [{ kind: 'x' }],
    chatId: 'room-123',
    futureKey: 'keep me'
  }
  const next = mergeState(prior, { where: { patch: 'dock' } })
  assert.equal(next.place, 'dock') // untouched
  assert.equal(next.chatId, 'room-123') // todo 4 field preserved
  assert.equal(next.futureKey, 'keep me') // unknown field preserved
  assert.deepEqual(next.recent, [{ kind: 'x' }]) // untouched
  assert.deepEqual(next.where, { patch: 'dock' }) // replaced
  assert.equal(next.schema, STATE_SCHEMA) // always stamped
})

test('applyMove: sets where and appends a bounded recent event', () => {
  const prior = { schema: STATE_SCHEMA, place: 'dock', where: { patch: 'workshop' }, chatId: 'r1' }
  const next = applyMove(prior, 'patch', 'dock')
  assert.equal(next.where.patch, 'dock')
  assert.equal(next.chatId, 'r1') // preserved across a move
  assert.equal(next.recent.length, 1)
  assert.equal(next.recent[0].who, 'patch')
  assert.equal(next.recent[0].place, 'dock')
})

test('applyMove: is a no-op when already in the target place', () => {
  const prior = { schema: STATE_SCHEMA, where: { patch: 'dock' } }
  assert.equal(applyMove(prior, 'patch', 'dock'), null)
})

test('applyMove: caps recent[] at RECENT_MAX', () => {
  const recent = Array.from({ length: RECENT_MAX }, (_, i) => ({ i }))
  const prior = { schema: STATE_SCHEMA, where: {}, recent }
  const next = applyMove(prior, 'patch', 'dock')
  assert.equal(next.recent.length, RECENT_MAX)
  // oldest dropped, newest move appended
  assert.equal(next.recent[RECENT_MAX - 1].who, 'patch')
  assert.equal(next.recent[0].i, 1)
})

// --- G4 reply-landed predicate --------------------------------------------
// The bounded poll in sendChatLine stops when a NEW assistant message appears
// past the optimistic echo. baseCount is the message count BEFORE the echo, so
// the poll looks for length > baseCount + 1 with an assistant tail.

function replyLanded(messages, baseCount) {
  const grew = messages.length > baseCount + 1
  const last = messages[messages.length - 1]
  return grew && !!last && last.role === 'assistant'
}

test('replyLanded: false while only the echoed user line is present', () => {
  // baseCount 2, after echo the history is 3 with a trailing user line.
  const msgs = [
    { role: 'user', text: 'a' },
    { role: 'assistant', text: 'b' },
    { role: 'user', text: 'c' }
  ]
  assert.equal(replyLanded(msgs, 2), false)
})

test('replyLanded: true once an assistant reply arrives past the echo', () => {
  const msgs = [
    { role: 'user', text: 'a' },
    { role: 'assistant', text: 'b' },
    { role: 'user', text: 'c' },
    { role: 'assistant', text: 'reply' }
  ]
  assert.equal(replyLanded(msgs, 2), true)
})

test('replyLanded: false when the tail is still a user turn', () => {
  const msgs = [
    { role: 'user', text: 'a' },
    { role: 'user', text: 'c' },
    { role: 'user', text: 'd' }
  ]
  assert.equal(replyLanded(msgs, 1), false)
})

// Count-based reply detection (the live fix): preview rows cap at 6, so a long
// chat can't use preview length to detect growth — use the RAW server count.
function replyLandedByCount(rawCount, baseCount, lastRole) {
  return rawCount >= baseCount + 2 && lastRole === 'assistant'
}

test('replyLandedByCount: needs +2 (user turn + reply) and an assistant tail', () => {
  // Long chat already at 40 msgs; preview length would be stuck at 6.
  assert.equal(replyLandedByCount(40, 40, 'user'), false)   // nothing yet
  assert.equal(replyLandedByCount(41, 40, 'user'), false)   // only our turn landed
  assert.equal(replyLandedByCount(42, 40, 'assistant'), true) // turn + reply
  assert.equal(replyLandedByCount(42, 40, 'user'), false)   // grew but tail not a reply
})
