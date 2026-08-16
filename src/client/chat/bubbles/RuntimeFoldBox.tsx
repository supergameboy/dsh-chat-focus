// RuntimeFoldBox: collapses a runtime-run into a native <details> with a
// summary line (icon + counts + tool names) and three states — collapsed,
// partial (box shows the most recent N rows) and expanded. State persists per
// anchor key in localStorage and degrades to session-only storage on failure.

import { memo, useState } from 'react'
import type { ReactNode } from 'react'
import { IconChevronDownOutline14, IconChevronUpOutline14, IconThinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../../contract/slots.ts'
import type { RuntimeSummary } from '../grouping/engine.ts'
import { SUMMARY_TOOL_NAME_LIMIT } from '../grouping/engine.ts'
import css from './RuntimeFoldBox.module.css'

/** Fold box visibility state. */
export type FoldBoxState = 'collapsed' | 'partial' | 'expanded'

const FOLD_STATE_PREFIX = 'dsh.chat-focus.fold.'

function readStored(key: string): FoldBoxState | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === 'collapsed' || raw === 'partial' || raw === 'expanded') return raw
  } catch {
    // Storage unavailable (privacy mode): session-only state.
  }
  return null
}

function writeStored(key: string, state: FoldBoxState): void {
  try {
    localStorage.setItem(key, state)
  } catch {
    // Quota/private mode: session-only state, no retry, no surface noise.
  }
}

/** Full props of one runtime-run fold box. */
export interface RuntimeFoldBoxProps {
  /** Stable identity of the run (first node key), also the storage key suffix. */
  readonly anchorKey: string
  /** Node keys inside the box (older than the visible tail). */
  readonly insideKeys: readonly string[]
  readonly summary: RuntimeSummary
  /** Whether boxes start expanded. */
  readonly defaultOpen: boolean
  /** Whether the summary line shows counts and tool names. */
  readonly summaryVisible: boolean
  /** Rows kept visible outside / shown in the partial state. */
  readonly keepVisible: number
  /** Locale seat (conversation namespace). */
  readonly t: ChatViewSlotProps['t']
  /** Render one node key (the caller owns the keyed seat). */
  readonly renderNode: (nodeKey: string) => ReactNode
}

/** Fold box with summary line, three-state expansion, and per-run persistence. */
export const RuntimeFoldBox = memo(function RuntimeFoldBox({
  anchorKey, insideKeys, summary, defaultOpen, summaryVisible, keepVisible, t, renderNode,
}: RuntimeFoldBoxProps) {
  const storageKey = `${FOLD_STATE_PREFIX}${anchorKey}`
  const [state, setState] = useState<FoldBoxState>(() => {
    const stored = readStored(storageKey)
    if (stored !== null) return stored
    return defaultOpen ? 'expanded' : 'collapsed'
  })

  const applyState = (next: FoldBoxState): void => {
    setState(next)
    writeStored(storageKey, next)
  }

  // The native toggle drives collapsed <-> expanded; partial is an explicit
  // in-between owned by the summary buttons (they preventDefault, so the
  // native toggle never fights the React-controlled open attribute).
  const onToggle = (event: React.SyntheticEvent<HTMLDetailsElement>): void => {
    const open = event.currentTarget.open
    if (open) {
      setState(prev => (prev === 'collapsed' ? 'expanded' : prev))
    } else {
      applyState('collapsed')
    }
  }

  const shownKeys = state === 'collapsed'
    ? []
    : state === 'partial'
      ? insideKeys.slice(-Math.max(0, keepVisible))
      : insideKeys

  const namesText = summary.toolNames.slice(0, SUMMARY_TOOL_NAME_LIMIT).join('、')
  const overflow = Math.max(0, summary.toolNames.length - SUMMARY_TOOL_NAME_LIMIT)

  return (
    <details className={css.box} open={state !== 'collapsed'} onToggle={onToggle}>
      <summary className={css.summary}>
        <span className={css.summaryIcon} aria-hidden>
          <IconThinkOutline14 />
        </span>
        <span className={css.summaryText}>
          {summaryVisible
            ? t('focus.foldSummary', {
              total: String(summary.total),
              toolCount: String(summary.toolCount),
              thinkCount: String(summary.thinkCount),
              otherCount: String(summary.otherCount),
              names: namesText,
              more: overflow > 0 ? t('focus.foldMore', { count: String(overflow) }) : '',
            })
            : t('focus.foldCount', { total: String(summary.total) })}
        </span>
        <span className={css.summaryChevron} aria-hidden>
          {state === 'collapsed' ? <IconChevronDownOutline14 /> : <IconChevronUpOutline14 />}
        </span>
        {state !== 'partial' && keepVisible > 0 && (
          <button
            type="button"
            className={css.summaryButton}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              applyState('partial')
            }}
          >
            {state === 'expanded'
              ? t('focus.foldCollapseToRecent', { count: String(keepVisible) })
              : t('focus.foldExpandRecent', { count: String(keepVisible) })}
          </button>
        )}
      </summary>
      {state !== 'collapsed' && (
        <div className={css.body} data-chat-fold-virtual="">
          {shownKeys.map(nodeKey => (
            <div key={nodeKey} className={css.bodyItem}>{renderNode(nodeKey)}</div>
          ))}
        </div>
      )}
    </details>
  )
})
