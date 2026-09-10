// SkinsPanel: the bubble-skin library — thumbnails, apply targets, rename and
// delete, plus the entry point to the maker. Built-in skins are read-only and
// labelled as such; durable skins live in the Host asset store.

import { useState } from 'react'
import type { ChatSettings } from '../../chat-settings.ts'
import type { SkinRecord } from '../../skin-contract.ts'
import type { SkinRegistry } from '../skins/registry.ts'
import { skinStylePatch } from '../chat/bubbles/chrome.ts'
import { Notice, type FocusTranslator } from './controls.tsx'
import css from './SkinMaker.module.css'

/** Where an applied skin goes. */
type ApplyTarget = 'assistant' | 'user' | 'both'

/** Full props of the skins panel. */
export interface SkinsPanelProps {
  readonly skins: SkinRegistry
  readonly focus: ChatSettings
  readonly setField: (field: keyof ChatSettings, value: unknown) => void
  /** One atomic write for applying a skin (artwork id + packaged style). */
  readonly setFields: (patch: Partial<ChatSettings>) => void
  readonly onOpenMaker: () => void
  readonly t: FocusTranslator
}

/** The bubble-skin library. */
export function SkinsPanel({ skins, focus, setField, setFields, onOpenMaker, t }: SkinsPanelProps) {
  const state = skins.state.getSnapshot()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /** Apply one skin: the artwork id plus its packaged style, written into the
   *  SAME per-side fields the settings page edits, as one atomic mutation. */
  const applyTo = (record: SkinRecord, target: ApplyTarget): void => {
    const patch: Partial<ChatSettings> = {}
    if (target === 'assistant' || target === 'both') {
      patch.focusBubbleSkin = record.id
      Object.assign(patch as Record<string, unknown>, skinStylePatch(record.style, 'assistant'))
    }
    if (target === 'user' || target === 'both') {
      patch.focusUserBubbleSkin = record.id
      Object.assign(patch as Record<string, unknown>, skinStylePatch(record.style, 'user'))
    }
    setFields(patch)
  }

  const remove = async (id: string): Promise<void> => {
    setBusy(true)
    try {
      await skins.remove(id)
      if (focus.focusBubbleSkin === id) setField('focusBubbleSkin', '')
      if (focus.focusUserBubbleSkin === id) setField('focusUserBubbleSkin', '')
      setConfirming(null)
    } finally {
      setBusy(false)
    }
  }

  const rename = async (id: string): Promise<void> => {
    const name = renameDraft.trim()
    if (name === '') return
    setBusy(true)
    try {
      await skins.rename(id, name)
      setRenaming(null)
    } finally {
      setBusy(false)
    }
  }

  const entries = skins.list()

  return (
    <div className={css.library}>
      <div className={css.libraryBar}>
        <button
          type="button"
          className={css.uploadButton}
          disabled={!skins.available}
          onClick={onOpenMaker}
        >
          {t('focus.skins.make')}
        </button>
        <span className={css.dropHint}>{t('focus.skins.makeHint')}</span>
      </div>

      {state.status === 'unavailable' && <Notice tone="error">{t('focus.skins.unavailable')}</Notice>}
      {state.status === 'loading' && <Notice>{t('focus.skins.loading')}</Notice>}
      {state.error !== undefined && state.status === 'unavailable' && (
        <button type="button" className={css.clearButton} onClick={() => { void skins.load(true) }}>
          {t('focus.skins.retry')}
        </button>
      )}

      {entries.length === 0
        ? <Notice>{t('focus.skins.empty')}</Notice>
        : (
          <ul className={css.grid}>
            {entries.map(entry => {
              const record = entry.record
              const appliedAssistant = focus.focusBubbleSkin === record.id
              const appliedUser = focus.focusUserBubbleSkin === record.id
              const badge = record.kind === 'sprite'
                ? t('focus.skins.kind.sprite', { count: String(record.frames) })
                : t(`focus.skins.kind.${record.kind}` as Parameters<FocusTranslator>[0])
              return (
                <li key={record.id} className={css.card}>
                  <div className={css.thumbWrap}>
                    {record.kind === 'style'
                      ? (
                        // A parameter-only skin has no artwork: preview its
                        // packaged colours directly.
                        <div
                          className={css.thumb}
                          style={{
                            background: record.style.gradientFrom !== ''
                              ? `linear-gradient(${record.style.gradientAngle}deg, ${record.style.gradientFrom}, ${record.style.gradientTo !== '' ? record.style.gradientTo : record.style.gradientFrom})`
                              : record.style.bg,
                            border: record.style.border === '' ? '1px solid var(--dsw-alias-border-l2)' : `1px solid ${record.style.border}`,
                          }}
                          role="img"
                          aria-label={record.name}
                        />
                      )
                      : record.kind === 'video'
                        ? (
                          // A video URL is not a CSS background image, and a real
                          // poster frame would mean downloading the whole clip:
                          // show a labelled tile instead of a blank square.
                          <div className={css.thumb} role="img" aria-label={record.name}>
                            <span className={css.thumbGlyph} aria-hidden>▶</span>
                          </div>
                        )
                        : (
                          <div
                            className={css.thumb}
                            style={{
                              backgroundImage: `url("${skins.urlOf(entry).replace(/"/g, '\\"')}")`,
                            // A sprite sheet shows its first frame: the strip is
                            // `frames` wide, so one frame fills the tile.
                            backgroundSize: record.kind === 'sprite' && record.frames > 1
                              ? `${String(record.frames * 100)}% 100%`
                              : 'cover',
                          }}
                          role="img"
                          aria-label={record.name}
                        />
                      )}
                  </div>
                  {renaming === record.id
                    ? (
                      <div className={css.cardRename}>
                        <input
                          type="text"
                          className={css.textInput}
                          value={renameDraft}
                          maxLength={40}
                          onChange={event => setRenameDraft(event.target.value)}
                        />
                        <button type="button" className={css.uploadButton} disabled={busy} onClick={() => { void rename(record.id) }}>
                          {t('focus.skins.renameSave')}
                        </button>
                        <button type="button" className={css.clearButton} onClick={() => setRenaming(null)}>
                          {t('focus.maker.cancel')}
                        </button>
                      </div>
                    )
                    : (
                      <div className={css.cardTitle}>
                        <span className={css.cardName}>{record.name}</span>
                        <span className={css.badge}>{badge}</span>
                        {entry.builtin && <span className={css.badge}>{t('focus.skins.builtin')}</span>}
                        {appliedAssistant && <span className={css.badge}>{t('focus.skins.appliedAssistant')}</span>}
                        {appliedUser && <span className={css.badge}>{t('focus.skins.appliedUser')}</span>}
                      </div>
                    )}

                  {confirming === record.id
                    ? (
                      <div className={css.cardActions}>
                        <span className={css.dropHint}>
                          {t('focus.skins.deleteConfirm', { name: record.name })}
                        </span>
                        <button type="button" className={css.uploadButton} disabled={busy} onClick={() => { void remove(record.id) }}>
                          {t('focus.skins.delete')}
                        </button>
                        <button type="button" className={css.clearButton} onClick={() => setConfirming(null)}>
                          {t('focus.maker.cancel')}
                        </button>
                      </div>
                    )
                    : (
                      <div className={css.cardActions}>
                        <select
                          className={css.select}
                          value=""
                          onChange={event => {
                            const target = event.target.value
                            if (target !== '') applyTo(record, target as ApplyTarget)
                          }}
                        >
                          <option value="">{t('focus.skins.apply')}</option>
                          <option value="assistant">{t('focus.skins.apply.assistant')}</option>
                          <option value="user">{t('focus.skins.apply.user')}</option>
                          <option value="both">{t('focus.skins.apply.both')}</option>
                        </select>
                        {!entry.builtin && (
                          <>
                            <button
                              type="button"
                              className={css.clearButton}
                              onClick={() => { setRenaming(record.id); setRenameDraft(record.name) }}
                            >
                              {t('focus.skins.rename')}
                            </button>
                            <button
                              type="button"
                              className={css.clearButton}
                              onClick={() => setConfirming(record.id)}
                            >
                              {t('focus.skins.delete')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                </li>
              )
            })}
          </ul>
        )}
    </div>
  )
}
