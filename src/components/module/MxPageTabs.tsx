import { useMemo, useState, type ChangeEvent, type ComponentType, type KeyboardEvent, type ReactNode } from 'react'
import { Eye, Search } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import { InternalMxTemplateTabs } from './InternalMxTemplateSlots'

export interface MxPageTabItem<T extends string> {
  key: T
  label: string
  description?: string
  icon?: ComponentType<{ size?: number; className?: string }>
  readOnly?: boolean
  group?: string
}

export interface MxPageTabsProps<T extends string> {
  items: MxPageTabItem<T>[]
  activeKey: T
  onChange: (key: T) => void
  ariaLabel: string
  searchable?: boolean
  searchPlaceholder?: string
  groupLabels?: Record<string, string>
  className?: string
}

export function MxPageTabs<T extends string>({
  items,
  activeKey,
  onChange,
  ariaLabel,
  searchable = false,
  searchPlaceholder = 'Buscar configuração',
  groupLabels,
  className,
}: MxPageTabsProps<T>): ReactNode {
  const [searchTerm, setSearchTerm] = useState('')
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('pt-BR')
    if (!term) return items
    return items.filter((item) => {
      const searchableText = [groupLabels?.[item.group ?? ''], item.group, item.label, item.description]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      return searchableText.includes(term)
    })
  }, [groupLabels, items, searchTerm])

  const groupedItems = useMemo(() => {
    const groups = new Map<string, MxPageTabItem<T>[]>()
    for (const item of filteredItems) {
      const group = item.group || 'default'
      const current = groups.get(group) || []
      current.push(item)
      groups.set(group, current)
    }
    return [...groups.entries()]
  }, [filteredItems])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? filteredItems.length - 1
        : event.key === 'ArrowRight'
          ? (index + 1) % filteredItems.length
          : (index - 1 + filteredItems.length) % filteredItems.length
    const next = filteredItems[nextIndex]
    if (!next) return
    onChange(next.key)
    document.querySelector<HTMLElement>(`[data-mx-page-tab-key="${next.key}"]`)?.focus()
  }

  let flatIndex = -1
  return (
    <InternalMxTemplateTabs
      data-mx-page-tabs=""
      aria-label={ariaLabel}
      className={cn('rounded-2xl border border-gray-100 bg-white p-4 shadow-sm', className)}
    >
      {searchable ? (
        <label className="relative mb-4 block w-full sm:max-w-sm">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
          />
        </label>
      ) : null}

      {filteredItems.length ? (
        <div className="space-y-4">
          {groupedItems.map(([group, groupItems]: [string, MxPageTabItem<T>[]]) => (
            <section key={group} aria-label={groupLabels?.[group] || undefined} className="space-y-2">
              {group !== 'default' && groupLabels?.[group] ? (
                <Typography variant="caption" className="block px-1 text-xs font-semibold text-gray-500">
                  {groupLabels[group]}
                </Typography>
              ) : null}
              <div role="tablist" aria-label={groupLabels?.[group] || ariaLabel} className="flex min-w-0 gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 no-scrollbar">
                {groupItems.map((item: MxPageTabItem<T>) => {
                  flatIndex += 1
                  const index = flatIndex
                  const Icon = item.icon
                  const selected = item.key === activeKey
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`mx-tab-panel-${item.key}`}
                      tabIndex={selected ? 0 : -1}
                      data-mx-page-tab-key={item.key}
                      data-mx-read-only={item.readOnly ? 'true' : 'false'}
                      onClick={() => onChange(item.key)}
                      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(event, index)}
                      title={item.description}
                      className={cn(
                        'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
                        selected ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-white/70 hover:text-gray-700',
                      )}
                    >
                      {Icon ? <Icon size={15} className="shrink-0" aria-hidden="true" /> : null}
                      <span>{item.label}</span>
                      {item.readOnly ? <Eye size={13} className="shrink-0 text-gray-400" aria-label="Somente consulta" /> : null}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
          <Typography variant="p" className="text-sm text-gray-500">Nenhuma opção encontrada para a busca.</Typography>
        </div>
      )}
    </InternalMxTemplateTabs>
  )
}
