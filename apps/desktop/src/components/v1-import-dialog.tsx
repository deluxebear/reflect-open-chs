import type { ReactElement } from 'react'
import type { GraphImportProgress, GraphImportSummary } from '@reflect/core'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { t as translate } from '@/i18n'
import type { V1ImportState } from '@/providers/v1-import-provider'

interface V1ImportDialogProps {
  state: V1ImportState
  onCancel: () => void
  onDismiss: () => void
}

/** The one-line result the dialog shows once an import completes. */
export function summaryText(summary: GraphImportSummary): string {
  const parts = [translate('settings:import.filesImported', { count: summary.importedFiles })]
  if (summary.mergedFiles > 0) {
    parts.push(translate('settings:import.dailiesMerged', { count: summary.mergedFiles }))
  }
  if (summary.renamedFiles > 0) {
    parts.push(translate('settings:import.renamed', { count: summary.renamedFiles }))
  }
  if (summary.skippedFiles > 0) {
    parts.push(translate('settings:import.skipped', { count: summary.skippedFiles }))
  }
  if (summary.downloadedAssets > 0) {
    parts.push(
      translate('settings:import.attachmentsDownloaded', { count: summary.downloadedAssets }),
    )
  }
  const text = `${parts.join(', ')}.`
  if (summary.failedAssetDownloads === 0) {
    return text
  }
  return `${text}${translate('settings:import.failedAssets', {
    count: summary.failedAssetDownloads,
  })}`
}

function stageText(progress: GraphImportProgress | null): string {
  if (progress === null) {
    return translate('settings:import.reading')
  }
  if (progress.stage === 'downloading') {
    return translate('settings:import.downloading', {
      done: progress.done,
      total: progress.total,
    })
  }
  return translate('settings:import.addingNotes', {
    done: progress.done,
    total: progress.total,
  })
}

function stagePercent(progress: GraphImportProgress | null): number | undefined {
  if (progress === null || progress.total === 0) {
    return undefined
  }
  return Math.round((progress.done / progress.total) * 100)
}

/**
 * The modal face of a running Reflect V1 import. While the import runs the
 * dialog cannot be dismissed (there is nothing else to do in the graph until
 * it settles) — but it can be cancelled up until writing starts, because
 * nothing lands in the graph before then. Once finished it reports the
 * outcome and closes on demand.
 */
export function V1ImportDialog({ state, onCancel, onDismiss }: V1ImportDialogProps): ReactElement {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')
  const running = state.phase === 'running'
  // Cancelling mid-write would leave a half-imported graph; the native side
  // only honours cancellation before writes start, so the button goes with it.
  const cancellable = running && (state.progress === null || state.progress.stage === 'downloading')

  return (
    <Dialog
      open={state.phase !== 'idle'}
      onOpenChange={(next) => {
        if (!next && !running) {
          onDismiss()
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => {
          event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (running) {
            event.preventDefault()
          }
        }}
      >
        {state.phase === 'running' ? (
          <>
            <DialogTitle>{t('import.runningTitle')}</DialogTitle>
            <DialogDescription role="status">
              {stageText(state.progress)}
            </DialogDescription>
            <Progress value={stagePercent(state.progress) ?? null} />
            {cancellable ? (
              <DialogFooter>
                <Button variant="ghost" disabled={state.cancelling} onClick={onCancel}>
                  {state.cancelling ? t('import.cancelling') : tc('cancel')}
                </Button>
              </DialogFooter>
            ) : null}
          </>
        ) : null}
        {state.phase === 'done' ? (
          <>
            <DialogTitle>{t('import.doneTitle')}</DialogTitle>
            <DialogDescription role="status">{summaryText(state.summary)}</DialogDescription>
            <DialogFooter>
              <Button onClick={onDismiss}>{t('import.done')}</Button>
            </DialogFooter>
          </>
        ) : null}
        {state.phase === 'failed' ? (
          <>
            <DialogTitle>{t('import.failedTitle')}</DialogTitle>
            <DialogDescription role="alert">{state.message}</DialogDescription>
            <DialogFooter>
              <Button variant="ghost" onClick={onDismiss}>
                {tc('close')}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
