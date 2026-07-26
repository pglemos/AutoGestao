// Quadro Kanban com drag-and-drop via @hello-pangea/dnd.
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { KANBAN_COLUMNS, STATUS_STYLES } from "../actionPlanConstants";
import { sortActions, isLate } from "../actionPlanUtils";
import KanbanCard from "./KanbanCard";

export default function KanbanBoard({ actions, sortBy, onQuickAction, onDelete, onMoveTo, onDragEnd }) {
  const sorted = sortActions(actions, sortBy);
  const lateIds = new Set(sorted.filter(isLate).map((a) => a.id));

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory lg:overflow-x-visible lg:snap-none">
        {KANBAN_COLUMNS.map((col) => {
          const colActions = col.isDerived
            ? sorted.filter((a) => lateIds.has(a.id))
            : sorted.filter((a) => a.status === col.value && !lateIds.has(a.id));
          const style = STATUS_STYLES[col.value];
          return (
            <div key={col.value} className="flex w-[85vw] shrink-0 snap-start flex-col sm:w-[280px] md:w-[300px] lg:w-auto lg:flex-1 lg:shrink lg:min-w-0">
              <div className={`rounded-t-lg border-t-2 ${style.border} ${style.bg} px-3 py-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span className={`text-sm font-semibold ${style.text}`}>{col.label}</span>
                  </div>
                  <span className={`rounded-full ${style.badge} px-2 py-0.5 text-xs font-bold`}>{colActions.length}</span>
                </div>
              </div>
              <Droppable droppableId={col.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2 overflow-y-auto rounded-b-lg border border-border bg-muted/20 p-2 min-h-[200px] max-h-[calc(100vh-320px)] transition-colors ${snapshot.isDraggingOver ? "bg-muted/40" : ""}`}
                  >
                    {colActions.map((action, index) => (
                      <Draggable key={action.id} draggableId={action.id} index={index}>
                        {(prov) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                            <KanbanCard action={action} onQuickAction={onQuickAction} onDelete={onDelete} onMoveTo={onMoveTo} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colActions.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-xs text-muted-foreground">Nenhuma ação neste status.</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
