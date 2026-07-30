import React from "react";
import { Rocket, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";

export default function NextCommissionJumpCard({ calcResult }) {
  if (!calcResult) return null;
  const { proximaFaixa, proxSaltoVendas, comissao, comissaoProxSalto, ganhoAdicionalSalto, politica, qtdVendas, faixaAtual } = calcResult;

  const semFaixas = !politica || (
    politica.tipo_comissao !== "Comissão por faixa de volume" &&
    politica.tipo_comissao !== "Comissão mista"
  );

  if (semFaixas) return null;

  const ultimaFaixa = !proximaFaixa;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Próximo Salto</span>
        </div>

        {ultimaFaixa ? (
          <div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-3" />
            <p className="text-lg font-bold text-white">Você já está na maior faixa de comissão.</p>
            <p className="text-slate-400 text-sm mt-2">Continue vendendo para aumentar sua comissão total e disputar novas premiações.</p>
            {faixaAtual && (
              <div className="mt-4 bg-white/5 rounded-xl p-3">
                <p className="text-slate-400 text-xs">Faixa atual</p>
                <p className="text-white font-bold">
                  {faixaAtual.quantidade_inicial}{faixaAtual.quantidade_final ? `–${faixaAtual.quantidade_final}` : "+"} veículos
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm">Venda mais</p>
            <p className="text-5xl font-bold text-white mt-1">
              {proxSaltoVendas} <span className="text-2xl font-semibold text-slate-300">veículo{proxSaltoVendas !== 1 ? "s" : ""}</span>
            </p>
            <p className="text-slate-400 text-sm mt-2">e sua comissão salta para</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{formatBRL(comissaoProxSalto)}</p>

            <div className="mt-4 bg-emerald-500/15 border border-emerald-500/20 rounded-xl px-4 py-3">
              <p className="text-emerald-300 text-xs font-medium">Ganho adicional estimado</p>
              <p className="text-emerald-400 text-2xl font-bold">+ {formatBRL(ganhoAdicionalSalto)}</p>
            </div>

            <p className="text-slate-500 text-xs mt-3">
              Ao atingir a próxima faixa, todos os veículos vendidos no período são recalculados pela nova faixa.
            </p>

            <div className="mt-3 flex gap-3 text-xs">
              <div className="bg-white/5 rounded-lg px-3 py-2 flex-1">
                <p className="text-slate-400">Agora</p>
                <p className="text-white font-bold">{qtdVendas} vend. · {formatBRL(comissao)}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex-1">
                <p className="text-emerald-400">Próxima faixa</p>
                <p className="text-emerald-300 font-bold">{proximaFaixa.quantidade_inicial}+ vend. · {formatBRL(comissaoProxSalto)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}