// Modal de aprovação de conclusão (validação).
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/atoms/Input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/atoms/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IMPACT_STATUSES } from "../actionPlanConstants";

export default function ValidateModal({ action, open, onOpenChange, onConfirm }) {
  const [note, setNote] = useState("");
  const [impactStatus, setImpactStatus] = useState("unmeasured");
  const [valueBefore, setValueBefore] = useState("");
  const [valueAfter, setValueAfter] = useState("");

  useEffect(() => {
    if (action) {
      setNote("");
      setImpactStatus(action.impactStatus || "unmeasured");
      setValueBefore("");
      setValueAfter("");
    }
  }, [action]);

  if (!action) return null;

  const handleConfirm = () => {
    onConfirm(action.id, { note: note.trim(), impactStatus, valueBefore: valueBefore || null, valueAfter: valueAfter || null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aprovar conclusão</DialogTitle>
          <DialogDescription>{action.code} — {action.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">Resumo</p>
            <p className="mt-1 text-muted-foreground">{action.description || action.title}</p>
            {action.expectedImpact && <p className="mt-1 text-muted-foreground"><span className="font-medium">Impacto esperado:</span> {action.expectedImpact}</p>}
          </div>
          {(action.evidences || []).length > 0 && (
            <div>
              <Label className="mb-1 block text-sm">Evidências ({action.evidences.length})</Label>
              <div className="space-y-1">
                {action.evidences.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
                    <span className="font-medium text-foreground">{e.name}</span>
                    <span className="text-muted-foreground">· {e.responsible}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="mb-1 block text-sm">Impacto inicial *</Label>
            <Select value={impactStatus} onValueChange={setImpactStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMPACT_STATUSES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Valor antes</Label>
              <Input value={valueBefore} onChange={(e) => setValueBefore(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Valor depois</Label>
              <Input value={valueAfter} onChange={(e) => setValueAfter(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Observação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm}>Aprovar conclusão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}