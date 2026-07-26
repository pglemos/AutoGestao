// Barra de ações em lote para o modo Lista.
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, X, UserCog, CalendarClock, Flag, MessageSquare } from "lucide-react";
import { PRIORITIES } from "../actionPlanConstants";

export default function BatchActionsBar({ selectedCount, onClear, onBatchResponsible, onBatchDueDate, onBatchPriority, onExportSelected, onRequestUpdate, responsiblePeople = [] }) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <span className="text-sm font-medium text-emerald-700">{selectedCount} selecionada{selectedCount !== 1 ? "s" : ""}</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Select onValueChange={onBatchResponsible}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><span className="flex items-center gap-1"><UserCog className="h-3 w-3" /> Responsável</span></SelectTrigger>
          <SelectContent>
            {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={onBatchPriority}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><span className="flex items-center gap-1"><Flag className="h-3 w-3" /> Prioridade</span></SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={onBatchDueDate} className="h-8 text-xs">
          <CalendarClock className="h-3.5 w-3.5" /> Prazo
        </Button>
        <Button size="sm" variant="outline" onClick={onRequestUpdate} className="h-8 text-xs">
          <MessageSquare className="h-3.5 w-3.5" /> Solicitar atualização
        </Button>
        <Button size="sm" variant="outline" onClick={onExportSelected} className="h-8 text-xs">
          <Download className="h-3.5 w-3.5" /> Exportar
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} className="h-8 w-8 p-0">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
