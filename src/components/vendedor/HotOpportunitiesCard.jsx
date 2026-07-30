import React from "react";
import { Target, Users } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";

export default function HotOpportunitiesCard({ qtdOportunidades, comissaoPotencial }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between"
      style={{
        background: "linear-gradient(135deg, #060F1F 0%, #0A1830 50%, #0D1E3A 100%)",
        border: "1px solid rgba(59,130,246,0.2)",
        boxShadow: "0 0 30px rgba(59,130,246,0.05)",
        minHeight: "220px",
      }}
    >
      <div className="absolute top-4 right-4 opacity-80">
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
          <Target className="w-7 h-7 text-white" />
        </div>
      </div>

      <div className="relative z-10 flex-1">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Hoje você possui</p>

        {qtdOportunidades === 0 ? (
          <p className="text-slate-400 text-sm mt-2">Nenhuma oportunidade quente encontrada neste momento.</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-bold" style={{ fontSize: "4rem", lineHeight: 1, color: "#3B82F6", textShadow: "0 0 20px rgba(59,130,246,0.4)" }}>
                {qtdOportunidades}
              </span>
              <span className="text-blue-400 text-xl font-bold">oportunidades</span>
            </div>
            <p className="text-slate-400 text-sm mt-1">que podem gerar</p>
            <p className="font-bold mt-1" style={{ fontSize: "2rem", color: "#60A5FA", textShadow: "0 0 15px rgba(96,165,250,0.3)" }}>
              {formatBRL(comissaoPotencial).replace(",00", "")}
            </p>
          </>
        )}
      </div>

      <div
        className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)" }}
      >
        <span className="text-slate-400 text-sm">Clientes quentes na sua carteira</span>
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-lg">{qtdOportunidades}</span>
          <Users className="w-4 h-4 text-blue-400" />
        </div>
      </div>
    </div>
  );
}