// Alternador de abas do Plano de Ação — Ações e Calendário.
import { KanbanSquare, CalendarDays } from "lucide-react";

const TABS = [
  { value: "acoes", label: "Ações", icon: KanbanSquare },
  { value: "calendario", label: "Calendário", icon: CalendarDays },
];

export default function ActionPlanTabs({ tab, onTabChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onTabChange(t.value)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-50 text-emerald-700 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
