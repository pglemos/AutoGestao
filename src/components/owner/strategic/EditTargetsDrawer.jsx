// Drawer de edição de metas persistidas no escopo real da unidade.
import { useState, useEffect } from "react";
import DetailDrawer from "@/components/owner/DetailDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MONTHS, MONTHS_FULL, SELECTED_MONTH_INDEX, formatCellValue, consolidateValues, getConsolidatedLabel, AREA_STYLES } from "./strategicUtils";
import { DIRECTION_LABELS, AGGREGATION_LABELS, FORMAT_LABELS } from "./strategicIndicatorCatalog";
import { strategicPlanRepository } from "./strategicPlanLiveRepository";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/owner-b44/AuthContext";
import { ShoppingCart, Megaphone, Package, Wallet, Settings } from "lucide-react";

const AREA_ICONS = { Vendas: ShoppingCart, Marketing: Megaphone, Estoque: Package, Financeiro: Wallet, Operacional: Settings };

export default function EditTargetsDrawer({ open, onOpenChange, indicator, year, onSaved }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [values, setValues] = useState(Array(12).fill(""));
  const [errors, setErrors] = useState({});
  const [note, setNote] = useState("");
  const [originalValues, setOriginalValues] = useState([]);

  useEffect(() => {
    if (open && indicator) {
      const series = strategicPlanRepository.getIndicatorSeries(indicator.id, year);
      const orig = series.targetValues.map((v) => String(v));
      setValues(orig);
      setOriginalValues(orig);
      setErrors({});
      setNote("");
    }
  }, [open, indicator, year]);

  if (!indicator) return null;
  const areaStyle = AREA_STYLES[indicator.area] || {};
  const AreaIcon = AREA_ICONS[indicator.area];

  const parseValue = (raw) => {
    if (raw === "" || raw === null || raw === undefined) return null;
    const cleaned = String(raw).replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const validate = (raw) => {
    const num = parseValue(raw);
    if (raw === "" || raw === null) return "Campo obrigatório";
    if (num === null) return "Valor inválido";
    if (num < 0 && indicator.displayFormat !== "currency") return "Não pode ser negativo";
    if (indicator.displayFormat === "percentage" && (num < 0 || num > 100)) return "Deve estar entre 0 e 100";
    if (indicator.displayFormat === "rating" && (num < 0 || num > 5)) return "Deve estar entre 0 e 5";
    return null;
  };

  const handleChange = (idx, raw) => {
    const newValues = [...values];
    newValues[idx] = raw;
    setValues(newValues);
    const err = validate(raw);
    setErrors((p) => ({ ...p, [idx]: err }));
  };

  const applyJanToAll = () => {
    const janVal = values[0];
    const err = validate(janVal);
    if (err) {
      toast({ title: "Erro", description: "Corrija o valor de Janeiro antes de aplicar a todos.", variant: "destructive" });
      return;
    }
    setValues(Array(12).fill(janVal));
    setErrors({});
  };

  const restore = () => {
    toast({ title: "Restaurar indisponível", description: "Não existe histórico persistido para restaurar.", variant: "destructive" });
  };

  const save = async () => {
    const newErrors = {};
    values.forEach((raw, idx) => {
      const err = validate(raw);
      if (err) newErrors[idx] = err;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({ title: "Erro", description: "Corrija os campos destacados antes de salvar.", variant: "destructive" });
      return;
    }
    const numValues = values.map((v) => parseValue(v));
    try {
      await strategicPlanRepository.updateTargets(indicator.id, year, numValues, user, note);
      toast({ title: "Metas atualizadas com sucesso." });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Não foi possível atualizar as metas.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const consValue = consolidateValues(values.map((v) => parseValue(v) || 0), indicator.aggregationMode, SELECTED_MONTH_INDEX);
  const changedCount = values.filter((v, i) => v !== originalValues[i]).length;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Metas"
      description={`${indicator.name} (${indicator.code}) · ${indicator.area} · ${DIRECTION_LABELS[indicator.direction]} · ${year}`}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={restore}>Restaurar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar alterações</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Faixa superior com cor da área */}
        <div className={`-mx-5 -mt-5 px-5 py-3 ${areaStyle.lightBg || "bg-muted/30"} border-b ${areaStyle.border || "border-border"}`}>
          <div className="flex items-center gap-3">
            {AreaIcon && (
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${areaStyle.iconBg}`}>
                <AreaIcon className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{indicator.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${areaStyle.bg} ${areaStyle.text}`}>{indicator.area}</span>
                <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">{DIRECTION_LABELS[indicator.direction]}</span>
                <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">{AGGREGATION_LABELS[indicator.aggregationMode]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo consolidado */}
        <div className="rounded-lg border border-border bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{getConsolidatedLabel(indicator.aggregationMode, SELECTED_MONTH_INDEX)}</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{formatCellValue(consValue, indicator.displayFormat, indicator.decimalPlaces)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">Formato</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{FORMAT_LABELS[indicator.displayFormat]}</p>
            </div>
          </div>
          {changedCount > 0 && (
            <p className="mt-2 text-xs font-medium text-amber-600">{changedCount} mês(es) alterado(s)</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MONTHS.map((m, i) => {
            const isChanged = values[i] !== originalValues[i];
            return (
              <div key={i}>
                <Label className="mb-1 block text-xs">{MONTHS_FULL[i]}</Label>
                <Input
                  value={values[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  className={`h-9 ${errors[i] ? "border-red-500" : isChanged ? "border-amber-400 bg-amber-50" : ""}`}
                />
                {errors[i] && <p className="mt-0.5 text-xs text-red-500">{errors[i]}</p>}
              </div>
            );
          })}
        </div>

        <Button variant="outline" size="sm" onClick={applyJanToAll}>Aplicar valor de Janeiro a todos os meses</Button>

        <div>
          <Label className="mb-1 block text-sm">Observação</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Justificativa da alteração..."
            rows={2}
          />
        </div>
        <p className="text-xs text-muted-foreground">Alterado por: {user?.full_name || user?.email || "Usuário"}</p>
      </div>
    </DetailDrawer>
  );
}
