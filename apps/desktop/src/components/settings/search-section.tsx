import type { ReactElement, ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { InlineAlert } from '@/components/inline-alert'
import { ensureEmbeddingsVisibly, retryFailedEmbeddings } from '@/lib/semantic'
import { useEmbedStatus } from '@/lib/use-embed-status'
import { useSettings } from '@/providers/settings-provider'
import { DescribeAssetsField } from './describe-assets-field'
import { SettingsField } from './field'
import { ModelDownloadProgress } from './model-download-progress'
import { RebuildIndexField } from './rebuild-index-field'
import { SettingsSection } from './section'

/**
 * The search settings: the semantic-search opt-in (Plan 09) and the index
 * rebuild action. Enabling semantic search persists `semanticSearchEnabled`;
 * EmbeddingsSync reacts by loading the model, and the first load's ~90MB
 * download streams through this section as a progress bar (the `embed:status`
 * events carry byte counts).
 */
export function SearchSection(): ReactElement {
  const { settings, updateSettings } = useSettings()
  const status = useEmbedStatus()
  const { t } = useTranslation('settings')

  let control: ReactNode
  if (!settings.semanticSearchEnabled) {
    // Disabling takes effect immediately — every semantic consumer gates on
    // the setting, so the still-loaded model just idles. No caveat needed.
    control = (
      <button
        type="button"
        onClick={() => {
          updateSettings({ semanticSearchEnabled: true })
          // EmbeddingsSync loads an untouched runtime; a `failed` one only
          // retries on an explicit action like this.
          void retryFailedEmbeddings()
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-text-on-brand shadow-sm transition-colors duration-100 hover:bg-accent-hover"
      >
        <Sparkles aria-hidden strokeWidth={1.75} className="size-3.5" />
        {t('search.semantic.enable')}
      </button>
    )
  } else if (status.status === 'ready') {
    control = (
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-xs text-text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
          {t('search.semantic.modelReady', { model: status.model })}
        </span>
        <button
          type="button"
          onClick={() => updateSettings({ semanticSearchEnabled: false })}
          className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-100 hover:bg-surface-hover"
        >
          {t('common.disable')}
        </button>
      </div>
    )
  } else if (status.status === 'failed') {
    control = (
      <div>
        <InlineAlert tone="error">
          {t('search.semantic.loadFailed', { message: status.message })}
        </InlineAlert>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void ensureEmbeddingsVisibly()}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-100 hover:bg-surface-hover"
          >
            {t('common.tryAgain')}
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ semanticSearchEnabled: false })}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-100 hover:bg-surface-hover"
          >
            {t('common.disable')}
          </button>
        </div>
      </div>
    )
  } else {
    // `loading`, or the `uninitialized` beat before EmbeddingsSync reacts.
    control = (
      <ModelDownloadProgress progress={status.status === 'loading' ? status.progress : undefined} />
    )
  }

  return (
    <SettingsSection id="search">
      <SettingsField
        legend={t('search.semantic.legend')}
        description={t('search.semantic.description')}
      >
        <div className="mt-3">{control}</div>
      </SettingsField>
      <DescribeAssetsField />
      <RebuildIndexField />
    </SettingsSection>
  )
}
