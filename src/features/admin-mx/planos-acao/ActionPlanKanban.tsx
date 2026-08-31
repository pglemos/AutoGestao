import { useMemo, type CSSProperties } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { MxEmptyState, MxProgress } from '@/components/module/MxModuleVisualPrimitives'
import { BOARD_COLUMNS, STATUS_LABEL, formatActionPlanCodigo, groupPlansByColumn, type BoardPlan, type PlanStatus } from './actionPlanBoard'

function formatDate(value: string | null) {
  if (!value) return 'sem prazo'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'sem prazo' : date.toLocaleDateString('pt-BR')
}

export function ActionPlanKanban(props: {
  plans: BoardPlan[]
  onOpen: (plan: BoardPlan) => void
  onMove?: (plan: BoardPlan, toStatus: PlanStatus) => void | Promise<void>
}) {
  const groups = useMemo(() => groupPlansByColumn(props.plans), [props.plans])

  if (!props.plans.length) {
    return <MxEmptyState title="Nenhum plano no board" description="Ajuste os filtros ou crie um plano a partir de um template." />
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !props.onMove) return
    const toStatus = result.destination.droppableId as PlanStatus
    if (!BOARD_COLUMNS.includes(toStatus)) return
    if (result.source.droppableId === toStatus) return
    const plan = props.plans.find(item => item.id === result.draggableId)
    if (!plan) return
    void props.onMove(plan, toStatus)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="action-plan-kanban-board">
        {BOARD_COLUMNS.map(column => (
          <section key={column} aria-label={STATUS_LABEL[column]} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{STATUS_LABEL[column]}</h3>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{groups[column].length}</span>
            </header>
            <Droppable droppableId={column}>
              {(provided, snapshot) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[120px] space-y-2 rounded-md p-1 transition-colors ${snapshot.isDraggingOver ? 'bg-muted/50' : ''}`}
                >
                  {groups[column].map((plan, index) => (
                    <Draggable key={plan.id} draggableId={plan.id} index={index} isDragDisabled={!props.onMove}>
                      {(dragProvided, dragSnapshot) => (
                        <li
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          style={dragProvided.draggableProps.style as CSSProperties}
                          className={dragSnapshot.isDragging ? 'opacity-90 shadow-md' : undefined}
                        >
                          <button
                            type="button"
                            {...dragProvided.dragHandleProps}
                            onClick={() => props.onOpen(plan)}
                            className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary focus-visible:border-primary"
                            data-testid="action-plan-kanban-card"
                            data-progress={plan.progresso ?? 0}
                          >
                            <div className="text-xs text-muted-foreground">{formatActionPlanCodigo(plan.codigo, plan.id)} · {plan.departamento || 'sem departamento'}</div>
                            <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{plan.acao || plan.problema || 'Plano sem descrição'}</div>
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatDate(plan.prazo)}</span>
                              <span>{plan.prioridade || 'média'}</span>
                            </div>
                            <div className="mt-2">
                              <MxProgress value={plan.progresso ?? 0} label={`${plan.progresso ?? 0}%`} />
                            </div>
                          </button>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {groups[column].length === 0 ? (
                    <li className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      Arraste cards para cá
                    </li>
                  ) : null}
                </ul>
              )}
            </Droppable>
          </section>
        ))}
      </div>
    </DragDropContext>
  )
}
