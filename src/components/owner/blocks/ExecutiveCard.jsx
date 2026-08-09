import { cn } from "@/lib/utils";
import StatusBadge from "@/components/owner/StatusBadge";
import { formatBRL, formatPercent, formatNumber, formatDateTime } from "@/lib/owner-b44/format";
import { ArrowUpRight } from "lucide-react";

// Barra de progresso compacta com cor de status
function MiniProgress({ value, tone = "slate" }) {
  const toneBg = {
    green: "bg-primary",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    slate: "bg-muted-foreground/60",
  }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", toneBg)} style={{ width: `${Math.min(100, value || 0)}%` }} />
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm tabular-nums", strong ? "font-semibold text-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

export default function ExecutiveCard({ title, status, rows = [], progress, deviation, updatedAt, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full w-full flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3.5 flex-1 space-y-2">
        {rows.map((r, i) => (
          <Row key={i} {...r} />
        ))}
      </div>

      {progress && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.label}</span>
            <span className="tabular-nums">{formatPercent(progress.value, 0)}</span>
          </div>
          <MiniProgress value={progress.value} tone={progress.tone || "slate"} />
        </div>
      )}

      {deviation && (
        <p className="mt-3 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Motivo do desvio:</span> {deviation}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-caption text-muted-foreground/80">
          {updatedAt ? `Atualizado em ${formatDateTime(updatedAt)}` : "—"}
        </span>
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground/80 transition-colors group-hover:text-foreground">
          Ver detalhes
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}