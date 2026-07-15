import { EDITOR_BINDING_DESCRIPTIONS } from '@/editor/keymap'
import { APP_COMMANDS } from '@/lib/commands/app-commands'
import { t } from '@/i18n'

/** One row of a shortcuts listing: a binding and what it does. */
export interface Shortcut {
  binding: string
  description: string
}

/**
 * App-scope shortcuts with descriptions localized for the active language.
 * Built at call time so language switches update the ⌘/ cheat-sheet.
 */
export function appShortcuts(): Shortcut[] {
  return APP_COMMANDS.flatMap((command) =>
    command.keybinding
      ? [
          {
            binding: command.keybinding,
            description: t(`commands:${command.id}.title`, { defaultValue: command.title }),
          },
        ]
      : [],
  )
}

/**
 * @deprecated Prefer {@link appShortcuts} so labels track the active locale.
 * Kept for call sites that still read a static list; values are English source.
 */
export const APP_SHORTCUTS: Shortcut[] = APP_COMMANDS.flatMap((command) =>
  command.keybinding ? [{ binding: command.keybinding, description: command.title }] : [],
)

export const EDITOR_SHORTCUTS: Shortcut[] = Object.entries(EDITOR_BINDING_DESCRIPTIONS).map(
  ([binding, description]) => ({ binding, description }),
)
