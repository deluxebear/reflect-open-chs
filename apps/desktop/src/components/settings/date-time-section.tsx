import type { ReactElement } from 'react'
import {
  dateFormatSchema,
  timeFormatSchema,
  weekStartDaySchema,
  type DateFormat,
  type TimeFormat,
  type WeekStartDay,
} from '@reflect/core'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatFullDate } from '@/lib/dates'
import { useSettings } from '@/providers/settings-provider'
import { SettingsField } from './field'
import { SettingsSection } from './section'

interface TimeFormatOption {
  value: TimeFormat
  labelKey: string
}

interface WeekStartOption {
  value: WeekStartDay
  labelKey: string
}

const TIME_FORMAT_OPTIONS: TimeFormatOption[] = [
  { value: '12h', labelKey: 'dateTime.timeFormat.12h' },
  { value: '24h', labelKey: 'dateTime.timeFormat.24h' },
]

const WEEK_START_OPTIONS: WeekStartOption[] = [
  { value: 'monday', labelKey: 'dateTime.weekStart.monday' },
  { value: 'sunday', labelKey: 'dateTime.weekStart.sunday' },
]

// The options demonstrate themselves: each shows today's date in its format,
// so the day/month order is visible rather than described.
const DATE_FORMAT_VALUES: DateFormat[] = ['mdy', 'dmy', 'iso']

/**
 * Date & time display preferences. Both formats feed every date and time the
 * app renders (via `formatDayLabel`/`formatTimeOfDay`/`formatRecencyLabel` in
 * `lib/dates.ts`) — display-only, so switching them never touches stored
 * timestamps or daily-note keys.
 */
export function DateTimeSection(): ReactElement {
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation('settings')
  const today = new Date()

  return (
    <SettingsSection id="date-time">
      <SettingsField
        legend={t('dateTime.dateFormat.legend')}
        description={t('dateTime.dateFormat.description')}
      >
        <div className="mt-3">
          <Select
            value={settings.dateFormat}
            onValueChange={(value) => updateSettings({ dateFormat: dateFormatSchema.parse(value) })}
          >
            <SelectTrigger aria-label={t('dateTime.dateFormat.aria')} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {formatFullDate(today, value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsField>
      <SettingsField
        legend={t('dateTime.weekStart.legend')}
        description={t('dateTime.weekStart.description')}
      >
        <div className="mt-3">
          <Select
            value={settings.weekStartDay}
            onValueChange={(value) =>
              updateSettings({ weekStartDay: weekStartDaySchema.parse(value) })
            }
          >
            <SelectTrigger aria-label={t('dateTime.weekStart.aria')} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_START_OPTIONS.map(({ value, labelKey }) => (
                <SelectItem key={value} value={value}>
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsField>
      <SettingsField
        legend={t('dateTime.timeFormat.legend')}
        description={t('dateTime.timeFormat.description', {
          defaultValue: 'How times are shown throughout Reflect — 8:22pm or 20:22.',
        })}
      >
        <div className="mt-3">
          <Select
            value={settings.timeFormat}
            onValueChange={(value) => updateSettings({ timeFormat: timeFormatSchema.parse(value) })}
          >
            <SelectTrigger
              aria-label={t('dateTime.timeFormat.legend')}
              className="w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_FORMAT_OPTIONS.map(({ value, labelKey }) => (
                <SelectItem key={value} value={value}>
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsField>
    </SettingsSection>
  )
}
