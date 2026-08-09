import React from "react";
import { Target, TrendingUp, Trophy } from "lucide-react";

function formatFaltam(v, isVolume) {
  if (v === null || v === undefined) return "—";
  if (isVolume) return `${v} vendas`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
}

export default function SuaPosicao({ posicao, total, atingimento, faltamValor, isVolume }) {
  const pct = Math.round((atingimento || 0) * 100) / 100;
  const posLabel = posicao ? `${posicao}º lugar` : "—";
  const proxLabel = posicao === 2 ? "para o 1º lugar" : `para o ${(posicao || 1) - 1}º lugar`;

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 min-w-[220px] overflow-hidden flex flex-col justify-between">
      {/* bg trophy watermark */}
      <Trophy className="absolute right-2 top-2 opacity-[0.06]" style={{ width: 120, height: 120, color: "#00A896" }} />
      <div>
        <p className="text-body-sm font-semibold text-slate-500 mb-1">Sua posição</p>
        <p className="text-h2 font-bold text-slate-800 leading-tight">{posLabel}</p>
        <p className="text-[12px] text-slate-400 mt-0.5">de {total || "—"} vendedores</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex flex-col items-center gap-1">
          <Target className="w-5 h-5 text-green-600" />
          <p className="text-caption text-slate-500 font-medium">Atingimento</p>
          <p className="text-h3 font-bold text-green-600 leading-tight">{pct}%</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <p className="text-caption text-slate-500 font-medium">Faltam</p>
          <p className="text-[16px] font-bold text-blue-600 leading-tight">{formatFaltam(faltamValor, isVolume)}</p>
          {posicao > 1 && <p className="text-caption text-slate-400">{proxLabel}</p>}
          {posicao === 1 && <p className="text-caption text-green-500 font-semibold">Você lidera!</p>}
        </div>
      </div>
    </div>
  );
}