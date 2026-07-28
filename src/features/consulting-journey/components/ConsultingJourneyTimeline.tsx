import type { ConsultingJourneyVisit } from '../consultingJourney.types'

const statusLabel: Record<string, string> = {
  agendada: 'Agendada', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
}

export function ConsultingJourneyTimeline({ visits, nextVisitNumber, onOpen }: {
  visits: ConsultingJourneyVisit[]
  nextVisitNumber: number | null
  onOpen(visitId: string): void
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Jornada do programa</h2>
        <p className="text-sm text-muted-foreground">Abra um encontro para acessar Aula, Entrega, Evidências e Progresso.</p>
      </div>
      <div className="space-y-3">
        {visits.map(visit => {
          const isNext = visit.visitNumber === nextVisitNumber
          return (
            <button
              key={visit.id}
              type="button"
              onClick={() => onOpen(visit.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${visit.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : isNext ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {visit.visitNumber}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-foreground">Encontro {visit.visitNumber}</strong>
                  {isNext ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Próximo passo</span> : null}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">{visit.objective || 'Objetivo disponível ao abrir o encontro'}</span>
              </span>
              <span className="text-xs font-medium text-muted-foreground">{statusLabel[visit.status] || visit.status}</span>
            </button>
          )
        })}
        {!visits.length ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum encontro persistido para esta loja.</p> : null}
      </div>
    </section>
  )
}
