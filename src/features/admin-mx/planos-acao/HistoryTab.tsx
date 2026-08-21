import { useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { MxEmptyState, MxErrorState, MxInput, MxLoadingState, MxSectionCard } from '@/components/module/MxModuleVisualPrimitives'
import { fetchTemplateHistory, type TemplateHistoryEvent } from './templateHistory'

function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

/** Histórico de operações na biblioteca de templates — criação, publicação, arquivamento, aplicações e sugestões. */
export function HistoryTab() {
  const [events, setEvents] = useState<TemplateHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    void fetchTemplateHistory().then(result => {
      setEvents(result.rows)
      setError(result.error)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return events
    return events.filter(event => [event.label, event.detail].some(value => (value ?? '').toLowerCase().includes(term)))
  }, [events, search])

  if (loading) return <MxLoadingState label="Carregando histórico" />
  if (error) return <MxErrorState description={error} />

  return (
    <MxSectionCard>
      <div className="space-y-4 p-5">
        <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar no histórico" aria-label="Buscar no histórico" />
        {filtered.length ? (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {filtered.map(event => (
              <div key={event.id} className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt">
                  <History size={12} className="text-text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-primary">{event.label}</div>
                  {event.detail ? <div className="mt-0.5 truncate text-xs text-text-secondary">{event.detail}</div> : null}
                </div>
                <div className="shrink-0 text-xs text-text-disabled">{formatDateTime(event.at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <MxEmptyState icon={History} title="Nenhum registro encontrado" description="As operações com templates aparecerão aqui." />
        )}
      </div>
    </MxSectionCard>
  )
}
