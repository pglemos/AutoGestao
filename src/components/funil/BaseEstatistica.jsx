import React from "react";

const FILTRO_LABEL = {
  mes_atual: "Este mês",
  mes_passado: "Mês passado",
  tres_meses: "Últimos 3 meses",
};

const COR = {
  Alta:  "text-green-600 bg-green-50 border-green-200",
  Média: "text-amber-600 bg-amber-50 border-amber-200",
  Baixa: "text-muted-foreground bg-slate-50 border-slate-200",
};

const MOTIVO = {
  Alta:  "Cálculo baseado nos dados do período selecionado.",
  Média: "O período atual tem poucos dados; usamos os últimos 90 dias para calcular conversões.",
  Baixa: "Ainda há poucos registros para projetar com precisão.",
};

export default function BaseEstatistica({ filtro, usou90, confianca, periodoCalculo }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-3">Base do cálculo</p>
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[12px]">
        <div>
          <span className="text-muted-foreground">Período exibido:</span>{" "}
          <span className="font-semibold text-muted-foreground">{FILTRO_LABEL[filtro] || filtro}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Período de cálculo:</span>{" "}
          <span className="font-semibold text-muted-foreground">{periodoCalculo || (usou90 ? "Últimos 90 dias" : FILTRO_LABEL[filtro])}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Confiança:</span>
          <span className={`text-caption font-bold px-2 py-0.5 rounded-full border ${COR[confianca] || COR.Baixa}`}>{confianca}</span>
        </div>
        <div className="w-full text-muted-foreground text-caption">{MOTIVO[confianca]}</div>
      </div>
    </div>
  );
}