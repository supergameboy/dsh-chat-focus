/**
 * ChatFocus grouping engine: node classification, runtime-run segmentation,
 * and summary projection. Pure functions over the conversation snapshot —
 * no IO, no DOM, no host mutation. The rendered view consumes these rows.
 */

import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNodeKind } from '../../contract/chat-nodes.ts'
import type { ChatFocusSettings } from '../../../submission-settings.ts'

/** One node's role inside the focus flow. */
export type NodeClass = 'reply' | 'user' | 'runtime' | 'tail' | 'other'

/** Runtime-run summary: counts plus deduped tool names in first-seen order. */
export interface RuntimeSummary {
  readonly total: number
  readonly toolCount: number
  readonly thinkCount: number
  readonly otherCount: number
  readonly toolNames: readonly string[]
}

/** One rendered row of the focus flow. */
export type GroupRow =
  | { readonly kind: 'user' | 'reply' | 'other'; readonly nodeKey: string }
  | { readonly kind: 'tail'; readonly nodeKey: string }
  | {
      readonly kind: 'runtime-run'
      /** Node keys collapsed inside the fold box (older than the visible tail). */
      readonly inside: readonly string[]
      /** Node keys kept visible outside the fold box (the most recent N). */
      readonly outside: readonly string[]
      readonly summary: RuntimeSummary
      /** Stable anchor identity: the first node key of the run. */
      readonly anchorKey: string
    }

/** Tool-name display cap in the fold summary line. */
export const SUMMARY_TOOL_NAME_LIMIT = 5

/** Text block discriminant: an assistant-step with any text block is a reply. */
function hasTextBlock(data: ChatConversationViewNode['data']): boolean {
  if (typeof data !== 'object' || data === null) return false
  const blocks = (data as { blocks?: readonly unknown[] }).blocks
  if (!Array.isArray(blocks)) return false
  return blocks.some(block =>
    typeof block === 'object' && block !== null && (block as { kind?: unknown }).kind === 'text')
}

/** Reasoning presence on a text-less assistant-step (foldReasoning gate). */
function hasReasoningBlock(data: ChatConversationViewNode['data']): boolean {
  if (typeof data !== 'object' || data === null) return false
  const blocks = (data as { blocks?: readonly unknown[] }).blocks
  if (!Array.isArray(blocks)) return false
  return blocks.some(block =>
    typeof block === 'object' && block !== null && (block as { kind?: unknown }).kind === 'reasoning')
}

/**
 * Classify one node by kind plus block content.
 * @param node - final business node.
 * @param settings - focus settings (focusReasoning gates text-less reasoning steps).
 * @returns the node class.
 */
export function classifyNode(
  node: ChatConversationViewNode,
  settings: Pick<ChatFocusSettings, 'focusReasoning'>,
): NodeClass {
  switch (node.kind as ChatNodeKind) {
    case 'user':
    case 'steering':
      return 'user'
    case 'assistant-step': {
      if (hasTextBlock(node.data)) return 'reply'
      if (hasReasoningBlock(node.data) && !settings.focusReasoning) return 'other'
      return 'runtime'
    }
    case 'turn-tail':
      return 'tail'
    default:
      return 'runtime'
  }
}

/**
 * Incremental summary update for one appended runtime node.
 * @param prev - previous summary.
 * @param node - the appended runtime node.
 * @returns the next summary (new references only when something changed).
 */
export function updateSummary(prev: RuntimeSummary, node: ChatConversationViewNode): RuntimeSummary {
  const think = (node.kind as ChatNodeKind) === 'assistant-step' && hasReasoningBlock(node.data)
  const toolName = (node.data as { root?: { name?: string } } | null)?.root?.name
  const names = toolName !== undefined && toolName !== '' && !prev.toolNames.includes(toolName)
    ? [...prev.toolNames, toolName]
    : prev.toolNames
  return {
    total: prev.total + 1,
    toolCount: prev.toolCount + (think ? 0 : 1),
    thinkCount: prev.thinkCount + (think ? 1 : 0),
    otherCount: prev.otherCount,
    toolNames: names,
  }
}

const EMPTY_SUMMARY: RuntimeSummary = { total: 0, toolCount: 0, thinkCount: 0, otherCount: 0, toolNames: [] }

/** Minimal node lookup the grouping engine needs (the chat snapshot's node store shape). */
export interface NodeLookup {
  get(key: string): ChatConversationViewNode | undefined
}

/**
 * Build the focus row sequence from the ordered node keys.
 * @param order - stable node key order from the conversation snapshot.
 * @param nodes - node store (get by key).
 * @param settings - focus settings (focusEnabled / focusKeepVisible / focusStrategy / focusReasoning).
 * @returns the group rows; when disabled, rows pass through in original order.
 */
export function buildGroups(
  order: readonly string[],
  nodes: NodeLookup,
  settings: Pick<ChatFocusSettings, 'focusEnabled' | 'focusKeepVisible' | 'focusStrategy' | 'focusReasoning'>,
): GroupRow[] {
  if (!settings.focusEnabled) {
    const rows: GroupRow[] = []
    for (const key of order) {
      const node = nodes.get(key)
      if (node === undefined) continue
      rows.push({ kind: 'other', nodeKey: key })
    }
    return rows
  }

  const rows: GroupRow[] = []
  let run: { keys: string[]; summary: RuntimeSummary } | null = null
  const flushRun = (): void => {
    if (run === null) return
    const keep = settings.focusStrategy === 'always'
      ? 0
      : settings.focusKeepVisible
    const split = Math.max(0, run.keys.length - keep)
    rows.push({
      kind: 'runtime-run',
      inside: run.keys.slice(0, split),
      outside: run.keys.slice(split),
      summary: run.summary,
      anchorKey: run.keys[0] ?? '',
    })
    run = null
  }

  for (const key of order) {
    const node = nodes.get(key)
    if (node === undefined) continue
    const klass = classifyNode(node, settings)
    if (klass === 'runtime') {
      if (run === null) run = { keys: [], summary: EMPTY_SUMMARY }
      run.keys.push(key)
      run.summary = updateSummary(run.summary, node)
      continue
    }
    flushRun()
    rows.push({ kind: klass === 'tail' ? 'tail' : klass === 'user' ? 'user' : 'reply', nodeKey: key })
  }
  flushRun()
  return rows
}
