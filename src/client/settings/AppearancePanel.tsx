// AppearancePanel: one editor for both bubble sides. The assistant/user
// segmented control swaps which side the shared controls edit, so the 19 rows
// exist once instead of twice; "copy to the other side" mirrors them in one
// atomic settings write.

import type { ChatSettings } from '../../chat-settings.ts'
import type { SkinRegistry } from '../skins/registry.ts'
import { BubbleSidePanel } from './BubbleSidePanel.tsx'
import { Notice, Row, type FocusTranslator } from './controls.tsx'
import css from './ChatFocusSection.module.css'

/** Which bubble side the shared editor currently edits. */
export type BubbleSide = 'assistant' | 'user'

/** Per-side field suffixes shared by both bubble sides (see chat-settings). */
const SIDE_FIELD_SUFFIXES = [
  'Bg', 'Border', 'Radius', 'MaxWidth', 'BgImage', 'BgSize', 'BgPosition', 'Overlay',
  'BackdropOpacity', 'BackdropBlur', 'GradientFrom', 'GradientTo', 'GradientAngle',
  'TextColor', 'Font', 'FontSize', 'Padding', 'Preset', 'Skin',
] as const

/** Full props of the appearance panel. */
export interface AppearancePanelProps {
  readonly side: BubbleSide
  readonly onSide: (next: BubbleSide) => void
  readonly focus: ChatSettings
  readonly setField: (field: keyof ChatSettings, value: unknown) => void
  /** One atomic write for the bulk copy action. */
  readonly setFields: (patch: Partial<ChatSettings>) => void
  readonly skins: SkinRegistry
  readonly onOpenMaker: () => void
  /** Live overlay slider value while dragging (preview only). */
  readonly overlayDraft: number | null
  readonly onOverlayDraft: (next: number | null) => void
  /** Live backdrop-opacity value while dragging (preview only). */
  readonly opacityDraft: number | null
  readonly onOpacityDraft: (next: number | null) => void
  readonly t: FocusTranslator
}

/** Both bubble sides, one shared editor. */
export function AppearancePanel({
  side, onSide, focus, setField, setFields, skins, onOpenMaker,
  overlayDraft, onOverlayDraft, opacityDraft, onOpacityDraft, t,
}: AppearancePanelProps) {
  /** Mirror this side's settings onto the other side in one mutation. */
  const copyToOther = (): void => {
    const from = side === 'assistant' ? 'focusBubble' : 'focusUserBubble'
    const to = side === 'assistant' ? 'focusUserBubble' : 'focusBubble'
    const patch: Partial<ChatSettings> = {}
    for (const suffix of SIDE_FIELD_SUFFIXES) {
      const field = `${from}${suffix}` as keyof ChatSettings
      ;(patch as Record<string, unknown>)[`${to}${suffix}`] = focus[field]
    }
    setFields(patch)
  }

  return (
    <>
      <Row
        title={t('focus.appearance.side')}
        hint={t('focus.appearance.sideHint')}
        control={(
          <div className={css.sideSwitch} role="tablist" aria-label={t('focus.appearance.side')}>
            {(['assistant', 'user'] as const).map(candidate => (
              <button
                key={candidate}
                type="button"
                role="tab"
                aria-selected={candidate === side}
                className={css.sideSwitchButton}
                data-active={candidate === side || undefined}
                onClick={() => onSide(candidate)}
              >
                {t(candidate === 'assistant' ? 'focus.sideAssistant' : 'focus.sideUser')}
              </button>
            ))}
          </div>
        )}
      />
      <Row
        title={t('focus.appearance.copy')}
        hint={t('focus.appearance.copyHint')}
        control={(
          <button type="button" className={css.clearButton} onClick={copyToOther}>
            {t('focus.appearance.copy')}
          </button>
        )}
      />
      {skins.state.getSnapshot().status === 'unavailable' && (
        <Notice>{t('focus.skins.unavailable')}</Notice>
      )}
      <BubbleSidePanel
        side={side}
        focus={focus}
        setField={setField}
        skins={skins}
        onOpenMaker={onOpenMaker}
        overlayDraft={overlayDraft}
        onOverlayDraft={onOverlayDraft}
        opacityDraft={opacityDraft}
        onOpacityDraft={onOpacityDraft}
        t={t}
      />
    </>
  )
}
