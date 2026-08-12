// Controle segmentado de exibição: Ambos, Tabela, Gráfico.
import { Table2, BarChart3, Columns2 } from "lucide-react";
import { DISPLAY_MODES } from "./strategicUtils";

const ICONS = {
  both: Columns2,
  table: Table2,
  chart: BarChart3,
};

export default function DisplayModeSelector({ value, onChange, hideBoth = false }) {
  const modes = hideBoth ? DISPLAY_MODES.filter((m) => m.value !== "both") : DISPLAY_MODES;
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
      {modes.map((mode) => {
        const Icon = ICONS[mode.value];
        const active = value === mode.value;
        return (
          <button
            key={mode.value}
            aria-label={mode.label}
            onClick={() => onChange(mode.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
