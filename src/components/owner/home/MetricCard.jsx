import { DollarSign, Percent, Car, Package, CalendarCheck } from "lucide-react";
import { STATUS_STYLES, ICON_STYLES, SPARK_COLORS } from "./homeData";
import Sparkline from "./Sparkline";

const ICONS = {
  dollar: DollarSign,
  percent: Percent,
  car: Car,
  package: Package,
  calendarCheck: CalendarCheck,
};

export default function MetricCard({ indicator }) {
  const style = STATUS_STYLES[indicator.status];
  const Icon = ICONS[indicator.icon] || DollarSign;
  const iconStyle = ICON_STYLES[indicator.iconColor] || ICON_STYLES.green;
  const sparkColor = SPARK_COLORS[indicator.sparkColor] || SPARK_COLORS.green;

  return (
    <article role="listitem" className={`rounded-xl border ${style.cardAccent} bg-card p-4 shadow-sm`} aria-label={indicator.title}>
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconStyle}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`inline-flex h-2 w-2 rounded-full ${style.dot}`} role="status" aria-label={`Status: ${indicator.status}`} />
      </div>
      <p className="mt-2.5 text-sm font-medium text-muted-foreground">{indicator.title}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground" aria-label={`${indicator.title}: ${indicator.value}`}>{indicator.value}</p>
      {indicator.complement && <p className="mt-0.5 text-xs text-muted-foreground">{indicator.complement}</p>}
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className={`text-xs font-medium ${indicator.trendUp ? "text-primary" : "text-status-error-text"}`} aria-label={`Tendência: ${indicator.trend}`}>
          {indicator.trend}
        </p>
        <div className="h-8 w-16 shrink-0" aria-hidden="true">
          <Sparkline data={indicator.sparkline} colorClass={sparkColor} />
        </div>
      </div>
    </article>
  );
}