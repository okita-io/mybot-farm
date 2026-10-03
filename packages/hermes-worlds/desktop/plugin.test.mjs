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
  if (typeof msg.text === 'string') return msg.text
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

test('previewMessages: reads the top-level text field (Hermes resume shape)', () => {
  // THE empty-bubble bug: resume/history rows are { role, text }, not
  // { role, content }. messageText must read `text` or every row drops.
  const out = previewMessages([
    { role: 'assistant', text: 'Yo! Just kicking it here.' },
    { role: 'user', text: 'hey' }
  ])
  assert.deepEqual(out, [
    { role: 'assistant', text: 'Yo! Just kicking it here.' },
    { role: 'user', text: 'hey' }
  ])
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

// --- ambient life name/tag helpers (task 6) -------------------------------
// The gateway cron has no native tag, so the `world:<id>` tag lives in the job
// NAME. These mirror ambientJobName/ambientPrefix and the list filter — the
// safety-critical part is that disable only ever matches OUR names.

function ambientJobName(worldId, profile) { return `world:${worldId}:${profile}` }
function ambientPrefix(worldId) { return `world:${worldId}:` }
function filterOurs(jobs, worldId) {
  const pfx = ambientPrefix(worldId)
  return jobs.filter(j => typeof j.name === 'string' && j.name.indexOf(pfx) === 0)
}

test('ambientJobName / prefix: one tagged name per member', () => {
  assert.equal(ambientJobName('neon-harbor', 'cydonia'), 'world:neon-harbor:cydonia')
  assert.equal(ambientPrefix('neon-harbor'), 'world:neon-harbor:')
})

test('ambient filter: disable matches ONLY this world\'s tagged jobs', () => {
  const jobs = [
    { name: 'world:neon-harbor:cydonia' },
    { name: 'world:neon-harbor:probe' },
    { name: 'world:other-world:x' },   // different world — must not match
    { name: 'nightly-backup' },         // unrelated user cron — must not match
    { name: 'Bot Chat' },
    {}                                   // nameless — ignored
  ]
  const ours = filterOurs(jobs, 'neon-harbor')
  assert.deepEqual(ours.map(j => j.name), ['world:neon-harbor:cydonia', 'world:neon-harbor:probe'])
})

// --- turnModel conformance note (task 5 / group-chat.md §5) ---------------
// Hermes runs `defer` natively; director/round-robin/free-for-all are NOT
// driven — they fall back to defer and the note says so. Mirror of the
// pane's note selector.
function turnModelNote(tm) {
  if (tm === 'defer') return 'turnModel: defer — Bot Mode owns turns in this world; this pane only draws.'
  if (tm === 'director') return `turnModel: ${tm} — no Director process on Hermes; treated as defer (Bot Mode owns turns). This pane only records state and draws, it never picks the speaker.`
  if (tm === 'round-robin' || tm === 'free-for-all') return `turnModel: ${tm} — not wired on Hermes (posting into the room is gated on a measured no-race check); treated as defer. Bot Mode owns turns.`
  return `turnModel: ${tm} — unrecognized; treated as defer. Bot Mode owns turns; this pane only draws.`
}

test('turnModelNote: defer is the native path', () => {
  assert.match(turnModelNote('defer'), /Bot Mode owns turns/)
  assert.doesNotMatch(turnModelNote('defer'), /treated as defer/)
})

test('turnModelNote: director/round-robin/free-for-all all fall back to defer', () => {
  for (const tm of ['director', 'round-robin', 'free-for-all']) {
    assert.match(turnModelNote(tm), /treated as defer/, `${tm} should downgrade`)
    assert.match(turnModelNote(tm), /Bot Mode owns turns/)
  }
  // The director note states it does NOT pick the speaker.
  assert.match(turnModelNote('director'), /never picks the speaker/)
})

test('turnModelNote: unknown value is treated as defer', () => {
  assert.match(turnModelNote('weird-mode'), /treated as defer/)
})

// --- animated sprite helpers (task 10) ------------------------------------
// Mirrors rowCount + the sheet-sibling path resolution used by useSpriteSheet.
function rowCount(manifest) {
  const states = manifest && manifest.states
  if (!states) return 1
  let max = 0
  for (const k of Object.keys(states)) {
    const r = Number(states[k] && states[k].row) || 0
    if (r > max) max = r
  }
  return max + 1
}
function sheetSibling(spriteRel, sheetName) {
  return spriteRel.replace(/[^/]+$/, '') + sheetName
}

test('rowCount: counts distinct sheet rows (max row + 1)', () => {
  // Shape of the real harbor-engineer.sheet.json (6 states, rows 0..5).
  const manifest = {
    states: {
      idle: { row: 0 }, working: { row: 1 }, thinking: { row: 2 },
      done: { row: 3 }, error: { row: 4 }, sleeping: { row: 5 }
    }
  }
  assert.equal(rowCount(manifest), 6)
  assert.equal(rowCount({}), 1)
  assert.equal(rowCount(null), 1)
})

test('sheetSibling: resolves the PNG next to the manifest path', () => {
  assert.equal(
    sheetSibling('assets/harbor-engineer.sheet.json', 'harbor-engineer.sheet.png'),
    'assets/harbor-engineer.sheet.png'
  )
  assert.equal(sheetSibling('x.sheet.json', 'x.sheet.png'), 'x.sheet.png')
})
