import React from "react";

const Item = ({ value, label, color }) => (
  <div className="flex flex-col items-center bg-white rounded-2xl border border-border p-4 gap-1 flex-1 min-w-0">
    <span className={`text-h2 font-bold tabular-nums leading-none ${color}`}>{value}</span>
    <span className="text-caption text-muted-foreground text-center leading-tight font-medium">{label}</span>
  </div>
);

export default function ResumoDiaMobile({
  totalLeads, totalAtend, totalAgend, totalVendas, totalFaturamento,
}) {
  const faturamentoStr = totalFaturamento > 0
    ? `R$ ${totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "R$ 0";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-4">
      <p className="text-caption font-bold text-muted-foreground uppercase tracking-[0.15em]">Resumo do Dia</p>

      <div className="grid grid-cols-2 gap-3">
        <Item value={totalLeads} label="Leads Recebidos" color="text-status-info-text" />
        <Item value={totalAtend} label="Atendimentos" color="text-status-info-text" />
        <Item value={totalAgend} label="Agendamentos D+1" color="text-status-warning-text" />
        <Item value={totalVendas} label="Vendas Realizadas" color="text-status-error" />
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-brand-primary-subtle rounded-xl border border-brand-primary/20">
        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Faturamento</span>
        <span className="text-h3 font-bold tabular-nums text-status-success">{faturamentoStr}</span>
      </div>
    </div>
  );
}
