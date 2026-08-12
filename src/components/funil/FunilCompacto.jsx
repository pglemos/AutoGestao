import React from "react";

// Card compacto de funil — linhas simples com conversão entre etapas
export default function FunilCompacto({ titulo, subtitulo, cor, etapas, conversaoGeral }) {
  const COR = {
    orange: { header: "bg-status-warning-surface border-status-warning/30", badge: "bg-status-warning-surface text-status-warning-text", dot: "bg-orange-400", pct: "text-status-warning" },
    blue:   { header: "bg-status-info-surface border-status-info/30",   badge: "bg-status-info-surface text-status-info-text",   dot: "bg-blue-400",   pct: "text-status-info"   },
    green:  { header: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-700", dot: "bg-green-400", pct: "text-green-600"  },
  };
  const c = COR[cor] || COR.blue;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${c.header}`}>
        <div>
          <p className="text-body-sm font-bold text-[#0F172A] uppercase tracking-wide">{titulo}</p>
          <p className="text-caption text-muted-foreground">{subtitulo}</p>
        </div>
        {conversaoGeral !== null && conversaoGeral !== undefined ? (
          <span className={`text-caption font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
            {conversaoGeral}% conv.
          </span>
        ) : (
          <span className="text-caption text-text-disabled font-medium">—</span>
        )}
      </div>

      {/* Etapas */}
      <div className="px-4 py-3 space-y-0">
        {etapas.map((etapa, idx) => {
          const next = etapas[idx + 1];
          const pct = next && etapa.value > 0 ? Math.round((next.value / etapa.value) * 100) : null;
          return (
            <div key={etapa.id}>
              {/* Linha da etapa */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className="text-body-sm text-[#0F172A] font-medium">{etapa.label}</span>
                </div>
                <span className="text-body font-bold tabular-nums text-[#0F172A]">{etapa.value}</span>
              </div>
              {/* Conversão para próxima etapa */}
              {next && (
                <div className="flex items-center justify-between pl-3.5 pb-1">
                  <span className={`text-caption font-semibold ${c.pct}`}>
                    {pct !== null ? `→ ${pct}%` : "→"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}