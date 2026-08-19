// Direcionamento MX — recomendação por área e status, com borda lateral colorida.
import { Lightbulb, Plus } from "lucide-react";
import { getStatusFromPercentage, calculatePercentageOfTarget, STATUS_STYLES, SELECTED_MONTH_INDEX } from "./strategicUtils";

const GUIDANCE_BY_AREA = {
  Vendas: "Revisar canais, agenda, conversões e desempenho comercial com o gerente.",
  Marketing: "Revisar origem dos leads, qualidade das campanhas, investimento e custo de aquisição.",
  Estoque: "Revisar giro, envelhecimento, preço, margem e estratégia de saída dos veículos.",
  Financeiro: "Revisar margem, receitas, despesas e os fatores que estão alterando o resultado.",
  Operacional: "Revisar preparação, pós-venda, custos, capacidade e cumprimento dos processos.",
};

const RESPONSIBLE_BY_AREA = {
  Vendas: "Gerente Comercial",
  Marketing: "Responsável de Marketing",
  Estoque: "Gerente de Estoque",
  Financeiro: "Responsável Financeiro",
  Operacional: "Gerente Operacional",
};

export default function StrategicIndicatorGuidance({ series, onCreateAction }) {
  if (!series) return null;
  const idx = SELECTED_MONTH_INDEX;
  const pct = calculatePercentageOfTarget(series.currentValues[idx], series.targetValues[idx]);
  const status = pct !== null ? getStatusFromPercentage(pct, series.direction) : "neutral";
  const statusStyle = STATUS_STYLES[status];

  let text;
  let responsible = "";
  if (status === "good") {
    text = "Manter o acompanhamento e preservar o padrão atual.";
  } else {
    text = GUIDANCE_BY_AREA[series.area] || "Revisar o indicador com a equipe responsável.";
    responsible = RESPONSIBLE_BY_AREA[series.area] || "Equipe responsável";
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${statusStyle.bg}`}>
          <Lightbulb className={`h-4 w-4 ${statusStyle.text}`} />
        </div>
        <h4 className="text-sm font-semibold text-foreground">Direcionamento MX</h4>
      </div>
      <p className="flex-1 text-sm leading-relaxed text-foreground">{text}</p>
      {responsible && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Responsável sugerido: <span className="font-medium text-foreground">{responsible}</span>
          </div>
          {onCreateAction && status !== "good" && (
            <button
              onClick={onCreateAction}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar Plano de Ação
            </button>
          )}
        </div>
      )}
    </div>
  );
}