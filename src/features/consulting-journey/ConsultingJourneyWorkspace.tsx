import { useConsultingJourney } from './useConsultingJourney'
import { ConsultingJourneyTimeline } from './components/ConsultingJourneyTimeline'
import { ConsultingMeetingDialog } from './components/ConsultingMeetingDialog'

function formatDate(value: string | null): string {
  if (!value) return 'A agendar'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function ConsultingJourneyWorkspace() {
  const controller = useConsultingJourney()
  const snapshot = controller.snapshot
  const nextVisit = snapshot?.visits.find(visit => visit.visitNumber === snapshot.nextVisitNumber) || null

  if (controller.loading) return <div className="space-y-4" aria-busy="true"><div className="h-20 animate-pulse rounded-xl bg-muted" /><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>
  if (controller.error) return <section className="rounded-xl border border-destructive/30 bg-card p-5" role="alert"><h2 className="font-semibold text-foreground">Não foi possível carregar a Consultoria</h2><p className="mt-2 text-sm text-muted-foreground">{controller.error}</p><button type="button" onClick={() => void controller.reload()} className="mt-4 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Tentar novamente</button></section>
  if (!snapshot) return <section className="rounded-xl border border-dashed border-border bg-card p-6"><h2 className="font-semibold text-foreground">Nenhum programa vinculado</h2><p className="mt-2 text-sm text-muted-foreground">A loja selecionada ainda não possui uma jornada ativa persistida.</p></section>

  return (
    <div className="space-y-5 pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Programa contratado</p><h1 className="mt-1 text-2xl font-bold text-foreground">{snapshot.programName}</h1><p className="mt-1 text-sm text-muted-foreground">{snapshot.visitsCompleted} de {snapshot.totalVisits} encontros concluídos.</p><p className="mt-2 max-w-2xl text-sm text-muted-foreground"><strong>{snapshot.programRules.label}:</strong> {snapshot.programRules.description}</p></div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${controller.realtimeStatus === 'connected' ? 'bg-status-success-surface text-status-success-text' : 'bg-status-warning-surface text-status-warning-text'}`}>{controller.realtimeStatus === 'connected' ? 'Atualização em tempo real' : 'Reconectando dados'}</span>
      </header>
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Próximo passo</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-semibold text-foreground">{snapshot.nextStep}</h2><p className="mt-1 text-sm text-muted-foreground">{nextVisit ? `Encontro ${nextVisit.visitNumber} · ${formatDate(nextVisit.scheduledAt)}` : 'Nenhum encontro agendado'}</p></div>
          {nextVisit ? <button type="button" onClick={() => controller.openVisit(nextVisit.id)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Comece por aqui</button> : null}
        </div>
      </section>
      {snapshot.confidentialityLevel === 'restricted' ? <div className="rounded-xl border border-border-strong bg-surface-alt p-4 text-sm text-foreground"><strong>Confidencialidade PPA:</strong> conteúdo estratégico restrito e auditável.</div> : null}
      {!snapshot.canViewStrategicContent ? <div className="rounded-xl border border-status-warning/30 bg-status-warning-surface p-4 text-sm text-status-warning-text">Conteúdo estratégico do PPA restrito ao Dono, sócios autorizados e perfis internos MX.</div> : null}
      <ConsultingJourneyTimeline visits={snapshot.visits} nextVisitNumber={snapshot.nextVisitNumber} onOpen={controller.openVisit} />
      <ConsultingMeetingDialog controller={controller} />
    </div>
  )
}
