/** Quick behavioral checks for the grouping engine (runs via tsx, no vitest needed). */
import assert from 'node:assert/strict'
import {
  buildGroups, classifyNode, updateSummary, type GroupRow,
} from '../src/client/chat/grouping/engine.ts'

const settings = {
  focusEnabled: true,
  focusKeepVisible: 1,
  focusReasoning: true,
}

const node = (kind: string, data: unknown = {}, key = `${kind}-${Math.random().toString(36).slice(2)}`) => ({
  key, kind, id: key, target: 'chat' as const, anchorSeq: 0, data, location: { kind: 'session' as const }, visibility: 'visible' as const,
})

const store = (entries: [string, ReturnType<typeof node>][]) => new Map(entries)

// 1. classifyNode: text-less assistant-step with reasoning is runtime; with text is reply.
assert.equal(classifyNode(node('assistant-step', { blocks: [{ kind: 'reasoning', text: 'x' }] }), settings), 'runtime')
assert.equal(classifyNode(node('assistant-step', { blocks: [{ kind: 'text', text: 'hi' }] }), settings), 'reply')
assert.equal(classifyNode(node('assistant-step', { blocks: [{ kind: 'text', text: 'hi' }, { kind: 'reasoning', text: 'x' }] }), settings), 'reply')
assert.equal(classifyNode(node('tool-call', { root: { name: 'read' } }), settings), 'runtime')
assert.equal(classifyNode(node('user', { time: 1 }), settings), 'user')
assert.equal(classifyNode(node('turn-tail', {}), settings), 'tail')
assert.equal(classifyNode(node('assistant-step', { blocks: [{ kind: 'reasoning', text: 'x' }] }), { focusReasoning: false }), 'other')

// 2. buildGroups: one runtime run before a reply; N=1 marks it recent (expanded).
const keys = ['u1', 't1', 't2', 't3', 'r1']
const nodes = store([
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
assert.deepEqual(run.inside, ['t1', 't2', 't3'])
assert.equal(run.recent, true, 'run before the single reply is recent')
assert.equal(run.summary.total, 3)
assert.equal(run.summary.toolCount, 2)
assert.equal(run.summary.thinkCount, 1)
assert.deepEqual(run.summary.toolNames, ['read', 'glob'])

// 3. N=0 folds everything (no recent runs).
const zero = buildGroups(keys, nodes, { ...settings, focusKeepVisible: 0 })
const run0 = zero.find(g => g.kind === 'runtime-run') as Extract<GroupRow, { kind: 'runtime-run' }>
assert.equal(run0.recent, false)

// 4. Multi-reply: only the runs of the most recent N replies are recent.
const multiKeys = ['t0', 'r1', 't1', 'r2', 't2', 'r3']
const multiNodes = store([
  ['t0', node('tool-call', { root: { name: 'read' } }, 't0')],
  ['r1', node('assistant-step', { blocks: [{ kind: 'text', text: 'a' }] }, 'r1')],
  ['t1', node('tool-call', { root: { name: 'glob' } }, 't1')],
  ['r2', node('assistant-step', { blocks: [{ kind: 'text', text: 'b' }] }, 'r2')],
  ['t2', node('tool-call', { root: { name: 'grep' } }, 't2')],
  ['r3', node('assistant-step', { blocks: [{ kind: 'text', text: 'c' }] }, 'r3')],
])
const multi = buildGroups(multiKeys, multiNodes, { ...settings, focusKeepVisible: 2 })
const runs = multi.filter(g => g.kind === 'runtime-run') as Extract<GroupRow, { kind: 'runtime-run' }>[]
assert.equal(runs.length, 3)
assert.equal(runs[0].anchorKey, 't0', 'oldest run')
assert.equal(runs[0].recent, false, 'run before r1 folds (older than the recent 2)')
assert.equal(runs[1].recent, true, 'run before r2 is recent')
assert.equal(runs[2].recent, true, 'run before r3 is recent')

// 5. Tail-open run (no following reply yet) counts as recent while N > 0.
const openKeys = ['u1', 't1', 't2']
const openNodes = store([
  ['u1', node('user', {}, 'u1')],
  ['t1', node('tool-call', { root: { name: 'read' } }, 't1')],
  ['t2', node('tool-call', { root: { name: 'glob' } }, 't2')],
])
const open = buildGroups(openKeys, openNodes, settings)
const openRun = open.find(g => g.kind === 'runtime-run') as Extract<GroupRow, { kind: 'runtime-run' }>
assert.equal(openRun.recent, true, 'live activity stays visible during streaming')
const openZero = buildGroups(openKeys, openNodes, { ...settings, focusKeepVisible: 0 })
assert.equal((openZero.find(g => g.kind === 'runtime-run') as Extract<GroupRow, { kind: 'runtime-run' }>).recent, false)

// 6. disabled passes rows through in original order.
const off = buildGroups(keys, nodes, { ...settings, focusEnabled: false })
assert.deepEqual(off.map(g => ('nodeKey' in g ? g.nodeKey : 'run')), ['u1', 't1', 't2', 't3', 'r1'])

// 7. updateSummary increments and dedupes tool names.
let s = { total: 0, toolCount: 0, thinkCount: 0, otherCount: 0, toolNames: [] as string[] }
s = updateSummary(s, node('tool-call', { root: { name: 'read' } }))
s = updateSummary(s, node('tool-call', { root: { name: 'read' } }))
s = updateSummary(s, node('assistant-step', { blocks: [{ kind: 'reasoning', text: 'x' }] }))
assert.equal(s.total, 3)
assert.equal(s.toolCount, 2)
assert.equal(s.thinkCount, 1)
assert.deepEqual(s.toolNames, ['read'])

console.log('engine checks: all passed')
