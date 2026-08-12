import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronRight, Clock, Search, Sparkles, Star, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import {
  MENTOR_FAVORITES_KEY,
  MENTOR_GUIDANCE,
  MENTOR_GUIDANCE_CATEGORY,
  filterMentorGuidance,
  type MentorGuidance,
} from './manager-mentor-guidance'

const CATEGORIES = [
  { key: 'todas', label: 'Todas' },
  { key: 'rotina', label: 'Rotina' },
  { key: 'pessoas', label: 'Pessoas' },
  { key: 'resultado', label: 'Resultado' },
  { key: 'desenvolvimento', label: 'Desenvolvimento' },
  { key: 'favoritos', label: '★ Favoritos' },
] as const

function readFavorites(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(MENTOR_FAVORITES_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function ManagerMentorLibrary() {
  const [category, setCategory] = useState<string>('todas')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MentorGuidance | null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites())
  const dialogRef = useRef<HTMLElement | null>(null)

  useFocusTrap(dialogRef, Boolean(selected))

  useEffect(() => {
    if (!selected) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selected])

  const toggleFavorite = (title: string) => {
    setFavorites(current => {
      const next = current.includes(title) ? current.filter(item => item !== title) : [...current, title]
      try {
        window.localStorage.setItem(MENTOR_FAVORITES_KEY, JSON.stringify(next))
      } catch {
        // Favoritar é conveniência local; storage indisponível não bloqueia a leitura da orientação.
      }
      return next
    })
  }

  const list = useMemo(
    () => filterMentorGuidance(MENTOR_GUIDANCE, { category, search, favorites }),
    [category, search, favorites],
  )
  const featured = MENTOR_GUIDANCE.find(item => item.highlight) || MENTOR_GUIDANCE[0]

  return (
    <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm" aria-labelledby="mentor-library-title">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50">
          <BookOpen className="text-emerald-600" size={20} />
        </span>
        <div className="flex-1">
          <h2 id="mentor-library-title" className="font-semibold text-foreground">Biblioteca de Orientações</h2>
          <p className="text-xs text-muted-foreground">Roteiros práticos para situações do dia a dia da gestão.</p>
        </div>
        <button
          type="button"
          onClick={() => setSelected(featured)}
          className="hidden items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 sm:flex"
        >
          <Sparkles size={13} /> Destaque
        </button>
      </div>

      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          aria-label="Buscar orientação"
          placeholder="Buscar orientação..."
          className="w-full rounded-xl border border-border-subtle bg-gray-50 py-2 pl-9 pr-3 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map(item => (
          <button
            key={item.key}
            type="button"
            aria-pressed={category === item.key}
            onClick={() => setCategory(item.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              category === item.key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-50 text-muted-foreground hover:bg-gray-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {category === 'favoritos'
            ? 'Nenhuma orientação favoritada ainda. Toque na estrela para salvar.'
            : 'Nenhum resultado para a busca.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map(item => {
            const categoryConfig = MENTOR_GUIDANCE_CATEGORY[item.category]
            const isFavorite = favorites.includes(item.title)
            return (
              <article
                key={item.title}
                className={`group rounded-xl border p-4 transition-all ${
                  item.highlight
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-border-subtle bg-gray-50/60 hover:border-emerald-200 hover:bg-emerald-50/40'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-caption font-semibold ${categoryConfig.className}`}>
                    {categoryConfig.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.highlight && <Sparkles size={13} className="text-emerald-500" />}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.title)}
                      aria-pressed={isFavorite}
                      aria-label={isFavorite ? `Remover ${item.title} dos favoritos` : `Adicionar ${item.title} aos favoritos`}
                      className={`rounded p-0.5 transition-colors ${isFavorite ? 'text-amber-400' : 'text-text-disabled hover:text-amber-400'}`}
                    >
                      <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
                <p className="mb-1.5 text-sm font-medium leading-snug text-foreground">{item.title}</p>
                <p className="mb-2 flex items-center gap-1 text-caption text-muted-foreground"><Clock size={11} />{item.duration}</p>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-emerald-600"
                >
                  Ver orientação <ChevronRight size={13} />
                </button>
              </article>
            )
          })}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={() => setSelected(null)}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mentor-guidance-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="absolute right-4 top-4 flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleFavorite(selected.title)}
                aria-pressed={favorites.includes(selected.title)}
                aria-label={favorites.includes(selected.title) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className={`rounded p-1 transition-colors ${favorites.includes(selected.title) ? 'text-amber-400' : 'text-text-disabled hover:text-amber-400'}`}
              >
                <Star size={18} fill={favorites.includes(selected.title) ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fechar orientação"
                className="p-1 text-muted-foreground hover:text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <span className={`mb-3 inline-block rounded-md border px-2 py-0.5 text-caption font-semibold ${MENTOR_GUIDANCE_CATEGORY[selected.category].className}`}>
              {MENTOR_GUIDANCE_CATEGORY[selected.category].label}
            </span>
            <h2 id="mentor-guidance-title" className="pr-10 font-semibold text-foreground">{selected.title}</h2>
            <p className="mb-3 mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={12} /> Tempo estimado: {selected.duration}
            </p>
            <div className="mb-3 h-px bg-gray-100" />
            <p className="text-sm leading-relaxed text-muted-foreground">{selected.content}</p>
          </section>
        </div>
      )}
    </section>
  )
}

export default ManagerMentorLibrary
