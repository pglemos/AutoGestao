// Card "Próximos prazos" — 5 ações não concluídas com menor prazo.
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { STATUS_STYLES, DEPT_STYLES } from "../actionPlanConstants";
import { isLate } from "../actionPlanUtils";
import { getUpcomingDeadlineActions, getRelativeDayLabel, parseISOToDate } from "./calendarUtils";

export default function UpcomingDeadlines({ actions, onSelectDate, onViewAll }) {
  const upcoming = getUpcomingDeadlineActions(actions, 5);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Próximos prazos</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onViewAll}>
          Ver todos
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {upcoming.length === 0 ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">Nenhum prazo próximo.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {upcoming.map((action) => {
            const deptStyle = DEPT_STYLES[action.department] || {};
            const statusStyle = STATUS_STYLES[action.status] || {};
            const late = isLate(action);
            const date = parseISOToDate(action.dueDate.split("/").reverse().join("-"));
            return (
              <button
                key={action.id}
                onClick={() => onSelectDate(date)}
                className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left hover:bg-muted/30"
              >
                <div className={`flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded ${deptStyle.bg || "bg-slate-50"}`}>
                  <span className={`text-xs font-bold ${deptStyle.text || "text-muted-foreground"}`}>
                    {date ? date.getDate() : "—"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-foreground">{action.code}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${statusStyle.badge || ""}`}>
                      {statusStyle.label}
                    </span>
                    {late && <span className="text-caption font-medium text-status-error-text">Atrasada</span>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{action.title}</p>
                  <p className="truncate text-caption text-muted-foreground">{action.responsible}</p>
                </div>
                <span className="shrink-0 text-caption font-medium text-muted-foreground">
                  {date ? getRelativeDayLabel(date) : action.dueDate}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}