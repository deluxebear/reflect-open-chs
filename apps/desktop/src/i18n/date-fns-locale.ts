import type { Locale } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import type { AppLocale } from './locales'

/**
 * Map a Reflect app catalog language to a date-fns locale for month names,
 * weekdays, and other calendar display strings.
 */
export function dateFnsLocaleForApp(appLocale: AppLocale): Locale {
  return appLocale === 'zh-CN' ? zhCN : enUS
}

/**
 * date-fns locale for an i18next language code (`en`, `zh-CN`, or BCP 47 variants).
 */
export function dateFnsLocaleForLanguage(language: string): Locale {
  if (language === 'zh-CN' || language.toLowerCase().startsWith('zh')) {
    return zhCN
  }
  return enUS
}
