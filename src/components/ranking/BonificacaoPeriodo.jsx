import React from "react";
import { Gift, Trophy } from "lucide-react";

const MEDAL_COLORS = ["#F59E0B", "#94a3b8", "#CD7F32"];
const MEDAL_LABELS = ["1º lugar", "2º lugar", "3º lugar"];

function formatBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v || 0);
}

export default function BonificacaoPeriodo({ bonificacao }) {
  if (!bonificacao) return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 w-full sm:w-[260px]">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-status-success-text" />
        <h2 className="text-body font-bold text-foreground">Bonificação do Período</h2>
      </div>
      <p className="text-body-sm text-muted-foreground text-center py-6">Nenhuma bonificação cadastrada para este período.</p>
    </div>
  );

  const rows = [
    { label: "1º lugar", valor: bonificacao.primeiro_lugar_valor, desc: bonificacao.primeiro_lugar_descricao, color: "#F59E0B" },
    { label: "2º lugar", valor: bonificacao.segundo_lugar_valor, desc: bonificacao.segundo_lugar_descricao, color: "#94a3b8" },
    { label: "3º lugar", valor: bonificacao.terceiro_lugar_valor, desc: bonificacao.terceiro_lugar_descricao, color: "#CD7F32" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 w-full sm:w-[260px]">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-status-success-text" />
        <h2 className="text-body font-bold text-foreground">Bonificação do Período</h2>
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: r.color }} fill="currentColor" />
              <span className="text-body-sm font-medium text-foreground">{r.label}</span>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-bold text-foreground">{formatBRL(r.valor)}</p>
              {r.desc && <p className="text-caption text-muted-foreground">{r.desc}</p>}
            </div>
          </div>
        ))}
        {bonificacao.bonus_meta_valor > 0 && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-brand-primary/20 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-status-success-text text-body">📈</span>
              <div>
                <p className="text-[12px] font-semibold text-brand-primary-hover">Acima de 100% da meta</p>
                <p className="text-caption text-muted-foreground">{bonificacao.bonus_meta_descricao || "bônus extra"}</p>
              </div>
            </div>
            <p className="text-[14px] font-bold text-status-success-text">{formatBRL(bonificacao.bonus_meta_valor)}</p>
          </div>
        )}
      </div>
    </div>
  );
}