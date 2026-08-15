import { secondaryAlerts } from "./homeData";
import { AlertCircle, ChevronRight } from "lucide-react";
import { toast } from '@/lib/toast'
import { SectionCard, SectionHeader, SectionContent } from "@/components/molecules/SectionCard";

export default function SecondaryAlerts() {

  return (
    <SectionCard>
      <SectionHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Alertas que exigem sua atenção</h2>
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
            {secondaryAlerts.length}
          </span>
        </div>
      </SectionHeader>
      <SectionContent className="p-5">
      <div className="space-y-2">
        {secondaryAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/50"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-status-warning-text" />
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
        onClick={() => toast.info("Alertas", { description: "Consulte os alertas reais na Visão Geral do Dono." })}
        className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Ver todos os alertas
      </button>
      </SectionContent>
    </SectionCard>
  );
}
