// Modal de duplicação de ação.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OBJECTIVES, DEPARTMENTS, PRIORITIES, ORIGINS, getObjectiveLabel, getDeptLabel } from "../actionPlanConstants";

export default function DuplicateModal({ action, open, onOpenChange, onConfirm, responsiblePeople = [] }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (action) {
      setForm({
        title: action.title,
        description: action.description || "",
        problemOrOpportunity: action.problemOrOpportunity || "",
        strategicObjective: action.strategicObjective,
        department: action.department,
        indicator: action.indicator || "",
        responsible: "",
        priority: action.priority,
        dueDate: "",
        expectedImpact: action.expectedImpact || "",
        origin: action.origin || "manual",
        requiresOwner: false,
      });
    }
  }, [action]);

  if (!action) return null;
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isValid = form.title && form.strategicObjective && form.department && form.priority;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(action.id, {
      ...form,
      departmentLabel: getDeptLabel(form.department),
      strategicObjectiveLabel: getObjectiveLabel(form.strategicObjective),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicar ação</DialogTitle>
          <DialogDescription>
            Nova ação a partir de {action.code}. Código, status, progresso, evidências e histórico não serão copiados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Título *</Label>
            <Input value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Descrição</Label>
            <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Problema ou oportunidade</Label>
            <Textarea value={form.problemOrOpportunity || ""} onChange={(e) => set("problemOrOpportunity", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Objetivo estratégico *</Label>
              <Select value={form.strategicObjective || ""} onValueChange={(v) => set("strategicObjective", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Departamento *</Label>
              <Select value={form.department || ""} onValueChange={(v) => set("department", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Indicador</Label>
              <Input value={form.indicator || ""} onChange={(e) => set("indicator", e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Origem</Label>
              <Select value={form.origin || "manual"} onValueChange={(v) => set("origin", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGINS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Responsável</Label>
              <Select value={form.responsible || ""} onValueChange={(v) => set("responsible", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Prioridade *</Label>
              <Select value={form.priority || "medium"} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Prazo</Label>
            <Input value={form.dueDate || ""} onChange={(e) => set("dueDate", e.target.value)} placeholder="DD/MM/AAAA" />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Impacto esperado</Label>
            <Textarea value={form.expectedImpact || ""} onChange={(e) => set("expectedImpact", e.target.value)} rows={2} />
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
            <input type="checkbox" checked={form.requiresOwner || false} onChange={(e) => set("requiresOwner", e.target.checked)} className="h-4 w-4 rounded border-border" />
            <span className="text-sm font-medium text-foreground">Requer decisão do Dono</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!isValid} className="bg-primary hover:bg-primary/90">Criar ação duplicada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
