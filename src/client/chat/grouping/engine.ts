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

/** One entry inside a runtime run: a whole node or a reply's thinking block. */
export type RunItem =
  | { readonly kind: 'node'; readonly nodeKey: string }
  | { readonly kind: 'reasoning'; readonly nodeKey: string; readonly text: string; readonly running: boolean }

/** One rendered row of the focus flow. */
export type GroupRow =
  | { readonly kind: 'user' | 'reply' | 'other'; readonly nodeKey: string }
  | { readonly kind: 'tail'; readonly nodeKey: string }
  | {
      readonly kind: 'runtime-run'
      /** Entries inside the fold box (nodes plus the reply's thinking blocks). */
      readonly inside: readonly RunItem[]
      readonly summary: RuntimeSummary
      /** Stable anchor identity: the first entry's node key. */
      readonly anchorKey: string
      /**
       * Whether this run belongs to one of the most recent `focusKeepVisible`
       * replies: such runs render expanded by default; older runs fold.
       */
      readonly recent: boolean
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

/** One pending run waiting for its following reply during the scan. */
interface PendingRun {
  readonly items: readonly RunItem[]
  readonly summary: RuntimeSummary
}

/** Intermediate row before recent-marking: a run remembers its following reply's ordinal. */
type BuiltRow =
  | { readonly kind: 'run'; readonly run: PendingRun; readonly afterReplySeq: number | null }
  | { readonly kind: 'node'; readonly nodeKey: string; readonly klass: 'user' | 'reply' | 'tail' | 'other' }

/** Extract a reply's thinking blocks as run entries (streaming tail marked running). */
function reasoningItemsOf(node: ChatConversationViewNode): RunItem[] {
  const data = node.data as { status?: unknown; blocks?: readonly unknown[] } | null
  if (data === null || typeof data !== 'object' || !Array.isArray(data.blocks)) return []
  const texts = data.blocks
    .filter(block => typeof block === 'object' && block !== null && (block as { kind?: unknown }).kind === 'reasoning')
    .map(block => String((block as { text?: unknown }).text ?? ''))
  const streaming = data.status === 'running'
  return texts.map((text, index) => ({
    kind: 'reasoning' as const,
    nodeKey: node.key,
    text,
    running: streaming && index === texts.length - 1,
  }))
}

/**
 * Build the focus row sequence from the ordered node keys.
 *
 * `recent` marks runs that render expanded by default, per strategy:
 * - keep-recent: the runs belonging to the most recent `focusKeepVisible`
 *   replies (counted from the flow tail); a run still open at the tail (no
 *   following reply yet) counts as recent while `focusKeepVisible > 0`, so
 *   live activity stays visible during streaming.
 * - threshold: runs whose entry count exceeds `focusKeepVisible` fold;
 *   shorter runs stay expanded.
 * - always: every run folds.
 *
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

  const built: BuiltRow[] = []
  let openRun: PendingRun | null = null
  let replySeq = 0
  const flushRun = (atTail: boolean): void => {
    if (openRun === null) return
    built.push({
      kind: 'run',
      run: openRun,
      // The ordinal of the first reply that follows this run; null only when
      // the run stays open at the flow tail (no following node at all).
      afterReplySeq: atTail ? null : replySeq + 1,
    })
    openRun = null
  }

  for (const key of order) {
    const node = nodes.get(key)
    if (node === undefined) continue
    const klass = classifyNode(node, settings)
    if (klass === 'runtime') {
      if (openRun === null) openRun = { items: [], summary: EMPTY_SUMMARY }
      openRun = {
        items: [...openRun.items, { kind: 'node', nodeKey: key }],
        summary: updateSummary(openRun.summary, node),
      }
      continue
    }
    if (klass === 'reply') {
      // The reply's thinking blocks fold into the run that precedes it, so
      // thinking never renders as a separate row outside the fold box.
      const reasoning = reasoningItemsOf(node)
      if (reasoning.length > 0) {
        if (openRun === null) openRun = { items: [], summary: EMPTY_SUMMARY }
        openRun = {
          items: [...openRun.items, ...reasoning],
          summary: {
            ...openRun.summary,
            total: openRun.summary.total + reasoning.length,
            thinkCount: openRun.summary.thinkCount + reasoning.length,
          },
        }
      }
    }
    flushRun(false)
    if (klass === 'reply') replySeq += 1
    built.push({ kind: 'node', nodeKey: key, klass: klass === 'tail' ? 'tail' : klass })
  }
  flushRun(true)

  // Mark the runs that stay expanded per the active strategy.
  const rows: GroupRow[] = []
  for (const row of built) {
    if (row.kind === 'node') {
      rows.push({ kind: row.klass, nodeKey: row.nodeKey })
      continue
    }
    const recent = settings.focusStrategy === 'keep-recent'
      ? settings.focusKeepVisible > 0
        && (row.afterReplySeq === null || row.afterReplySeq > replySeq - settings.focusKeepVisible)
      : settings.focusStrategy === 'threshold'
        ? row.run.items.length <= settings.focusKeepVisible
        : false
    rows.push({
      kind: 'runtime-run',
      inside: row.run.items,
      summary: row.run.summary,
      anchorKey: row.run.items[0]?.nodeKey ?? '',
      recent,
    })
  }
  return rows
}
