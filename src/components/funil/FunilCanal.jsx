import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

// ── Utilitário ────────────────────────────────────────────────────────────────

function pct(a, b) {
  if (!b || b === 0) return null;
  return Math.round((a / b) * 100);
}

function PctArrow({ value }) {
  if (value === null) return <div className="flex items-center justify-center gap-1 py-1"><ChevronDown className="w-4 h-4 text-slate-300" /></div>;
  const color = value >= 60 ? "text-green-600" : value >= 30 ? "text-amber-600" : "text-red-500";
  return (
    <div className="flex items-center justify-center gap-1 py-1">
      <ChevronDown className="w-4 h-4 text-slate-300" />
      <span className={`text-[12px] font-bold ${color}`}>{value}%</span>
    </div>
  );
}

function EtapaRow({ label, value, modalidades, isLast, onClickEtapa }) {
  return (
    <div>
      <div
        className={`rounded-xl border px-4 py-3 text-center ${onClickEtapa ? "cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors" : ""} bg-white border-slate-200`}
        onClick={onClickEtapa}
      >
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-[28px] font-bold text-[#0F172A] tabular-nums leading-none">{value}</p>
        {value === 0 && <p className="text-[10px] text-slate-300 mt-0.5">Sem registros</p>}
      </div>
      {modalidades && modalidades.length > 0 && (
        <div className="mt-1.5 px-1 space-y-0.5">
          {modalidades.map(m => (
            <div key={m.label} className="flex justify-between text-[11px]">
              <span className="text-slate-400">{m.label}</span>
              <span className="font-semibold text-slate-600">{m.value}</span>
            </div>
          ))}
        </div>
      )}
      {!isLast && <PctArrow value={null} />}
    </div>
  );
}

// ── Funil genérico (vertical) ─────────────────────────────────────────────────

/**
 * etapas: Array<{ id, label, value, modalidades? }>
 * conversaoGeral: number | null
 */
export default function FunilCanal({ titulo, cor, icone: Icone, etapas, conversaoGeral, descricao }) {
  const semDados = etapas.every(e => e.value === 0);

  const corMap = {
    orange: { border: "border-orange-200", bg: "bg-orange-50", title: "text-orange-700", iconBg: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
    blue:   { border: "border-blue-200",   bg: "bg-blue-50",   title: "text-blue-700",   iconBg: "bg-blue-600",   badge: "bg-blue-100 text-blue-700"   },
    green:  { border: "border-green-200",  bg: "bg-green-50",  title: "text-green-700",  iconBg: "bg-green-500",  badge: "bg-green-100 text-green-700"  },
  };
  const c = corMap[cor] || corMap.blue;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-full ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icone className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-bold uppercase tracking-wider ${c.title}`}>{titulo}</p>
          {descricao && <p className="text-[11px] text-slate-400 mt-0.5">{descricao}</p>}
        </div>
        {conversaoGeral !== null && !semDados && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${c.badge}`}>
            {conversaoGeral}% geral
          </span>
        )}
      </div>

      {/* Funil */}
      {semDados ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
          <p className="text-[13px] text-slate-400 font-medium">Sem dados no período</p>
          <p className="text-[11px] text-slate-300">Registre atendimentos no Fechamento Diário</p>
          <Link to="/fechamento" className="mt-2 text-[12px] font-bold text-[#005BFF] hover:underline">Abrir Fechamento Diário</Link>
        </div>
      ) : (
        <div className="space-y-0">
          {etapas.map((etapa, idx) => {
            const proxima = etapas[idx + 1];
            const conv = proxima ? pct(proxima.value, etapa.value) : null;
            return (
              <div key={etapa.id}>
                <EtapaRow
                  label={etapa.label}
                  value={etapa.value}
                  modalidades={etapa.modalidades}
                  isLast={idx === etapas.length - 1}
                  onClickEtapa={etapa.onClickEtapa}
                />
                {proxima && (
                  <div className="flex items-center justify-center gap-1 py-1.5">
                    <ChevronDown className="w-4 h-4 text-slate-300" />
                    {conv !== null && (
                      <span className={`text-[12px] font-bold ${conv >= 60 ? "text-green-600" : conv >= 30 ? "text-amber-600" : "text-red-500"}`}>
                        {conv}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}