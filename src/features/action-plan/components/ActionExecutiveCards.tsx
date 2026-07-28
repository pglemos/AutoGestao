import type { ActionPlanMetrics, ExecutiveCardKey } from '../actionPlan.types'

const cards: Array<{ key: ExecutiveCardKey; label: string; field: keyof ActionPlanMetrics }> = [
  { key: 'total', label: 'Ações', field: 'total' },
  { key: 'not_started', label: 'Não iniciadas', field: 'notStarted' },
  { key: 'late', label: 'Atrasadas', field: 'late' },
  { key: 'in_progress', label: 'Em andamento', field: 'inProgress' },
  { key: 'completed', label: 'Concluídas', field: 'completed' },
]

export function ActionExecutiveCards({ metrics, activeCard, onCardClick }: {
  metrics: ActionPlanMetrics
  activeCard: ExecutiveCardKey | null
  onCardClick: (key: ExecutiveCardKey) => void
}) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Resumo executivo do Plano de Ação">
      {cards.map(card => {
        const active = activeCard === card.key
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={active}
            onClick={() => onCardClick(card.key)}
            className={`rounded-xl border p-4 text-left transition ${active ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-border bg-card hover:border-primary/40'}`}
          >
            <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            <strong className="mt-1 block text-2xl font-bold text-foreground">{metrics[card.field]}</strong>
          </button>
        )
      })}
    </section>
  )
}
