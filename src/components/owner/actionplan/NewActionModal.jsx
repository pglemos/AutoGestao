// Modal canônico de criação de ação, com suporte a modo Ação Rápida (Executiva) e Detalhado.
import { useState, useEffect } from "react";
import { Zap, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/atoms/Input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/atoms/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OBJECTIVES, DEPARTMENTS, PRIORITIES, ORIGINS } from "./actionPlanConstants";

const EMPTY_FORM = {
  title: "", description: "", problemOrOpportunity: "", strategicObjective: "sales_growth",
  department: "", indicator: "", responsible: "", priority: "medium", dueDate: "",
  expectedImpact: "", requiresOwner: false, origin: "manual", financialImpact: "",
  budget: "", evidenceRequired: false,
};

function buildInitialForm(initialValues, initialDueDate) {
  return {
    ...EMPTY_FORM,
    ...(initialValues || {}),
    strategicObjective: initialValues?.strategicObjective || "sales_growth",
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
  const [mode, setMode] = useState("quick"); // 'quick' | 'detailed'
  const [form, setForm] = useState(() => buildInitialForm(initialValues, initialDueDate));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(initialValues, initialDueDate));
      setMode("quick");
    }
  }, [open, initialDueDate, initialValues]);

  const isValid = form.title && form.department && form.responsible && form.priority && form.dueDate;
  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm({
      ...form,
      strategicObjective: form.strategicObjective || "sales_growth",
      financialImpact: form.financialImpact ? parseFloat(form.financialImpact) : null,
      budget: form.budget ? parseFloat(form.budget) : null,
    });
    setForm(EMPTY_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Nova Ação</DialogTitle>
            <div className="flex items-center rounded-lg border border-border bg-surface-alt p-0.5">
              <button
                type="button"
                onClick={() => setMode("quick")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  mode === "quick" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap size={14} className={mode === "quick" ? "text-status-success-text" : ""} />
                Ação Rápida
              </button>
              <button
                type="button"
                onClick={() => setMode("detailed")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  mode === "detailed" ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal size={14} />
                Completo
              </button>
            </div>
          </div>
          <DialogDescription>
            {mode === "quick"
              ? "Crie uma ação executiva em poucos campos essenciais."
              : "Defina objetivos estratégicos, orçamentos e detalhes operacionais."}
          </DialogDescription>
        </DialogHeader>

        {mode === "quick" ? (
          <div className="space-y-3.5 py-1">
            <div>
              <Label className="mb-1 block text-xs font-semibold">O que deve ser feito? (Título) *</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ex: Treinamento de abordagem no showroom"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-semibold">Departamento *</Label>
                <Select value={form.department} onValueChange={(value) => set("department", value)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold">Responsável *</Label>
                <Select value={form.responsible} onValueChange={(value) => set("responsible", value)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{responsiblePeople.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-semibold">Prazo *</Label>
                <Input value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} placeholder="DD/MM/AAAA" />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold">Prioridade *</Label>
                <Select value={form.priority} onValueChange={(value) => set("priority", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold">Instrução ou Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                placeholder="Orientações breves para a equipe..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <div><Label className="mb-1 block text-xs font-semibold">Título *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Título da ação" /></div>
            <div><Label className="mb-1 block text-xs font-semibold">Descrição</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Descreva a ação..." /></div>
            <div><Label className="mb-1 block text-xs font-semibold">Problema ou oportunidade</Label><Textarea value={form.problemOrOpportunity} onChange={(e) => set("problemOrOpportunity", e.target.value)} rows={2} placeholder="Descreva o problema ou oportunidade..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs font-semibold">Objetivo estratégico *</Label><Select value={form.strategicObjective} onValueChange={(value) => set("strategicObjective", value)}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{OBJECTIVES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="mb-1 block text-xs font-semibold">Departamento *</Label><Select value={form.department} onValueChange={(value) => set("department", value)}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{DEPARTMENTS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs font-semibold">Indicador</Label><Input value={form.indicator} onChange={(e) => set("indicator", e.target.value)} placeholder="Opcional" /></div>
              <div><Label className="mb-1 block text-xs font-semibold">Origem</Label><Select value={form.origin} onValueChange={(value) => set("origin", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORIGINS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs font-semibold">Responsável *</Label><Select value={form.responsible} onValueChange={(value) => set("responsible", value)}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{responsiblePeople.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="mb-1 block text-xs font-semibold">Prioridade *</Label><Select value={form.priority} onValueChange={(value) => set("priority", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label className="mb-1 block text-xs font-semibold">Prazo *</Label><Input value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} placeholder="DD/MM/AAAA" /></div>
            <div><Label className="mb-1 block text-xs font-semibold">Impacto esperado</Label><Textarea value={form.expectedImpact} onChange={(e) => set("expectedImpact", e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs font-semibold">Impacto financeiro (R$)</Label><Input type="number" value={form.financialImpact} onChange={(e) => set("financialImpact", e.target.value)} /></div>
              <div><Label className="mb-1 block text-xs font-semibold">Orçamento (R$)</Label><Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted/40"><input type="checkbox" checked={form.evidenceRequired} onChange={(e) => set("evidenceRequired", e.target.checked)} /><div><span className="text-sm font-medium">Evidência obrigatória</span><p className="text-xs text-muted-foreground">Exigirá evidência antes da validação.</p></div></label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted/40"><input type="checkbox" checked={form.requiresOwner} onChange={(e) => set("requiresOwner", e.target.checked)} /><div><span className="text-sm font-medium">Requer decisão do Dono</span><p className="text-xs text-muted-foreground">Inicia aguardando decisão.</p></div></label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid}>Criar ação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
