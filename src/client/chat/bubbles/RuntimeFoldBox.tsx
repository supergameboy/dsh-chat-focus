// RuntimeFoldBox: collapses a runtime-run into a native <details> with a
// summary line (icon + counts + tool names). State persists per anchor key in
// localStorage and degrades to session-only storage on failure.

import { memo, useState } from 'react'
import type { ReactNode } from 'react'
import { IconChevronDownOutline14, IconChevronUpOutline14, IconThinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../../contract/slots.ts'
import type { RunItem, RuntimeSummary } from '../grouping/engine.ts'
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
  /** Entries inside the box (nodes plus thinking blocks). */
  readonly insideItems: readonly RunItem[]
  readonly summary: RuntimeSummary
  /** Whether the box starts expanded (recent-run strategy or user preference). */
  readonly defaultOpen: boolean
  /**
   * Strategy signature salted into the storage key (e.g. "keep-recent:1").
   * Changing the fold strategy or the keep-visible count invalidates stored
   * manual states, so the new default applies — stale "expanded" entries from
   * an older configuration cannot fight the current strategy.
   */
  readonly strategySalt?: string
  /** Whether the summary line shows counts and tool names. */
  readonly summaryVisible: boolean
  /** Locale seat (conversation namespace). */
  readonly t: ChatViewSlotProps['t']
  /** Render one run entry (the caller owns the keyed seat / Think row). */
  readonly renderItem: (item: RunItem, index: number) => ReactNode
}

/** Fold box with summary line and per-run persistence. */
export const RuntimeFoldBox = memo(function RuntimeFoldBox({
  anchorKey, insideItems, summary, defaultOpen, strategySalt, summaryVisible, t, renderItem,
}: RuntimeFoldBoxProps) {
  const storageKey = `${FOLD_STATE_PREFIX}${anchorKey}${strategySalt === undefined || strategySalt === '' ? '' : `.${strategySalt}`}`
  // Manual state (user toggle, persisted) is layered over the strategy
  // default: null means "follow defaultOpen", which keeps setting changes
  // live for groups the user never touched.
  const [manual, setManual] = useState<FoldBoxState | null>(() => readStored(storageKey))
  const open = manual === null ? defaultOpen : manual === 'expanded'

  const toggle = (): void => {
    const next = !open
    setManual(next ? 'expanded' : 'collapsed')
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
          {insideItems.map((item, index) => (
            <div
              key={item.kind === 'node' ? item.nodeKey : `${item.nodeKey}:think:${index}`}
              className={css.bodyItem}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}
    </details>
  )
})
