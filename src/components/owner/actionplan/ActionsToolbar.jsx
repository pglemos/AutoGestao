// Barra de ferramentas compacta da aba Ações — filtros, modos e ordenação.
import { SlidersHorizontal, Plus, Target, KanbanSquare, Table2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEPARTMENTS,
  SORT_OPTIONS,
} from "./actionPlanConstants";

const selectClass = "h-9 text-sm";

const MODES = [
  { value: "foco", label: "Foco", icon: Target },
  { value: "kanban", label: "Kanban", icon: KanbanSquare },
  { value: "table", label: "Tabela", icon: Table2 },
];

export default function ActionsToolbar({
  filters,
  onFilterChange,
  onClearFilters,
  mode,
  onModeChange,
  sortBy,
  onSortChange,
  onNewAction,
  isMobile,
  onOpenMobileFilters,
  responsiblePeople = [],
}) {
  const set = (key, value) => onFilterChange({ ...filters, [key]: value || undefined });

  const activeChips = [];
  if (filters.department) activeChips.push({ key: "department", label: `Departamento: ${DEPARTMENTS.find((d) => d.value === filters.department)?.label}` });
  if (filters.responsible) activeChips.push({ key: "responsible", label: `Responsável: ${filters.responsible}` });

  const removeChip = (key) => set(key, undefined);

  return (
    <section className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {isMobile ? (
            <Button variant="outline" size="sm" onClick={onOpenMobileFilters} className="shrink-0">
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </Button>
          ) : (
            <>
              <Select value={filters.department || "all"} onValueChange={(v) => set("department", v === "all" ? undefined : v)}>
              <SelectTrigger className={`${selectClass} w-[208px]`}><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  {DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.responsible || "all"} onValueChange={(v) => set("responsible", v === "all" ? undefined : v)}>
              <SelectTrigger className={`${selectClass} w-[208px]`}><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Right: mode switcher + sort + new action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => onModeChange(m.value)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {m.label}
                </button>
              );
            })}
          </div>

          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={onNewAction} className="bg-primary hover:bg-primary/90 shrink-0">
            <Plus className="h-4 w-4" /> Nova Ação
          </Button>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
            >
              {chip.label}
              <button onClick={() => removeChip(chip.key)} className="hover:text-emerald-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button onClick={onClearFilters} className="text-xs text-muted-foreground hover:text-foreground">
            Limpar tudo
          </button>
        </div>
      )}
    </section>
  );
}
