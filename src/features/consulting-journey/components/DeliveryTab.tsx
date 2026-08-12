import type { ChangeEvent } from 'react'
import type { ConsultingJourneyController } from '../useConsultingJourney'
import type { ConsultingJourneyVisit } from '../consultingJourney.types'
import { calculateDeliveryProgress } from '../consultingJourneyRules'

export function DeliveryTab({ visit, controller }: { visit: ConsultingJourneyVisit; controller: ConsultingJourneyController }) {
  const progress = calculateDeliveryProgress(visit.deliveryItems)
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-base font-semibold text-foreground">Entrega</h3><p className="text-sm text-muted-foreground">Checklist de preparação do encontro.</p></div>
          <span className="text-sm font-semibold text-primary">{progress.completedRequired}/{progress.totalRequired}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${progress.percentage}%` }} /></div>
        <div className="mt-4 space-y-2">
          {visit.deliveryItems.map(item => (
            <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={item.status === 'completed'}
                disabled={controller.mutating}
                onChange={(event: ChangeEvent<HTMLInputElement>) => void controller.updateDeliveryItem(item.id, event.target.checked ? 'completed' : 'reopened')}
                className="mt-1 h-4 w-4"
              />
              <span className="min-w-0 flex-1"><strong className="block text-sm text-foreground">{item.title}</strong>{item.description ? <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span> : null}</span>
              {item.required ? <span className="text-caption font-medium text-status-warning-text">Obrigatório</span> : null}
            </label>
          ))}
          {!visit.deliveryItems.length ? <p className="text-sm text-muted-foreground">Nenhum item de Entrega configurado.</p> : null}
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Participantes</h3>
        <p className="mt-1 text-sm text-muted-foreground">Confirme quem participará deste encontro.</p>
        <div className="mt-3 space-y-2">
          {visit.participants.map(participant => (
            <label key={participant.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
              <input type="checkbox" checked={participant.confirmed} disabled={controller.mutating} onChange={(event: ChangeEvent<HTMLInputElement>) => void controller.confirmParticipant(participant.id, event.target.checked)} className="h-4 w-4" />
              <span className="flex-1"><strong className="block text-sm text-foreground">{participant.name}</strong><span className="text-xs text-muted-foreground">{participant.roleLabel || 'Participante'}</span></span>
              {participant.required ? <span className="text-caption font-medium text-status-warning-text">Obrigatório</span> : null}
            </label>
          ))}
          {!visit.participants.length ? <p className="text-sm text-muted-foreground">Nenhum participante obrigatório configurado.</p> : null}
        </div>
      </section>
    </div>
  )
}
