import { useEffect, type ReactElement, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { applyLocalePreference, i18n, initI18n } from './index'
import { useSettings } from '@/providers/settings-provider'
import { reinstallNativeMenu } from '@/lib/native-menu/menu'

initI18n('system')

interface LocaleProviderProps {
  children: ReactNode
}

/**
 * Keeps i18next language in sync with `settings.locale` and rebuilds the
 * macOS native menu when the resolved catalog changes.
 */
export function LocaleProvider({ children }: LocaleProviderProps): ReactElement {
  const { settings } = useSettings()

  useEffect(() => {
    const locale = applyLocalePreference(settings.locale)
    document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en'
    void reinstallNativeMenu()
  }, [settings.locale])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
