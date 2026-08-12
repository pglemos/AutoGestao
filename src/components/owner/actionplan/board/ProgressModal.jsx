// Modal de atualização de progresso.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProgressOptions } from "../actionPlanFormUtils";

export default function ProgressModal({ action, open, onOpenChange, onConfirm }) {
  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [projectedDate, setProjectedDate] = useState("");

  useEffect(() => {
    if (action) {
      setProgress(action.progress || 0);
      setComment("");
      setNextStep("");
      setProjectedDate("");
    }
  }, [action]);

  if (!action) return null;

  const handleConfirm = () => {
    onConfirm(action.id, { progress: Number(progress), comment: comment.trim(), nextStep: nextStep.trim(), projectedDate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar progresso</DialogTitle>
          <DialogDescription>{action.code} — {action.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Progresso atual: {action.progress || 0}%</Label>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${action.progress || 0}%` }} />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Novo progresso *</Label>
            <Select value={String(progress)} onValueChange={(v) => setProgress(parseInt(v, 10))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {getProgressOptions(action.progress).map((p) => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Comentário / atualização</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Descreva a atualização..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Próximo passo</Label>
              <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="O que vem agora?" />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Data prevista</Label>
              <Input value={projectedDate} onChange={(e) => setProjectedDate(e.target.value)} placeholder="DD/MM/AAAA" />
            </div>
          </div>
          {progress === 100 && (
            <div className="rounded-md bg-status-info-surface px-3 py-2 text-sm text-status-info-text">
              Progresso 100% não conclui a ação automaticamente. Use "Enviar para validação" após salvar.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90">Salvar atualização</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
