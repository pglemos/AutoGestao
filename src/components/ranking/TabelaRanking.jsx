import React from "react";
import { Trophy } from "lucide-react";

const MEDAL = [
  { color: "#F59E0B", bg: "#FEF3C7" },
  { color: "#94a3b8", bg: "#f1f5f9" },
  { color: "#CD7F32", bg: "#fef9f0" },
];

function Avatar({ nome, foto, size = 32 }) {
  const initials = nome ? nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size, height: size, minWidth: size,
        background: "linear-gradient(135deg,#00A896,#005BFF)",
        fontSize: size * 0.35,
      }}
    >
      {foto ? <img src={foto} alt={nome} className="w-full h-full rounded-full object-cover" /> : initials}
    </div>
  );
}

function StatusBadge({ pct }) {
  if (pct >= 100) return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-green-100 text-green-700">Acima da meta</span>;
  if (pct >= 80)  return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-warning-surface text-status-warning-text">Próximo da meta</span>;
  if (pct >= 50)  return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-info-surface text-status-info-text">Em evolução</span>;
  return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-error-surface text-status-error-text">Abaixo do esperado</span>;
}

function formatBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v || 0);
}

export default function TabelaRanking({ vendedores, meta, isVolume, meuId }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-slate-50 border-b border-border-subtle">
              {["Posição", "Vendedor", "Unidade", isVolume ? "Vendas" : "Faturamento", "Meta", "Atingimento", "Status"].map(h => (
                <th key={h} className="text-left text-caption font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendedores.map((v, i) => {
              const isMe = v.id === meuId;
              const val = isVolume ? v.vendas : v.faturamento;
              const pct = meta > 0 ? Math.round((val / meta) * 100) : 0;
              const medal = MEDAL[i] || null;
              return (
                <tr
                  key={v.id}
                  className={`border-b border-slate-50 transition-colors ${isMe ? "bg-status-info-surface/60" : "hover:bg-slate-50/50"}`}
                  style={isMe ? { outline: "1.5px solid #3b82f6", outlineOffset: "-1px" } : {}}
                >
                  {/* Posição */}
                  <td className="px-4 py-3">
                    {medal ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: medal.bg }}>
                        <Trophy className="w-4 h-4" style={{ color: medal.color }} fill="currentColor" />
                      </div>
                    ) : (
                      <span className="text-[14px] font-bold text-muted-foreground">{i + 1}</span>
                    )}
                  </td>
                  {/* Vendedor */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar nome={v.nome} foto={v.foto} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-body-sm font-semibold text-foreground">{v.nome}</span>
                          {isMe && <span className="px-1.5 py-0.5 bg-status-info-surface text-status-info-text text-caption font-bold rounded-full">Você</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Unidade */}
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{v.unidade || "—"}</td>
                  {/* Vendas / Faturamento */}
                  <td className="px-4 py-3">
                    <span className={`text-[14px] font-bold ${isMe ? "text-status-info-text" : "text-green-600"}`}>
                      {isVolume ? val : formatBRL(val)}
                    </span>
                  </td>
                  {/* Meta */}
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{isVolume ? meta : formatBRL(meta)}</td>
                  {/* Atingimento */}
                  <td className="px-4 py-3">
                    <span className={`text-[14px] font-bold ${pct >= 100 ? "text-green-600" : pct >= 80 ? "text-status-warning-text" : pct >= 50 ? "text-status-info" : "text-status-error"}`}>
                      {pct}%
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3"><StatusBadge pct={pct} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {vendedores.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-body-sm">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}