// Modal de bloqueio de ação.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BLOCK_CATEGORIES } from "../actionPlanConstants";
import { normalizeResponsibleValue } from "../actionPlanFormUtils";

export default function BlockModal({ action, open, onOpenChange, onConfirm, responsiblePeople = [] }) {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [responsible, setResponsible] = useState("");
  const [expectedUnblockDate, setExpectedUnblockDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (action) {
      setReason("");
      setCategory("");
      setResponsible(normalizeResponsibleValue(action.responsible));
      setExpectedUnblockDate("");
      setNote("");
    }
  }, [action]);

  if (!action) return null;
  const isValid = reason.trim() && category && responsible;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(action.id, { reason: reason.trim(), category, responsible, expectedUnblockDate, note: note.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear ação</DialogTitle>
          <DialogDescription>{action.code} — {action.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Motivo do bloqueio *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Descreva o motivo..." />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {BLOCK_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Responsável pela resolução *</Label>
              <Select value={responsible} onValueChange={setResponsible}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Previsão de desbloqueio</Label>
              <Input value={expectedUnblockDate} onChange={(e) => setExpectedUnblockDate(e.target.value)} placeholder="DD/MM/AAAA" />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Observação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!isValid} className="bg-status-error hover:bg-status-error text-status-error-foreground">Confirmar bloqueio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
