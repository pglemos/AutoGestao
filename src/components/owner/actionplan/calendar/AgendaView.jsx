// Visualização agenda — lista cronológica agrupada por data.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, AlertTriangle, ExternalLink, CalendarClock } from "lucide-react";
import { STATUS_STYLES, DEPT_STYLES, PRIORITY_STYLES } from "../actionPlanConstants";
import { isLate, daysLate, parseBRDate, getRefDate, daysBetween } from "../actionPlanUtils";
import { formatDateISO, getRelativeDayLabel, getActionsByDate } from "./calendarUtils";

const SUB_FILTERS = [
  { value: "upcoming", label: "Próximas" },
  { value: "late", label: "Atrasadas" },
  { value: "completed", label: "Concluídas" },
];

export default function AgendaView({ actions, selectedDate, onSelectDate, onOpenAction, onUpdateDeadline, onTalkToConsultant }) {
  const [subFilter, setSubFilter] = useState("upcoming");
  const ref = getRefDate();

  const filtered = actions.filter((a) => {
    if (!a.dueDate) return false;
    if (subFilter === "upcoming") {
      return a.status !== "completed" && a.status !== "cancelled" && parseBRDate(a.dueDate).getTime() >= ref.getTime();
    }
    if (subFilter === "late") {
      return isLate(a);
    }
    if (subFilter === "completed") {
      return a.status === "completed";
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => parseBRDate(a.dueDate) - parseBRDate(b.dueDate));
  const byDate = getActionsByDate(sorted);
  const dateKeys = Array.from(byDate.keys()).sort();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border p-3">
        {SUB_FILTERS.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setSubFilter(sf.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              subFilter === sf.value
                ? "bg-status-success-surface text-status-success-text"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      <div data-mx-scroll-region="vertical" className="max-h-[600px] divide-y divide-border overflow-y-auto">
        {dateKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {subFilter === "upcoming" ? "Nenhuma ação próxima." : subFilter === "late" ? "Nenhuma ação atrasada." : "Nenhuma ação concluída."}
            </p>
          </div>
        ) : (
          dateKeys.map((key) => {
            const [y, m, d] = key.split("-");
            const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            const dayActions = byDate.get(key) || [];
            const isToday = daysBetween(date, ref) === 0;
            return (
              <div key={key} className="flex">
                <button
                  onClick={() => onSelectDate(date)}
                  className={`w-28 shrink-0 border-r border-border p-3 text-left ${isToday ? "bg-status-success-surface" : "bg-muted/20"}`}
                >
                  <div className={`text-xs font-semibold uppercase ${isToday ? "text-status-success-text" : "text-muted-foreground"}`}>
                    {getRelativeDayLabel(date)}
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-foreground">{date.getDate()}</div>
                  <div className="text-xs text-muted-foreground">{formatDateISO(date).slice(5).replace("-", "/")}</div>
                </button>
                <div className="flex-1 space-y-2 p-3">
                  {dayActions.map((action) => {
                    const deptStyle = DEPT_STYLES[action.department] || {};
                    const statusStyle = STATUS_STYLES[action.status] || {};
                    const prioStyle = PRIORITY_STYLES[action.priority] || {};
                    const late = isLate(action);
                    return (
                      <div
                        key={action.id}
                        className={`rounded-lg border-l-2 bg-white p-3 shadow-sm ${deptStyle.border || "border-border"} ${late ? "border-l-red-500" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{action.code}</span>
                              <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${statusStyle.badge || ""}`}>
                                {statusStyle.label}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${prioStyle.badge || ""}`}>
                                {prioStyle.label}
                              </span>
                              {late && (
                                <span className="inline-flex items-center gap-0.5 text-caption font-medium text-status-error-text">
                                  <AlertTriangle className="h-3 w-3" />
                                  Atrasada há {daysLate(action)}d
                                </span>
                              )}
                              {action.status === "blocked" && <Lock className="h-3 w-3 text-status-error-text" />}
                            </div>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{action.title}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className={`h-2 w-2 rounded-full ${deptStyle.dot || "bg-slate-400"}`} />
                              <span className="truncate">{action.responsible}</span>
                              <span>·</span>
                              <span>{action.progress || 0}%</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenAction(action)}>
                              <ExternalLink className="h-3 w-3" />
                              Abrir
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdateDeadline(action)}>
                              <CalendarClock className="h-3 w-3" />
                              Prazo
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
