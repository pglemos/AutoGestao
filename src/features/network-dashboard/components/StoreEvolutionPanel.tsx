import type { NetworkCockpitStore, TraceableMetric } from '../types'

function Metric({ label, metric }: { label: string; metric: TraceableMetric }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{metric.percentage == null ? '—' : `${Math.round(metric.percentage)}%`}</p>
      <p className="mt-1 text-xs text-muted-foreground">{metric.value ?? '—'} de {metric.universe ?? '—'} · {metric.source}</p>
    </div>
  )
}

export function StoreEvolutionPanel({ store }: { store: NetworkCockpitStore }) {
  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Plano Estratégico" metric={store.strategicProgress} />
        <Metric label="Consultoria" metric={store.consultingProgress} />
        <Metric label="Entrega consultiva" metric={store.consultingDeliveryProgress} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Ações atrasadas</p><p className="mt-1 text-xl font-bold">{store.overdueActions}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Ações bloqueadas</p><p className="mt-1 text-xl font-bold">{store.blockedActions}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Evidências pendentes</p><p className="mt-1 text-xl font-bold">{store.consultingEvidencePending}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Participantes pendentes</p><p className="mt-1 text-xl font-bold">{store.consultingParticipantsPending}</p></div>
      </div>
      {store.riskReasons.length ? (
        <div className="mt-3 rounded-xl border border-status-warning/30 bg-status-warning-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-warning-text">Motivos de atenção</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-status-warning-text">{store.riskReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        </div>
      ) : null}
    </section>
  )
}
