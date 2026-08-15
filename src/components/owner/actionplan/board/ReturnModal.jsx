// Modal de devolução para execução.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/atoms/Input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/atoms/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeResponsibleValue } from "../actionPlanFormUtils";

export default function ReturnModal({ action, open, onOpenChange, onConfirm, responsiblePeople = [] }) {
  const [reason, setReason] = useState("");
  const [guidance, setGuidance] = useState("");
  const [responsible, setResponsible] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    if (action) {
      setReason("");
      setGuidance("");
      setResponsible(normalizeResponsibleValue(action.responsible));
      setNewDueDate("");
    }
  }, [action]);

  if (!action) return null;
  const isValid = reason.trim() && guidance.trim() && responsible;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(action.id, { reason: reason.trim(), guidance: guidance.trim(), responsible, newDueDate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver para execução</DialogTitle>
          <DialogDescription>{action.code} — {action.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Motivo da devolução *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Por que está sendo devolvida?" />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Orientação *</Label>
            <Textarea value={guidance} onChange={(e) => setGuidance(e.target.value)} rows={2} placeholder="O que precisa ser ajustado?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Responsável *</Label>
              <Select value={responsible} onValueChange={setResponsible}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Novo prazo (opcional)</Label>
              <Input value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} placeholder="DD/MM/AAAA" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!isValid} className="bg-primary hover:bg-primary/90">Confirmar devolução</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
