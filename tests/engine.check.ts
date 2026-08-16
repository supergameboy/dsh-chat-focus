/** Quick behavioral checks for the grouping engine (runs via tsx, no vitest needed). */
import assert from 'node:assert/strict'
import {
  buildGroups, classifyNode, updateSummary, type GroupRow,
} from '../src/client/chat/grouping/engine.ts'

const settings = {
  focusEnabled: true,
  focusKeepVisible: 1,
  focusStrategy: 'keep-recent' as const,
  focusReasoning: true,
}

const node = (kind: string, data: unknown = {}, key = `${kind}-${Math.random().toString(36).slice(2)}`) => ({
  key, kind, id: key, target: 'chat' as const, anchorSeq: 0, data, location: { kind: 'session' as const }, visibility: 'visible' as const,
})

// 1. classifyNode: text-less assistant-step with reasoning is runtime; with text is reply.
assert.equal(classifyNode(node('assistant-step', { blocks: [{ kind: 'reasoning', text: 'x' }] }), settings), 'runtime')
assert.equal(classifyNode(node('assistant-step', { blocks: [{ kind: 'text', text: 'hi' }] }), settings), 'reply')
assert.equal(classifyNode(node('assistant-step', { blocks: [{ kind: 'text', text: 'hi' }, { kind: 'reasoning', text: 'x' }] }), settings), 'reply')
assert.equal(classifyNode(node('tool-call', { root: { name: 'read' } }), settings), 'runtime')
assert.equal(classifyNode(node('user', { time: 1 }), settings), 'user')
assert.equal(classifyNode(node('turn-tail', {}), settings), 'tail')
// foldReasoning=false: text-less reasoning steps stay visible (other).
assert.equal(classifyNode(node('assistant-step', { blocks: [{ kind: 'reasoning', text: 'x' }] }), { focusReasoning: false }), 'other')

// 2. buildGroups: consecutive runtime nodes before a reply fold; last N stay outside.
const keys = ['u1', 't1', 't2', 't3', 'r1']
const nodes = new Map([
  ['u1', node('user', {}, 'u1')],
  ['t1', node('tool-call', { root: { name: 'read' } }, 't1')],
  ['t2', node('tool-call', { root: { name: 'glob' } }, 't2')],
  ['t3', node('assistant-step', { blocks: [{ kind: 'reasoning', text: 'x' }] }, 't3')],
  ['r1', node('assistant-step', { blocks: [{ kind: 'text', text: 'hi' }] }, 'r1')],
])
const groups = buildGroups(keys, nodes, settings)
assert.equal(groups.length, 3, 'user + runtime-run + reply')
const run = groups.find(g => g.kind === 'runtime-run') as Extract<GroupRow, { kind: 'runtime-run' }>
assert.ok(run, 'runtime-run exists')
assert.deepEqual(run.inside, ['t1', 't2'], 'older rows fold inside')
assert.deepEqual(run.outside, ['t3'], 'most recent N stays outside')
assert.equal(run.summary.total, 3)
assert.equal(run.summary.toolCount, 2)
assert.equal(run.summary.thinkCount, 1)
assert.deepEqual(run.summary.toolNames, ['read', 'glob'])

// 3. keepVisible=0 folds everything.
const zero = buildGroups(keys, nodes, { ...settings, focusKeepVisible: 0 })
const run0 = zero.find(g => g.kind === 'runtime-run') as Extract<GroupRow, { kind: 'runtime-run' }>
assert.deepEqual(run0.inside, ['t1', 't2', 't3'])
assert.deepEqual(run0.outside, [])

// 4. disabled passes rows through in original order.
const off = buildGroups(keys, nodes, { ...settings, focusEnabled: false })
assert.deepEqual(off.map(g => ('nodeKey' in g ? g.nodeKey : 'run')), ['u1', 't1', 't2', 't3', 'r1'])

// 5. updateSummary increments and dedupes tool names.
let s = { total: 0, toolCount: 0, thinkCount: 0, otherCount: 0, toolNames: [] as string[] }
s = updateSummary(s, node('tool-call', { root: { name: 'read' } }))
s = updateSummary(s, node('tool-call', { root: { name: 'read' } }))
s = updateSummary(s, node('assistant-step', { blocks: [{ kind: 'reasoning', text: 'x' }] }))
assert.equal(s.total, 3)
assert.equal(s.toolCount, 2)
assert.equal(s.thinkCount, 1)
assert.deepEqual(s.toolNames, ['read'])

console.log('engine checks: all passed')
