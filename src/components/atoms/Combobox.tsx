import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Command as CommandPrimitive } from 'cmdk'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption<T extends string = string> {
  value: T
  label: string
  /** Termos extras de busca (ex.: código, sinônimos). */
  keywords?: string
  /** Agrupa os itens no dropdown. */
  group?: string
}

export interface ComboboxProps<T extends string = string> {
  label: string
  value: T | undefined
  onValueChange: (value: T) => void
  options: ComboboxOption<T>[]
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  className?: string
}

/**
 * Select pesquisável (combobox) — FASE L 12.004.
 *
 * Aparência única, sem variação por perfil (§8.5): o trigger usa a mesma
 * anatomia do campo (`--mx-input-*`), a lista abre num popover com busca por
 * teclado e seleção por Enter/clique (cmdk). A fiação a11y segue o padrão
 * ARIA combobox: trigger `role="combobox"` + `aria-expanded` + `aria-controls`.
 */
const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      label,
      value,
      onValueChange,
      options,
      placeholder = 'Selecione...',
      searchPlaceholder = 'Buscar...',
      emptyLabel = 'Nenhum resultado encontrado.',
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false)
    const listId = React.useId()
    const selected = options.find((option) => option.value === value)

    const groups = React.useMemo(() => {
      const map = new Map<string, ComboboxOption[]>()
      for (const option of options) {
        const key = option.group ?? ''
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(option)
      }
      return [...map.entries()]
    }, [options])

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={ref}
            type="button"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={listId}
            className={cn(
              'flex h-[var(--mx-input-height)] w-full items-center justify-between rounded-[var(--mx-input-radius)] border-[length:var(--mx-input-border-width)] border-solid border-border bg-surface-default px-3 text-sm font-normal text-text-primary shadow-none outline-none transition',
              'focus-visible:border-primary focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-focus-ring/25',
              'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-disabled',
              'data-[placeholder]:text-text-disabled',
              className,
            )}
            data-placeholder={value === undefined ? '' : undefined}
          >
            <span className="truncate">{selected ? selected.label : placeholder}</span>
            <ChevronsUpDown aria-hidden className="h-4 w-4 shrink-0 text-text-secondary" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className="z-[var(--mx-z-popover)] w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-[var(--mx-input-radius)] border border-border bg-surface-default p-0 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          >
            <CommandPrimitive>
              <div className="flex items-center border-b border-border px-3">
                <Search aria-hidden className="mr-2 h-4 w-4 shrink-0 text-text-secondary" />
                <CommandPrimitive.Input
                  placeholder={searchPlaceholder}
                  className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-text-disabled"
                />
              </div>
              <CommandPrimitive.List id={listId} className="max-h-[320px] overflow-y-auto overflow-x-hidden p-1">
                <CommandPrimitive.Empty className="py-6 text-center text-sm text-text-secondary">
                  {emptyLabel}
                </CommandPrimitive.Empty>
                {groups.map(([group, items]) => (
                  <CommandPrimitive.Group
                    key={group || '__root'}
                    heading={group || undefined}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-secondary"
                  >
                    {items.map((option) => (
                      <CommandPrimitive.Item
                        key={option.value}
                        value={`${option.label} ${option.keywords ?? ''}`}
                        onSelect={() => {
                          onValueChange(option.value)
                          setOpen(false)
                        }}
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-primary-subtle data-[selected=true]:text-text-primary data-[disabled=true]:opacity-50"
                      >
                        <span className="flex-1 truncate">{option.label}</span>
                        <Check
                          aria-hidden
                          className={cn('h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')}
                        />
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                ))}
              </CommandPrimitive.List>
            </CommandPrimitive>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  },
)
Combobox.displayName = 'Combobox'

export { Combobox }
