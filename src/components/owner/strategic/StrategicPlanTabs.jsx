import { LayoutGrid, List } from "lucide-react";

const TABS = [
  { value: "resumo", label: "Resumo", icon: LayoutGrid },
  { value: "visao-geral", label: "Visão Geral", icon: List },
];

export default function StrategicPlanTabs({ tab, onTabChange }) {
  return (
    <div role="tablist" aria-label="Visualizações do Plano Estratégico" tabIndex={0} className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-success/30">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.value;
        return (
          <button
            key={t.value}
            id={`spe-tab-${t.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={active ? `spe-tab-panel-${t.value}` : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onTabChange(t.value)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-status-success-surface text-status-success-text shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
