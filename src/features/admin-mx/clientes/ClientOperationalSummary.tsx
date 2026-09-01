import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Info,
} from "lucide-react";
import { Button } from "@/components/atoms/Button";
import type { ClientDetailNextAction } from "./clientDetailPresentation";

type SummaryTone = "success" | "warning" | "danger" | "info";

const TONE_STYLES: Record<
  SummaryTone,
  { surface: string; icon: string; status: string }
> = {
  success: {
    surface: "border-status-success/25 bg-status-success-surface/40",
    icon: "bg-status-success-surface text-status-success-text",
    status: "bg-status-success-surface text-status-success-text",
  },
  warning: {
    surface: "border-status-warning/30 bg-status-warning-surface/45",
    icon: "bg-status-warning-surface text-status-warning-text",
    status: "bg-status-warning-surface text-status-warning-text",
  },
  danger: {
    surface: "border-status-error/30 bg-status-error-surface/40",
    icon: "bg-status-error-surface text-status-error-text",
    status: "bg-status-error-surface text-status-error-text",
  },
  info: {
    surface: "border-status-info/25 bg-status-info-surface/40",
    icon: "bg-status-info-surface text-status-info-text",
    status: "bg-status-info-surface text-status-info-text",
  },
};

function StatusIcon({ tone }: { tone: SummaryTone }) {
  if (tone === "success") return <CheckCircle2 size={20} aria-hidden="true" />;
  if (tone === "info") return <Info size={20} aria-hidden="true" />;
  return tone === "danger" ? (
    <CircleAlert size={20} aria-hidden="true" />
  ) : (
    <AlertTriangle size={20} aria-hidden="true" />
  );
}

export function ClientOperationalSummary(props: {
  statusLabel: string;
  statusTone: SummaryTone;
  statusDescription: string;
  completedValue: string;
  completedDetail: string;
  attentionValue: string;
  attentionDetail: string;
  nextAction: ClientDetailNextAction;
  onNextAction: () => void;
}) {
  const styles = TONE_STYLES[props.statusTone];

  return (
    <section
      aria-labelledby="client-operational-summary-title"
      data-mx-client-operational-summary=""
      className="overflow-hidden rounded-[var(--mx-card-radius)] border border-border bg-white shadow-[var(--mx-card-shadow)]"
    >
      <div
        className={`flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${styles.surface}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${styles.icon}`}
          >
            <StatusIcon tone={props.statusTone} />
          </span>
          <div className="min-w-0">
            <h2
              id="client-operational-summary-title"
              className="text-base font-semibold text-foreground"
            >
              Leitura operacional
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
              {props.statusDescription}
            </p>
          </div>
        </div>
        <span
          role="status"
          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${styles.status}`}
        >
          {props.statusLabel}
        </span>
      </div>

      <div className="grid divide-y divide-border-subtle medium:grid-cols-3 medium:divide-x medium:divide-y-0">
        <div className="order-3 min-w-0 p-4 sm:p-5 medium:order-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2
              size={16}
              className="text-status-success-text"
              aria-hidden="true"
            />
            <span>Concluído</span>
          </div>
          <p className="mt-2 text-xl font-bold leading-6 text-foreground">
            {props.completedValue}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {props.completedDetail}
          </p>
        </div>

        <div className="order-2 min-w-0 p-4 sm:p-5 medium:order-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle
              size={16}
              className="text-status-warning-text"
              aria-hidden="true"
            />
            <span>Atenção</span>
          </div>
          <p className="mt-2 text-xl font-bold leading-6 text-foreground">
            {props.attentionValue}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {props.attentionDetail}
          </p>
        </div>

        <div className="order-1 min-w-0 p-4 sm:p-5 medium:order-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ArrowRight
              size={16}
              className="text-status-info-text"
              aria-hidden="true"
            />
            <span>Próxima ação</span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-5 text-foreground">
            {props.nextAction.label}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {props.nextAction.detail}
          </p>
          <Button
            size="sm"
            className="mt-3 w-full justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus-ring focus-visible:ring-offset-2 sm:w-auto"
            onClick={props.onNextAction}
          >
            {props.nextAction.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
