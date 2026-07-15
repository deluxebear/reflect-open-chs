import type { ReactElement } from 'react'
import type { EditorMarkdownSyntax, EditorTextSize } from '@reflect/core'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSettings } from '@/providers/settings-provider'
import { SettingsField } from './field'
import { KeyboardShortcutsField } from './keyboard-shortcuts-field'
import { SettingsOptionCard } from './option-card'
import { SettingsSection } from './section'
import { SettingsSwitchField } from './switch-field'

interface MarkdownSyntaxOption {
  value: EditorMarkdownSyntax
  labelKey: string
  descriptionKey: string
}

const MARKDOWN_SYNTAX_OPTIONS: MarkdownSyntaxOption[] = [
  {
    value: 'hide',
    labelKey: 'editor.markdownSyntax.hide',
    descriptionKey: 'editor.markdownSyntax.hideDesc',
  },
  {
    value: 'hybrid',
    labelKey: 'editor.markdownSyntax.hybrid',
    descriptionKey: 'editor.markdownSyntax.hybridDesc',
  },
  {
    value: 'show',
    labelKey: 'editor.markdownSyntax.show',
    descriptionKey: 'editor.markdownSyntax.showDesc',
  },
]

interface TextSizeOption {
  value: EditorTextSize
  labelKey: string
  descriptionKey: string
}

const TEXT_SIZE_OPTIONS: TextSizeOption[] = [
  {
    value: 'small',
    labelKey: 'editor.textSize.small',
    descriptionKey: 'editor.textSize.smallDesc',
  },
  {
    value: 'medium',
    labelKey: 'editor.textSize.medium',
    descriptionKey: 'editor.textSize.mediumDesc',
  },
  {
    value: 'large',
    labelKey: 'editor.textSize.large',
    descriptionKey: 'editor.textSize.largeDesc',
  },
]

export function EditorSection(): ReactElement {
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation('settings')

  return (
    <SettingsSection id="editor">
      <SettingsField
        legend={t('editor.markdownSyntax.legend')}
        description={t('editor.markdownSyntax.description')}
      >
        <div className="mt-3 @container">
          <div className="grid grid-cols-1 gap-2 @xl:grid-cols-3">
            {MARKDOWN_SYNTAX_OPTIONS.map((option) => {
              const selected = settings.editorMarkdownSyntax === option.value
              return (
                <SettingsOptionCard
                  key={option.value}
                  selected={selected}
                  className="items-start justify-between gap-3 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-sm font-medium',
                        selected && 'text-accent-soft-text',
                      )}
                    >
                      {t(option.labelKey)}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      {t(option.descriptionKey)}
                    </span>
                  </span>
                  <input
                    type="radio"
                    name="editor-markdown-syntax"
                    value={option.value}
                    checked={selected}
                    onChange={() => updateSettings({ editorMarkdownSyntax: option.value })}
                    className="mt-0.5 shrink-0 accent-accent"
                  />
                </SettingsOptionCard>
              )
            })}
          </div>
        </div>
      </SettingsField>

      <SettingsField
        legend={t('editor.textSize.legend')}
        description={t('editor.textSize.description')}
      >
        <div className="mt-3 @container">
          <div className="grid grid-cols-1 gap-2 @xl:grid-cols-3">
            {TEXT_SIZE_OPTIONS.map((option) => {
              const selected = settings.editorTextSize === option.value
              return (
                <SettingsOptionCard
                  key={option.value}
                  selected={selected}
                  className="items-start justify-between gap-3 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-sm font-medium',
                        selected && 'text-accent-soft-text',
                      )}
                    >
                      {t(option.labelKey)}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      {t(option.descriptionKey)}
                    </span>
                  </span>
                  <input
                    type="radio"
                    name="editor-text-size"
                    value={option.value}
                    checked={selected}
                    onChange={() => updateSettings({ editorTextSize: option.value })}
                    className="mt-0.5 shrink-0 accent-accent"
                  />
                </SettingsOptionCard>
              )
            })}
          </div>
        </div>
      </SettingsField>

      <SettingsSwitchField
        legend={t('editor.fullWidth.legend')}
        description={t('editor.fullWidth.description')}
        checked={settings.editorFullWidth}
        onCheckedChange={(checked) => updateSettings({ editorFullWidth: checked })}
      />

      <SettingsSwitchField
        legend={t('editor.spellCheck.legend')}
        description={t('editor.spellCheck.description')}
        checked={settings.editorSpellCheck}
        onCheckedChange={(checked) => updateSettings({ editorSpellCheck: checked })}
      />

      <SettingsSwitchField
        legend={t('editor.defaultBullet.legend')}
        description={t('editor.defaultBullet.description')}
        checked={settings.editorDefaultBullet}
        onCheckedChange={(checked) => updateSettings({ editorDefaultBullet: checked })}
      />

      <SettingsSwitchField
        legend={t('editor.bulletAfterHeading.legend')}
        description={t('editor.bulletAfterHeading.description')}
        checked={settings.editorBulletAfterHeading}
        onCheckedChange={(checked) => updateSettings({ editorBulletAfterHeading: checked })}
      />

      <KeyboardShortcutsField />
    </SettingsSection>
  )
}
