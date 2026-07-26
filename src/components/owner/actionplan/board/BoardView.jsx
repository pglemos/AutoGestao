// Container principal da aba Ações — Kanban e tabela detalhada.
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { actionPlanLiveRepository } from "../actionPlanLiveRepository";
import { exportActionsCSV } from "../exportActions";
import { Button } from "@/components/ui/button";
import KanbanBoard from "./KanbanBoard";
import ListView from "./ListView";
import BatchActionsBar from "./BatchActionsBar";

export default function BoardView({
  actions,
  loading,
  mode,
  sortBy,
  onSortChange,
  onQuickAction,
  onMoveTo,
  onDragEnd,
  onNewAction,
  onOpenGuide,
  onClearFilters,
  user,
  onReload,
}) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };
  const toggleSelectAll = (ids) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((i) => prev.includes(i));
      if (allSelected) return prev.filter((i) => !ids.includes(i));
      return [...new Set([...prev, ...ids])];
    });
  };

  const handleBatchResponsible = async (responsible) => {
    try {
      await actionPlanLiveRepository.batchUpdate(selectedIds, { responsible });
      toast({ title: `${selectedIds.length} ação(ões) atualizada(s).` });
      setSelectedIds([]);
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível atualizar as ações.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleBatchPriority = async (priority) => {
    try {
      await actionPlanLiveRepository.batchUpdate(selectedIds, { priority });
      toast({ title: `${selectedIds.length} ação(ões) atualizada(s).` });
      setSelectedIds([]);
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível atualizar as ações.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleBatchDueDate = async () => {
    const dueDate = window.prompt("Novo prazo para as ações selecionadas (DD/MM/AAAA):");
    if (!dueDate) return;
    try {
      await actionPlanLiveRepository.batchUpdate(selectedIds, { dueDate });
      toast({ title: `${selectedIds.length} ação(ões) atualizada(s).` });
      setSelectedIds([]);
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível atualizar as ações.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleExportSelected = () => {
    const selected = actions.filter((a) => selectedIds.includes(a.id));
    exportActionsCSV(selected);
    toast({ title: "Exportação concluída." });
  };

  const handleRequestUpdate = async () => {
    try {
      await Promise.all(selectedIds.map((id) => actionPlanLiveRepository.addComment(id, {
        author: user?.full_name || "Dono",
        content: "Solicito atualização do status e progresso desta ação.",
      })));
      toast({ title: `${selectedIds.length} solicitação(ões) enviada(s).` });
      setSelectedIds([]);
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível solicitar atualização.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma ação encontrada para os filtros selecionados.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClearFilters}>Limpar filtros</Button>
          <Button onClick={onNewAction} className="bg-primary hover:bg-primary/90">Nova Ação</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mode === "table" && (
        <BatchActionsBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onBatchResponsible={handleBatchResponsible}
          onBatchDueDate={handleBatchDueDate}
          onBatchPriority={handleBatchPriority}
          onExportSelected={handleExportSelected}
          onRequestUpdate={handleRequestUpdate}
        />
      )}
      {mode === "kanban" ? (
        <KanbanBoard
          actions={actions}
          sortBy={sortBy}
          onQuickAction={onQuickAction}
          onMoveTo={onMoveTo}
          onDragEnd={onDragEnd}
        />
      ) : (
        <ListView
          actions={actions}
          sortBy={sortBy}
          onSortChange={onSortChange}
          onQuickAction={onQuickAction}
          onMoveTo={onMoveTo}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      )}
    </div>
  );
}
