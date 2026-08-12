// Modal de confirmação de alteração de prazo — usado por botão e drag-and-drop.
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Lock } from "lucide-react";
import { STATUS_STYLES } from "../actionPlanConstants";

export default function RescheduleModal({ action, newDate, open, onOpenChange, onConfirm }) {
  const [form, setForm] = useState({ newDueDate: "", reason: "", note: "" });

  useEffect(() => {
    if (open) {
      setForm({ newDueDate: newDate || action?.dueDate || "", reason: "", note: "" });
    }
  }, [open, newDate, action]);

  if (!action) return null;

  const isValid = form.newDueDate && form.reason && form.newDueDate !== action.dueDate;
  const isAwaitingValidation = action.status === "awaiting_validation";
  const isBlocked = action.status === "blocked";

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm(action.id, {
      oldDueDate: action.dueDate,
      newDueDate: form.newDueDate,
      reason: form.reason,
      note: form.note,
    });
  };

  const statusStyle = STATUS_STYLES[action.status] || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar prazo</DialogTitle>
          <DialogDescription>
            Confirme a alteração do prazo da ação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{action.code}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.badge || ""}`}>
                {statusStyle.label || action.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{action.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Prazo atual</Label>
              <Input value={action.dueDate || "—"} readOnly disabled />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Novo prazo *</Label>
              <Input
                value={form.newDueDate}
                onChange={(e) => setForm((p) => ({ ...p, newDueDate: e.target.value }))}
                placeholder="DD/MM/AAAA"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-sm">Motivo *</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              rows={2}
              placeholder="Motivo da alteração do prazo..."
            />
          </div>

          <div>
            <Label className="mb-1 block text-sm">Observação</Label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              rows={2}
              placeholder="Observação opcional..."
            />
          </div>

          {isAwaitingValidation && (
            <div className="flex items-start gap-2 rounded-lg bg-status-warning-surface p-3 text-xs text-status-warning-text">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Esta ação aguarda validação. Confirme que a alteração do prazo é necessária.</span>
            </div>
          )}

          {isBlocked && (
            <div className="flex items-start gap-2 rounded-lg bg-status-error-surface p-3 text-xs text-status-error-text">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>A ação continuará bloqueada após a alteração do prazo.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="bg-primary hover:bg-primary/90">
            Confirmar alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}