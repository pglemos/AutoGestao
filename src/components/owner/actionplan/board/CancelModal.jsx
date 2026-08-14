// Modal de cancelamento de ação.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CancelModal({ action, open, onOpenChange, onConfirm }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (action) {
      setReason("");
      setNote("");
      setConfirm(false);
    }
  }, [action]);

  if (!action) return null;
  const isValid = reason.trim() && confirm;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(action.id, { reason: reason.trim(), note: note.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar ação</DialogTitle>
          <DialogDescription>{action.code} — {action.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text">
            A ação será removida do Kanban principal e mantida no histórico. Não será incluída nos cálculos.
          </div>
          <div>
            <Label className="mb-1 block text-sm">Motivo do cancelamento *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Observação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="h-4 w-4 rounded border-border" />
            <span className="text-sm text-foreground">Confirmo que desejo cancelar esta ação.</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button onClick={handleConfirm} disabled={!isValid} className="bg-status-error hover:bg-status-error text-status-error-foreground">Cancelar ação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}