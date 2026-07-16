import type { ReactElement, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { InlineAlert } from '@/components/inline-alert'
import { Button } from '@/components/ui/button'
import type { ConnectGithubWizard } from '@/hooks/use-connect-github-wizard'

interface ConnectGithubFinishStepProps {
  wizard: ConnectGithubWizard
  /**
   * `row`: desktop dialog — small buttons side by side, escape hatches
   * leading. `stack`: mobile sheet — full-width buttons, primary action
   * first (the platform's bottom-sheet convention).
   */
  layout: 'row' | 'stack'
}

/**
 * The connect wizard's finish step, shared by the desktop dialog and the
 * mobile drawer so the view precedence and every user-facing string live
 * once. Renders whatever {@link ConnectGithubWizard.finishView} says —
 * the public-repo consent gate, the create/grant handoffs (whose polls the
 * hook owns), the in-flight state, or a failure's inline error with its
 * escape back to the repo step. Only button sizing/stacking varies by
 * `layout`.
 */
export function ConnectGithubFinishStep({
  wizard,
  layout,
}: ConnectGithubFinishStepProps): ReactElement {
  const { t } = useTranslation('settings')
  const view = wizard.finishView
  const buttonSize = layout === 'row' ? ('sm' as const) : undefined
  const groupClass = layout === 'row' ? 'flex gap-2' : 'flex flex-col gap-2'

  function changeRepository(label: string): ReactNode {
    return (
      <Button variant="outline" size={buttonSize} onClick={wizard.backToRepo}>
        {label}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {wizard.user !== null ? (
        <p className="text-xs text-text-muted">
          {t('githubConnect.signedInAs')}{' '}
          <strong className="text-text">{wizard.user.login}</strong>
        </p>
      ) : null}

      {view.kind === 'publicConfirm' ? (
        <>
          <InlineAlert tone="error">
            <strong>
              {t('githubConnect.publicRepo', {
                owner: view.repo.owner,
                name: view.repo.name,
              })}
            </strong>{' '}
            {t('githubConnect.publicWarning')}
          </InlineAlert>
          <div className={groupClass}>
            {layout === 'row' ? changeRepository(t('githubConnect.chooseAnother')) : null}
            <Button
              variant="destructive"
              size={buttonSize}
              disabled={wizard.pending || wizard.user === null}
              onClick={wizard.confirmPublic}
            >
              {t('githubConnect.backupPublic')}
            </Button>
            {layout === 'stack' ? changeRepository(t('githubConnect.chooseAnother')) : null}
          </div>
        </>
      ) : null}

      {view.kind === 'createGuide' ? (
        <>
          <p className="text-sm text-text">
            {t('githubConnect.createOnGithub', { owner: view.owner, name: view.name })}
          </p>
          <div className={groupClass}>
            <Button size={buttonSize} onClick={wizard.openCreatePage}>
              {t('githubConnect.createOnGithubButton')}
            </Button>
            {changeRepository(t('githubConnect.changeRepo'))}
          </div>
          <p className="text-xs text-text-muted">{t('githubConnect.waitingRepo')}</p>
          {wizard.authKind === 'app' ? (
            <p className="text-xs text-text-muted">
              {t('githubConnect.grantIfNeededPrefix')}
              <button type="button" className="underline" onClick={wizard.openInstallPage}>
                {t('githubConnect.grantIfNeededLink')}
              </button>
              {t('githubConnect.grantIfNeededSuffix')}
            </p>
          ) : (
            <p className="text-xs text-text-muted">{t('githubConnect.grantIfNeededPat')}</p>
          )}
        </>
      ) : null}

      {view.kind === 'grantAccess' ? (
        <>
          <p className="text-sm text-text">
            {t('githubConnect.grantAccess', {
              owner: view.repo.owner,
              name: view.repo.name,
            })}
          </p>
          <div className={groupClass}>
            <Button size={buttonSize} onClick={wizard.openInstallPage}>
              {t('githubConnect.grantAccessButton')}
            </Button>
            {changeRepository(t('githubConnect.changeRepo'))}
          </div>
          <p className="text-xs text-text-muted">{t('githubConnect.onlySelectRepos')}</p>
          <p className="text-xs text-text-muted">{t('githubConnect.waitingAccess')}</p>
        </>
      ) : null}

      {view.kind === 'connecting' ? (
        <p className="text-sm text-text-muted">{t('githubConnect.connecting')}</p>
      ) : null}

      {!wizard.pending && wizard.error !== null ? (
        <>
          <InlineAlert tone="error">{wizard.error}</InlineAlert>
          {view.kind === 'idle' ? changeRepository(t('githubConnect.changeRepo')) : null}
        </>
      ) : null}
    </div>
  )
}
