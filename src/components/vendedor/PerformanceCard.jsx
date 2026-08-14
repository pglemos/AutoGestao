import React from "react";
import { TrendingUp, Info } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";
import { chartTokens } from "@/lib/charts/tokens"

export default function PerformanceCard({ melhorMes, comissaoAtual }) {
  const pct = melhorMes > 0 ? Math.round((comissaoAtual / melhorMes) * 100) : 0;
  const melhorPct = 100;
  const atualPct = melhorMes > 0 ? Math.min(100, Math.round((comissaoAtual / melhorMes) * 100)) : 0;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: chartTokens.primary(),
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="text-text-disabled text-xs font-bold uppercase tracking-widest">Seu Desempenho</span>
        <Info className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {melhorMes === 0 ? (
        <p className="text-muted-foreground text-sm">Seu desempenho começará a aparecer conforme suas vendas forem registradas.</p>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground text-sm">Seu melhor mês</span>
                <span className="text-emerald-400 font-bold text-sm tabular-nums">{formatBRL(melhorMes).replace(",00","")}</span>
              </div>
              <div className="w-full rounded-full h-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-3 rounded-full" style={{ width: `${melhorPct}%`, background: `linear-gradient(90deg, ${chartTokens.success()}, ${chartTokens.success()})`, boxShadow: "0 0 8px rgba(34,197,94,0.3)" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground text-sm">Mês atual</span>
                <span className="text-blue-400 font-bold text-sm tabular-nums">{formatBRL(comissaoAtual).replace(",00","")}</span>
              </div>
              <div className="w-full rounded-full h-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-3 rounded-full" style={{ width: `${atualPct}%`, background: `linear-gradient(90deg, ${chartTokens.info()}, ${chartTokens.info()})`, boxShadow: "0 0 8px rgba(59,130,246,0.3)" }} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <p className="text-text-disabled text-sm">
              Você está <span className="text-emerald-400 font-bold">{pct}%</span> do seu melhor resultado!
            </p>
          </div>
        </>
      )}
    </div>
  );
}