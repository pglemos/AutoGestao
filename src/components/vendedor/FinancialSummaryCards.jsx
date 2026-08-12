import React from "react";
import { DollarSign, Layers, Award, Gift } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";

function SummaryCard({ icon: IconComp, iconColor, iconBg, label, value, sub }) {
  const Icon = IconComp;
  const isZero = !value || value === 0;
  return (
    <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${isZero ? "text-text-disabled" : "text-mx-navy"}`}>
        {formatBRL(value)}
      </p>
      <p className={`text-xs mt-1.5 ${isZero ? "text-text-disabled" : "text-muted-foreground"}`}>
        {isZero ? "Ainda não conquistado neste período" : sub}
      </p>
    </div>
  );
}

export default function FinancialSummaryCards({ calcResult }) {
  if (!calcResult) return null;
  const { comissao, qtdVendas, faixaAtual, premiacoesTotal, premiacoesAtingidas, bonificacoesConfirmadas } = calcResult;

  const faixaLabel = faixaAtual
    ? `Faixa: ${faixaAtual.quantidade_inicial}${faixaAtual.quantidade_final ? ` a ${faixaAtual.quantidade_final}` : "+"} veículos`
    : "Sem faixa ativa";

  const valorFaixa = faixaAtual
    ? (faixaAtual.tipo === "Valor fixo por veículo" ? `${formatBRL(faixaAtual.valor)} por veículo` : `${faixaAtual.valor}% s/ valor vendido`)
    : "—";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50"
        label="Comissão confirmada" value={comissao}
        sub={`${qtdVendas} veículo${qtdVendas !== 1 ? "s" : ""} vendido${qtdVendas !== 1 ? "s" : ""} no período`}
      />
      <SummaryCard
        icon={Layers} iconColor="text-mx-blue" iconBg="bg-mx-blue/10"
        label="Faixa atual" value={faixaAtual?.valor || 0}
        sub={faixaLabel}
      />
      <SummaryCard
        icon={Award} iconColor="text-amber-600" iconBg="bg-amber-50"
        label="Premiações atingidas" value={premiacoesTotal}
        sub={`${premiacoesAtingidas?.length || 0} prêmio${premiacoesAtingidas?.length !== 1 ? "s" : ""} desbloqueado${premiacoesAtingidas?.length !== 1 ? "s" : ""}`}
      />
      <SummaryCard
        icon={Gift} iconColor="text-purple-600" iconBg="bg-purple-50"
        label="Bônus confirmados" value={bonificacoesConfirmadas}
        sub="Bonificações já garantidas"
      />
    </div>
  );
}