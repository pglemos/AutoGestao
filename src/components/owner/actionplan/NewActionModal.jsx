// Modal de criação de nova ação — fluxo simplificado.
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
import { OBJECTIVES, DEPARTMENTS, PRIORITIES, ORIGINS } from "./actionPlanConstants";

export default function NewActionModal({ open, onOpenChange, onConfirm, initialDueDate, responsiblePeople = [] }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    problemOrOpportunity: "",
    strategicObjective: "",
    department: "",
    indicator: "",
    responsible: "",
    priority: "medium",
    dueDate: "",
    expectedImpact: "",
    requiresOwner: false,
    origin: "manual",
    financialImpact: "",
    budget: "",
    evidenceRequired: false,
  });

  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    if (open && initialDueDate) {
      setForm((p) => ({ ...p, dueDate: initialDueDate }));
    }
  }, [open, initialDueDate]);

  const isValid = form.title && form.strategicObjective && form.department && form.responsible && form.priority && form.dueDate;

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm({
      ...form,
      financialImpact: form.financialImpact ? parseFloat(form.financialImpact) : null,
      budget: form.budget ? parseFloat(form.budget) : null,
    });
    setForm({
      title: "",
      description: "",
      problemOrOpportunity: "",
      strategicObjective: "",
      department: "",
      indicator: "",
      responsible: "",
      priority: "medium",
      dueDate: "",
      expectedImpact: "",
      requiresOwner: false,
      origin: "manual",
      financialImpact: "",
      budget: "",
      evidenceRequired: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Ação</DialogTitle>
          <DialogDescription>
            Crie uma nova ação vinculada a um objetivo estratégico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Título da ação" />
          </div>

          <div>
            <Label className="mb-1 block text-sm">Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Descreva a ação..."
            />
          </div>

          <div>
            <Label className="mb-1 block text-sm">Problema ou oportunidade</Label>
            <Textarea
              value={form.problemOrOpportunity}
              onChange={(e) => set("problemOrOpportunity", e.target.value)}
              rows={2}
              placeholder="Descreva o problema ou oportunidade..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Objetivo estratégico *</Label>
              <Select value={form.strategicObjective} onValueChange={(v) => set("strategicObjective", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Departamento *</Label>
              <Select value={form.department} onValueChange={(v) => set("department", v)}>
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
              <Input value={form.indicator} onChange={(e) => set("indicator", e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Origem</Label>
              <Select value={form.origin} onValueChange={(v) => set("origin", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGINS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Responsável *</Label>
              <Select value={form.responsible} onValueChange={(v) => set("responsible", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {responsiblePeople.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Prioridade *</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-sm">Prazo *</Label>
            <Input value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} placeholder="DD/MM/AAAA" />
          </div>

          <div>
            <Label className="mb-1 block text-sm">Impacto esperado</Label>
            <Textarea
              value={form.expectedImpact}
              onChange={(e) => set("expectedImpact", e.target.value)}
              rows={2}
              placeholder="Descreva o impacto esperado..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Impacto financeiro (R$)</Label>
              <Input
                type="number"
                value={form.financialImpact}
                onChange={(e) => set("financialImpact", e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Orçamento (R$)</Label>
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
            <input
              type="checkbox"
              checked={form.evidenceRequired}
              onChange={(e) => set("evidenceRequired", e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Evidência obrigatória</span>
              <p className="text-xs text-muted-foreground">Exigirá anexo de evidência antes do envio para validação</p>
            </div>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
            <input
              type="checkbox"
              checked={form.requiresOwner}
              onChange={(e) => set("requiresOwner", e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Requer decisão do Dono</span>
              <p className="text-xs text-muted-foreground">Se ativo, a ação iniciará com status "Aguardando decisão"</p>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="bg-primary hover:bg-primary/90">
            Criar ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
