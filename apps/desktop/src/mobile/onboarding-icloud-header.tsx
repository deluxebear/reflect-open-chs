import { type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { Cloud } from 'lucide-react'

interface OnboardingIcloudHeaderProps {
  description: string
}

export function OnboardingIcloudHeader({
  description,
}: OnboardingIcloudHeaderProps): ReactElement {
  const { t } = useTranslation('mobile')
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Cloud aria-hidden className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{t('onboarding.icloudSyncTitle')}</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {t('onboarding.recommended')}
          </span>
        </div>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
    </div>
  )
}
