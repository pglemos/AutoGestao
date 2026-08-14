import { cn } from "@/lib/utils";
import StatusBadge from "@/components/owner/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/atoms/Badge";
import { formatBRL, formatDate, relativeDayLabel } from "@/features/owner/lib/ownerFormatters";
import { IMPACT_LABELS, DEPARTMENT_LABELS } from "@/features/owner/lib/ownerStatus";
import { Clock, Tag, Building, Flag, Lightbulb, UserCircle } from "lucide-react";

const impactTone = {
  high: "bg-status-error-surface text-status-error-text border-status-error/30",
  medium: "bg-status-warning-surface text-status-warning-text border-status-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function DecisionCard({ decision, onAction }) {
  const deptLabel = decision.department
    ? decision.department.split("_").map((d) => DEPARTMENT_LABELS[d] || d).join(" e ")
    : "—";

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {decision.category && (
              <span className="inline-flex items-center gap-1 text-caption font-medium text-muted-foreground">
                <Tag className="h-3 w-3" />
                {decision.category}
              </span>
            )}
            <Badge variant="outline" className={cn("border", impactTone[decision.impact_level] || impactTone.medium)}>
              Impacto {IMPACT_LABELS[decision.impact_level] || "—"}
            </Badge>
          </div>
          <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground">{decision.title}</h3>
        </div>
        <StatusBadge status={decision.status} />
      </div>

      <p className="mt-2.5 text-sm text-muted-foreground">{decision.context}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <Meta icon={Building} label="Departamento" value={deptLabel} />
        <Meta icon={Flag} label="Origem" value={decision.source_type} />
        <Meta icon={Clock} label="Prazo" value={relativeDayLabel(decision.due_date)} />
        {decision.responsible_name && (
          <Meta icon={UserCircle} label="Responsável" value={decision.responsible_name} />
        )}
      </div>

      {decision.financial_impact ? (
        <div className="mt-3 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Impacto financeiro:</span> {formatBRL(decision.financial_impact)}
        </div>
      ) : null}

      {decision.recommendation && (
        <div className="mt-2.5 flex gap-2 rounded-md border border-status-info/20 bg-status-info-surface/50 px-2.5 py-2 text-xs text-foreground">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-info-text" />
          <p><span className="font-medium text-foreground">Recomendação:</span> {decision.recommendation}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" onClick={() => onAction("analyze", decision)}>
          Analisar
        </Button>
        <Button size="sm" variant="default" className="bg-primary hover:bg-primary/90" onClick={() => onAction("approve", decision)}>
          Aprovar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction("delegate", decision)}>
          Delegar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction("convert", decision)}>
          Transformar em ação
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onAction("consultant", decision)}>
          Falar com Consultor
        </Button>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, label, value }) {
  const display = label === "Origem" ? sourceLabel(value) : value;
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
      <span className="min-w-0">
        <span className="block text-caption text-muted-foreground/80">{label}</span>
        <span className="block truncate text-muted-foreground">{display}</span>
      </span>
    </div>
  );
}

const sourceLabel = (s) => ({
  action: "Plano de Ação",
  alert: "Alerta executivo",
  consulting: "Consultoria",
  manual: "Manual",
})[s] || s || "—";
