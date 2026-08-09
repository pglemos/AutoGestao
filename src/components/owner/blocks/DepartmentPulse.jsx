import { useState } from "react";
import DetailDrawer from "@/components/owner/DetailDrawer";
import StatusBadge from "@/components/owner/StatusBadge";
import { CardSkeleton } from "@/components/owner/Skeleton";
import { useOwner } from "@/components/owner/OwnerContext";
import { DEPARTMENT_LABELS } from "@/features/owner/lib/ownerStatus";
import { formatDateTime } from "@/features/owner/lib/ownerFormatters";
import { ArrowUpRight } from "lucide-react";

const ORDER = ["commercial", "marketing", "product_stock", "people_hr", "financial", "operations"];

export default function DepartmentPulse({ snapshots, loading, onTalkToConsultant }) {
  const [selected, setSelected] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const byDept = {};
  snapshots.forEach((s) => {
    byDept[s.department] = s;
  });

  const list = ORDER.map((d) => byDept[d]).filter(Boolean);

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum snapshot de departamento encontrado para o período selecionado.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s)}
            className="group flex flex-col rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{DEPARTMENT_LABELS[s.department] || s.department}</h3>
              <StatusBadge status={s.status} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label={s.primary_metric_label} value={s.primary_metric_value} />
              <Metric label={s.secondary_metric_label} value={s.secondary_metric_value} />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.summary}</p>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
              <span className="text-caption text-muted-foreground/80">
                {s.last_data_at ? `Atualizado em ${formatDateTime(s.last_data_at)}` : "—"}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground/80 transition-colors group-hover:text-foreground">
                Ver detalhes
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <DetailDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? DEPARTMENT_LABELS[selected.department] : ""}
        description={selected?.summary}
        footer={
          <button
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onTalkToConsultant(selected)}
          >
            Falar com Consultor
          </button>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <StatusBadge status={selected.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Block title={selected.primary_metric_label || "Indicador principal"}>
                <p className="text-lg font-semibold text-foreground">{selected.primary_metric_value || "—"}</p>
              </Block>
              <Block title={selected.secondary_metric_label || "Indicador secundário"}>
                <p className="text-lg font-semibold text-foreground">{selected.secondary_metric_value || "—"}</p>
              </Block>
            </div>

            <Block title="Motivo do status">
              <p className="text-sm text-muted-foreground">{selected.status_reason || "Sem justificativa registrada."}</p>
            </Block>

            <Block title="Resumo">
              <p className="text-sm text-muted-foreground">{selected.summary}</p>
            </Block>

            <div className="rounded-md bg-muted/60 px-3 py-2 text-caption text-muted-foreground/80">
              Fonte: {selected.source || "—"} • Atualizado: {formatDateTime(selected.last_data_at || selected.updated_date)}
            </div>

            <div className="rounded-md border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs text-muted-foreground">
              A página detalhada do departamento será construída na próxima etapa.
            </div>
          </div>
        )}
      </DetailDrawer>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-caption text-muted-foreground/80">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{value || "—"}</p>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <p className="mb-1 text-caption font-medium uppercase tracking-wide text-muted-foreground/80">{title}</p>
      {children}
    </div>
  );
}
