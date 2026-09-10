/** Host registration for browser Chat preferences. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { CHAT_SETTINGS_NAMESPACE, ChatSettingsSchema } from './chat-settings.ts'
import { installSkinStore } from './skins/host.ts'

export {
  CHAT_SETTINGS_NAMESPACE, DEFAULT_TRANSCRIPT_VIEW_MODE, TRANSCRIPT_VIEW_FIELD,
  TRANSCRIPT_VIEW_MODES, type ChatSettings, type TranscriptViewMode,
} from './chat-settings.ts'
export type {
  SkinFit, SkinIndex, SkinKind, SkinPadding, SkinRecord, SkinSaveRequest,
} from './skin-contract.ts'

/** Register the durable Chat settings section when a provider exists. */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      CHAT_SETTINGS_NAMESPACE,
      ChatSettingsSchema,
    )
  })
  // Skin assets are far too large for the settings document; when the Host
  // exposes its authenticated connection seam, serve them from disk instead.
  // Absence is expected (headless profiles) and simply disables the library.
  ctx.inject(['connection'], (connectionCtx) => {
    installSkinStore(connectionCtx)
  })
}
