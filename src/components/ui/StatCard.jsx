import React from "react";
import { StatCard as CanonicalStatCard } from "@/components/molecules/StatCard";

const TONE_BY_COLOR = {
  blue: "blue",
  green: "green",
  amber: "orange",
  red: "red",
  navy: "brand",
};

/**
 * Adapter legacy → StatCard canônica.
 *
 * A base44-reference (snapshot congelado) ainda importa este caminho. A
 * geometria (padding/radius/sombra) agora é 100% da `molecules/StatCard`, que
 * compõe a família Card canônica — este arquivo só traduz as props antigas.
 */
export default function StatCard({ label, value, sublabel, icon: Icon, color = "blue", children, ...props }) {
  return (
    <CanonicalStatCard
      label={label}
      value={value}
      detail={sublabel}
      tone={TONE_BY_COLOR[color] || "blue"}
      icon={Icon ? <Icon className="w-5 h-5" /> : undefined}
      {...props}
    >
      {children}
    </CanonicalStatCard>
  );
}
