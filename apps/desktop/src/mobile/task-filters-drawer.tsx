import { type ReactElement } from 'react'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import type { TaskFilters } from '@/lib/tasks/task-filters'
import { cn } from '@/lib/utils'
import { hapticImpactLight } from '@/mobile/haptics'

interface TaskFiltersDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: TaskFilters
  toggle: (key: keyof TaskFilters) => void
}

const BUCKET_KEYS: ReadonlyArray<keyof TaskFilters> = [
  'pinned',
  'current',
  'overdue',
  'upcoming',
  'other',
]

/**
 * The Tasks tab's filter sheet (V1 mobile's filters modal, desktop's "Task
 * filters" menu as a bottom sheet): the five bucket toggles plus "Show
 * archived", which reveals the whole completed history. Rows toggle without
 * closing, so several filters flip in one visit — the drawer dismisses by
 * drag or tapping outside, like every mobile sheet.
 */
export function TaskFiltersDrawer({
  open,
  onOpenChange,
  filters,
  toggle,
}: TaskFiltersDrawerProps): ReactElement {
  const { t } = useTranslation('tasks')

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent aria-label={t('taskFilters')}>
        <DrawerTitle>{t('taskFilters')}</DrawerTitle>
        <div className="flex flex-col">
          {BUCKET_KEYS.map((key) => (
            <FilterRow
              key={key}
              label={t(`mobileFilters.${key}`)}
              checked={filters[key]}
              onToggle={() => toggle(key)}
            />
          ))}
          <div className="my-1 border-t border-border" />
          <FilterRow
            label={t('mobileFilters.archived')}
            checked={filters.archived}
            onToggle={() => toggle('archived')}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function FilterRow({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}): ReactElement {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => {
        hapticImpactLight()
        onToggle()
      }}
      className="flex h-12 items-center gap-3 text-left text-base"
    >
      <span
        className={cn(
          'flex size-5 items-center justify-center rounded border',
          checked ? 'border-accent bg-accent text-white' : 'border-border',
        )}
      >
        {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
      {label}
    </button>
  )
}
