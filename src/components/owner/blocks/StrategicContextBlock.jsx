import { useOwner } from "@/components/owner/OwnerContext";
import { PHASE_LABELS } from "@/features/owner/lib/ownerStatus";
import { greetingByHour, formatDate, formatDateTime } from "@/features/owner/lib/ownerFormatters";
import { Badge } from "@/components/atoms/Badge";
import { Sparkles, UserCircle, CalendarClock, RefreshCcw } from "lucide-react";

export default function StrategicContextBlock({ cycle }) {
  const { user } = useOwner();
  const firstName = (user?.full_name || "Nome não informado").split(" ")[0];
  const isDemo = cycle?.is_demo;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
            {greetingByHour()}, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cycle
              ? `Sua empresa está na fase de ${PHASE_LABELS[cycle.phase] || cycle.phase}.`
              : "Nenhum ciclo estratégico ativo encontrado."}
          </p>
          {cycle?.strategic_focus && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Foco do ciclo:</span> {cycle.strategic_focus}
            </p>
          )}
        </div>

        {cycle && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {cycle.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
            </span>
            {cycle.consultant_name && (
              <span className="inline-flex items-center gap-1.5">
                <UserCircle className="h-3.5 w-3.5" />
                {cycle.consultant_name}
              </span>
            )}
            {cycle.last_review_at && (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCcw className="h-3.5 w-3.5" />
                Revisão: {formatDate(cycle.last_review_at)}
              </span>
            )}
          </div>
        )}
      </div>

      {isDemo && (
        <div className="mt-4">
          <Badge variant="outline" className="border-status-warning/30 bg-status-warning-surface text-status-warning-text">
            Dados demonstrativos
          </Badge>
        </div>
      )}
    </section>
  );
}
