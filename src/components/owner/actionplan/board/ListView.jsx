// Modo Lista — tabela com seleção em lote, colunas fixas e ordenação.
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, ArrowUpDown, Eye } from "lucide-react";
import { DEPT_STYLES, PRIORITY_STYLES, STATUS_STYLES, QUICK_ACTIONS } from "../actionPlanConstants";
import { sortActions, formatDueDate, isLate, daysLate } from "../actionPlanUtils";
import MoveToMenu from "./MoveToMenu";

export default function ListView({ actions, sortBy, onSortChange, onQuickAction, onDelete, onMoveTo, selectedIds, onToggleSelect, onToggleSelectAll }) {
  const sorted = sortActions(actions, sortBy);
  const allSelected = sorted.length > 0 && sorted.every((a) => selectedIds.includes(a.id));

  return (
    <div className="overflow-x-auto rounded-xl border border-border" role="region" tabIndex={0} aria-label="Lista de ações com rolagem horizontal">
      <table className="w-full min-w-[1980px] table-fixed text-sm">
        <colgroup>
          <col className="w-10" /><col className="w-28" /><col className="w-64" /><col className="w-48" />
          <col className="w-40" /><col className="w-44" /><col className="w-40" /><col className="w-24" />
          <col className="w-40" /><col className="w-36" /><col className="w-28" /><col className="w-28" />
          <col className="w-36" /><col className="w-32" /><col className="w-16" />
        </colgroup>
        <thead className="sticky top-0 bg-muted/50">
          <tr className="border-b border-border">
            <th className="w-10 px-2 py-2 text-left">
              <Checkbox aria-label="Selecionar todas as ações" checked={allSelected} onCheckedChange={() => onToggleSelectAll(sorted.map((a) => a.id))} />
            </th>
            <th className="sticky left-10 z-10 whitespace-nowrap bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              <SortButton label="Código" onClick={() => onSortChange("updated_recent")} />
            </th>
            <th className="sticky left-[88px] z-10 whitespace-nowrap bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Ação</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Objetivo</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Indicador</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Depto</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Resp.</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Prio</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Progresso</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Início</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Prazo</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Atraso</th>
            <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Atualização</th>
            <th className="w-12 whitespace-nowrap px-2 py-2 text-center text-xs font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((action) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
            const status = STATUS_STYLES[action.status] || STATUS_STYLES.not_started;
            const late = isLate(action);
            const lateDays = daysLate(action);
            const quickActions = QUICK_ACTIONS[action.status] || [];
            const selected = selectedIds.includes(action.id);

            return (
              <tr key={action.id} className={`border-b border-border transition-colors hover:bg-muted/30 ${selected ? "bg-status-success-surface/40" : ""}`}>
                <td className="px-2 py-2">
                  <Checkbox aria-label={`Selecionar ação ${action.title}`} checked={selected} onCheckedChange={() => onToggleSelect(action.id)} />
                </td>
                <td className="sticky left-10 z-10 bg-card px-3 py-2 text-xs font-bold text-muted-foreground">{action.code}</td>
                <td className="sticky left-[88px] z-10 max-w-[256px] bg-card px-3 py-2">
                  <button title={action.title} onClick={() => onQuickAction(action, "open")} className="block w-full truncate text-left text-sm font-medium text-foreground hover:text-primary">
                    {action.title}
                  </button>
                </td>
                <td title={action.strategicObjectiveLabel} className="max-w-[192px] truncate px-3 py-2 text-xs text-muted-foreground">{action.strategicObjectiveLabel}</td>
                <td title={action.indicator || "—"} className="max-w-[160px] truncate px-3 py-2 text-xs text-muted-foreground">{action.indicator || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2"><span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${dept.badge}`}>{dept.label}</span></td>
                <td className="truncate px-3 py-2 text-xs text-foreground" title={action.responsible}>{action.responsible}</td>
                <td className="whitespace-nowrap px-3 py-2"><span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${priority.badge}`}>{priority.label}</span></td>
                <td className="whitespace-nowrap px-3 py-2"><span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${status.badge}`}>{status.label}</span></td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${action.status === "completed" ? "bg-status-success" : action.status === "blocked" ? "bg-red-400" : "bg-status-info"}`} style={{ width: `${action.progress}%` }} />
                    </div>
                    <span className="text-xs text-foreground">{action.progress}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{action.startDate}</td>
                <td className="px-3 py-2 text-xs text-foreground">{formatDueDate(action)}</td>
                <td className="px-3 py-2 text-xs">
                  {late ? <span className="font-medium text-status-error-text">Atrasada há {lateDays}d</span> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{action.lastUpdate}</td>
                <td className="px-2 py-2 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" aria-label={`Ações para ${action.title}`} className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => onQuickAction(action, "open")}><Eye className="h-3.5 w-3.5" /> Abrir</DropdownMenuItem>
                      {quickActions.filter((q) => q.value !== "open").map((qa) => (
                        <DropdownMenuItem key={qa.value} onClick={() => onQuickAction(action, qa.value)}>{qa.label}</DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      {onDelete && <DropdownMenuItem className="text-destructive" onClick={() => onDelete(action)}>Excluir definitivamente</DropdownMenuItem>}
                      <MoveToMenu action={action} onMoveTo={onMoveTo} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={15} className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma ação encontrada para os filtros selecionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortButton({ label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}
