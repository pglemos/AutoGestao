import React from "react";

// Card compacto de funil — linhas simples com conversão entre etapas
export default function FunilCompacto({ titulo, subtitulo, cor, etapas, conversaoGeral }) {
  const COR = {
    orange: { header: "bg-status-warning-surface border-status-warning/30", badge: "bg-status-warning-surface text-status-warning-text", dot: "bg-orange-400", pct: "text-status-warning-text" },
    blue:   { header: "bg-status-info-surface border-status-info/30",   badge: "bg-status-info-surface text-status-info-text",   dot: "bg-blue-400",   pct: "text-status-info-text"   },
    green:  { header: "bg-brand-primary-subtle border-brand-primary/30", badge: "bg-brand-primary-subtle text-brand-primary-hover", dot: "bg-brand-primary/50", pct: "text-status-success-text"  },
  };
  const c = COR[cor] || COR.blue;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${c.header}`}>
        <div>
          <p className="text-body-sm font-bold text-mx-navy uppercase tracking-wide">{titulo}</p>
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
                  <span className="text-body-sm text-mx-navy font-medium">{etapa.label}</span>
                </div>
                <span className="text-body font-bold tabular-nums text-mx-navy">{etapa.value}</span>
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