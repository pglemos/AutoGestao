import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

// ── Utilitário ────────────────────────────────────────────────────────────────

function pct(a, b) {
  if (!b || b === 0) return null;
  return Math.round((a / b) * 100);
}

function PctArrow({ value }) {
  if (value === null) return <div className="flex items-center justify-center gap-1 py-1"><ChevronDown className="w-4 h-4 text-text-disabled" /></div>;
  const color = value >= 60 ? "text-status-success-text" : value >= 30 ? "text-status-warning-text" : "text-status-error-text";
  return (
    <div className="flex items-center justify-center gap-1 py-1">
      <ChevronDown className="w-4 h-4 text-text-disabled" />
      <span className={`text-[12px] font-bold ${color}`}>{value}%</span>
    </div>
  );
}

function EtapaRow({ label, value, modalidades, isLast, onClickEtapa }) {
  return (
    <div>
      <div
        className={`rounded-xl border px-4 py-3 text-center ${onClickEtapa ? "cursor-pointer hover:border-status-info/50 hover:bg-status-info-surface/40 transition-colors" : ""} bg-white border-border`}
        onClick={onClickEtapa}
      >
        <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-h2 font-bold text-mx-navy tabular-nums leading-none">{value}</p>
        {value === 0 && <p className="text-caption text-text-disabled mt-0.5">Sem registros</p>}
      </div>
      {modalidades && modalidades.length > 0 && (
        <div className="mt-1.5 px-1 space-y-0.5">
          {modalidades.map(m => (
            <div key={m.label} className="flex justify-between text-caption">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-semibold text-muted-foreground">{m.value}</span>
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
    orange: { border: "border-status-warning/30", bg: "bg-status-warning-surface", title: "text-status-warning-text", iconBg: "bg-status-warning", badge: "bg-status-warning-surface text-status-warning-text" },
    blue:   { border: "border-status-info/30",   bg: "bg-status-info-surface",   title: "text-status-info-text",   iconBg: "bg-status-info",   badge: "bg-status-info-surface text-status-info-text"   },
    green:  { border: "border-brand-primary/30",  bg: "bg-brand-primary-subtle",  title: "text-brand-primary-hover",  iconBg: "bg-brand-primary",  badge: "bg-brand-primary-subtle text-brand-primary-hover"  },
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
          {descricao && <p className="text-caption text-muted-foreground mt-0.5">{descricao}</p>}
        </div>
        {conversaoGeral !== null && !semDados && (
          <span className={`text-caption font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${c.badge}`}>
            {conversaoGeral}% geral
          </span>
        )}
      </div>

      {/* Funil */}
      {semDados ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
          <p className="text-body-sm text-muted-foreground font-medium">Sem dados no período</p>
          <p className="text-caption text-text-disabled">Registre atendimentos no Fechamento Diário</p>
          <Link to="/fechamento" className="mt-2 text-[12px] font-bold text-status-info-text hover:underline">Abrir Fechamento Diário</Link>
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
                    <ChevronDown className="w-4 h-4 text-text-disabled" />
                    {conv !== null && (
                      <span className={`text-[12px] font-bold ${conv >= 60 ? "text-status-success-text" : conv >= 30 ? "text-status-warning-text" : "text-status-error-text"}`}>
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