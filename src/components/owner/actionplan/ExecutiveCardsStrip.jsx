// Faixa executiva — cinco cards clicáveis que filtram a aba Ações.
import { CheckSquare, Circle, AlertTriangle, Play, CheckCircle2 } from "lucide-react";
import { countByStatus, countLate } from "./actionPlanUtils";

const CARDS = [
  {
    key: "total",
    title: "Ações",
    complement: "no ciclo estratégico",
    icon: CheckSquare,
    strip: "bg-status-info",
    iconBg: "bg-status-info-surface text-status-info-text",
    selectedBg: "bg-status-info-surface/60",
    selectedBorder: "border-status-info/50",
    getValue: (actions) => actions.filter((a) => a.status !== "cancelled").length,
  },
  {
    key: "not_started",
    title: "Não Iniciadas",
    complement: "aguardando início",
    icon: Circle,
    strip: "bg-slate-400",
    iconBg: "bg-slate-100 text-muted-foreground",
    selectedBg: "bg-slate-50/80",
    selectedBorder: "border-slate-400",
    getValue: (actions) => countByStatus(actions, "not_started"),
  },
  {
    key: "late",
    title: "Atrasadas",
    complement: "fora do prazo",
    icon: AlertTriangle,
    strip: "bg-status-error",
    iconBg: "bg-status-error-surface text-status-error-text",
    selectedBg: "bg-status-error-surface/60",
    selectedBorder: "border-status-error/50",
    getValue: (actions) => countLate(actions),
  },
  {
    key: "in_progress",
    title: "Em Andamento",
    complement: "em execução ativa",
    icon: Play,
    strip: "bg-status-info",
    iconBg: "bg-status-info-surface text-status-info-text",
    selectedBg: "bg-status-info-surface/60",
    selectedBorder: "border-status-info/50",
    getValue: (actions) => countByStatus(actions, "in_progress"),
  },
  {
    key: "completed",
    title: "Concluídas",
    complement: "entregas realizadas",
    icon: CheckCircle2,
    strip: "bg-status-success",
    iconBg: "bg-status-success-surface text-status-success-text",
    selectedBg: "bg-status-success-surface/60",
    selectedBorder: "border-emerald-400",
    getValue: (actions) => countByStatus(actions, "completed"),
  },
];

export default function ExecutiveCardsStrip({ actions, activeCard, onCardClick }) {
  return (
    <div aria-label="Resumo executivo das ações" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = card.getValue(actions);
        const selected = activeCard === card.key;
        const isTotal = card.key === "total";
        return (
          <button
            key={card.key}
            aria-pressed={selected}
            aria-label={`${card.title}: ${value} ${card.complement}`}
            onClick={() => onCardClick(card.key)}
            className={`group relative overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
              selected
                ? `${card.selectedBorder} ${card.selectedBg} ring-1 ring-offset-0`
                : "border-border"
            } ${isTotal ? "col-span-2 lg:col-span-1" : ""}`}
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${card.strip}`} aria-hidden="true" />
            <div className="flex items-start justify-between gap-2 pl-1.5">
              <div className="min-w-0 flex-1">
                <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`} aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-3xl font-bold leading-none text-foreground">{value}</p>
                <p className="mt-1.5 text-sm font-semibold text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.complement}</p>
              </div>
            </div>
            {selected && (
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-caption font-medium text-foreground">
                Filtro ativo
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
