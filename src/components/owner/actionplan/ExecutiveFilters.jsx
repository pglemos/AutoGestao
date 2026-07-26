// Barra de filtros da Visão Executiva.
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS } from "./actionPlanConstants";

const selectClass = "h-9 text-sm";

export default function ExecutiveFilters({ filters, onChange, onClear, collapsed, onToggleCollapse, responsiblePeople = [] }) {
  const set = (key, value) => onChange({ ...filters, [key]: value || undefined });

  const activeChips = [];
  if (filters.department) activeChips.push({ key: "department", label: `Departamento: ${DEPARTMENTS.find((d) => d.value === filters.department)?.label}` });
  if (filters.responsible) activeChips.push({ key: "responsible", label: `Equipe: ${filters.responsible}` });

  const removeChip = (key) => set(key, undefined);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Filtros</h2>
        <div className="flex items-center gap-2">
          {activeChips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-muted-foreground">
              Limpar filtros
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="text-xs text-muted-foreground">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Departamento</label>
              <Select value={filters.department || "all"} onValueChange={(v) => set("department", v === "all" ? undefined : v)}>
                <SelectTrigger className={selectClass}><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  {DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Equipe</label>
              <Select value={filters.responsible || "all"} onValueChange={(v) => set("responsible", v === "all" ? undefined : v)}>
                <SelectTrigger className={selectClass}><SelectValue placeholder="Equipe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda a equipe</SelectItem>
                  {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClear}>Limpar filtros</Button>
          </div>
        </div>
      )}

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
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
        </div>
      )}
    </section>
  );
}
