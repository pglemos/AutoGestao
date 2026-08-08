// Gauge em SVG — semicircular (cards de indicadores) ou circular (MX Score).
export default function ScoreGauge({ value, max = 100, colorClass = "text-primary", variant = "semicircle" }) {
  const progress = Math.min(Math.max(value / max, 0), 1);

  if (variant === "circle") {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);
    return (
      <svg viewBox="0 0 100 100" className="w-full">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className={colorClass}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset var(--mx-duration-deliberate) ease" }}
        />
      </svg>
    );
  }

  // semicircle
  const radius = 50;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - progress);
  return (
    <svg viewBox="0 0 120 70" className="w-full">
      <path
        d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-muted"
        strokeLinecap="round"
      />
      <path
        d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className={colorClass}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset var(--mx-duration-deliberate) ease" }}
      />
    </svg>
  );
}