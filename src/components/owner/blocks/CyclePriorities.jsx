import StatusBadge from "@/components/owner/StatusBadge";
import { DEPARTMENT_LABELS } from "@/features/owner/lib/ownerStatus";
import { formatDate } from "@/features/owner/lib/ownerFormatters";
import { Target, UserCircle, Flag, CalendarClock } from "lucide-react";

// Deriva até 4 prioridades a partir dos objetivos estratégicos do ciclo.
export default function CyclePriorities({ objectives }) {
  const top = (objectives || [])
    .filter((o) => o.status !== "done" && o.status !== "paused")
    .sort((a, b) => {
      const order = { critical: 0, attention: 1, on_track: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    })
    .slice(0, 4);

  if (top.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card p-5">
        <p className="text-sm font-medium text-foreground">Prioridades do ciclo</p>
        <p className="mt-1 text-xs text-muted-foreground">Nenhuma prioridade ativa registrada no plano estratégico.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Prioridades do ciclo</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Focos principais do ciclo estratégico em andamento.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {top.map((o) => (
          <div key={o.id} className="rounded-lg border border-border p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{o.title}</p>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                {DEPARTMENT_LABELS[o.department] || o.department}
              </div>
              <div className="flex items-center gap-1.5">
                <UserCircle className="h-3 w-3" />
                {o.responsible_name || "—"}
              </div>
              {o.next_milestone && (
                <div className="flex items-center gap-1.5">
                  <Flag className="h-3 w-3" />
                  {o.next_milestone}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <CalendarClock className="h-3 w-3" />
                {formatDate(o.due_date)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
