// FoldPanel: how runtime information (tool calls, thinking, retries) collapses
// around the reply bubbles. One group, five controls, no bubble-side concerns.

import type { ChatSettings } from '../../chat-settings.ts'
import { FOCUS_STRATEGIES, type FocusFoldStrategy } from '../../chat-settings.ts'
import { Checkbox, Group, Row, type FocusTranslator } from './controls.tsx'
import css from './ChatFocusSection.module.css'

/** Full props of the fold settings panel. */
export interface FoldPanelProps {
  readonly focus: ChatSettings
  readonly setField: (field: keyof ChatSettings, value: unknown) => void
  readonly t: FocusTranslator
}

/** Fold strategy and disclosure defaults. */
export function FoldPanel({ focus, setField, t }: FoldPanelProps) {
  return (
    <Group title={t('focus.foldGroup')}>
      <Row
        title={t('focus.strategy')}
        hint={t(`focus.strategy.${focus.focusStrategy}`)}
        control={(
          <select
            className={css.select}
            value={focus.focusStrategy}
            onChange={event => setField('focusStrategy', event.target.value as FocusFoldStrategy)}
          >
            {FOCUS_STRATEGIES.map(strategy => (
              <option key={strategy} value={strategy}>{t(`focus.strategy.${strategy}`)}</option>
            ))}
          </select>
        )}
      />
      <Row
        title={t('focus.keepVisible')}
        hint={t('focus.keepVisibleHint')}
        control={(
          <input
            type="number"
            min={0}
            max={10}
            step={1}
            value={String(focus.focusKeepVisible)}
            onChange={event => setField('focusKeepVisible', Number(event.target.value))}
            className={css.number}
          />
        )}
      />
      <Row
        title={t('focus.defaultOpen')}
        hint={t('focus.defaultOpenHint')}
        control={(
          <Checkbox
            checked={focus.focusDefaultOpen}
            onChange={next => setField('focusDefaultOpen', next)}
            label={focus.focusDefaultOpen ? t('focus.on') : t('focus.off')}
          />
        )}
      />
      <Row
        title={t('focus.summary')}
        hint={t('focus.summaryHint')}
        control={(
          <Checkbox
            checked={focus.focusSummary}
            onChange={next => setField('focusSummary', next)}
            label={focus.focusSummary ? t('focus.on') : t('focus.off')}
          />
        )}
      />
      <Row
        title={t('focus.reasoning')}
        hint={t('focus.reasoningHint')}
        control={(
          <Checkbox
            checked={focus.focusReasoning}
            onChange={next => setField('focusReasoning', next)}
            label={focus.focusReasoning ? t('focus.on') : t('focus.off')}
          />
        )}
      />
    </Group>
  )
}
