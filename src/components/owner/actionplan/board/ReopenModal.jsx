// Modal de reabertura de ação concluída.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/atoms/Input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/atoms/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeResponsibleValue, getProgressOptions } from "../actionPlanFormUtils";

export default function ReopenModal({ action, open, onOpenChange, onConfirm, responsiblePeople = [] }) {
  const [reason, setReason] = useState("");
  const [newResponsible, setNewResponsible] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [initialProgress, setInitialProgress] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (action) {
      setReason("");
      setNewResponsible(normalizeResponsibleValue(action.responsible));
      setNewDueDate("");
      setInitialProgress(0);
      setNote("");
    }
  }, [action]);

  if (!action) return null;
  const isValid = reason.trim() && newResponsible && newDueDate;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(action.id, { reason: reason.trim(), newResponsible, newDueDate, initialProgress, note: note.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reabrir ação</DialogTitle>
          <DialogDescription>{action.code} — {action.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Motivo da reabertura *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Novo responsável *</Label>
              <Select value={newResponsible} onValueChange={setNewResponsible}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Novo prazo *</Label>
              <Input value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} placeholder="DD/MM/AAAA" />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Progresso inicial após reabertura</Label>
            <Select value={String(initialProgress)} onValueChange={(v) => setInitialProgress(parseInt(v, 10))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {getProgressOptions(action.progress).filter((p) => p < 100).map((p) => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Observação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <p className="text-xs text-muted-foreground">O histórico anterior será preservado.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!isValid} className="bg-primary hover:bg-primary/90">Confirmar reabertura</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
