import { Search } from 'lucide-react'
import { Input } from '@/components/atoms/Input'
import { cn } from '@/lib/utils'

type Props = {
  searchTerm: string
  onSearchChange: (value: string) => void
  lojas: string[]
  filterStore: string
  onFilterStoreChange: (value: string) => void
  hideStoreNames: boolean
  getHiddenStoreName: (storeName?: string) => string
}

/**
 * Barra de busca + filtro de loja (chips) do GlobalRanking. Visual preservado.
 */
export function GlobalFiltersBar({
  searchTerm, onSearchChange,
  lojas, filterStore, onFilterStoreChange,
  hideStoreNames, getHiddenStoreName,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-mx-sm shrink-0 mb-6">
      <label className="relative group flex-1" htmlFor="ranking-global-search">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-600 transition-colors"
        />
        <Input
          id="ranking-global-search"
          name="ranking-global-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          aria-label="Localizar vendedor ou loja"
          placeholder="LOCALIZAR VENDEDOR OU LOJA..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="!pl-11 !h-mx-14 !text-mx-tiny uppercase tracking-widest font-bold"
        />
      </label>
      <div className="flex items-center gap-mx-xs bg-white border border-border px-4 h-mx-14 sm:h-mx-14 rounded-xl shadow-none overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onFilterStoreChange('all')}
          className={cn(
            "px-3 py-1 rounded-lg text-mx-tiny font-bold uppercase tracking-widest whitespace-nowrap transition-colors",
            filterStore === 'all' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:bg-gray-50'
          )}
        >Todas</button>
        {lojas.map(store => (
          <button
            key={store}
            type="button"
            onClick={() => onFilterStoreChange(store === filterStore ? 'all' : (store || 'all'))}
            className={cn(
              "px-3 py-1 rounded-lg text-mx-tiny font-bold uppercase tracking-widest whitespace-nowrap transition-colors",
              filterStore === store ? 'bg-emerald-600 text-mx-black' : 'text-muted-foreground hover:bg-gray-50'
            )}
          >{hideStoreNames ? getHiddenStoreName(store) : store}</button>
        ))}
      </div>
    </div>
  )
}

export default GlobalFiltersBar
