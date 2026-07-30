import React from "react";
import { Flag } from "lucide-react";

function Avatar({ nome, foto, isMe, size = 40 }) {
  const initials = nome ? nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{
        width: size, height: size, minWidth: size,
        background: isMe ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "linear-gradient(135deg,#00A896,#005BFF)",
        border: isMe ? "3px solid #3b82f6" : "3px solid #e2e8f0",
        boxShadow: isMe ? "0 0 0 3px rgba(59,130,246,0.25)" : "none",
        fontSize: size * 0.35,
      }}
    >
      {foto
        ? <img src={foto} alt={nome} className="w-full h-full rounded-full object-cover" />
        : initials}
    </div>
  );
}

function formatValue(v, isVolume) {
  if (isVolume) return `${v} vendas`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v || 0);
}

export default function CorridaPeriodo({ vendedores, meta, isVolume, meuId }) {
  const maxVal = Math.max(...vendedores.map(v => isVolume ? v.vendas : v.faturamento), meta, 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-1">
      <div className="flex items-center gap-2 mb-1">
        <Flag className="w-5 h-5 text-slate-700" />
        <h2 className="text-[15px] font-bold text-slate-800">Corrida do Período</h2>
      </div>
      <p className="text-[12px] text-slate-400 mb-4">
        Meta de {isVolume ? "volume" : "faturamento"}:{" "}
        <span className="font-bold text-green-600">{formatValue(meta, isVolume)}</span>
      </p>

      {/* Pista */}
      <div className="relative px-4">
        {/* Pista de corrida */}
        <div className="relative h-16 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl border border-slate-200 overflow-visible">
          {/* Linha verde de progresso até o líder */}
          <div
            className="absolute left-0 top-0 h-full rounded-l-xl"
            style={{
              width: `${Math.min(100, (Math.max(...vendedores.map(v => isVolume ? v.vendas : v.faturamento), 0) / maxVal) * 100)}%`,
              background: "linear-gradient(90deg, rgba(0,168,150,0.15), rgba(0,168,150,0.05))",
            }}
          />
          {/* Linha da meta */}
          <div className="absolute right-0 top-0 h-full w-1 bg-green-400 rounded-r-xl opacity-60" />

          {/* Avatares dos vendedores */}
          {vendedores.map((v) => {
            const val = isVolume ? v.vendas : v.faturamento;
            const pct = Math.min(100, (val / maxVal) * 100);
            const isMe = v.id === meuId;
            return (
              <div
                key={v.id}
                className="absolute flex flex-col items-center"
                style={{ left: `calc(${pct}% - 20px)`, top: "-28px" }}
              >
                <p className={`text-[10px] font-bold mb-0.5 text-center whitespace-nowrap ${isMe ? "text-blue-600" : "text-slate-600"}`}>
                  {v.nome?.split(" ")[0]}
                  <br />
                  <span className={isMe ? "text-blue-500" : "text-slate-400"}>{formatValue(val, isVolume)}</span>
                </p>
                <Avatar nome={v.nome} foto={v.foto} isMe={isMe} size={36} />
                {isMe && (
                  <span className="mt-0.5 text-[9px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded-full">VOCÊ</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Labels 0% e 100% */}
        <div className="flex justify-between mt-1 px-0">
          <span className="text-[10px] text-slate-400">0%</span>
          <span className="text-[10px] text-slate-400">100%</span>
        </div>
      </div>
    </div>
  );
}