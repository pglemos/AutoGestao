import React from "react";
import { Link } from "react-router-dom";
import { Star, Play } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";

export default function RecordRoutineCard({ melhorMes }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col justify-between"
      style={{
        background: "#071525",
        border: "1px solid rgba(255,255,255,0.06)",
        minHeight: "220px",
      }}
    >
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.3)" }}
        >
          <Star className="w-7 h-7" style={{ color: "#22c55e", filter: "drop-shadow(0 0 6px rgba(34,197,94,0.5))" }} fill="currentColor" />
        </div>

        <p className="text-muted-foreground text-sm mb-1">Seu recorde foi</p>
        <p
          className="font-bold tabular-nums"
          style={{ fontSize: "2.25rem", color: "#39FF5A", textShadow: "0 0 20px rgba(57,255,90,0.3)" }}
        >
          {melhorMes > 0 ? formatBRL(melhorMes).replace(",00", "") : "—"}
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Vamos buscar{" "}
          <span style={{ color: "#22c55e" }}>isso novamente?</span>
        </p>
      </div>

      <Link to="/execucao">
        <button
          className="w-full mt-5 flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base tracking-wide transition-all hover:brightness-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            color: "#030B14",
            boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
          }}
        >
          <Play className="w-5 h-5" fill="currentColor" />
          EXECUTAR MINHA ROTINA
        </button>
      </Link>
      <p className="text-muted-foreground text-xs text-center mt-2">Acesse sua Rotina do Dia e venda mais hoje!</p>
    </div>
  );
}