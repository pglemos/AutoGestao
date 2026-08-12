import React from "react";
import { Link } from "react-router-dom";
import { Target, CheckCircle } from "lucide-react";

export default function StatusMeta({ indicadores, filtro }) {
  const { meta, realizado, faltam, diasRestantes, necessarioPorDia, probabilidade } = indicadores;
  const metaBatida = faltam === 0 && meta > 0;
  const pct = meta > 0 ? Math.min(100, Math.round((realizado / meta) * 100)) : 0;

  const probCor =
    probabilidade === null ? "text-muted-foreground" :
    probabilidade >= 80 ? "text-status-success-text" :
    probabilidade >= 50 ? "text-status-warning-text" : "text-status-error-text";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-4">Status da Meta</p>

      {!meta ? (
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-text-disabled shrink-0" />
          <div>
            <p className="text-body-sm text-muted-foreground">Meta mensal não configurada.</p>
            <Link to="/perfil" className="text-[12px] font-bold text-status-info-text hover:underline">Definir meta no perfil →</Link>
          </div>
        </div>
      ) : metaBatida ? (
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-status-success-text shrink-0" />
          <div>
            <p className="text-[20px] font-bold text-status-success-text">Meta batida!</p>
            <p className="text-body-sm text-muted-foreground">{realizado} de {meta} vendas realizadas</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Números principais */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-[12px] text-muted-foreground mb-0.5">Realizado</p>
              <p className="text-h2 font-bold text-[#0F172A] tabular-nums leading-none">
                {realizado}
                <span className="text-[16px] font-semibold text-text-disabled ml-1">/ {meta}</span>
              </p>
              <p className="text-caption text-muted-foreground mt-0.5">vendas realizadas</p>
            </div>

            {/* Barra de progresso */}
            <div>
              <div className="flex justify-between text-caption text-muted-foreground mb-1">
                <span>{pct}% da meta</span>
                <span>{realizado} / {meta}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#005BFF] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px bg-muted self-stretch" />

          {/* Grid de indicadores */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="bg-surface-alt rounded-xl p-3">
              <p className="text-caption text-muted-foreground uppercase tracking-wide mb-0.5">Faltam</p>
              <p className="text-h3 font-bold text-status-error-text tabular-nums leading-none">{faltam}</p>
              <p className="text-caption text-muted-foreground">vendas</p>
            </div>
            <div className="bg-surface-alt rounded-xl p-3">
              <p className="text-caption text-muted-foreground uppercase tracking-wide mb-0.5">Dias úteis restantes</p>
              <p className="text-h3 font-bold text-[#0F172A] tabular-nums leading-none">
                {filtro === "mes_atual" ? (diasRestantes ?? "—") : "—"}
              </p>
              <p className="text-caption text-muted-foreground">seg–sab</p>
            </div>
            <div className="bg-surface-alt rounded-xl p-3">
              <p className="text-caption text-muted-foreground uppercase tracking-wide mb-0.5">Ritmo necessário</p>
              {filtro !== "mes_atual" || necessarioPorDia === null ? (
                <>
                  <p className="text-h3 font-bold text-status-warning-text tabular-nums leading-none">—</p>
                  <p className="text-caption text-muted-foreground">sem dados</p>
                </>
              ) : faltam <= 0 ? (
                <>
                  <p className="text-[18px] font-bold text-status-success-text leading-tight">Meta batida</p>
                  <p className="text-caption text-muted-foreground">Continue o ritmo.</p>
                </>
              ) : diasRestantes <= 0 ? (
                <>
                  <p className="text-[18px] font-bold text-status-error-text leading-tight">Prazo encerrado</p>
                  <p className="text-caption text-muted-foreground">Revise o fechamento.</p>
                </>
              ) : Number(necessarioPorDia) >= 1 ? (
                <>
                  <p className="text-h3 font-bold text-status-warning-text tabular-nums leading-none">
                    {Number(necessarioPorDia) % 1 === 0 ? Number(necessarioPorDia) : Number(necessarioPorDia).toFixed(2)}
                  </p>
                  <p className="text-caption text-muted-foreground">vendas por dia útil</p>
                  <p className="text-caption text-muted-foreground mt-1">≈ {Math.floor(Number(necessarioPorDia) * 6)}–{Math.ceil(Number(necessarioPorDia) * 6)} por semana</p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-bold text-status-warning-text leading-tight">
                    1 venda a cada
                  </p>
                  <p className="text-h3 font-bold text-status-warning-text tabular-nums leading-none">
                    {(diasRestantes / faltam).toFixed(1)} dias
                  </p>
                  <p className="text-caption text-muted-foreground mt-1">≈ {Math.floor(Number(necessarioPorDia) * 6)}–{Math.ceil(Number(necessarioPorDia) * 6)} por semana</p>
                </>
              )}
            </div>
            <div className="bg-surface-alt rounded-xl p-3">
              <p className="text-caption text-muted-foreground uppercase tracking-wide mb-0.5">Probabilidade</p>
              <p className={`text-h3 font-bold tabular-nums leading-none ${probCor}`}>
                {probabilidade !== null ? `${probabilidade}%` : "—"}
              </p>
              <p className="text-caption text-muted-foreground">com ritmo atual</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}