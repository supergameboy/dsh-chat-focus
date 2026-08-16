// RuntimeFoldBox: collapses a runtime-run into a native <details> with a
// summary line (icon + counts + tool names). State persists per anchor key in
// localStorage and degrades to session-only storage on failure.

import { memo, useState } from 'react'
import type { ReactNode } from 'react'
import { IconChevronDownOutline14, IconChevronUpOutline14, IconThinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../../contract/slots.ts'
import type { RuntimeSummary } from '../grouping/engine.ts'
import { SUMMARY_TOOL_NAME_LIMIT } from '../grouping/engine.ts'
import css from './RuntimeFoldBox.module.css'

/** Fold box visibility state (legacy 'partial' values map to expanded). */
export type FoldBoxState = 'collapsed' | 'expanded'

const FOLD_STATE_PREFIX = 'dsh.chat-focus.fold.'

function readStored(key: string): FoldBoxState | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === 'collapsed') return 'collapsed'
    if (raw === 'expanded' || raw === 'partial') return 'expanded'
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
  /** Node keys inside the box. */
  readonly insideKeys: readonly string[]
  readonly summary: RuntimeSummary
  /** Whether the box starts expanded (recent-run strategy or user preference). */
  readonly defaultOpen: boolean
  /** Whether the summary line shows counts and tool names. */
  readonly summaryVisible: boolean
  /** Locale seat (conversation namespace). */
  readonly t: ChatViewSlotProps['t']
  /** Render one node key (the caller owns the keyed seat). */
  readonly renderNode: (nodeKey: string) => ReactNode
}

/** Fold box with summary line and per-run persistence. */
export const RuntimeFoldBox = memo(function RuntimeFoldBox({
  anchorKey, insideKeys, summary, defaultOpen, summaryVisible, t, renderNode,
}: RuntimeFoldBoxProps) {
  const storageKey = `${FOLD_STATE_PREFIX}${anchorKey}`
  const [open, setOpen] = useState(() => {
    const stored = readStored(storageKey)
    return stored !== null ? stored === 'expanded' : defaultOpen
  })

  const toggle = (): void => {
    const next = !open
    setOpen(next)
    writeStored(storageKey, next ? 'expanded' : 'collapsed')
  }

  const namesText = summary.toolNames.slice(0, SUMMARY_TOOL_NAME_LIMIT).join('、')
  const overflow = Math.max(0, summary.toolNames.length - SUMMARY_TOOL_NAME_LIMIT)

  return (
    <details className={css.box} open={open}>
      <summary className={css.summary} onClick={(event) => {
        event.preventDefault()
        toggle()
      }}>
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
          {open ? <IconChevronUpOutline14 /> : <IconChevronDownOutline14 />}
        </span>
      </summary>
      {open && (
        <div className={css.body} data-chat-fold-virtual="">
          {insideKeys.map(nodeKey => (
            <div key={nodeKey} className={css.bodyItem}>{renderNode(nodeKey)}</div>
          ))}
        </div>
      )}
    </details>
  )
})
