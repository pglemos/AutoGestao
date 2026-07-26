// Aba Execução do drawer — progresso, checklist, comentários, bloqueios.
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, Trash2, Lock, Unlock, MessageSquare, ListChecks } from "lucide-react";
import { actionPlanLiveRepository } from "../actionPlanLiveRepository";
import { getExecutionQuickActions, shouldShowProgressEditor } from "../actionPlanUiUtils";

export default function ExecutionTab({ action, onReload, onQuickAction, user }) {
  const { toast } = useToast();
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newChecklistRequired, setNewChecklistRequired] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const checklistProgress = actionPlanLiveRepository.getChecklistProgress(action);
  const showProgressEditor = shouldShowProgressEditor(action.status);
  const sharedActions = getExecutionQuickActions(action.status);

  const handleAddChecklist = async () => {
    if (!newChecklistText.trim()) return;
    try {
      await actionPlanLiveRepository.addChecklistItem(action.id, { text: newChecklistText.trim(), required: newChecklistRequired });
      setNewChecklistText("");
      setNewChecklistRequired(false);
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível adicionar o item.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleToggleChecklist = async (itemId, done) => {
    try {
      await actionPlanLiveRepository.updateChecklistItem(action.id, itemId, { done: !done });
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível atualizar o checklist.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleRemoveChecklist = async (itemId) => {
    try {
      await actionPlanLiveRepository.removeChecklistItem(action.id, itemId);
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível remover o item.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = async (itemId) => {
    try {
      if (editText.trim()) {
        await actionPlanLiveRepository.updateChecklistItem(action.id, itemId, { text: editText.trim() });
      }
      setEditingId(null);
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível editar o item.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await actionPlanLiveRepository.addComment(action.id, { author: user?.full_name || "Nome não informado", content: newComment.trim() });
      setNewComment("");
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível adicionar o comentário.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Progresso */}
      {showProgressEditor && (
        <section className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Progresso atual</p>
            <span className="text-lg font-bold text-foreground">{action.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${action.progress}%` }} />
          </div>
          {checklistProgress != null && (
            <p className="mt-1.5 text-xs text-muted-foreground">Checklist sugere: {checklistProgress}%</p>
          )}
          <Button size="sm" variant="outline" className="mt-2" onClick={() => onQuickAction(action, "progress")}>
            Atualizar progresso
          </Button>
        </section>
      )}

      {sharedActions.length > 0 && (
        <section className="flex flex-wrap gap-2 rounded-lg border border-border p-3">
          {sharedActions.map((quickAction) => {
            const isPrimary = ["approve", "validate", "start", "submitValidation"].includes(quickAction.value);
            const isDanger = ["cancel", "return"].includes(quickAction.value);
            return (
              <Button
                key={quickAction.value}
                size="sm"
                variant={isPrimary ? "default" : "outline"}
                onClick={() => onQuickAction(action, quickAction.value)}
                className={isPrimary ? "bg-primary hover:bg-primary/90" : isDanger ? "text-red-600 hover:text-red-700" : ""}
              >
                {quickAction.label}
              </Button>
            );
          })}
        </section>
      )}

      {/* Checklist */}
      <section className="rounded-lg border border-border p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground"><ListChecks className="h-4 w-4" /> Checklist</p>
        <div className="space-y-1.5">
          {(action.checklist || []).map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5">
              <button
                onClick={() => handleToggleChecklist(item.id, item.done)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"}`}
              >
                {item.done && <Check className="h-3 w-3" />}
              </button>
              {editingId === item.id ? (
                <Input value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={() => handleSaveEdit(item.id)} onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item.id)} className="h-7 text-xs" autoFocus />
              ) : (
                <span className={`flex-1 text-xs ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`} onClick={() => handleStartEdit(item)}>
                  {item.text} {item.required && <span className="text-red-500">*</span>}
                </span>
              )}
              <button onClick={() => handleRemoveChecklist(item.id)} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {(action.checklist || []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum item no checklist.</p>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input value={newChecklistText} onChange={(e) => setNewChecklistText(e.target.value)} placeholder="Novo item..." className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && handleAddChecklist()} />
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={newChecklistRequired} onChange={(e) => setNewChecklistRequired(e.target.checked)} className="h-3.5 w-3.5" />
            Obrig.
          </label>
          <Button size="sm" variant="outline" onClick={handleAddChecklist} className="h-8 px-2"><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </section>

      {/* Bloqueio */}
      {action.status === "blocked" ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-red-700"><Lock className="h-4 w-4" /> Ação bloqueada</p>
          <p className="text-sm text-red-900">{action.blockedReason}</p>
          {action.blockCategory && <p className="mt-1 text-xs text-red-600">Categoria: {action.blockCategory}</p>}
          {action.blockResponsible && <p className="text-xs text-red-600">Responsável: {action.blockResponsible}</p>}
          <Button size="sm" variant="outline" className="mt-2" onClick={() => onQuickAction(action, "unblock")}>
            <Unlock className="h-3.5 w-3.5" /> Remover bloqueio
          </Button>
        </section>
      ) : action.status === "in_progress" && (
        <section className="rounded-lg border border-border p-3">
          <p className="mb-2 text-sm font-medium text-foreground">Bloqueio</p>
          <Button size="sm" variant="outline" onClick={() => onQuickAction(action, "block")} className="text-red-600 hover:text-red-700">
            <Lock className="h-3.5 w-3.5" /> Bloquear ação
          </Button>
        </section>
      )}

      {/* Comentários */}
      <section className="rounded-lg border border-border p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground"><MessageSquare className="h-4 w-4" /> Comentários</p>
        <div className="space-y-2">
          {(action.comments || []).map((c) => (
            <div key={c.id} className="rounded-md bg-muted/30 p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{c.author}</span>
                <span className="text-muted-foreground">{c.date}</span>
              </div>
              <p className="mt-0.5 text-sm text-foreground">{c.content}</p>
            </div>
          ))}
          {(action.comments || []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário.</p>}
        </div>
        <div className="mt-2 flex gap-2">
          <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Adicionar comentário..." rows={2} className="text-xs" />
          <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()} className="self-end">Enviar</Button>
        </div>
      </section>
    </div>
  );
}
