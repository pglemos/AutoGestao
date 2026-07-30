import React from "react";
import { Link } from "react-router-dom";
import { Target, CheckCircle } from "lucide-react";

export default function StatusMeta({ indicadores, filtro }) {
  const { meta, realizado, faltam, diasRestantes, necessarioPorDia, probabilidade } = indicadores;
  const metaBatida = faltam === 0 && meta > 0;
  const pct = meta > 0 ? Math.min(100, Math.round((realizado / meta) * 100)) : 0;

  const probCor =
    probabilidade === null ? "text-slate-400" :
    probabilidade >= 80 ? "text-green-600" :
    probabilidade >= 50 ? "text-amber-600" : "text-red-500";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Status da Meta</p>

      {!meta ? (
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-slate-300 shrink-0" />
          <div>
            <p className="text-[13px] text-slate-500">Meta mensal não configurada.</p>
            <Link to="/perfil" className="text-[12px] font-bold text-[#005BFF] hover:underline">Definir meta no perfil →</Link>
          </div>
        </div>
      ) : metaBatida ? (
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
          <div>
            <p className="text-[20px] font-bold text-green-600">Meta batida!</p>
            <p className="text-[13px] text-slate-500">{realizado} de {meta} vendas realizadas</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Números principais */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-[12px] text-slate-400 mb-0.5">Realizado</p>
              <p className="text-[32px] font-bold text-[#0F172A] tabular-nums leading-none">
                {realizado}
                <span className="text-[16px] font-semibold text-slate-300 ml-1">/ {meta}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">vendas realizadas</p>
            </div>

            {/* Barra de progresso */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>{pct}% da meta</span>
                <span>{realizado} / {meta}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#005BFF] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px bg-slate-100 self-stretch" />

          {/* Grid de indicadores */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Faltam</p>
              <p className="text-[22px] font-bold text-red-500 tabular-nums leading-none">{faltam}</p>
              <p className="text-[11px] text-slate-400">vendas</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Dias úteis restantes</p>
              <p className="text-[22px] font-bold text-[#0F172A] tabular-nums leading-none">
                {filtro === "mes_atual" ? (diasRestantes ?? "—") : "—"}
              </p>
              <p className="text-[11px] text-slate-400">seg–sab</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Ritmo necessário</p>
              {filtro !== "mes_atual" || necessarioPorDia === null ? (
                <>
                  <p className="text-[22px] font-bold text-amber-600 tabular-nums leading-none">—</p>
                  <p className="text-[11px] text-slate-400">sem dados</p>
                </>
              ) : faltam <= 0 ? (
                <>
                  <p className="text-[18px] font-bold text-green-600 leading-tight">Meta batida</p>
                  <p className="text-[11px] text-slate-400">Continue o ritmo.</p>
                </>
              ) : diasRestantes <= 0 ? (
                <>
                  <p className="text-[18px] font-bold text-red-500 leading-tight">Prazo encerrado</p>
                  <p className="text-[11px] text-slate-400">Revise o fechamento.</p>
                </>
              ) : Number(necessarioPorDia) >= 1 ? (
                <>
                  <p className="text-[22px] font-bold text-amber-600 tabular-nums leading-none">
                    {Number(necessarioPorDia) % 1 === 0 ? Number(necessarioPorDia) : Number(necessarioPorDia).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400">vendas por dia útil</p>
                  <p className="text-[10px] text-slate-400 mt-1">≈ {Math.floor(Number(necessarioPorDia) * 6)}–{Math.ceil(Number(necessarioPorDia) * 6)} por semana</p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-bold text-amber-600 leading-tight">
                    1 venda a cada
                  </p>
                  <p className="text-[22px] font-bold text-amber-600 tabular-nums leading-none">
                    {(diasRestantes / faltam).toFixed(1)} dias
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">≈ {Math.floor(Number(necessarioPorDia) * 6)}–{Math.ceil(Number(necessarioPorDia) * 6)} por semana</p>
                </>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Probabilidade</p>
              <p className={`text-[22px] font-bold tabular-nums leading-none ${probCor}`}>
                {probabilidade !== null ? `${probabilidade}%` : "—"}
              </p>
              <p className="text-[11px] text-slate-400">com ritmo atual</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}