import type { ReactElement } from 'react'
import type { LocalePreference, ThemePreference } from '@reflect/core'
import { localePreferenceSchema } from '@reflect/core'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSettings } from '@/providers/settings-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingsField } from './field'
import { SettingsOptionCard } from './option-card'
import { SettingsSection } from './section'

interface ThemeOption {
  value: ThemePreference
  labelKey: string
  icon: LucideIcon
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', labelKey: 'appearance.theme.system', icon: Monitor },
  { value: 'light', labelKey: 'appearance.theme.light', icon: Sun },
  { value: 'dark', labelKey: 'appearance.theme.dark', icon: Moon },
] // keys under settings namespace

const LOCALE_OPTIONS: LocalePreference[] = ['system', 'en', 'zh-CN']

/**
 * Theme and language pickers. Edits the settings document directly — the
 * ThemeProvider and LocaleProvider apply whatever is persisted.
 */
export function AppearanceSection(): ReactElement {
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation('settings')

  return (
    <SettingsSection id="appearance">
      <SettingsField
        legend={t('appearance.theme.legend')}
        description={t('appearance.theme.description')}
      >
        <div className="mt-3 grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, labelKey, icon: Icon }) => {
            const selected = settings.theme === value
            return (
              <SettingsOptionCard
                key={value}
                selected={selected}
                className={cn(
                  'flex-col items-center gap-1.5 px-3 py-3',
                  selected ? 'text-accent-soft-text' : 'text-text-secondary',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={selected}
                  onChange={() => updateSettings({ theme: value })}
                  className="sr-only"
                />
                <Icon aria-hidden strokeWidth={1.75} className="size-4" />
                <span className="text-xs font-medium">{t(labelKey)}</span>
              </SettingsOptionCard>
            )
          })}
        </div>
      </SettingsField>
      <SettingsField
        legend={t('appearance.locale.legend')}
        description={t('appearance.locale.description')}
      >
        <div className="mt-3">
          <Select
            value={settings.locale}
            onValueChange={(value) =>
              updateSettings({ locale: localePreferenceSchema.parse(value) })
            }
          >
            <SelectTrigger aria-label={t('appearance.locale.legend')} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALE_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`appearance.locale.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsField>
    </SettingsSection>
  )
}
