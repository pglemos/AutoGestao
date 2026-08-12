import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Modal } from "@/components/organisms/Modal";

type RegularizeLateModalProps = {
  open: boolean;
  sellerName: string;
  referenceDate: string;
  submittedAt: string | null | undefined;
  saving: boolean;
  onClose: () => void;
  onSubmit: (observation: string) => void | Promise<void>;
};

export function RegularizeLateModal({
  open,
  sellerName,
  referenceDate,
  submittedAt,
  saving,
  onClose,
  onSubmit,
}: RegularizeLateModalProps) {
  const [observation, setObservation] = useState("");

  useEffect(() => {
    if (open) setObservation("");
  }, [open, sellerName, referenceDate]);

  const valid = observation.trim().length >= 8;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      referenceStyle
      title="Regularizar Fechamento"
      description={`${sellerName} — ${formatDate(referenceDate)}`}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-alt disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onSubmit(observation.trim())}
            disabled={!valid || saving}
            className="h-11 rounded-xl bg-status-info px-4 text-sm font-semibold text-white shadow-sm hover:bg-status-info disabled:cursor-not-allowed disabled:bg-status-info/20"
          >
            {saving ? "Enviando..." : "Enviar Regularização"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-status-info/20 bg-status-info-surface p-4 text-sm leading-5 text-status-info-text">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p>
            Este fechamento foi enviado fora do horário limite. Ao regularizar,
            ele ficará como “Aguardando aprovação” e será avaliado pelo gerente.
          </p>
        </div>

        <div className="space-y-2 rounded-xl bg-surface-alt p-4 text-sm">
          <DataRow label="Vendedor" value={sellerName} />
          <DataRow label="Data" value={formatDate(referenceDate)} />
          <DataRow label="Entrega" value={formatTime(submittedAt)} />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Observação
          </span>
          <textarea
            aria-label="Observação da regularização"
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            rows={4}
            placeholder="Justificativa ou contexto da regularização..."
            className="w-full resize-none rounded-xl border border-border px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-status-info"
          />
          <span className="mt-1 block text-caption text-muted-foreground">
            Informe ao menos 8 caracteres para manter a justificativa auditável.
          </span>
        </label>
      </div>
    </Modal>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <strong className="text-foreground">{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return format(parseISO(`${value}T12:00:00`), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const civilTime = value.match(/T(\d{2}):(\d{2})/);
  if (civilTime) return `${civilTime[1]}:${civilTime[2]}`;
  try {
    return format(parseISO(value), "HH:mm");
  } catch {
    return "—";
  }
}
