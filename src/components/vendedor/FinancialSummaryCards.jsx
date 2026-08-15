import React from "react";
import { DollarSign, Layers, Award, Gift } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";
import { StatCard } from "@/components/molecules/StatCard";

function SummaryCard({ icon: IconComp, tone, label, value, sub }) {
  const Icon = IconComp;
  const isZero = !value || value === 0;
  return (
    <StatCard
      icon={<Icon />}
      tone={tone}
      label={label}
      value={<span className={`text-2xl font-bold tabular-nums ${isZero ? "text-text-disabled" : "text-mx-navy"}`}>{formatBRL(value)}</span>}
      detail={isZero ? "Ainda não conquistado neste período" : sub}
    />
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
        icon={DollarSign} tone="green"
        label="Comissão confirmada" value={comissao}
        sub={`${qtdVendas} veículo${qtdVendas !== 1 ? "s" : ""} vendido${qtdVendas !== 1 ? "s" : ""} no período`}
      />
      <SummaryCard
        icon={Layers} tone="blue"
        label="Faixa atual" value={faixaAtual?.valor || 0}
        sub={faixaLabel}
      />
      <SummaryCard
        icon={Award} tone="orange"
        label="Premiações atingidas" value={premiacoesTotal}
        sub={`${premiacoesAtingidas?.length || 0} prêmio${premiacoesAtingidas?.length !== 1 ? "s" : ""} desbloqueado${premiacoesAtingidas?.length !== 1 ? "s" : ""}`}
      />
      <SummaryCard
        icon={Gift} tone="blue"
        label="Bônus confirmados" value={bonificacoesConfirmadas}
        sub="Bonificações já garantidas"
      />
    </div>
  );
}
