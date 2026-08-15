// Modal canônico de criação de ação, com suporte a contexto vindo de outros módulos.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/atoms/Input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/atoms/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OBJECTIVES, DEPARTMENTS, PRIORITIES, ORIGINS } from "./actionPlanConstants";

const EMPTY_FORM = {
  title: "", description: "", problemOrOpportunity: "", strategicObjective: "",
  department: "", indicator: "", responsible: "", priority: "medium", dueDate: "",
  expectedImpact: "", requiresOwner: false, origin: "manual", financialImpact: "",
  budget: "", evidenceRequired: false,
};

function buildInitialForm(initialValues, initialDueDate) {
  return {
    ...EMPTY_FORM,
    ...(initialValues || {}),
    dueDate: initialDueDate || initialValues?.dueDate || "",
  };
}

/**
 * @typedef {Object} NewActionModalProps
 * @property {boolean} open
 * @property {(open: boolean) => void} onOpenChange
 * @property {(payload: Record<string, unknown>) => void | Promise<void>} onConfirm
 * @property {string=} initialDueDate
 * @property {Record<string, any>=} initialValues
 * @property {string[]=} responsiblePeople
 */

/** @param {NewActionModalProps} props */
export default function NewActionModal({
  open,
  onOpenChange,
  onConfirm,
  initialDueDate,
  initialValues,
  responsiblePeople = [],
}) {
  const [form, setForm] = useState(() => buildInitialForm(initialValues, initialDueDate));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (open) setForm(buildInitialForm(initialValues, initialDueDate));
  }, [open, initialDueDate, initialValues]);

  const isValid = form.title && form.strategicObjective && form.department && form.responsible && form.priority && form.dueDate;
  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm({
      ...form,
      financialImpact: form.financialImpact ? parseFloat(form.financialImpact) : null,
      budget: form.budget ? parseFloat(form.budget) : null,
    });
    setForm(EMPTY_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Ação</DialogTitle>
          <DialogDescription>Crie uma ação no Plano de Ação canônico. O contexto recebido de outros módulos pode ser editado antes do envio.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label className="mb-1 block text-sm">Título *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Título da ação" /></div>
          <div><Label className="mb-1 block text-sm">Descrição</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Descreva a ação..." /></div>
          <div><Label className="mb-1 block text-sm">Problema ou oportunidade</Label><Textarea value={form.problemOrOpportunity} onChange={(e) => set("problemOrOpportunity", e.target.value)} rows={2} placeholder="Descreva o problema ou oportunidade..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-sm">Objetivo estratégico *</Label><Select value={form.strategicObjective} onValueChange={(value) => set("strategicObjective", value)}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{OBJECTIVES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="mb-1 block text-sm">Departamento *</Label><Select value={form.department} onValueChange={(value) => set("department", value)}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{DEPARTMENTS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-sm">Indicador</Label><Input value={form.indicator} onChange={(e) => set("indicator", e.target.value)} placeholder="Opcional" /></div>
            <div><Label className="mb-1 block text-sm">Origem</Label><Select value={form.origin} onValueChange={(value) => set("origin", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORIGINS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-sm">Responsável *</Label><Select value={form.responsible} onValueChange={(value) => set("responsible", value)}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{responsiblePeople.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="mb-1 block text-sm">Prioridade *</Label><Select value={form.priority} onValueChange={(value) => set("priority", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label className="mb-1 block text-sm">Prazo *</Label><Input value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} placeholder="DD/MM/AAAA" /></div>
          <div><Label className="mb-1 block text-sm">Impacto esperado</Label><Textarea value={form.expectedImpact} onChange={(e) => set("expectedImpact", e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-sm">Impacto financeiro (R$)</Label><Input type="number" value={form.financialImpact} onChange={(e) => set("financialImpact", e.target.value)} /></div>
            <div><Label className="mb-1 block text-sm">Orçamento (R$)</Label><Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted/40"><input type="checkbox" checked={form.evidenceRequired} onChange={(e) => set("evidenceRequired", e.target.checked)} /><div><span className="text-sm font-medium">Evidência obrigatória</span><p className="text-xs text-muted-foreground">Exigirá evidência antes da validação.</p></div></label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted/40"><input type="checkbox" checked={form.requiresOwner} onChange={(e) => set("requiresOwner", e.target.checked)} /><div><span className="text-sm font-medium">Requer decisão do Dono</span><p className="text-xs text-muted-foreground">Inicia aguardando decisão.</p></div></label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={!isValid}>Criar ação</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
