import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface AgendaSearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  placeholder?: string
}

export function AgendaSearchBar({ searchQuery, onSearchChange, placeholder = 'Buscar cliente, consultor ou evento...' }: AgendaSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search input when pressing '/' key outside inputs/textareas
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative flex items-center flex-1 max-w-md min-w-[200px]">
      <Search size={16} className="absolute left-3 text-gray-500 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar agendamentos"
        className="w-full h-9 pl-9 pr-14 text-xs bg-gray-50/60 hover:bg-gray-50 border border-gray-200 focus:border-brand-primary focus:bg-white focus:outline-none rounded-xl text-gray-800 placeholder:text-gray-500 transition-all"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="absolute right-2 text-gray-500 hover:text-gray-800 p-1 rounded-xl"
          aria-label="Limpar busca"
        >
          <X size={14} />
        </button>
      ) : (
        <kbd className="absolute right-2.5 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-caption font-mono font-medium text-gray-500 bg-white border border-gray-200 rounded shadow-2xs pointer-events-none">
          /
        </kbd>
      )}
    </div>
  )
}
