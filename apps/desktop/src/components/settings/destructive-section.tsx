import { useState, type ReactElement } from 'react'
import { errorMessage } from '@reflect/core'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useGraph } from '@/providers/graph-provider'
import { SettingsField } from './field'
import { SettingsSection } from './section'

export function DestructiveSection(): ReactElement {
  const { graph, forget, deleteGraph } = useGraph()
  const { t } = useTranslation('settings')
  const [confirming, setConfirming] = useState(false)
  const [forgetting, setForgetting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteName, setDeleteName] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const graphId = graph?.root ?? 'this graph'
  const graphName = graph?.name ?? ''
  // GitHub-style guard: the delete button stays dead until the typed name
  // matches the graph's folder name exactly.
  const nameConfirmed = graph !== null && deleteName === graph.name

  const forgetGraph = async (): Promise<void> => {
    if (graph === null || forgetting) {
      return
    }
    setForgetting(true)
    try {
      await forget(graph.root)
      setConfirming(false)
    } finally {
      setForgetting(false)
    }
  }

  const openDeleteDialog = (): void => {
    setDeleteName('')
    setDeleteError(null)
    setConfirmingDelete(true)
  }

  const deleteGraphToTrash = async (): Promise<void> => {
    if (!nameConfirmed || deleting) {
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteGraph()
      setConfirmingDelete(false)
    } catch (err) {
      setDeleteError(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <SettingsSection id="destructive">
        <SettingsField
          legend={t('destructive.forget.legend')}
          description={t('destructive.forget.description')}
        >
          <div className="mt-3 flex justify-start">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={graph === null || forgetting}
              onClick={() => setConfirming(true)}
            >
              {t('destructive.forget.button')}
            </Button>
          </div>
        </SettingsField>
        <SettingsField
          legend={t('destructive.delete.legend')}
          description={t('destructive.delete.description')}
        >
          <div className="mt-3 flex justify-start">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={graph === null || deleting}
              onClick={openDeleteDialog}
            >
              {t('destructive.delete.button')}
            </Button>
          </div>
        </SettingsField>
      </SettingsSection>

      <Dialog open={confirming} onOpenChange={(open) => !forgetting && setConfirming(open)}>
        <DialogContent>
          <DialogTitle>{t('destructive.forget.confirmTitle')}</DialogTitle>
          <DialogDescription className="min-w-0">
            {t('destructive.forget.confirmDescription', { graphId })}
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={forgetting}>
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button variant="destructive" disabled={forgetting} onClick={() => void forgetGraph()}>
              {forgetting ? t('destructive.forget.forgetting') : t('destructive.forget.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmingDelete}
        onOpenChange={(open) => !deleting && setConfirmingDelete(open)}
      >
        <DialogContent>
          <DialogTitle>{t('destructive.delete.confirmTitle')}</DialogTitle>
          <DialogDescription className="min-w-0">
            {t('destructive.delete.confirmDescription', { graphId, graphName })}
          </DialogDescription>
          <Input
            aria-label={t('destructive.delete.nameAria')}
            placeholder={graphName}
            value={deleteName}
            autoComplete="off"
            spellCheck={false}
            disabled={deleting}
            onChange={(event) => setDeleteName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void deleteGraphToTrash()
              }
            }}
          />
          {deleteError !== null && (
            <p role="alert" className="text-xs text-destructive">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={deleting}>
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!nameConfirmed || deleting}
              onClick={() => void deleteGraphToTrash()}
            >
              {deleting ? t('destructive.delete.deleting') : t('destructive.delete.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
