import React from "react";
import { X } from "lucide-react";
import moment from "moment";
import { formatBRL } from "@/components/vendedor/formatBRL";

export default function CalculationDetailsDrawer({ open, onClose, calcResult, period, vendas, bonificacoes }) {
  if (!open) return null;

  const { politica, faixaAtual, qtdVendas, valorTotalVendido, comissao, premiacoesAtingidas, proximaPremiacao, salarioPrevisto } = calcResult || {};
  const { start, end } = period || {};

  return (
    <div className="fixed inset-0 z-[var(--mx-z-overlay)] flex items-end sm:items-center justify-center">
      <div role="presentation" className="absolute inset-0 bg-surface-overlay/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-mx-navy">Detalhamento do Cálculo</h2>
          <button onClick={onClose} className="min-h-[var(--mx-touch-target-min)] min-w-[var(--mx-touch-target-min)] w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Section title="Período analisado">
            {start && end ? `${start.format("DD/MM/YYYY")} a ${end.format("DD/MM/YYYY")}` : "—"}
          </Section>

          <Section title="Política aplicada">
            {politica?.nome || "Nenhuma política encontrada"}
          </Section>

          <Section title="Tipo de comissão">
            {politica?.tipo_comissao || "—"}
          </Section>

          <Section title="Veículos elegíveis">
            {qtdVendas || 0}
          </Section>

          <Section title="Valor total vendido">
            {formatBRL(valorTotalVendido)}
          </Section>

          {faixaAtual && (
            <>
              <Section title="Faixa atingida">
                {faixaAtual.quantidade_inicial}{faixaAtual.quantidade_final ? ` a ${faixaAtual.quantidade_final}` : "+"} veículos
              </Section>
              <Section title="Regra da faixa">
                {faixaAtual.tipo === "Valor fixo por veículo"
                  ? `${formatBRL(faixaAtual.valor)} por veículo`
                  : `${faixaAtual.valor}% sobre valor vendido`}
              </Section>
              <Section title="Cálculo">
                {faixaAtual.tipo === "Valor fixo por veículo"
                  ? `${qtdVendas} veículos × ${formatBRL(faixaAtual.valor)} = ${formatBRL(comissao)}`
                  : `${formatBRL(valorTotalVendido)} × ${faixaAtual.valor}% = ${formatBRL(comissao)}`}
              </Section>
            </>
          )}

          {premiacoesAtingidas?.length > 0 && (
            <Section title="Premiações atingidas">
              {premiacoesAtingidas.map((p, i) => (
                <div key={i} className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">{p.quantidade_vendas_necessarias} vendas</span>
                  <span className="font-semibold text-status-success-text">{formatBRL(p.valor_premio)}</span>
                </div>
              ))}
            </Section>
          )}

          {proximaPremiacao && (
            <Section title="Próxima premiação">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{proximaPremiacao.quantidade_vendas_necessarias} vendas</span>
                <span className="font-semibold text-status-warning-text">{formatBRL(proximaPremiacao.valor_premio)} — Não atingida</span>
              </div>
            </Section>
          )}

          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-mx-navy">Total previsto</span>
              <span className="text-2xl font-bold text-status-success-text">{formatBRL(salarioPrevisto)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <div className="text-sm text-foreground font-medium">{children}</div>
    </div>
  );
}