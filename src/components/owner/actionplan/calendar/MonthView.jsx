// Visualização mensal — grade 6x7 com drag-and-drop.
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Lock, AlertTriangle } from "lucide-react";
import { STATUS_STYLES, DEPT_STYLES } from "../actionPlanConstants";
import { isLate } from "../actionPlanUtils";
import {
  getMonthMatrix,
  isSameDay,
  isRefToday,
  isInCycle,
  formatDateISO,
} from "./calendarUtils";
import MoreActionsPopover from "./MoreActionsPopover";

const WEEKDAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function EventCard({ action, provided, isDragging }) {
  const deptStyle = DEPT_STYLES[action.department] || {};
  const statusStyle = STATUS_STYLES[action.status] || {};
  const late = isLate(action);
  const isBlocked = action.status === "blocked";

  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      className={`mb-1 rounded border-l-2 bg-white px-1.5 py-1 text-xs shadow-sm transition-shadow ${
        deptStyle.border || "border-border"
      } ${late ? "border-l-red-500" : ""} ${isDragging ? "shadow-md opacity-70" : ""} cursor-grab hover:shadow-md`}
      title={`${action.code} — ${action.title}`}
    >
      <div className="flex items-center gap-1">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${deptStyle.dot || "bg-slate-400"}`} />
        <span className="truncate font-medium text-foreground">{action.code}</span>
        {isBlocked && <Lock className="h-3 w-3 shrink-0 text-red-500" />}
        {late && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
      </div>
      <p className="truncate text-muted-foreground">{action.title}</p>
    </div>
  );
}

function DayCell({ date, actions, isCurrentMonth, isSelected, isToday, inCycle, onSelectDate, onSelectAction, onOpenAction, onReschedule, provided }) {
  const dayActions = actions || [];
  const visible = dayActions.slice(0, 2);
  const remaining = dayActions.length - visible.length;

  return (
    <div
      onClick={() => onSelectDate(date)}
      className={`min-h-[80px] cursor-pointer border border-border p-1 transition-colors hover:bg-muted/30 lg:min-h-[100px] ${
        !isCurrentMonth ? "bg-muted/20" : "bg-card"
      } ${isSelected ? "ring-2 ring-emerald-400 ring-inset" : ""} ${isToday ? "bg-emerald-50/50" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`text-xs font-medium ${
            isToday
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"
              : isCurrentMonth
              ? "text-foreground"
              : "text-muted-foreground/50"
          }`}
        >
          {date.getDate()}
        </span>
        {!inCycle && isCurrentMonth && (
          <span className="text-caption text-muted-foreground/60">fora</span>
        )}
      </div>
      <div ref={provided?.innerRef} {...provided?.droppableProps}>
        {visible.map((action, idx) => (
          <Draggable key={action.id} draggableId={action.id} index={idx}>
            {(prov, snap) => (
              <div onClick={(e) => { e.stopPropagation(); onOpenAction(action); }}>
                <EventCard action={action} provided={prov} isDragging={snap.isDragging} />
              </div>
            )}
          </Draggable>
        ))}
        {provided?.placeholder}
        {remaining > 0 && (
          <MoreActionsPopover actions={dayActions} onSelectAction={onSelectAction} onOpenAction={onOpenAction} />
        )}
      </div>
    </div>
  );
}

export default function MonthView({ refDate, selectedDate, actionsByDate, onSelectDate, onOpenAction, onReschedule, isMobile }) {
  const weeks = getMonthMatrix(refDate);

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
    return <MonthViewMobile refDate={refDate} selectedDate={selectedDate} actionsByDate={actionsByDate} onSelectDate={onSelectDate} onOpenAction={onOpenAction} />;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {WEEKDAY_HEADERS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((date) => {
            const key = formatDateISO(date);
            const actions = actionsByDate.get(key) || [];
            const isCurrentMonth = date.getMonth() === refDate.getMonth();
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isRefToday(date);
            const inCycle = isInCycle(date);

            return (
              <Droppable key={key} droppableId={key} type="action">
                {(provided) => (
                  <DayCell
                    date={date}
                    actions={actions}
                    isCurrentMonth={isCurrentMonth}
                    isSelected={isSelected}
                    isToday={isToday}
                    inCycle={inCycle}
                    onSelectDate={onSelectDate}
                    onSelectAction={onOpenAction}
                    onOpenAction={onOpenAction}
                    onReschedule={onReschedule}
                    provided={provided}
                  />
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}

function MonthViewMobile({ refDate, selectedDate, actionsByDate, onSelectDate, onOpenAction }) {
  const weeks = getMonthMatrix(refDate);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="px-1 py-1.5 text-center text-caption font-semibold text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((date) => {
          const key = formatDateISO(date);
          const actions = actionsByDate.get(key) || [];
          const isCurrentMonth = date.getMonth() === refDate.getMonth();
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isRefToday(date);
          return (
            <button
              key={key}
              onClick={() => onSelectDate(date)}
              className={`flex min-h-[44px] flex-col items-center justify-start border-b border-r border-border p-1 ${
                !isCurrentMonth ? "bg-muted/20" : ""
              } ${isSelected ? "bg-emerald-50" : ""} ${isToday ? "bg-emerald-50/50" : ""}`}
            >
              <span className={`text-xs font-medium ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"}`}>
                {date.getDate()}
              </span>
              {actions.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {actions.slice(0, 3).map((a) => (
                    <span key={a.id} className={`h-1.5 w-1.5 rounded-full ${DEPT_STYLES[a.department]?.dot || "bg-slate-400"}`} />
                  ))}
                  {actions.length > 3 && <span className="text-caption text-muted-foreground">+{actions.length - 3}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}