// Modal de criação de Plano de Ação com persistência no Supabase.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { strategicPlanRepository } from "./strategicPlanLiveRepository";
import { formatCellValue, calculatePercentageOfTarget, getStatusFromPercentage, STATUS_STYLES, AREA_STYLES, SELECTED_MONTH_INDEX } from "./strategicUtils";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/owner-b44/AuthContext";
import { AlertTriangle, TrendingUp, Target, Gauge } from "lucide-react";

export default function CreateActionModal({ open, onOpenChange, indicator, year, onCreated }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({});

  useEffect(() => {
    if (open && indicator) {
      const series = strategicPlanRepository.getIndicatorSeries(indicator.id, year);
      const idx = SELECTED_MONTH_INDEX;
      const resultado = series.currentValues[idx];
      const meta = series.targetValues[idx];
      const pct = calculatePercentageOfTarget(resultado, meta);
      const status = pct !== null ? getStatusFromPercentage(pct, series.direction) : "neutral";
      const distance = resultado !== null && meta ? meta - resultado : null;

      setForm({
        title: `Corrigir desvio em ${indicator.name}`,
        indicatorId: indicator.id,
        indicatorName: indicator.name,
        area: indicator.area,
        status,
        problem: `O indicador está em ${STATUS_STYLES[status]?.label || "Sem dados"}, com resultado de ${formatCellValue(resultado, series.displayFormat, series.decimalPlaces)} diante de uma meta de ${formatCellValue(meta, series.displayFormat, series.decimalPlaces)}.`,
        resultado: resultado !== null ? formatCellValue(resultado, series.displayFormat, series.decimalPlaces) : "—",
        meta: formatCellValue(meta, series.displayFormat, series.decimalPlaces),
        distance: distance !== null ? formatCellValue(Math.abs(distance), series.displayFormat, series.decimalPlaces) : "—",
        action: "",
        responsible: user?.full_name || "",
        deadline: "",
        priority: status === "critical" ? "high" : status === "attention" ? "medium" : "low",
        note: "",
      });
    }
  }, [open, indicator, year, user]);

  if (!indicator) return null;
  const statusStyle = STATUS_STYLES[form.status] || STATUS_STYLES.neutral;
  const areaStyle = AREA_STYLES[indicator.area] || {};

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.title || !form.action) {
      toast({ title: "Erro", description: "Preencha o título e a ação proposta.", variant: "destructive" });
      return;
    }
    try {
      await strategicPlanRepository.createActionItem({
        ...form,
        year,
        createdBy: user?.full_name || user?.email || "Usuário",
      });
      toast({ title: "Plano de ação criado com sucesso." });
      onCreated?.();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Não foi possível criar o plano de ação.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Criar Plano de Ação</DialogTitle>
          <DialogDescription>Vincule um plano de ação ao indicador selecionado.</DialogDescription>
        </DialogHeader>

        {/* Resumo visual do status */}
        <div className={`rounded-lg border ${statusStyle.border} ${statusStyle.bg} p-3`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${statusStyle.text}`} />
            <span className={`text-sm font-semibold ${statusStyle.text}`}>{statusStyle.label}</span>
            <span className="text-xs text-muted-foreground">· {form.indicatorName}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-md bg-card/60 p-2">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Meta</p>
              </div>
              <p className="mt-0.5 text-sm font-bold text-foreground">{form.meta || "—"}</p>
            </div>
            <div className="rounded-md bg-card/60 p-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Resultado</p>
              </div>
              <p className="mt-0.5 text-sm font-bold text-foreground">{form.resultado || "—"}</p>
            </div>
            <div className="rounded-md bg-card/60 p-2">
              <div className="flex items-center gap-1">
                <Gauge className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Distância</p>
              </div>
              <p className="mt-0.5 text-sm font-bold text-foreground">{form.distance || "—"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">Título</Label>
            <Input value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Indicador</Label>
              <Input value={form.indicatorName || ""} disabled />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Área</Label>
              <Input value={form.area || ""} disabled />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Problema identificado</Label>
            <Textarea value={form.problem || ""} onChange={(e) => set("problem", e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Ação proposta *</Label>
            <Textarea value={form.action || ""} onChange={(e) => set("action", e.target.value)} rows={3} placeholder="Descreva a ação..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="mb-1 block text-sm">Responsável</Label>
              <Input value={form.responsible || ""} onChange={(e) => set("responsible", e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Prazo</Label>
              <Input type="date" value={form.deadline || ""} onChange={(e) => set("deadline", e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Prioridade</Label>
              <Select value={form.priority || "medium"} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm">Observação</Label>
            <Textarea value={form.note || ""} onChange={(e) => set("note", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Criar plano de ação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
