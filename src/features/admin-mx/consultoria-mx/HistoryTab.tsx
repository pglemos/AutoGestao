import { useEffect, useState } from 'react'
import { History as HistoryIcon, Search } from 'lucide-react'
import { MxEmptyState, MxInput, MxLoadingState, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { fetchAuditLogs, type AuditEntry } from './consultoriaMxData'

function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function HistoryTab() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    void (async () => {
      const result = await fetchAuditLogs()
      setLogs(result.rows)
      setError(result.error)
      setLoading(false)
    })()
  }, [])

  const filtered = logs.filter(log => {
    if ((log.origin ?? '').toLowerCase() === 'admin-mx') return false
    if (!search) return true
    const term = search.toLowerCase()
    return (log.action ?? '').toLowerCase().includes(term)
      || (log.value_after ?? '').toLowerCase().includes(term)
      || (log.user_name ?? '').toLowerCase().includes(term)
  })

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar no histórico..." aria-label="Buscar no histórico" />
      </div>

      {loading ? <MxLoadingState label="Carregando histórico" /> : error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : filtered.length === 0 ? (
        <MxEmptyState title="Nenhum registro encontrado" description="As alterações de metodologia aparecerão aqui." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="divide-y divide-border-subtle">
            {filtered.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt">
                  <HistoryIcon size={14} className="text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{log.action?.replace(/_/g, ' ') || '—'}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{log.user_name || '—'}</span>
                    {log.user_role && <span className="text-xs text-muted-foreground">({log.user_role.replace(/_/g, ' ')})</span>}
                  </div>
                  {log.value_after && <p className="mt-0.5 truncate text-xs text-muted-foreground">{log.value_after}</p>}
                  <div className="mt-0.5 text-xs text-muted-foreground">{log.origin || 'Consultoria MX'} · {formatDateTime(log.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
