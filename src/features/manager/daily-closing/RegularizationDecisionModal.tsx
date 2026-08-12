import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Modal } from "@/components/organisms/Modal";
import type { RegularizationRequest } from "./RegularizationsListModal";

export type RegularizationDecision = "approve" | "reject";

type RegularizationDecisionModalProps = {
  open: boolean;
  action: RegularizationDecision;
  request: RegularizationRequest | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void | Promise<void>;
};

export function RegularizationDecisionModal({
  open,
  action,
  request,
  saving = false,
  onClose,
  onConfirm,
}: RegularizationDecisionModalProps) {
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setComment("");
    setConfirmed(false);
  }, [open, action, request?.id]);

  if (!request) return null;

  const sellerName = request.seller?.name || request.seller_id;
  const referenceDate = formatReferenceDate(
    request.requested_values.reference_date || request.created_at,
  );
  const isApproval = action === "approve";
  const canSubmit = isApproval ? confirmed : comment.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      referenceStyle
      title={isApproval ? "Aprovar regularização?" : "Recusar regularização?"}
      description={`${sellerName} — ${referenceDate}`}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onConfirm(comment.trim())}
            disabled={!canSubmit || saving}
            className={
              isApproval
                ? "h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-200"
                : "h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-200"
            }
          >
            {saving
              ? "Processando..."
              : isApproval
                ? "Aprovar"
                : "Confirmar recusa"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {isApproval
            ? "Confirme a aprovação da regularização deste fechamento. Após aprovada, ela passará a contar nos indicadores oficiais conforme as regras da loja."
            : "Informe o motivo da recusa. A solicitação continuará registrada na auditoria e não contará nos indicadores oficiais."}
        </p>

        <div>
          <label
            htmlFor="regularization-decision-comment"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            {isApproval ? "Comentário (opcional)" : "Motivo da recusa"}
          </label>
          <textarea
            id="regularization-decision-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder={
              isApproval
                ? "Adicione um comentário sobre a aprovação..."
                : "Descreva por que a regularização foi recusada..."
            }
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {isApproval && (
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="sr-only"
              aria-label="Confirmo a aprovação da regularização."
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded ${
                confirmed
                  ? "bg-emerald-600 text-white"
                  : "border border-gray-300 bg-white"
              }`}
            >
              {confirmed && <Check size={12} />}
            </span>
            <span className="text-sm text-muted-foreground">
              Confirmo a aprovação da regularização.
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}

function formatReferenceDate(value: string) {
  try {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T12:00:00`
      : value;
    return format(parseISO(normalized), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}
