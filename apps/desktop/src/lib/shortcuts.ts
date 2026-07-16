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
 * Catalog key for an editor binding. Dots in the binding (e.g. `Mod-.`) would
 * be split by i18next's key separator, so they become `Dot` in the path.
 */
function editorShortcutCatalogKey(binding: string): string {
  return binding.replace(/\./g, 'Dot')
}

/**
 * Editor-scope shortcuts (meowdown + Reflect editor bindings) with localized
 * descriptions for the active language.
 */
export function editorShortcuts(): Shortcut[] {
  return Object.entries(EDITOR_BINDING_DESCRIPTIONS).map(([binding, english]) => ({
    binding,
    description: t(`shell:editorShortcuts.${editorShortcutCatalogKey(binding)}`, {
      defaultValue: english,
    }),
  }))
}

/**
 * @deprecated Prefer {@link appShortcuts} so labels track the active locale.
 * Kept for call sites that still read a static list; values are English source.
 */
export const APP_SHORTCUTS: Shortcut[] = APP_COMMANDS.flatMap((command) =>
  command.keybinding ? [{ binding: command.keybinding, description: command.title }] : [],
)

/**
 * @deprecated Prefer {@link editorShortcuts} so labels track the active locale.
 */
export const EDITOR_SHORTCUTS: Shortcut[] = Object.entries(EDITOR_BINDING_DESCRIPTIONS).map(
  ([binding, description]) => ({ binding, description }),
)
