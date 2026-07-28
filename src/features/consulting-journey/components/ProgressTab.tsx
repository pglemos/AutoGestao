import type { ConsultingJourneyController } from '../useConsultingJourney'
import type { ConsultingJourneyVisit } from '../consultingJourney.types'
import { calculateDeliveryProgress, calculateLessonProgress } from '../consultingJourneyRules'

function Step({ label, completed, detail }: { label: string; completed: boolean; detail: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border p-3">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{completed ? '✓' : '•'}</span>
      <span><strong className="block text-sm text-foreground">{label}</strong><span className="text-xs text-muted-foreground">{detail}</span></span>
    </li>
  )
}

export function ProgressTab({ visit, controller }: { visit: ConsultingJourneyVisit; controller: ConsultingJourneyController }) {
  const lesson = calculateLessonProgress({
    playedSeconds: visit.lessonProgress?.playedSeconds || 0,
    durationSeconds: visit.lessonProgress?.durationSeconds || 0,
  })
  const preparationItems = visit.deliveryItems.filter(item => item.itemType !== 'lesson' && item.itemType !== 'evidence')
  const delivery = calculateDeliveryProgress(preparationItems)
  const requiredParticipants = visit.participants.filter(item => item.required)
  const confirmedParticipants = requiredParticipants.filter(item => item.confirmed).length
  const requiredEvidenceItems = visit.deliveryItems.filter(item => item.required && item.itemType === 'evidence')
  const approvedEvidence = visit.evidences.filter(item => item.status === 'approved').length
  const evidenceComplete = requiredEvidenceItems.length === 0 || approvedEvidence >= requiredEvidenceItems.length
  const implementationComplete = visit.deliveryItems.filter(item => item.required && item.itemType !== 'lesson' && item.itemType !== 'evidence').every(item => item.status === 'completed')
  const requestStatus = visit.anticipation?.status || 'não solicitada'
  const actionParams = new URLSearchParams()
  if (controller.snapshot?.storeId) actionParams.set('storeId', controller.snapshot.storeId)
  actionParams.set('createAction', '1')
  actionParams.set('origin', 'consulting')
  actionParams.set('visitId', visit.id)
  actionParams.set('indicator', `Consultoria - Encontro ${visit.visitNumber}`)
  actionParams.set('title', `Implementar entrega do encontro ${visit.visitNumber}`)
  actionParams.set('problemOrOpportunity', 'Entrega ou melhoria definida durante a Consultoria.')
  const actionUrl = `/plano-acao?${actionParams.toString()}`

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-base font-semibold text-foreground">Autonomia assistida</h3>
        <p className="mt-1 text-sm text-muted-foreground">Aprender → Preparar → Implementar → Provar → Solicitar antecipação → Validar com o consultor.</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          <Step label="Aprender" completed={!visit.lesson || lesson.completed} detail={visit.lesson ? `${lesson.percentage}% efetivamente assistido` : 'Sem aula obrigatória'} />
          <Step label="Preparar" completed={delivery.percentage === 100} detail={`${delivery.completedRequired}/${delivery.totalRequired} itens obrigatórios`} />
          <Step label="Implementar" completed={implementationComplete} detail={implementationComplete ? 'Implementação registrada' : 'Há tarefas obrigatórias pendentes'} />
          <Step label="Provar" completed={evidenceComplete} detail={evidenceComplete ? 'Evidências obrigatórias aprovadas' : 'Evidências pendentes ou em análise'} />
          <Step label="Participantes" completed={confirmedParticipants === requiredParticipants.length} detail={`${confirmedParticipants}/${requiredParticipants.length} confirmados`} />
          <Step label="Validar" completed={visit.status === 'concluida'} detail={visit.status === 'concluida' ? 'Encontro validado' : `Encontro ${visit.status || 'pendente'}`} />
        </ol>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Execução e decisões</h3>
        <p className="mt-1 text-sm text-muted-foreground">Antecipação: <strong>{requestStatus}</strong>. Assistir à aula não conclui o encontro.</p>
        <a href={actionUrl} className="mt-4 inline-flex rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5">Criar ação no Plano de Ação</a>
      </section>
    </div>
  )
}
