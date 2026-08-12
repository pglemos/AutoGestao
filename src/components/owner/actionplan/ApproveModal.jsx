// Modal de aprovação de ação.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeResponsibleValue } from "./actionPlanFormUtils";

export default function ApproveModal({ action, open, onOpenChange, onConfirm, responsiblePeople = [] }) {
  const [note, setNote] = useState("");
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (action) {
      setNote("");
      setResponsible(normalizeResponsibleValue(action.executor || action.responsible));
      setDueDate(action.dueDate || "");
      setBudget(action.budget != null ? String(action.budget) : "");
    }
  }, [action]);

  if (!action) return null;

  const handleConfirm = () => {
    onConfirm(action.id, {
      note: note.trim(),
      responsible,
      dueDate,
      budget: budget ? parseFloat(budget) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aprovar ação</DialogTitle>
          <DialogDescription>
            {action.code} — {action.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Decisão</Label>
            <p className="rounded-md bg-status-success-surface px-3 py-2 text-sm text-status-success-text">
              Aprovar e iniciar execução
            </p>
          </div>

          <div>
            <Label className="mb-1 block text-sm">Observação</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Adicione uma observação sobre a aprovação..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Responsável pela execução</Label>
              <Select value={responsible} onValueChange={setResponsible}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Novo prazo</Label>
              <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="DD/MM/AAAA" />
            </div>
          </div>

          {action.budget != null && (
            <div>
              <Label className="mb-1 block text-sm">Orçamento (R$)</Label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90">
            Confirmar aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
