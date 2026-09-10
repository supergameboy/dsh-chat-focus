// RuntimeFoldBox: collapses a runtime-run into a native <details> with a
// summary line (icon + counts + tool names). The body scrolls inside itself
// (max-height in CSS) so a long run never stretches the outer flow; rows keep
// their natural height, because activity rows vary too much for a fixed
// estimate. State persists per anchor key in localStorage and degrades to
// session-only storage on failure.

import { memo, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IconChevronDownOutline14, IconChevronUpOutline14, IconThinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { RunItem, RuntimeSummary } from '../grouping/engine.ts'
import { SUMMARY_TOOL_NAME_LIMIT } from '../grouping/engine.ts'
import css from './RuntimeFoldBox.module.css'

/** Fold-box summary keys (present in both the chat and chat-focus namespaces). */
export type FoldBoxKey = 'focus.foldSummary' | 'focus.foldCount' | 'focus.foldMore'

/** Minimal translator seat the fold box needs. */
export type FoldBoxTranslator = (key: FoldBoxKey, params: Record<string, string>) => string

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
  /** Locale seat: either namespace owning the focus.fold* keys. */
  readonly t: FoldBoxTranslator
  /** Render one run entry (the caller owns the keyed seat / Think row). */
  readonly renderItem: (item: RunItem, index: number) => ReactNode
}

/** Pixels from the floor that still count as "following the tail". */
const FOLLOW_EPSILON = 4

/** The conversation scroller this box scrolls inside (host-owned when present). */
function scrollerOf(element: HTMLElement | null): HTMLElement | null {
  return element?.closest<HTMLElement>('[data-conversation-scroll]') ?? null
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
  const boxRef = useRef<HTMLDetailsElement | null>(null)
  /** Scroll geometry captured before a toggle, restored after the DOM commits. */
  const anchorRef = useRef<{ summaryTop: number; atBottom: boolean } | null>(null)

  const toggle = (): void => {
    const box = boxRef.current
    const scroller = scrollerOf(box)
    const summaryRow = box?.querySelector('summary') ?? null
    anchorRef.current = scroller === null || summaryRow === null ? null : {
      summaryTop: summaryRow.getBoundingClientRect().top,
      atBottom: scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= FOLLOW_EPSILON,
    }
    const next = !open
    setManual(next ? 'expanded' : 'collapsed')
    writeStored(storageKey, next ? 'expanded' : 'collapsed')
  }

  // Expanding or collapsing changes the flow height. The rows inside mount in
  // waves, so `scrollHeight` can briefly exceed the real content: a reader who
  // was following the tail would land in blank space. Keep the summary row
  // where it was, and re-pin to the true floor (this frame and the next) when
  // the reader was already there.
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    anchorRef.current = null
    if (anchor === null) return
    const box = boxRef.current
    const scroller = scrollerOf(box)
    if (box === null || scroller === null) return
    if (anchor.atBottom) {
      const pin = (): void => { scroller.scrollTop = scroller.scrollHeight }
      pin()
      // A second correction catches rows that mount after this commit.
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(pin)
      return
    }
    const summaryRow = box.querySelector('summary')
    if (summaryRow === null) return
    scroller.scrollTop += summaryRow.getBoundingClientRect().top - anchor.summaryTop
  }, [open])

  const namesText = summary.toolNames.slice(0, SUMMARY_TOOL_NAME_LIMIT).join('、')
  const overflow = Math.max(0, summary.toolNames.length - SUMMARY_TOOL_NAME_LIMIT)

  return (
    <details ref={boxRef} className={css.box} open={open}>
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
        <div className={css.body}>
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
