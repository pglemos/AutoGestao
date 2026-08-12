import React from "react";
import { Gift, Shield, Clock, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";

const TIPO_STATUS = {
  "Melhor vendedor do mês": "disputa",
  "Melhor vendedor do trimestre": "disputa",
  "Melhor vendedor do semestre": "disputa",
  "Melhor vendedor do ano": "disputa",
  "Loja bateu meta": "condicional",
  "Campanha específica": "ativa",
  "Outro": "ativa",
};

const STATUS_CONFIG = {
  disputa: { label: "Em disputa", color: "text-status-warning-text", bg: "bg-status-warning-surface", border: "border-status-warning/20", icon: Clock },
  condicional: { label: "Condicional", color: "text-status-info-text", bg: "bg-status-info-surface", border: "border-status-info/20", icon: Shield },
  ativa: { label: "Ativa", color: "text-status-success-text", bg: "bg-status-success-surface", border: "border-status-success/20", icon: CheckCircle2 },
};

export default function BonusDisputeCard({ bonificacoes }) {
  if (!bonificacoes || bonificacoes.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-border-subtle shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-4 h-4 text-purple-500" />
          <span className="text-purple-600 text-xs font-semibold uppercase tracking-widest">Bônus em Disputa</span>
        </div>
        <div className="text-center py-4">
          <p className="text-muted-foreground text-sm">Nenhuma bonificação em disputa no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-border-subtle shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-4 h-4 text-purple-500" />
        <span className="text-purple-600 text-xs font-semibold uppercase tracking-widest">Bônus em Disputa</span>
      </div>

      <div className="space-y-3">
        {bonificacoes.map((bon, i) => {
          const statusKey = TIPO_STATUS[bon.tipo] || "ativa";
          const cfg = STATUS_CONFIG[statusKey];
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex items-start justify-between p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{bon.nome}</p>
                {bon.criterio && <p className="text-xs text-muted-foreground mt-0.5">{bon.criterio}</p>}
                <div className={`flex items-center gap-1 mt-1.5 ${cfg.color}`}>
                  <Icon className="w-3 h-3" />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
              </div>
              <div className="text-right ml-3">
                <p className="text-sm font-bold text-foreground">{formatBRL(bon.valor)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs mt-4">
        Bônus em disputa não são somados ao salário previsto até confirmação.
      </p>
    </div>
  );
}