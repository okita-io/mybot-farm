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
