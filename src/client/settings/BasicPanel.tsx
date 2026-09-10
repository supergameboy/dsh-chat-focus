// BasicPanel: the two master switches plus bubble density — everything that
// applies to the whole conversation rather than to one bubble side.

import type { ChatSettings } from '../../chat-settings.ts'
import { FOCUS_BUBBLE_STYLES, type FocusBubbleStyle } from '../../chat-settings.ts'
import { Checkbox, Group, Row, type FocusTranslator } from './controls.tsx'
import css from './ChatFocusSection.module.css'

/** Full props of the basic settings panel. */
export interface BasicPanelProps {
  readonly focus: ChatSettings
  readonly setField: (field: keyof ChatSettings, value: unknown) => void
  readonly t: FocusTranslator
}

/** Master switches and bubble density. */
export function BasicPanel({ focus, setField, t }: BasicPanelProps) {
  return (
    <Group title={t('focus.basicGroup')}>
      <Row
        title={t('focus.enabled')}
        hint={t('focus.enabledHint')}
        control={(
          <Checkbox
            checked={focus.focusEnabled}
            onChange={next => setField('focusEnabled', next)}
            label={focus.focusEnabled ? t('focus.on') : t('focus.off')}
          />
        )}
      />
      <Row
        title={t('focus.bubbles')}
        hint={t('focus.bubblesHint')}
        control={(
          <Checkbox
            checked={focus.focusBubbles}
            onChange={next => setField('focusBubbles', next)}
            label={focus.focusBubbles ? t('focus.on') : t('focus.off')}
          />
        )}
      />
      <Row
        title={t('focus.bubbleStyle')}
        hint={t('focus.bubbleStyleHint')}
        control={(
          <select
            className={css.select}
            value={focus.focusBubbleStyle}
            onChange={event => setField('focusBubbleStyle', event.target.value as FocusBubbleStyle)}
          >
            {FOCUS_BUBBLE_STYLES.map(style => (
              <option key={style} value={style}>{t(`focus.bubbleStyle.${style}`)}</option>
            ))}
          </select>
        )}
      />
    </Group>
  )
}
