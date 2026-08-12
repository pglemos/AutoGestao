// Visualização semanal — 7 colunas (Seg-Dom) com drag-and-drop.
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Lock, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_STYLES, DEPT_STYLES } from "../actionPlanConstants";
import { isLate } from "../actionPlanUtils";
import {
  getWeekDays,
  isSameDay,
  isRefToday,
  isInCycle,
  formatDateISO,
  getRelativeDayLabel,
} from "./calendarUtils";

const WEEKDAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function WeekEvent({ action, provided, isDragging, onOpenAction }) {
  const deptStyle = DEPT_STYLES[action.department] || {};
  const statusStyle = STATUS_STYLES[action.status] || {};
  const late = isLate(action);
  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      onClick={(e) => { e.stopPropagation(); onOpenAction(action); }}
      className={`mb-1.5 cursor-grab rounded border-l-2 bg-white p-2 text-xs shadow-sm hover:shadow-md ${
        deptStyle.border || "border-border"
      } ${late ? "border-l-red-500" : ""} ${isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{action.code}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${statusStyle.badge || ""}`}>
          {statusStyle.label}
        </span>
      </div>
      <p className="mt-0.5 truncate text-muted-foreground">{action.title}</p>
      <div className="mt-1 flex items-center gap-2 text-caption text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${deptStyle.dot || "bg-slate-400"}`} />
        <span className="truncate">{action.responsible}</span>
        {action.status === "blocked" && <Lock className="h-3 w-3 text-status-error" />}
        {late && <AlertTriangle className="h-3 w-3 text-status-error" />}
      </div>
    </div>
  );
}

export default function WeekView({ refDate, selectedDate, actionsByDate, onSelectDate, onOpenAction, onReschedule, isMobile }) {
  const days = getWeekDays(refDate);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const dateStr = result.destination.droppableId;
    const [y, m, d] = dateStr.split("-");
    const newDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const actionId = result.draggableId;
    const allActions = Array.from(actionsByDate.values()).flat();
    const action = allActions.find((a) => a.id === actionId);
    if (action) onReschedule(action, newDate);
  };

  if (isMobile) {
    return (
      <WeekViewMobile
        refDate={refDate}
        selectedDate={selectedDate}
        actionsByDate={actionsByDate}
        onSelectDate={onSelectDate}
        onOpenAction={onOpenAction}
      />
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, idx) => {
          const key = formatDateISO(date);
          const actions = actionsByDate.get(key) || [];
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isRefToday(date);
          const inCycle = isInCycle(date);

          return (
            <div key={key} className="rounded-xl border border-border bg-card shadow-sm">
              <button
                onClick={() => onSelectDate(date)}
                className={`w-full border-b border-border px-2 py-2 text-center ${isToday ? "bg-status-success-surface" : ""} ${isSelected ? "bg-status-success-surface" : ""}`}
              >
                <div className="text-xs font-semibold text-muted-foreground">{WEEKDAY_LABELS[idx]}</div>
                <div className={`mt-0.5 text-lg font-bold ${isToday ? "text-status-success-text" : "text-foreground"}`}>
                  {date.getDate()}
                </div>
                <div className="text-caption text-muted-foreground">{getRelativeDayLabel(date)}</div>
                {!inCycle && <div className="text-caption text-muted-foreground/60">Fora do ciclo</div>}
              </button>
              <Droppable droppableId={key} type="action">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[200px] p-1.5">
                    {actions.map((action, i) => (
                      <Draggable key={action.id} draggableId={action.id} index={i}>
                        {(prov, snap) => <WeekEvent action={action} provided={prov} isDragging={snap.isDragging} onOpenAction={onOpenAction} />}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {actions.length === 0 && (
                      <p className="mt-4 text-center text-caption text-muted-foreground/50">Sem ações</p>
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

function WeekViewMobile({ refDate, selectedDate, actionsByDate, onSelectDate, onOpenAction }) {
  const days = getWeekDays(refDate);
  const currentIdx = days.findIndex((d) => isSameDay(d, selectedDate));
  const idx = currentIdx >= 0 ? currentIdx : 0;
  const date = days[idx];
  const key = formatDateISO(date);
  const actions = actionsByDate.get(key) || [];
  const isToday = isRefToday(date);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border p-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSelectDate(days[Math.max(0, idx - 1)])}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">{WEEKDAY_LABELS[idx]}, {date.getDate()}</div>
          <div className="text-xs text-muted-foreground">{getRelativeDayLabel(date)}</div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSelectDate(days[Math.min(6, idx + 1)])}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2 p-3">
        {actions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma ação prevista para este dia.</p>
        ) : (
          actions.map((action) => {
            const deptStyle = DEPT_STYLES[action.department] || {};
            const statusStyle = STATUS_STYLES[action.status] || {};
            const late = isLate(action);
            return (
              <button
                key={action.id}
                onClick={() => onOpenAction(action)}
                className={`w-full rounded border-l-2 bg-white p-3 text-left shadow-sm ${deptStyle.border || "border-border"} ${late ? "border-l-red-500" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{action.code}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.badge || ""}`}>{statusStyle.label}</span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{action.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${deptStyle.dot || "bg-slate-400"}`} />
                  <span className="truncate">{action.responsible}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}