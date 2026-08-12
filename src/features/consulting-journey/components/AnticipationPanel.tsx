import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import type { ConsultingJourneyController } from '../useConsultingJourney'
import type { ConsultingJourneyVisit } from '../consultingJourney.types'
import { calculateDeliveryProgress, calculateLessonProgress, getAnticipationEligibility } from '../consultingJourneyRules'

export function AnticipationPanel({ visit, controller }: { visit: ConsultingJourneyVisit; controller: ConsultingJourneyController }) {
  const [reason, setReason] = useState('')
  const [preferredDateOne, setPreferredDateOne] = useState('')
  const [preferredDateTwo, setPreferredDateTwo] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const request = visit.anticipation
  const active = Boolean(request && ['draft', 'under_review', 'date_adjustment_requested', 'approved'].includes(request.status))
  const eligibility = useMemo(() => {
    const lesson = calculateLessonProgress({ playedSeconds: visit.lessonProgress?.playedSeconds || 0, durationSeconds: visit.lessonProgress?.durationSeconds || 0 })
    const delivery = calculateDeliveryProgress(visit.deliveryItems)
    const participants = visit.participants.filter(item => item.required)
    const evidenceRequired = visit.deliveryItems.filter(item => item.required && item.itemType === 'evidence').length
    const evidenceApproved = visit.evidences.filter(item => item.status === 'approved').length
    return getAnticipationEligibility({
      isNextVisit: controller.snapshot?.nextVisitNumber === visit.visitNumber,
      requiredLessonsComplete: !visit.lesson || lesson.completed,
      requiredDeliveryComplete: delivery.percentage === 100,
      requiredParticipantsConfirmed: participants.every(item => item.confirmed),
      requiredEvidenceComplete: evidenceRequired === 0 || evidenceApproved >= evidenceRequired,
      hasActiveRequest: active,
    })
  }, [active, controller.snapshot?.nextVisitNumber, visit])

  const requestAnticipation = async () => {
    const dates = [preferredDateOne, preferredDateTwo].filter(Boolean)
    await controller.requestAnticipation(visit.id, reason.trim(), dates)
    setReason('')
    setPreferredDateOne('')
    setPreferredDateTwo('')
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Antecipação</h3>
      {request ? <p className="mt-2 text-sm text-muted-foreground">Status: <strong>{request.status}</strong>{request.reviewNote ? ` · ${request.reviewNote}` : ''}</p> : null}
      {!active ? (
        <div className="mt-3 space-y-3">
          {!eligibility.eligible ? <div className="rounded-lg border border-status-warning/30 bg-status-warning-surface p-3"><p className="text-sm font-medium text-status-warning-text">Pré-requisitos pendentes</p><ul className="mt-1 list-disc pl-5 text-xs text-status-warning-text">{eligibility.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
          <textarea value={reason} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)} rows={3} placeholder="Explique por que deseja antecipar" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Primeira data sugerida<input type="date" value={preferredDateOne} onChange={event => setPreferredDateOne(event.target.value)} className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" /></label><label className="text-xs text-muted-foreground">Segunda data sugerida<input type="date" value={preferredDateTwo} onChange={event => setPreferredDateTwo(event.target.value)} className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" /></label></div>
          <button type="button" disabled={!eligibility.eligible || !reason.trim() || controller.mutating} onClick={() => void requestAnticipation()} className="rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary disabled:opacity-50">Solicitar antecipação</button>
        </div>
      ) : null}
      {request && ['draft', 'under_review', 'date_adjustment_requested'].includes(request.status) ? <button type="button" onClick={() => void controller.cancelAnticipation(request.id)} className="mt-3 text-sm font-medium text-destructive hover:underline">Cancelar solicitação</button> : null}
      {request && controller.canReviewAnticipation && ['under_review', 'date_adjustment_requested'].includes(request.status) ? (
        <div className="mt-4 space-y-3 rounded-lg border border-border p-3">
          <textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} rows={2} placeholder="Parecer do consultor" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void controller.reviewAnticipation(request.id, 'approved', reviewNote || null)} className="rounded-md bg-brand-primary px-3 py-2 text-sm text-status-warning-foreground">Aprovar</button><button type="button" disabled={!reviewNote.trim()} onClick={() => void controller.reviewAnticipation(request.id, 'date_adjustment_requested', reviewNote)} className="rounded-md bg-status-warning px-3 py-2 text-sm text-status-warning-foreground disabled:opacity-50">Pedir ajuste</button><button type="button" disabled={!reviewNote.trim()} onClick={() => void controller.reviewAnticipation(request.id, 'rejected', reviewNote)} className="rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground disabled:opacity-50">Recusar</button></div>
        </div>
      ) : null}
    </section>
  )
}
