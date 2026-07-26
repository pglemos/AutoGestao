// Modal de delegação de ação.
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
import { PRIORITIES } from "./actionPlanConstants";

export default function DelegateModal({ action, open, onOpenChange, onConfirm, responsiblePeople = [] }) {
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState("");

  useEffect(() => {
    if (action) {
      setResponsible(action.executor || action.responsible || "");
      setDueDate(action.dueDate || "");
      setNote("");
      setPriority(action.priority || "medium");
    }
  }, [action]);

  if (!action) return null;

  const handleConfirm = () => {
    onConfirm(action.id, { responsible, dueDate, note, priority });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delegar ação</DialogTitle>
          <DialogDescription>
            {action.code} — {action.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Responsável</Label>
            <Select value={responsible} onValueChange={setResponsible}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Prazo</Label>
              <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="DD/MM/AAAA" />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-sm">Orientação</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Descreva a orientação para o responsável..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90">
            Confirmar delegação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
