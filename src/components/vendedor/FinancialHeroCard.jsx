import React from "react";
import { TrendingUp, Info } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";

export default function FinancialHeroCard({ calcResult, userName, periodLabel, onVerCalculo }) {
  if (!calcResult) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        <p className="text-slate-400 text-sm">Nenhuma política de remuneração ativa encontrada.</p>
        <p className="text-slate-500 text-xs mt-1">Peça ao gestor ou RH para configurar sua política em Departamento / RH / Remuneração.</p>
      </div>
    );
  }

  const { salarioPrevisto, comissao, premiacoesTotal, bonificacoesConfirmadas, salarioFixo, qtdVendas } = calcResult;
  const nenhuma = qtdVendas === 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden shadow-2xl">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-mx-blue/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Salário Previsto</span>
              <span className="text-slate-500 text-xs">· {periodLabel}</span>
            </div>

            {nenhuma ? (
              <div>
                <p className="text-4xl lg:text-6xl font-bold text-slate-400 mt-2">R$ 0,00</p>
                <p className="text-slate-400 text-sm mt-3 max-w-md">
                  Ainda não há vendas confirmadas neste período. Assim que suas vendas forem registradas, seu salário previsto aparecerá aqui.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-5xl lg:text-7xl font-bold text-white mt-2 tracking-tight">
                  {formatBRL(salarioPrevisto)}
                </p>
                <p className="text-slate-400 text-xs mt-3 max-w-sm">
                  Estimativa baseada nas vendas confirmadas, política de remuneração ativa, premiações e bonificações do período.
                </p>
              </div>
            )}
          </div>

          {!nenhuma && (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <LineItem label="Comissões confirmadas" value={comissao} />
              <LineItem label="Premiações atingidas" value={premiacoesTotal} />
              <LineItem label="Bonificações confirmadas" value={bonificacoesConfirmadas} />
              <LineItem label="Salário fixo" value={salarioFixo} />
              <div className="border-t border-white/10 pt-2 mt-1">
                <LineItem label="Total previsto" value={salarioPrevisto} highlight />
              </div>
            </div>
          )}
        </div>

        {!nenhuma && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-slate-500 text-xs">Os valores são estimativas e podem variar conforme regras da empresa.</p>
            <button
              onClick={onVerCalculo}
              className="text-emerald-400 text-xs font-semibold hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              Ver cálculo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LineItem({ label, value, highlight }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${highlight ? "mt-1" : ""}`}>
      <span className={`text-xs ${highlight ? "text-white font-semibold" : "text-slate-400"}`}>{label}</span>
      <span className={`text-sm font-bold tabular-nums ${highlight ? "text-emerald-400" : value > 0 ? "text-white" : "text-slate-500"}`}>
        {formatBRL(value)}
      </span>
    </div>
  );
}