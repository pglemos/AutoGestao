import { RefreshCw } from 'lucide-react'
import { RANKING_PERIODOS, type RankingPeriodo } from '@/features/ranking/periodos'

/**
 * Controles compartilhados da rota `/classificacao`.
 *
 * A mesma rota renderiza três views (vendedor/dono, gerente, MX interno) e cada
 * uma tinha escrito o seu próprio seletor de período, o seu próprio filtro de
 * unidade e o seu próprio botão de atualizar — com geometrias diferentes, duas
 * delas abaixo do alvo de toque de 44px. Um único conjunto aqui.
 */

export function RankingPeriodTabs({ value, onChange }: { value: RankingPeriodo; onChange: (periodo: RankingPeriodo) => void }) {
  return (
    <div role="group" aria-label="Período do ranking" className="flex flex-wrap items-center gap-1 rounded-xl bg-muted p-1">
      {RANKING_PERIODOS.map(periodo => (
        <button
          key={periodo}
          type="button"
          aria-pressed={value === periodo}
          onClick={() => onChange(periodo)}
          className={`min-h-11 rounded-lg px-4 text-body-sm font-semibold transition-all ${
            value === periodo
              ? 'border border-brand-primary/30 bg-white text-brand-primary-hover shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {periodo}
        </button>
      ))}
    </div>
  )
}

export function RankingUnitSelect({ id, value, unidades, onChange }: { id: string; value: string; unidades: string[]; onChange: (unidade: string) => void }) {
  if (unidades.length < 2) return null
  return (
    <label className="flex items-center gap-2 text-body-sm font-semibold text-muted-foreground" htmlFor={id}>
      <span className="sr-only sm:not-sr-only">Unidade</span>
      <select
        id={id}
        name="unidade"
        aria-label="Filtrar por unidade"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-border bg-white px-3 text-body-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
      >
        <option value="todas">Todas as unidades</option>
        {unidades.map(unidade => <option key={unidade} value={unidade}>{unidade}</option>)}
      </select>
    </label>
  )
}

export function RankingRefreshButton({ onRefresh, isRefetching }: { onRefresh: () => void; isRefetching: boolean }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefetching}
      aria-label="Atualizar ranking"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
    >
      <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} aria-hidden="true" />
    </button>
  )
}

export function RankingErrorNotice({ message, onRetry, isRetrying }: { message: string; onRetry: () => void; isRetrying: boolean }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error/30 bg-status-error-surface px-4 py-2 text-body-sm font-bold text-status-error-text">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-status-error/40 bg-white px-4 text-body-sm font-bold text-status-error-text transition-colors hover:bg-status-error-surface disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error/40"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  )
}
