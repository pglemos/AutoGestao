// Legenda recolhível de departamentos e status.
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const DEPT_LEGEND = [
  { value: "commercial", label: "Comercial", color: "bg-violet-500" },
  { value: "marketing", label: "Marketing", color: "bg-indigo-500" },
  { value: "product_stock", label: "Produto e Estoque", color: "bg-status-info" },
  { value: "financial", label: "Financeiro", color: "bg-status-success" },
  { value: "operations", label: "Operações", color: "bg-status-warning" },
  { value: "people_hr", label: "Pessoas — RH", color: "bg-teal-500" },
  { value: "general", label: "Geral e Estratégia", color: "bg-indigo-500" },
];

const STATUS_LEGEND = [
  { value: "awaiting_decision", label: "Aguardando decisão", color: "bg-violet-500" },
  { value: "in_progress", label: "Em andamento", color: "bg-status-info" },
  { value: "blocked", label: "Bloqueada", color: "bg-status-error" },
  { value: "awaiting_validation", label: "Aguardando validação", color: "bg-status-warning" },
  { value: "completed", label: "Concluída", color: "bg-status-success" },
  { value: "late", label: "Atrasada", color: "bg-status-error" },
];

export default function CalendarLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
      >
        <span>Legenda</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Departamentos</p>
            <div className="flex flex-wrap gap-2">
              {DEPT_LEGEND.map((d) => (
                <span key={d.value} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${d.color}`} />
                  {d.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_LEGEND.map((s) => (
                <span key={s.value} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}