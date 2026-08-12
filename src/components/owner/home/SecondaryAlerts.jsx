import { secondaryAlerts } from "./homeData";
import { AlertCircle, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SecondaryAlerts() {
  const { toast } = useToast();

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Alertas que exigem sua atenção</h2>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
          {secondaryAlerts.length}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {secondaryAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/50"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-status-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground">
                {alert.department} · {alert.info}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-status-warning-surface px-2 py-0.5 text-xs font-medium text-status-warning-text">
              {alert.deadline}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        ))}
      </div>
      <button
        onClick={() => toast({ title: "Alertas", description: "Consulte os alertas reais na Visão Geral do Dono." })}
        className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Ver todos os alertas
      </button>
    </section>
  );
}
