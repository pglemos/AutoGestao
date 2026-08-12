import React from "react";
import { Trophy } from "lucide-react";

function Avatar({ nome, foto, size = 64, border = "" }) {
  const initials = nome ? nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${border}`}
      style={{
        width: size, height: size, minWidth: size,
        background: "linear-gradient(135deg, #00A896, #005BFF)",
        border: border ? undefined : "3px solid #e2e8f0",
        fontSize: size * 0.32,
      }}
    >
      {foto
        ? <img src={foto} alt={nome} className="w-full h-full rounded-full object-cover" />
        : initials}
    </div>
  );
}

const PEDESTAL = [
  { pos: 2, label: "2º", color: "#94a3b8", bg: "linear-gradient(180deg,#cbd5e1,#94a3b8)", height: 56, order: 1 },
  { pos: 1, label: "1º", color: "#F59E0B", bg: "linear-gradient(180deg,#FDE68A,#F59E0B)", height: 80, order: 2 },
  { pos: 3, label: "3º", color: "#CD7F32", bg: "linear-gradient(180deg,#e9c57e,#CD7F32)", height: 40, order: 3 },
];

function formatValue(v, isVolume) {
  if (isVolume) return `${v} vendas`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v || 0);
}

export default function PodioRanking({ top3, isVolume }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex-1">
      <h2 className="text-body font-bold text-foreground mb-4">Pódio do Período</h2>
      <div className="flex items-end justify-center gap-3 sm:gap-6 mt-2 pb-2">
        {PEDESTAL.map(({ pos, label, color, bg, height, order }) => {
          const v = top3[pos - 1];
          if (!v) return (
            <div key={pos} className="flex flex-col items-center gap-2" style={{ order }}>
              <div className="w-14 h-14 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                <span className="text-text-disabled text-lg font-bold">{pos}</span>
              </div>
              <div className="rounded-t-md w-16 sm:w-20" style={{ height, background: bg, opacity: 0.4 }} />
            </div>
          );
          return (
            <div key={pos} className="flex flex-col items-center gap-1.5" style={{ order }}>
              {pos === 1 && (
                <Trophy className="w-6 h-6 mb-0.5" style={{ color: "#F59E0B", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.5))" }} fill="currentColor" />
              )}
              <Avatar nome={v.nome} foto={v.foto} size={pos === 1 ? 68 : 56} border={pos === 1 ? "4px solid #F59E0B" : "3px solid #e2e8f0"} />
              <div className="text-center mt-1">
                <p className="text-body-sm font-bold text-foreground leading-tight">{v.nome?.split(" ")[0]}</p>
                <p className="text-caption font-semibold" style={{ color: "#00A896" }}>{formatValue(isVolume ? v.vendas : v.faturamento, isVolume)}</p>
              </div>
              <div className="relative rounded-t-md flex items-center justify-center w-16 sm:w-20" style={{ height, background: bg }}>
                <span className="text-white font-bold text-xl drop-shadow">{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}