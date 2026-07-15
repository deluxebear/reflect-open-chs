import type { ReactElement } from 'react'
import { ArrowDownToLine, RefreshCw, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useUpdate } from '@/providers/update-provider'
import { SettingsField } from './field'

/**
 * The manual path to the same updater the app checks on launch: one button
 * whose label tracks the update lifecycle, with the outcome reported inline.
 */
export function UpdateField(): ReactElement {
  const { state, checkNow, install, restart } = useUpdate()
  const { t } = useTranslation('settings')

  const action: {
    label: string
    icon: typeof RefreshCw
    run?: (() => Promise<void>) | undefined
    spinning?: boolean | undefined
  } = (() => {
    switch (state.phase) {
      case 'checking':
        return { label: t('about.updates.checking'), icon: RefreshCw, run: undefined, spinning: true }
      case 'available':
        return {
          label: t('about.updates.install', { version: state.version }),
          icon: ArrowDownToLine,
          run: install,
        }
      case 'downloading':
        return {
          label:
            state.percent !== null
              ? t('about.updates.downloadingPercent', { percent: state.percent })
              : t('about.updates.downloading'),
          icon: ArrowDownToLine,
          run: undefined,
        }
      case 'ready':
        return { label: t('about.updates.restart'), icon: RotateCw, run: restart }
      case 'error':
        // Retry what actually failed: a failed install still has its found
        // update (same contract as the sidebar row); a failed check re-checks.
        return state.during === 'install'
          ? { label: t('about.updates.retryInstall'), icon: ArrowDownToLine, run: install }
          : { label: t('about.updates.check'), icon: RefreshCw, run: checkNow }
      default:
        return { label: t('about.updates.check'), icon: RefreshCw, run: checkNow }
    }
  })()

  const run = action.run
  return (
    <SettingsField
      legend={t('about.updates.legend')}
      description={t('about.updates.description')}
    >
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={run === undefined}
          onClick={run ? () => void run() : undefined}
          className="text-text-secondary"
        >
          <action.icon
            aria-hidden
            strokeWidth={1.75}
            className={action.spinning ? 'animate-spin' : undefined}
          />
          {action.label}
        </Button>
        {state.phase === 'upToDate' ? (
          <span role="status" className="text-xs text-text-muted">
            {t('about.updates.upToDate')}
          </span>
        ) : null}
        {state.phase === 'error' ? (
          <span role="alert" className="text-xs text-red-500">
            {state.message}
          </span>
        ) : null}
      </div>
    </SettingsField>
  )
}
