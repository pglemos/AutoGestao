import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react'
import type { DeterministicAction } from '@/lib/deterministic-actions'

interface DeterministicActionsPanelProps {
  actions: DeterministicAction[]
  loading: boolean
  error: string | null
  resolveAction: (action: DeterministicAction) => Promise<{ error: string | null }>
  refresh?: () => Promise<void>
  title?: string
  maxItems?: number
  compact?: boolean
}

const priorityCopy = {
  critical: { label: 'Crítica', badge: 'bg-status-error-surface text-status-error-text', border: 'border-status-error/30' },
  high: { label: 'Alta', badge: 'bg-status-warning-surface text-status-warning-text', border: 'border-status-warning/30' },
  medium: { label: 'Média', badge: 'bg-status-info-surface text-status-info-text', border: 'border-status-info/30' },
  low: { label: 'Baixa', badge: 'bg-muted text-muted-foreground', border: 'border-border' },
} as const

function formatDueDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

function evidenceSummary(action: DeterministicAction): string | null {
  const entries = Object.entries(action.evidence)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 3)
    .map(([, value]) => {
      if (typeof value === 'number') return new Intl.NumberFormat('pt-BR').format(value)
      if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
      if (typeof value === 'object') return 'Dados de origem preservados'
      return String(value)
    })

  return entries.length ? entries.join(' · ') : null
}

export default function DeterministicActionsPanel({
  actions,
  loading,
  error,
  resolveAction,
  refresh,
  title = 'Ações recomendadas',
  maxItems,
  compact = false,
}: DeterministicActionsPanelProps) {
  const navigate = useNavigate()
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const visibleActions = useMemo(
    () => typeof maxItems === 'number' ? actions.slice(0, maxItems) : actions,
    [actions, maxItems],
  )

  const handleResolve = async (action: DeterministicAction) => {
    const confirmed = window.confirm(
      `Marcar “${action.title}” como tratada? A origem será verificada novamente e a ação poderá reaparecer se a pendência continuar.`,
    )
    if (!confirmed) return

    setResolvingId(action.id)
    setLocalError(null)
    const result = await resolveAction(action)
    if (result.error) setLocalError(result.error)
    setResolvingId(null)
  }

  const wrapperClass = compact
    ? 'flex h-full flex-col rounded-2xl border border-border-subtle bg-white p-5 shadow-sm'
    : 'rounded-2xl border border-border-subtle bg-white p-5 shadow-sm'

  return (
    <section className={wrapperClass} aria-labelledby="deterministic-actions-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-status-warning-surface text-status-warning-text">
            <AlertTriangle size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 id="deterministic-actions-title" className="text-sm font-bold text-foreground">{title}</h2>
            {!compact && <p className="mt-0.5 text-xs text-muted-foreground">Regras oficiais aplicadas aos dados atuais da operação.</p>}
          </div>
        </div>
        {refresh && (
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Atualizar ações recomendadas"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-alt hover:text-muted-foreground disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div aria-live="polite" className={compact ? 'flex flex-1 flex-col' : ''}>
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-6 text-sm text-muted-foreground">
            <RefreshCw size={16} className="mr-2 animate-spin" /> Avaliando dados oficiais...
          </div>
        ) : error || localError ? (
          <div role="alert" className="rounded-xl border border-status-error/20 bg-status-error-surface p-3 text-sm text-status-error-text">
            Não foi possível atualizar as ações: {localError || error}
          </div>
        ) : visibleActions.length === 0 ? (
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-status-success/20 bg-status-success-surface p-4 text-sm text-status-success-text">
            <CheckCircle2 size={18} className="shrink-0" /> Nenhuma pendência determinística no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleActions.map((action) => {
              const priority = priorityCopy[action.priority]
              const dueDate = formatDueDate(action.dueAt)
              const evidence = evidenceSummary(action)
              const resolving = resolvingId === action.id
              const requiresSourceRegularization = action.scenarioCode === 'AUTOMATIC_TASK_ORIGIN_PENDING'

              return (
                <article key={action.id} className={`rounded-xl border p-4 ${priority.border} bg-white`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 text-sm font-semibold text-foreground">{action.title}</h3>
                    <span className={`rounded-full px-2 py-1 text-caption font-bold uppercase tracking-wide ${priority.badge}`}>
                      {priority.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{action.explanation}</p>
                  {(dueDate || evidence) && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {dueDate && <p>Prazo de atenção: {dueDate}</p>}
                      {evidence && <p className="truncate" title={evidence}>Evidências: {evidence}</p>}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {action.actionUrl && (
                      <button
                        type="button"
                        onClick={() => navigate(action.actionUrl!)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-status-success/30"
                      >
                        Abrir ação <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    )}
                    {requiresSourceRegularization ? (
                      <span className="inline-flex min-h-9 items-center rounded-lg border border-status-warning/30 bg-status-warning-surface px-3 py-2 text-xs font-semibold text-status-warning-text">
                        Regularize a origem para concluir
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleResolve(action)}
                        disabled={resolving}
                        className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-border-subtle disabled:opacity-50"
                      >
                        {resolving ? 'Registrando...' : 'Marcar como tratada'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {maxItems && actions.length > maxItems && (
        <p className="mt-3 text-xs text-muted-foreground">Mais {actions.length - maxItems} ação(ões) disponível(is) nas áreas operacionais.</p>
      )}
    </section>
  )
}
