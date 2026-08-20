import { AlertTriangle, CheckCircle2, Inbox, Plus, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EstadoVazio({
  filtered,
  filterLabel,
  pendingCount = 0,
  onOpenPending,
  onClearFilter,
  onOpenRoutine,
  onCreate,
}: {
  filtered: boolean
  filterLabel?: string
  pendingCount?: number
  onOpenPending?: () => void
  onClearFilter: () => void
  onOpenRoutine: () => void
  onCreate: () => void
}) {
  if (filtered) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-text-disabled" aria-hidden="true" />
        <p className="text-body-sm text-muted-foreground">
          Nenhuma oportunidade do tipo <strong>{filterLabel}</strong> para hoje.
        </p>
        <button type="button" onClick={onClearFilter} className="mt-2 text-[12px] font-bold text-status-info-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info/40">
          Ver todas
        </button>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="rounded-2xl border border-status-warning/30 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-warning-surface">
          <AlertTriangle className="h-7 w-7 text-status-warning-text" aria-hidden="true" />
        </div>
        <p className="mb-1 text-[16px] font-bold text-foreground">Tudo em dia para hoje — com pendências anteriores</p>
        <p className="mx-auto mb-5 max-w-md text-body-sm text-muted-foreground">
          Você não possui novas oportunidades agendadas para hoje, mas tem <strong className="text-status-warning-text font-bold">{pendingCount} pendência{pendingCount > 1 ? 's' : ''}</strong> de dias anteriores aguardando resolução.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onOpenPending && (
            <button
              type="button"
              onClick={onOpenPending}
              className="flex items-center gap-1.5 rounded-xl bg-status-warning px-5 py-2.5 text-body-sm font-bold text-white shadow-xs transition-colors hover:bg-status-warning/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-warning/40"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Resolver {pendingCount} pendência{pendingCount > 1 ? 's' : ''}
            </button>
          )}
          <Link to="/carteira-clientes" className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-body-sm font-bold text-muted-foreground transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">
            <Users className="h-4 w-4" aria-hidden="true" /> Abrir Carteira
          </Link>
          <button type="button" onClick={onCreate} className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-body-sm font-bold text-foreground transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">
            <Plus className="h-4 w-4" aria-hidden="true" /> Nova atividade
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm sm:p-14">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-info-surface">
        <CheckCircle2 className="h-7 w-7 text-status-info-text" aria-hidden="true" />
      </div>
      <p className="mb-1 text-[16px] font-bold text-foreground">Tela limpa por hoje.</p>
      <p className="mx-auto mb-5 max-w-sm text-body-sm text-muted-foreground">
        Você não possui oportunidades pendentes para executar agora.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onOpenRoutine} className="flex items-center gap-1.5 rounded-xl border border-status-info px-4 py-2 text-body-sm font-bold text-status-info-text transition-colors hover:bg-status-info-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info/40">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Ver Rotina do Dia
        </button>
        <Link to="/carteira-clientes" className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-body-sm font-bold text-muted-foreground transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">
          <Users className="h-4 w-4" aria-hidden="true" /> Abrir Carteira
        </Link>
        <button type="button" onClick={onCreate} className="flex items-center gap-1.5 rounded-xl bg-status-info px-4 py-2 text-body-sm font-bold text-white transition-colors hover:bg-status-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info/40">
          <Plus className="h-4 w-4" aria-hidden="true" /> Nova atividade
        </button>
      </div>
    </div>
  )
}
