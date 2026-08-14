import React from "react";
import { chartTokens } from "@/lib/charts/tokens"

export default function DisciplineRing({ score, size = "md" }) {
  const dimensions = { sm: 88, md: 104, lg: 120 };
  const strokes = { sm: 11, md: 13, lg: 15 };

  const px = dimensions[size] ?? dimensions.md;
  const strokeWidth = strokes[size] ?? strokes.md;
  const r = (px - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.max(0, Math.min(score / 100, 1)) * circ;

  const color =
    score >= 90 ? chartTokens.success() :
    score >= 70 ? chartTokens.info() :
    score >= 40 ? chartTokens.warning() :
    chartTokens.danger();

  const fontSize = score === 100 ? px * 0.16 : px * 0.19;

  return (
    <div className="relative flex-shrink-0" style={{ width: px, height: px }}>
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          stroke={chartTokens.grid()}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray var(--mx-duration-slow) ease, stroke var(--mx-duration-slow) ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-bold tabular-nums leading-none"
          style={{ fontSize, color: chartTokens.primary(), fontFamily: "Inter, sans-serif" }}
        >
          {score}%
        </span>
      </div>
    </div>
  );
}