import React from "react";
import { Info, CircleDollarSign, Coins } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";

export default function CommissionHeroCard({ comissaoEstimada, qtdVendas, onVerCalculo, semPolitica }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
      style={{
        background: "linear-gradient(135deg, #071A10 0%, #0A2918 40%, #0D3320 100%)",
        border: "1px solid rgba(34,197,94,0.25)",
        boxShadow: "0 0 40px rgba(34,197,94,0.08), inset 0 1px 0 rgba(34,197,94,0.1)",
        minHeight: "240px",
      }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #22c55e 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #16a34a 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Comissão Estimada</span>
            <button onClick={onVerCalculo} className="text-emerald-600 hover:text-emerald-400 transition-colors">
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {semPolitica ? (
            <div>
              <p className="text-slate-300 text-lg font-semibold mt-2">Nenhuma política de remuneração ativa encontrada.</p>
              <p className="text-slate-500 text-sm mt-2">Peça ao gestor ou RH para configurar sua remuneração em Departamento / RH / Remuneração.</p>
            </div>
          ) : (
            <>
              <p
                className="font-bold leading-none tabular-nums"
                style={{
                  fontSize: "clamp(3rem, 8vw, 5.5rem)",
                  color: "#39FF5A",
                  textShadow: "0 0 30px rgba(57,255,90,0.4)",
                }}
              >
                {formatBRL(comissaoEstimada).replace(",00", "")}
              </p>

              {qtdVendas === 0 ? (
                <p className="text-slate-400 text-sm mt-4">
                  Ainda não há vendas confirmadas neste período. Assim que suas vendas forem registradas, sua comissão aparecerá aqui.
                </p>
              ) : (
                <p className="text-slate-300 text-sm mt-4">
                  💰 Você já vendeu{" "}
                  <span className="text-emerald-400 font-bold">{qtdVendas} veículo{qtdVendas !== 1 ? "s" : ""}</span>{" "}
                  neste mês.
                </p>
              )}
            </>
          )}
        </div>

        {/* Right illustration */}
        <div className="hidden lg:flex items-center justify-center flex-shrink-0 w-48 h-48 relative">
          {/* Bag illustration using CSS + icons */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-40 h-40 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #22c55e, transparent)", filter: "blur(20px)" }} />
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", boxShadow: "0 0 30px rgba(34,197,94,0.4)" }}>
              <CircleDollarSign className="w-14 h-14 text-white" strokeWidth={1.5} />
            </div>
            {/* Coins decoration */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "#15803d", border: "2px solid #22c55e" }}>
              <Coins className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="absolute -top-1 -left-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "#166534", border: "2px solid #4ade80" }}>
              <span className="text-emerald-300 text-xs font-bold">$</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}