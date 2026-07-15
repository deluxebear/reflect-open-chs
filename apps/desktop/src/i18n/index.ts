import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { AppLocale } from './locales'
import { resolveAppLocale } from './locales'
import type { LocalePreference } from '@reflect/core'

import enCommon from './locales/en/common.json'
import enShell from './locales/en/shell.json'
import enSettings from './locales/en/settings.json'
import enCommands from './locales/en/commands.json'
import enContext from './locales/en/context.json'
import zhCommon from './locales/zh-CN/common.json'
import zhShell from './locales/zh-CN/shell.json'
import zhSettings from './locales/zh-CN/settings.json'
import zhCommands from './locales/zh-CN/commands.json'
import zhContext from './locales/zh-CN/context.json'

export const I18N_NAMESPACES = ['common', 'shell', 'settings', 'commands', 'context'] as const

const resources = {
  en: {
    common: enCommon,
    shell: enShell,
    settings: enSettings,
    commands: enCommands,
    context: enContext,
  },
  'zh-CN': {
    common: zhCommon,
    shell: zhShell,
    settings: zhSettings,
    commands: zhCommands,
    context: zhContext,
  },
} as const

let initialized = false

/**
 * Initialize the shared i18n instance once. Safe to call from main before
 * React mounts so non-React callers (`t`, native menu) share the same catalogs.
 */
export function initI18n(preference: LocalePreference = 'system'): typeof i18n {
  const locale = resolveAppLocale(preference)
  if (!initialized) {
    // Bundled resources initialize synchronously for `t()` before the promise
    // settles; `react.useSuspense` stays off so tests render without Suspense.
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: [...I18N_NAMESPACES],
      nsSeparator: ':',
      interpolation: { escapeValue: false },
      returnNull: false,
      react: { useSuspense: false },
    })
    initialized = true
  } else if (i18n.language !== locale) {
    void i18n.changeLanguage(locale)
  }
  return i18n
}

/** Apply a settings preference to the running instance. */
export function applyLocalePreference(preference: LocalePreference): AppLocale {
  const locale = resolveAppLocale(preference)
  if (!initialized) {
    initI18n(preference)
    return locale
  }
  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale)
  }
  return locale
}

/** Translate outside React. Requires {@link initI18n} first. */
export function t(key: string, options?: { defaultValue?: string } & Record<string, unknown>): string {
  if (!initialized) {
    initI18n('system')
  }
  if (options === undefined) {
    return i18n.t(key)
  }
  return i18n.t(key, options)
}

export { i18n }
export { resolveAppLocale, type AppLocale } from './locales'

// Eager default so tests and early menu builds share English catalogs before
// SettingsProvider applies the user preference.
initI18n('en')
