/** Host-backed ChatFocus display policy (fold + bubble chrome). */

import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  DEFAULT_CHAT_SETTINGS, type ChatSettings,
} from '../chat-settings.ts'

/** JSON value one settings path write accepts. */
type SettingsValue = Extract<SettingsPathOpView, { op: 'set' }>['value']

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
   * Publish and persist several fields as one atomic mutation. Used by the
   * bulk actions (copy one bubble side onto the other, reset everything): one
   * revision fence and one settings write instead of one per field.
   * @param patch - fields to overwrite.
   */
  setFields(patch: Partial<ChatSettings>): void {
    const current = this.settings.getSnapshot()
    const changed = (Object.entries(patch) as [keyof ChatSettings, ChatSettings[keyof ChatSettings]][])
      .filter(([field, value]) => current[field] !== value)
    if (changed.length === 0) return
    this.settings.set({ ...current, ...Object.fromEntries(changed) } as ChatSettings)
    const ops: SettingsPathOpView[] = changed.map(([field, value]) => ({
      op: 'set',
      path: [field as string],
      value: value as SettingsValue,
    }))
    void this.host.mutate(ops)
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
