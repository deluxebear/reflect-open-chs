import { type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { InlineAlert } from '@/components/inline-alert'
import { ConnectGithubFinishStep } from '@/components/settings/connect-github-finish-step'
import { GithubAuthStep } from '@/components/settings/github-auth-step'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useConnectGithubWizard, type ConnectWizardStep } from '@/hooks/use-connect-github-wizard'
import { useRestoreFocus } from '@/hooks/use-restore-focus'

interface ConnectGithubDialogProps {
  /** A suggested name for a newly created backup repo (from the graph name). */
  suggestedRepoName: string
  onClose: () => void
  /** Delay between repo-existence polls on the create handoff (test hook). */
  pollIntervalMs?: number
}

/**
 * The desktop "Connect GitHub" dialog — a Dialog shell over
 * {@link useConnectGithubWizard}, which owns the whole flow (repo → sign-in →
 * connect, with the create-handoff/grant-access polls and the public-repo
 * consent gate). The mobile drawer renders the same hook; flow changes belong
 * there, not here.
 */
export function ConnectGithubDialog({
  suggestedRepoName,
  onClose,
  pollIntervalMs = 3000,
}: ConnectGithubDialogProps): ReactElement {
  const { t } = useTranslation('settings')
  const wizard = useConnectGithubWizard({ suggestedRepoName, onClose, pollIntervalMs })

  useRestoreFocus()

  const stepDescription = (step: ConnectWizardStep): string => {
    switch (step) {
      case 'repo':
        return t('githubConnect.stepRepo')
      case 'auth':
        return t('githubConnect.stepAuth')
      case 'finish':
        return t('githubConnect.stepFinish')
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
        }
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('githubConnect.title')}</DialogTitle>
          <DialogDescription>{stepDescription(wizard.step)}</DialogDescription>
        </DialogHeader>

        {wizard.step === 'repo' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="radio"
                  name="repo-mode"
                  checked={wizard.mode === 'create'}
                  onChange={() => wizard.setMode('create')}
                />
                {t('githubConnect.createNew')}
              </label>
              {wizard.mode === 'create' ? (
                <Input
                  autoFocus
                  value={wizard.repoName}
                  onChange={(event) => wizard.setRepoName(event.target.value)}
                  className="ml-6 w-auto"
                  aria-label={t('githubConnect.newRepoAria')}
                />
              ) : null}
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="radio"
                  name="repo-mode"
                  checked={wizard.mode === 'existing'}
                  onChange={() => wizard.setMode('existing')}
                />
                {t('githubConnect.useExisting')}
              </label>
              {wizard.mode === 'existing' ? (
                <Input
                  autoFocus
                  value={wizard.existingRepo}
                  onChange={(event) => wizard.setExistingRepo(event.target.value)}
                  placeholder={t('githubConnect.ownerNamePlaceholder')}
                  className="ml-6 w-auto"
                  aria-label={t('githubConnect.existingRepoAria')}
                />
              ) : null}
            </div>
            <Button onClick={wizard.continueFromRepo} size="sm">
              {t('githubConnect.continue')}
            </Button>
          </div>
        ) : null}

        {wizard.step === 'auth' ? (
          <GithubAuthStep
            onAuthed={wizard.onAuthed}
            repoName={wizard.mode === 'create' ? wizard.repoName.trim() : undefined}
          />
        ) : null}

        {wizard.step === 'finish' ? (
          <ConnectGithubFinishStep wizard={wizard} layout="row" />
        ) : null}

        {wizard.step !== 'finish' && wizard.error !== null ? (
          <InlineAlert tone="error">{wizard.error}</InlineAlert>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
