import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type IndicatorPickerItem = {
  code: string
  label: string
  unit: string
  direction: string
}

export function formatIndicatorPickerMeta(item: Pick<IndicatorPickerItem, 'unit' | 'direction'>) {
  return [item.unit, item.direction].filter(Boolean).join(' · ')
}

export function filterIndicatorPickerOptions(options: IndicatorPickerItem[], search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return options
  return options.filter(item =>
    item.label.toLowerCase().includes(query) ||
    item.code.toLowerCase().includes(query) ||
    formatIndicatorPickerMeta(item).toLowerCase().includes(query),
  )
}

/**
 * Dropdown pesquisável do Base44 (`TemplateFilters` / wizard):
 * nome oficial + `unidade · direção` (ex.: Número inteiro · AUMENTAR).
 */
export function IndicatorPicker(props: {
  id?: string
  name?: string
  'aria-label': string
  value: string
  options: IndicatorPickerItem[]
  disabled?: boolean
  placeholder: string
  allowClear?: boolean
  clearLabel?: string
  onChange: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = props.options.find(item => item.code === props.value)
  const filtered = useMemo(() => filterIndicatorPickerOptions(props.options, search), [props.options, search])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <div ref={rootRef} className="relative" style={{ minWidth: 200 }}>
      <button
        id={props.id}
        name={props.name}
        type="button"
        disabled={props.disabled}
        aria-label={props['aria-label']}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => { if (!props.disabled) setOpen(current => !current) }}
        className={cn(
          'w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm outline-none',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30',
          props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        {selected ? selected.label : props.placeholder}
      </button>
      {open && !props.disabled ? (
        <div
          role="listbox"
          aria-label={props['aria-label']}
          className="absolute left-0 right-0 z-[var(--mx-z-popover)] mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-background shadow-lg"
        >
          <div className="border-b border-border p-2">
            <input
              type="text"
              placeholder="Buscar indicador..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              autoFocus
            />
          </div>
          {props.allowClear ? (
            <button
              type="button"
              onClick={() => { props.onChange(''); setOpen(false) }}
              className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {props.clearLabel ?? 'Todos os indicadores'}
            </button>
          ) : null}
          {filtered.map(item => (
            <button
              key={item.code}
              type="button"
              onClick={() => { props.onChange(item.code); setOpen(false) }}
              className={cn(
                'w-full border-t border-border px-3 py-2 text-left text-sm hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                item.code === props.value && 'bg-surface-alt',
              )}
            >
              <div className="font-medium text-text-primary">{item.label}</div>
              <div className="text-xs text-text-secondary">{formatIndicatorPickerMeta(item)}</div>
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-text-secondary">Nenhum indicador encontrado</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
