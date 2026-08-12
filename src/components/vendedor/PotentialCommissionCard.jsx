import React from "react";
import { formatBRL } from "@/components/vendedor/formatBRL";

// Mini sparkline ascendente usando SVG inline
function Sparkline() {
  const points = [30, 45, 35, 55, 48, 65, 80, 72, 90];
  const max = Math.max(...points);
  const w = 120, h = 60;
  const coords = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id="spline" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <polyline points={coords} stroke="url(#spline)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PotentialCommissionCard({ comissaoProjetada, ganhoPotencial }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col justify-between"
      style={{
        background: "#071525",
        border: "1px solid rgba(255,255,255,0.06)",
        minHeight: "180px",
      }}
    >
      <div>
        <div className="flex items-start justify-between">
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest max-w-[60%]">
            Se fechar todos os clientes quentes
          </p>
          <Sparkline />
        </div>
        <p className="text-muted-foreground text-sm mt-3">Sua comissão sobe para</p>
        <p
          className="font-bold mt-1 tabular-nums"
          style={{ fontSize: "2.25rem", color: "#39FF5A", textShadow: "0 0 20px rgba(57,255,90,0.3)" }}
        >
          {formatBRL(comissaoProjetada).replace(",00", "")}
        </p>
      </div>

      <div
        className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl"
        style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
      >
        <span className="text-lg">🔥</span>
        <span className="text-emerald-400 text-sm font-semibold">
          Potencial de ganho: <span className="font-bold">{formatBRL(ganhoPotencial).replace(",00","")}</span>
        </span>
      </div>
    </div>
  );
}