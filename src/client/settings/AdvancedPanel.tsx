// AdvancedPanel: the escape hatches. One bulk reset (every ChatFocus field
// back to its default in a single settings mutation) plus the facts a user
// needs when something looks wrong — where skins live and whether the library
// actually connected.

import { useState } from 'react'
import type { ChatSettings } from '../../chat-settings.ts'
import { DEFAULT_CHAT_SETTINGS } from '../../chat-settings.ts'
import type { SkinRegistry } from '../skins/registry.ts'
import { Group, Notice, Row, type FocusTranslator } from './controls.tsx'
import css from './ChatFocusSection.module.css'

/** Every durable field the plugin owns (the host transcriptView stays put). */
const OWNED_FIELDS = (Object.keys(DEFAULT_CHAT_SETTINGS) as (keyof ChatSettings)[])
  .filter(field => field.startsWith('focus'))

/** Full props of the advanced panel. */
export interface AdvancedPanelProps {
  readonly focus: ChatSettings
  /** One atomic write for the bulk reset. */
  readonly setFields: (patch: Partial<ChatSettings>) => void
  readonly skins: SkinRegistry
  readonly t: FocusTranslator
}

/** Bulk reset plus library diagnostics. */
export function AdvancedPanel({ setFields, skins, t }: AdvancedPanelProps) {
  const [confirming, setConfirming] = useState(false)
  const state = skins.state.getSnapshot()
  const libraryStatus = state.status === 'ready'
    ? t('focus.advanced.library.ready', { count: String(state.records.length) })
    : state.status === 'loading'
      ? t('focus.advanced.library.loading')
      : state.status === 'unavailable'
        ? t('focus.advanced.library.unavailable')
        : t('focus.advanced.library.idle')

  const resetAll = (): void => {
    const patch: Partial<ChatSettings> = {}
    for (const field of OWNED_FIELDS) {
      ;(patch as Record<string, unknown>)[field] = DEFAULT_CHAT_SETTINGS[field]
    }
    setFields(patch)
    setConfirming(false)
  }

  return (
    <>
      <Group title={t('focus.advanced.library')}>
        <Row
          title={t('focus.advanced.library')}
          hint={t('focus.advanced.storageHint')}
          control={<span className={css.statusText}>{libraryStatus}</span>}
        />
        <Row
          title={t('focus.advanced.storage')}
          hint={t('focus.advanced.storagePath')}
          control={(
            <button
              type="button"
              className={css.clearButton}
              disabled={state.status === 'loading'}
              onClick={() => { void skins.load(true) }}
            >
              {t('focus.skins.retry')}
            </button>
          )}
        />
        {state.error !== undefined && <Notice tone="error">{state.error}</Notice>}
      </Group>

      <Group title={t('focus.advanced.resetAll')}>
        <Row
          title={t('focus.advanced.resetAll')}
          hint={t('focus.advanced.resetAllHint')}
          control={confirming
            ? (
              <div className={css.confirmRow}>
                <span className={css.confirmText}>{t('focus.advanced.confirm')}</span>
                <button type="button" className={css.uploadButton} onClick={resetAll}>
                  {t('focus.advanced.confirmYes')}
                </button>
                <button type="button" className={css.clearButton} onClick={() => setConfirming(false)}>
                  {t('focus.advanced.cancel')}
                </button>
              </div>
            )
            : (
              <button type="button" className={css.clearButton} onClick={() => setConfirming(true)}>
                {t('focus.advanced.resetAll')}
              </button>
            )}
        />
      </Group>
    </>
  )
}
