import { useState, type ReactElement } from 'react'
import type { AiProvidersState } from '@reflect/core'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { backfillAssetDescriptionsVisibly } from '@/lib/asset-backfill'
import { useGraph } from '@/providers/graph-provider'
import { useSettings } from '@/providers/settings-provider'
import { SettingsField } from './field'

/**
 * Settings → Search → OCR assets (Plan 20): a toggle for the automatic path
 * (read new images/PDFs as they're added) plus an explicit backfill, gated
 * behind a cost-warning confirmation because
 * an existing graph can hold many large or costly assets. Progress and final
 * state surface through the operations status UI.
 */
export function DescribeAssetsField(): ReactElement {
  const { settings, updateSettings } = useSettings()
  const { graph } = useGraph()
  const { t } = useTranslation('settings')
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)

  const hasProvider = settings.aiProviders.length > 0
  const generation = graph?.generation ?? null

  const runBackfill = async (): Promise<void> => {
    setConfirming(false)
    if (generation === null || running) {
      return
    }
    const providers: AiProvidersState = {
      providers: settings.aiProviders,
      defaultProviderId: settings.defaultAiProviderId,
    }
    setRunning(true)
    try {
      await backfillAssetDescriptionsVisibly(generation, providers)
    } finally {
      setRunning(false)
    }
  }

  return (
    <SettingsField legend={t('search.ocr.legend')} description={t('search.ocr.description')}>
      <div className="mt-3 flex items-center gap-3">
        <Switch
          aria-label={t('search.ocr.autoLabel')}
          checked={settings.describeAssets}
          onCheckedChange={(checked) => updateSettings({ describeAssets: checked })}
        />
        <span className="text-xs text-text-muted">{t('search.ocr.autoLabel')}</span>
      </div>
      <div className="mt-3 flex flex-col items-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={generation === null || !hasProvider || running}
          onClick={() => setConfirming(true)}
          className="text-text-secondary"
        >
          {running ? t('search.ocr.backfilling') : t('search.ocr.backfill')}
        </Button>
        {!hasProvider ? (
          <p className="mt-2 text-xs text-text-muted">{t('search.ocr.needProvider')}</p>
        ) : null}
      </div>
      {confirming ? (
        <Dialog
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setConfirming(false)
          }}
        >
          <DialogContent showCloseButton={false} className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('search.ocr.confirmTitle')}</DialogTitle>
              <DialogDescription>{t('search.ocr.confirmDescription')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" size="sm" onClick={() => void runBackfill()}>
                {t('search.ocr.backfill')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </SettingsField>
  )
}
