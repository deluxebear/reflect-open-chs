import type { LocalePreference } from '@reflect/core'

/** Catalogs shipped with the app (not including the `system` preference). */
export type AppLocale = 'en' | 'zh-CN'

export const APP_LOCALES: readonly AppLocale[] = ['en', 'zh-CN'] as const

/**
 * Resolve a settings preference to a concrete catalog. `system` uses the OS
 * language when it looks Chinese; everything else falls back to English.
 */
export function resolveAppLocale(preference: LocalePreference): AppLocale {
  if (preference === 'en' || preference === 'zh-CN') {
    return preference
  }
  if (typeof navigator === 'undefined') {
    return 'en'
  }
  const languages =
    navigator.languages?.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : []
  for (const language of languages) {
    if (typeof language !== 'string' || language.length === 0) {
      continue
    }
    const normalized = language.toLowerCase()
    if (normalized === 'zh' || normalized.startsWith('zh-')) {
      return 'zh-CN'
    }
  }
  return 'en'
}
