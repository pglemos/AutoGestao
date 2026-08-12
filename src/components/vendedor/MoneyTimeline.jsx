import React from "react";
import { ArrowRight, Star } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";
import { calcularMoneyTimeline } from "@/components/vendedor/remuneracaoEngine";

export default function MoneyTimeline({ calcResult, faixas = [] }) {
  if (!calcResult || !calcResult.politica) return null;
  const { politica, qtdVendas, valorTotalVendido, ticketMedio } = calcResult;

  const timeline = calcularMoneyTimeline(
    politica,
    faixas,
    qtdVendas, valorTotalVendido, ticketMedio
  );

  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-border-subtle shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="w-4 h-4 text-mx-blue" />
        <h3 className="text-base font-bold text-mx-navy">Linha do Dinheiro</h3>
      </div>
      <p className="text-muted-foreground text-xs mb-5">Evolução da sua comissão conforme você vende mais veículos.</p>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {timeline.map((ponto, i) => {
          const isAtual = i === 0;
          const ganho = ponto.comissao - (timeline[0]?.comissao || 0);
          return (
            <div
              key={i}
              className={`flex-shrink-0 rounded-2xl p-4 text-center min-w-[120px] transition-all ${
                isAtual
                  ? "bg-slate-900 text-white shadow-lg"
                  : ponto.novaFaixa
                  ? "bg-status-success-surface border-2 border-status-success/40"
                  : "bg-slate-50 border border-border-subtle"
              }`}
            >
              {ponto.novaFaixa && !isAtual && (
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Star className="w-3 h-3 text-status-success" fill="currentColor" />
                  <span className="text-caption font-bold text-status-success-text uppercase tracking-wider">Nova faixa</span>
                </div>
              )}
              <p className={`text-xs font-medium mb-1 ${isAtual ? "text-text-disabled" : "text-muted-foreground"}`}>
                {isAtual ? "Atual" : `+${i} venda${i !== 1 ? "s" : ""}`}
              </p>
              <p className={`text-lg font-bold tabular-nums ${isAtual ? "text-white" : ponto.novaFaixa ? "text-status-success-text" : "text-mx-navy"}`}>
                {ponto.vendas} <span className="text-xs font-normal">vend.</span>
              </p>
              <p className={`text-sm font-bold mt-1 tabular-nums ${isAtual ? "text-emerald-400" : "text-mx-navy"}`}>
                {formatBRL(ponto.comissao)}
              </p>
              {!isAtual && ganho > 0 && (
                <p className="text-caption font-bold text-status-success-text mt-1">+ {formatBRL(ganho)}</p>
              )}
              {ponto.faixa && (
                <p className={`text-caption mt-1.5 ${isAtual ? "text-muted-foreground" : "text-muted-foreground"}`}>
                  {ponto.faixa.tipo === "Valor fixo por veículo"
                    ? `${formatBRL(ponto.faixa.valor)}/vend.`
                    : `${ponto.faixa.valor}% s/ valor`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}