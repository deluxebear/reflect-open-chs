import { useMemo, useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  aiProvider,
  errorMessage,
  hasBridge,
  listNotes,
  type AiProviderConfig,
  type EditorTextSize,
  type LocalePreference,
  type ThemePreference,
} from '@reflect/core'
import { useAiProviders } from '@/hooks/use-ai-providers'
import { useAppVersion } from '@/hooks/use-app-version'
import { marketingVersion } from '@/lib/marketing-version'
import { INDEX_QUERY_SCOPE } from '@/lib/query-client'
import { AddAiProviderDrawer } from '@/mobile/add-ai-provider-drawer'
import { AiProviderActionsDrawer } from '@/mobile/ai-provider-actions-drawer'
import { ConnectGithubDrawer } from '@/mobile/connect-github-drawer'
import { MobileScreenHeader } from '@/mobile/screen-header'
import {
  SettingsActionRow,
  SettingsGroup,
  SettingsNavRow,
  SettingsSegmentedRow,
  SettingsSwitchRow,
  SettingsValueRow,
  type SegmentedOption,
} from '@/mobile/settings-list'
import { useMobileSyncStatus } from '@/mobile/use-sync-status'
import { useGraph } from '@/providers/graph-provider'
import { useSettings } from '@/providers/settings-provider'
import { useSyncContext } from '@/providers/sync-provider'
import { useRouter } from '@/routing/router'

/**
 * The mobile Settings screen — a pushed card (route kind `settings`) in the
 * iOS inset-grouped idiom, replacing the old bottom-sheet hodgepodge. The
 * graph row discloses into the Graphs switcher screen; appearance and editor
 * preferences edit the shared settings document (the same keys desktop
 * exposes); the backup group mirrors the status pill's engine state, connects
 * GitHub for the local graph (the {@link ConnectGithubDrawer} sheet — iCloud
 * graphs sync through the container instead, Plan 21), and can disconnect.
 */
export function MobileSettings(): ReactElement {
  const { t } = useTranslation('mobile')
  const { t: ts } = useTranslation('settings')
  const { back, canBack, navigate } = useRouter()
  const { graph, mobileStorageKind } = useGraph()
  const { settings, updateSettings } = useSettings()
  const version = useAppVersion()
  const sync = useSyncContext()
  // Shared with the status pill (one hook, one query cache entry) — and null
  // until the conflict count is known, so the row never claims `Backed up`
  // over conflict markers already on disk and then flips.
  const status = useMobileSyncStatus()
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const { providers, defaultProvider, addProvider, removeProvider, makeDefault } = useAiProviders()
  const [addProviderOpen, setAddProviderOpen] = useState(false)
  // The managed provider sticks around after close so the exit animation has
  // content; `manageOpen` alone drives visibility (the edit-sheet pattern).
  const [managedProvider, setManagedProvider] = useState<AiProviderConfig | null>(null)
  const [manageOpen, setManageOpen] = useState(false)

  const themeOptions = useMemo(
    (): readonly SegmentedOption<ThemePreference>[] => [
      { value: 'system', label: t('settings.themeSystem') },
      { value: 'light', label: t('settings.themeLight') },
      { value: 'dark', label: t('settings.themeDark') },
    ],
    [t],
  )

  const textSizeOptions = useMemo(
    (): readonly SegmentedOption<EditorTextSize>[] => [
      { value: 'small', label: t('settings.sizeSmall') },
      { value: 'medium', label: t('settings.sizeMedium') },
      { value: 'large', label: t('settings.sizeLarge') },
    ],
    [t],
  )

  const localeOptions = useMemo(
    (): readonly SegmentedOption<LocalePreference>[] => [
      { value: 'system', label: ts('appearance.locale.system') },
      { value: 'en', label: ts('appearance.locale.en') },
      { value: 'zh-CN', label: ts('appearance.locale.zh-CN') },
    ],
    [ts],
  )

  const { data: notes } = useQuery({
    queryKey: [INDEX_QUERY_SCOPE, graph?.root, 'mobile-note-count'],
    queryFn: () => listNotes(),
    enabled: hasBridge() && graph !== null,
  })

  const backup = sync?.backup ?? null
  const repo = backup !== null && backup.phase === 'connected' ? backup.repo : null
  // The connect entry point is local-graph-only (iCloud sync and a Git remote
  // are mutually exclusive per graph, Plan 21) and waits out the controller's
  // `loading` phase so the row never flashes on a graph that turns out to be
  // connected.
  const canConnect = mobileStorageKind === 'local' && backup?.phase === 'disconnected'

  // Stop backing this graph up and forget the GitHub credential (one graph
  // per device — unlinking is signing out). The local clone stays; the
  // controller restarts into its disconnected state, and re-connecting
  // re-onboards.
  async function disconnect(): Promise<void> {
    if (sync === null) {
      return
    }
    setDisconnecting(true)
    try {
      await sync.disconnectGraph()
      await sync.signOut()
    } catch (err) {
      console.error('GitHub disconnect failed:', errorMessage(err))
    } finally {
      setDisconnecting(false)
    }
  }

  const storageLabel =
    mobileStorageKind === 'icloud'
      ? t('settings.icloudDrive')
      : mobileStorageKind === 'local'
        ? t('settings.thisDevice')
        : undefined

  return (
    <div
      className="flex h-full w-screen flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <MobileScreenHeader
        title={t('settings.title')}
        onBack={() => (canBack ? back() : navigate({ kind: 'today' }))}
      />
      <main
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex flex-col gap-6 px-4 py-4">
          <SettingsGroup header={t('settings.graph')}>
            <SettingsNavRow
              label={graph?.name ?? '—'}
              value={storageLabel}
              onPress={() => navigate({ kind: 'graphs' })}
            />
          </SettingsGroup>

          <SettingsGroup header={t('settings.appearance')}>
            <SettingsSegmentedRow
              label={t('settings.theme')}
              value={settings.theme}
              options={themeOptions}
              onChange={(theme) => updateSettings({ theme })}
            />
            <SettingsSegmentedRow
              label={t('settings.textSize')}
              value={settings.editorTextSize}
              options={textSizeOptions}
              onChange={(editorTextSize) => updateSettings({ editorTextSize })}
            />
            <SettingsSegmentedRow
              label={t('settings.language')}
              value={settings.locale}
              options={localeOptions}
              onChange={(locale) => updateSettings({ locale })}
            />
          </SettingsGroup>

          <SettingsGroup header={t('settings.editor')}>
            <SettingsSwitchRow
              label={t('settings.startWithBullet')}
              checked={settings.editorDefaultBullet}
              onCheckedChange={(editorDefaultBullet) => updateSettings({ editorDefaultBullet })}
            />
            <SettingsSwitchRow
              label={t('settings.bulletAfterHeading')}
              checked={settings.editorBulletAfterHeading}
              onCheckedChange={(editorBulletAfterHeading) =>
                updateSettings({ editorBulletAfterHeading })
              }
            />
          </SettingsGroup>

          <SettingsGroup header={t('settings.ai')} footer={t('settings.aiFooter')}>
            {providers.map((provider) => (
              <SettingsNavRow
                key={provider.id}
                label={aiProvider(provider.provider).label}
                value={`·····${provider.keyHint}${provider.id === defaultProvider?.id ? t('settings.defaultSuffix') : ''}`}
                onPress={() => {
                  setManagedProvider(provider)
                  setManageOpen(true)
                }}
              />
            ))}
            <SettingsActionRow
              label={t('settings.addAiProvider')}
              onPress={() => setAddProviderOpen(true)}
            />
          </SettingsGroup>

          {repo !== null || status !== null || canConnect ? (
            <SettingsGroup
              header={t('settings.backup')}
              footer={
                canConnect ? t('settings.backupFooterConnect') : (status?.detail ?? null)
              }
            >
              {repo !== null ? (
                <SettingsValueRow
                  label={t('settings.github')}
                  value={`${repo.owner}/${repo.name}`}
                />
              ) : null}
              {status !== null ? (
                <SettingsValueRow label={t('settings.status')} value={status.label} />
              ) : null}
              {canConnect ? (
                <SettingsActionRow
                  label={t('settings.connectGithub')}
                  onPress={() => setConnectOpen(true)}
                />
              ) : null}
              {repo !== null ? (
                <SettingsActionRow
                  label={t('settings.disconnectGithub')}
                  tone="destructive"
                  pending={disconnecting}
                  onPress={() => void disconnect()}
                />
              ) : null}
            </SettingsGroup>
          ) : null}

          <SettingsGroup header={t('settings.about')}>
            <SettingsValueRow
              label={t('settings.notes')}
              value={notes === undefined ? '…' : String(notes.length)}
            />
            <SettingsValueRow
              label={t('settings.version')}
              value={version === null ? '…' : marketingVersion(version)}
            />
          </SettingsGroup>
        </div>
      </main>
      <ConnectGithubDrawer open={connectOpen} onOpenChange={setConnectOpen} />
      <AddAiProviderDrawer
        open={addProviderOpen}
        onOpenChange={setAddProviderOpen}
        onAdd={addProvider}
      />
      <AiProviderActionsDrawer
        provider={managedProvider}
        isDefault={managedProvider !== null && managedProvider.id === defaultProvider?.id}
        open={manageOpen}
        onOpenChange={setManageOpen}
        onMakeDefault={makeDefault}
        onRemove={removeProvider}
      />
    </div>
  )
}
