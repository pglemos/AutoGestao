// Cabeçalho compacto da aba Quadro de Ações.
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanSquare, List, Plus, BookOpen } from "lucide-react";
import { SORT_OPTIONS } from "../actionPlanConstants";

export default function BoardHeader({ count, view, onViewChange, sortBy, onSortChange, onNewAction, onOpenGuide }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{count}</span> ação{count !== 1 ? "ões" : ""} encontrada{count !== 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onOpenGuide} className="text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> Guia de transições
        </Button>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            onClick={() => onViewChange("kanban")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === "kanban" ? "bg-status-success-surface text-status-success-text shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <KanbanSquare className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === "list" ? "bg-status-success-surface text-status-success-text shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onNewAction} className="bg-primary hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Nova Ação
        </Button>
      </div>
    </div>
  );
}