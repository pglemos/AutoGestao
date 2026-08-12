import React from "react";
import { Trophy, Star } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";

export default function NextAwardCard({ calcResult }) {
  if (!calcResult) return null;
  const { proximaPremiacao, premiacoesAtingidas, premiacoesTotal, qtdVendas } = calcResult;

  const semPremiacao = !proximaPremiacao && (!premiacoesAtingidas || premiacoesAtingidas.length === 0);

  return (
    <div className="bg-white rounded-2xl p-6 border border-border-subtle shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-status-warning" />
        <span className="text-status-warning-text text-xs font-semibold uppercase tracking-widest">Próxima Premiação</span>
      </div>

      {semPremiacao ? (
        <div className="text-center py-4">
          <p className="text-muted-foreground text-sm">Nenhuma premiação ativa cadastrada para este período.</p>
        </div>
      ) : (
        <div>
          {premiacoesAtingidas && premiacoesAtingidas.length > 0 && (
            <div className="mb-4 bg-status-warning-surface border border-status-warning/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-status-warning" fill="currentColor" />
                <span className="text-status-warning-text text-sm font-semibold">
                  Você já desbloqueou {formatBRL(premiacoesTotal)} em premiações!
                </span>
              </div>
              <p className="text-status-warning-text text-xs mt-1">
                {premiacoesAtingidas.length} prêmio{premiacoesAtingidas.length !== 1 ? "s" : ""} conquistado{premiacoesAtingidas.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {proximaPremiacao && (
            <div>
              {premiacoesAtingidas?.length > 0 && (
                <p className="text-muted-foreground text-xs mb-2">Próxima premiação:</p>
              )}
              <p className="text-muted-foreground text-sm">Faltam</p>
              <p className="text-5xl font-bold text-mx-navy mt-1">
                {(proximaPremiacao.quantidade_vendas_necessarias || 0) - qtdVendas}
                <span className="text-xl font-semibold text-muted-foreground ml-2">vendas</span>
              </p>
              <p className="text-muted-foreground text-sm mt-2">para desbloquear</p>
              <p className="text-3xl font-bold text-status-warning mt-1">+ {formatBRL(proximaPremiacao.valor_premio)}</p>

              <div className="mt-4 bg-slate-50 rounded-xl p-3">
                <p className="text-muted-foreground text-xs">
                  Prêmio ao atingir {proximaPremiacao.quantidade_vendas_necessarias} vendas no mês.
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{qtdVendas} vendas</span>
                    <span>{proximaPremiacao.quantidade_vendas_necessarias} vendas</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (qtdVendas / (proximaPremiacao.quantidade_vendas_necessarias || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}