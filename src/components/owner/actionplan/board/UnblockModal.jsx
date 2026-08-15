// Modal de remoção de bloqueio.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/atoms/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeResponsibleValue } from "../actionPlanFormUtils";

export default function UnblockModal({ action, open, onOpenChange, onConfirm, responsiblePeople = [] }) {
  const [solution, setSolution] = useState("");
  const [responsible, setResponsible] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (action) {
      setSolution("");
      setResponsible(normalizeResponsibleValue(action.blockResponsible || action.responsible));
      setNote("");
    }
  }, [action]);

  if (!action) return null;
  const isValid = solution.trim() && responsible;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(action.id, { solution: solution.trim(), responsible, note: note.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remover bloqueio</DialogTitle>
          <DialogDescription>{action.code} — {action.title}</DialogDescription>
        </DialogHeader>
        {action.blockedReason && (
          <div className="rounded-md bg-status-error-surface px-3 py-2 text-sm text-status-error-text">
            Bloqueio atual: {action.blockedReason}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Solução aplicada *</Label>
            <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={2} placeholder="Descreva a solução..." />
          </div>
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
            <Label className="mb-1 block text-sm">Observação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <p className="text-xs text-muted-foreground">O progresso anterior ({action.progress}%) será preservado.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!isValid} className="bg-primary hover:bg-primary/90">Confirmar desbloqueio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
