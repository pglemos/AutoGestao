import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/atoms/Input';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS, PRIORITIES } from "./actionPlanConstants";

export default function EditActionModal({ action, open, onOpenChange, onConfirm, responsiblePeople = [] }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!action) return;
    setForm({
      title: action.title || "",
      strategicObjectiveLabel: action.strategicObjectiveLabel || "",
      department: action.department || "general",
      indicator: action.indicator || "",
      responsible: action.responsible && action.responsible !== "Não definido" ? action.responsible : "",
      priority: action.priority || "medium",
      dueDate: action.dueDate || "",
      como: action.expectedImpact || "",
    });
  }, [action]);

  if (!action) return null;

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const people = [...new Set([form.responsible, ...responsiblePeople].filter(Boolean))];
  const isValid = Boolean(form.title && form.department && form.priority);

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm(action.id, form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar ação</DialogTitle>
          <DialogDescription>{action.code} — atualize os dados e salve no Plano de Ação centralizado.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Título *</Label>
            <Input value={form.title || ""} onChange={(event) => set("title", event.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Objetivo estratégico</Label>
              <Input value={form.strategicObjectiveLabel || ""} onChange={(event) => set("strategicObjectiveLabel", event.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Indicador</Label>
              <Input value={form.indicator || ""} onChange={(event) => set("indicator", event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Departamento *</Label>
              <Select value={form.department || "general"} onValueChange={(value) => set("department", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((department) => <SelectItem key={department.value} value={department.value}>{department.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Prioridade *</Label>
              <Select value={form.priority || "medium"} onValueChange={(value) => set("priority", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Responsável</Label>
              <Select value={form.responsible || ""} onValueChange={(value) => set("responsible", value)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {people.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">Prazo</Label>
              <Input value={form.dueDate || ""} onChange={(event) => set("dueDate", event.target.value)} placeholder="DD/MM/AAAA" />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-sm">Observação / como executar</Label>
            <Input value={form.como || ""} onChange={(event) => set("como", event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
