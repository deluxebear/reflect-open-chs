import type { AppCommand } from '@/lib/commands/types'
import { t } from './index'

/**
 * Return commands with palette titles/keywords localized for the active
 * language. English registry titles remain the fallback when a key is missing.
 * Keyword strings from the catalog are split on commas and **merged** with the
 * English registry keywords so Chinese and English queries both match.
 */
export function localizeCommands(commands: AppCommand[]): AppCommand[] {
  return commands.map((command) => {
    const title = t(`commands:${command.id}.title`, { defaultValue: command.title })
    const extraKeywords = t(`commands:${command.id}.keywords`, { defaultValue: '' })
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    const keywords = [...new Set([...(command.keywords ?? []), ...extraKeywords])]
    return {
      ...command,
      title,
      ...(keywords.length > 0 ? { keywords } : {}),
    }
  })
}
