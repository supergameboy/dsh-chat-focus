/** Host-backed ChatFocus display policy (fold + bubble chrome). */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  DEFAULT_CHAT_SETTINGS, type ChatSettings,
} from '../chat-settings.ts'

/** Live ChatFocus preferences consumed by Chat and its Settings rows. */
export class ChatFocusPolicy {
  /** Reactive full section; defaults apply before Host settings arrive. */
  readonly settings: SnapshotStore<ChatSettings> = createSnapshotStore(DEFAULT_CHAT_SETTINGS)

  /**
   * @param host - durable Chat settings scope.
   */
  constructor(private readonly host: SettingsScope<ChatSettings>) {
    host.subscribe(() => { this.adopt() })
    this.adopt()
  }

  /**
   * Publish and persist one explicit user choice.
   * @param field - durable field name.
   * @param value - next field value.
   */
  set<Field extends keyof ChatSettings>(field: Field, value: ChatSettings[Field]): void {
    const current = this.settings.getSnapshot()
    if (current[field] === value) return
    this.settings.set({ ...current, [field]: value })
    void this.host.set(field, value)
  }

  /**
   * Persist one field from a settings-row callback (the durable schema
   * validates the value on the Host side).
   * @param field - durable field name.
   * @param value - next field value.
   */
  setField(field: keyof ChatSettings, value: unknown): void {
    const current = this.settings.getSnapshot()
    if (current[field] === value) return
    this.settings.set({ ...current, [field]: value as ChatSettings[typeof field] })
    void this.host.set(field, value as ChatSettings[typeof field])
  }

  /** Adopt the latest accepted Host section without writing it back. */
  private adopt(): void {
    const section = this.host.getSnapshot().value
    if (section === undefined) return
    this.settings.set(section)
  }
}
