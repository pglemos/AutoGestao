// Próximos prazos — 5 ações mais próximas em ordem cronológica.
import { Button } from "@/components/ui/button";
import { CalendarClock, ChevronRight } from "lucide-react";
import { DEPT_STYLES, STATUS_STYLES } from "./actionPlanConstants";
import { getUpcomingDeadlines, formatDueDateShort } from "./actionPlanUtils";

export default function UpcomingDeadlines({ actions, onOpen }) {
  const upcoming = getUpcomingDeadlines(actions);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-blue-500" />
        <h2 className="text-sm font-semibold text-foreground">Próximos prazos</h2>
      </div>

      {upcoming.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum prazo próximo.</p>
      ) : (
        <div className="space-y-1.5">
          {upcoming.map((action) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            const status = STATUS_STYLES[action.status] || STATUS_STYLES.not_started;
            return (
              <div
                key={action.id}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5 hover:bg-muted/40"
              >
                <div className={`h-8 w-1 shrink-0 rounded-full ${dept.sideBar}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{action.code}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${status.badge}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">{action.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{action.responsible}</span>
                    <span>·</span>
                    <span className="font-medium text-foreground">{formatDueDateShort(action)}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onOpen(action)} className="shrink-0">
                  Abrir <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}