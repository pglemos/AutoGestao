// Aba Histórico e Impacto do drawer — timeline + medição de impacto.
import { useEffect, useState } from "react";
import { toast } from '@/lib/toast'
import { Button } from "@/components/ui/button";
import { Input } from '@/components/atoms/Input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/atoms/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { actionPlanLiveRepository } from "../actionPlanLiveRepository";
import { IMPACT_STATUSES, IMPACT_STYLES } from "../actionPlanConstants";

const HISTORY_ICONS = {
  created: "🟢",
  approved: "✅",
  delegated: "👤",
  status_changed: "🔄",
  progress_changed: "📊",
  blocked: "🔒",
  unblocked: "🔓",
  comment: "💬",
  evidence: "📎",
  validated: "✔️",
  reopened: "↩️",
  cancelled: "❌",
  impact_measured: "📈",
  due_date_changed: "📅",
};

export default function HistoryTab({ action, onReload, user }) {
  const [impactForm, setImpactForm] = useState({
    impactStatus: action.impactStatus || "unmeasured",
    valueBefore: "",
    valueAfter: "",
    realizedImpact: "",
    measurementDate: "",
    note: "",
  });
  useEffect(() => {
    setImpactForm({
      impactStatus: action.impactStatus || "unmeasured",
      valueBefore: action.impactValueBefore == null ? "" : String(action.impactValueBefore),
      valueAfter: action.impactValueAfter == null ? "" : String(action.impactValueAfter),
      realizedImpact: action.realizedImpact || "",
      measurementDate: action.impactMeasurementDate || "",
      note: action.expectedImpact || "",
    });
  }, [action.id, action.impactStatus, action.impactValueBefore, action.impactValueAfter, action.realizedImpact, action.impactMeasurementDate, action.expectedImpact]);
  const set = (k, v) => setImpactForm((p) => ({ ...p, [k]: v }));

  const history = [...(action.history || [])].reverse();
  const impact = IMPACT_STYLES[action.impactStatus] || IMPACT_STYLES.unmeasured;

  const handleMeasure = async () => {
    try {
      await actionPlanLiveRepository.measureImpact(action.id, {
        ...impactForm,
        valueBefore: impactForm.valueBefore || null,
        valueAfter: impactForm.valueAfter || null,
        measuredBy: user?.full_name || "Nome não informado",
      });
      await onReload();
    } catch (error) {
      toast.error("Não foi possível registrar o impacto.", { description: error instanceof Error ? error.message : "Erro desconhecido" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Histórico */}
      <section>
        <p className="mb-2 text-sm font-medium text-foreground">Histórico</p>
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex gap-2.5 rounded-lg border border-border bg-muted/20 p-2.5">
              <span className="text-base">{HISTORY_ICONS[h.type] || "•"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{h.description}</p>
                <p className="text-xs text-muted-foreground">{h.author} · {h.date}</p>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="text-xs text-muted-foreground">Sem histórico.</p>}
        </div>
      </section>

      {/* Impacto */}
      <section className="rounded-lg border border-border p-3">
        <p className="mb-2 text-sm font-medium text-foreground">Medição de impacto</p>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Classificação atual:</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${impact.badge}`}>{impact.label}</span>
        </div>
        <div className="space-y-2">
          <div>
            <Label className="mb-1 block text-xs">Classificação</Label>
            <Select value={impactForm.impactStatus} onValueChange={(v) => set("impactStatus", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMPACT_STATUSES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1 block text-xs">Valor antes</Label>
              <Input value={impactForm.valueBefore} onChange={(e) => set("valueBefore", e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Valor depois</Label>
              <Input value={impactForm.valueAfter} onChange={(e) => set("valueAfter", e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Impacto realizado</Label>
            <Input value={impactForm.realizedImpact} onChange={(e) => set("realizedImpact", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Data de medição</Label>
            <Input value={impactForm.measurementDate} onChange={(e) => set("measurementDate", e.target.value)} placeholder="DD/MM/AAAA" className="h-8 text-xs" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Observação</Label>
            <Textarea value={impactForm.note} onChange={(e) => set("note", e.target.value)} rows={2} className="text-xs" />
          </div>
          <Button size="sm" onClick={handleMeasure} className="bg-primary hover:bg-primary/90">Registrar medição</Button>
        </div>
        {action.indicator && (
          <p className="mt-2 text-xs text-muted-foreground">Indicador relacionado: {action.indicator}</p>
        )}
      </section>
    </div>
  );
}
