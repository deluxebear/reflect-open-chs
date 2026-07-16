import type { ReactElement } from 'react'
import { ListFilter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TaskFilters, TaskFiltersControl } from '@/lib/tasks/task-filters'

const BUCKET_FILTER_KEYS: ReadonlyArray<keyof TaskFilters> = [
  'pinned',
  'current',
  'overdue',
  'upcoming',
  'other',
]

interface TaskFiltersMenuProps extends TaskFiltersControl {
  /** Controlled open state, so ⌘⇧E can toggle the menu (V1). */
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The Tasks view's "Task filters" dropdown (V1): per-bucket toggles plus
 * "Show archived tasks". Toggling keeps the menu open (`preventDefault` on
 * select) so several filters can be flipped at once. Open state is controlled so
 * the ⌘⇧E shortcut can open and close it.
 */
export function TaskFiltersMenu({
  filters,
  toggle,
  open,
  onOpenChange,
}: TaskFiltersMenuProps): ReactElement {
  const { t } = useTranslation('tasks')

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="window-drag-control text-xs font-normal text-text-muted">
          <ListFilter aria-hidden className="size-3.5" />
          {t('taskFilters')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('filtersHeading')}</DropdownMenuLabel>
        {BUCKET_FILTER_KEYS.map((key) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={filters[key]}
            onCheckedChange={() => toggle(key)}
            onSelect={(event) => event.preventDefault()}
          >
            {t(`filters.${key}`)}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.archived}
          onCheckedChange={() => toggle('archived')}
          onSelect={(event) => event.preventDefault()}
        >
          {t('filters.archived')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
