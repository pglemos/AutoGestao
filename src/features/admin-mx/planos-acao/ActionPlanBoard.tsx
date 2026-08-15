import { useMemo } from 'react'
import { MxEmptyState } from '@/components/module/MxModuleVisualPrimitives'
import { BOARD_COLUMNS, STATUS_LABEL, groupPlansByColumn, type BoardPlan } from './actionPlanBoard'

function formatDate(value: string | null) {
  if (!value) return 'sem prazo'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'sem prazo' : date.toLocaleDateString('pt-BR')
}

export function ActionPlanBoard(props: { plans: BoardPlan[]; onOpen: (plan: BoardPlan) => void }) {
  const groups = useMemo(() => groupPlansByColumn(props.plans), [props.plans])

  if (!props.plans.length) {
    return <MxEmptyState title="Nenhum plano no board" description="Ajuste os filtros ou crie um plano a partir de um template." />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {BOARD_COLUMNS.map(column => (
        <section key={column} aria-label={STATUS_LABEL[column]} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{STATUS_LABEL[column]}</h3>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{groups[column].length}</span>
          </header>
          <ul className="space-y-2">
            {groups[column].map(plan => (
              <li key={plan.id}>
                <button
                  type="button"
                  onClick={() => props.onOpen(plan)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary focus-visible:border-primary"
                >
                  <div className="text-xs text-muted-foreground">{plan.codigo || 'sem código'} · {plan.departamento || 'sem departamento'}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{plan.acao || plan.problema || 'Plano sem descrição'}</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(plan.prazo)}</span>
                    <span>{plan.prioridade || 'média'} · {plan.progresso ?? 0}%</span>
                  </div>
                </button>
              </li>
            ))}
            {groups[column].length === 0 ? <li className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Sem planos nesta coluna</li> : null}
          </ul>
        </section>
      ))}
    </div>
  )
}
