import type { CheckinFormData } from "@/types/database";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Modal } from "@/components/organisms/Modal";
import { format, parseISO } from "date-fns";

export type RegularizationRequest = {
  id: string;
  seller_id: string;
  created_at: string;
  requested_values: CheckinFormData;
  seller?: { name?: string | null; avatar_url?: string | null } | null;
};

type RegularizationsListModalProps = {
  open: boolean;
  requests: RegularizationRequest[];
  onClose: () => void;
  onApprove: (request: RegularizationRequest) => void | Promise<void>;
  onReject: (request: RegularizationRequest) => void | Promise<void>;
  externalDecision?: {
    request: RegularizationRequest;
    action: "approve" | "reject";
  } | null;
  onExternalDecisionHandled?: () => void;
};

export function RegularizationsListModal({
  open,
  requests,
  onClose,
  onApprove,
  onReject,
  externalDecision = null,
  onExternalDecisionHandled,
}: RegularizationsListModalProps) {
  const [decision, setDecision] = useState<{
    request: RegularizationRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDecision(null);
      setConfirmed(false);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!externalDecision) return;
    setDecision(externalDecision);
    setConfirmed(false);
    onExternalDecisionHandled?.();
  }, [externalDecision, onExternalDecisionHandled]);

  const closeDecision = () => {
    if (saving) return;
    setDecision(null);
    setConfirmed(false);
  };

  const submitDecision = async () => {
    if (!decision || !confirmed) return;
    setSaving(true);
    try {
      if (decision.action === "approve") await onApprove(decision.request);
      else await onReject(decision.request);
      closeDecision();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        referenceStyle
        className="sm:!max-w-2xl"
        title="Regularizações Aguardando Aprovação"
        description={`${requests.length} regularização(ões) pendente(s)`}
      >
      {requests.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Nenhuma regularização aguardando aprovação.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const name = request.seller?.name || request.seller_id;
            const metrics = getRequestedMetrics(request.requested_values);
            return (
              <article key={request.id} className="rounded-xl bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{name}</p>
                      <p className="text-xs text-gray-500">
                        Entrega: {formatRequestDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <div
                    className="grid h-8 w-8 place-items-center rounded-full p-[4px] text-caption font-bold text-blue-700"
                    style={{ background: `conic-gradient(rgb(59 130 246) ${metrics.discipline * 3.6}deg, rgb(219 234 254) 0deg)` }}
                    aria-label={`Disciplina ${metrics.discipline}%`}
                  >
                    <span className="grid h-full w-full place-items-center rounded-full bg-gray-50">{metrics.discipline}%</span>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
                  <Metric label="Leads" value={metrics.leads} />
                  <Metric label="Agend." value={metrics.appointments} />
                  <Metric label="Vendas" value={metrics.sales} />
                  <Metric label="Atend." value={metrics.visits} />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDecision({ request, action: "approve" });
                      setConfirmed(false);
                    }}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
                    aria-label={`Aprovar ${name}`}
                  >
                    <Check size={14} /> Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecision({ request, action: "reject" });
                      setConfirmed(false);
                    }}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-xl border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                    aria-label={`Recusar ${name}`}
                  >
                    <X size={14} /> Recusar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </Modal>
      <RegularizationDecisionModal
        decision={decision}
        confirmed={confirmed}
        saving={saving}
        onClose={closeDecision}
        onConfirmedChange={setConfirmed}
        onSwitchAction={() => {
          setDecision((current) => current ? {
            ...current,
            action: current.action === "approve" ? "reject" : "approve",
          } : current);
          setConfirmed(false);
        }}
        onSubmit={() => void submitDecision()}
      />
    </>
  );
}

function RegularizationDecisionModal({
  decision,
  confirmed,
  saving,
  onClose,
  onConfirmedChange,
  onSwitchAction,
  onSubmit,
}: {
  decision: { request: RegularizationRequest; action: "approve" | "reject" } | null;
  confirmed: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirmedChange: (value: boolean) => void;
  onSwitchAction: () => void;
  onSubmit: () => void;
}) {
  const approve = decision?.action === "approve";
  const sellerName = decision?.request.seller?.name || decision?.request.seller_id || "Nome não informado";
  const referenceDate = decision?.request.requested_values.reference_date;
  const actionLabel = approve ? "Aprovar" : "Recusar";
  const confirmationLabel = approve
    ? "Confirmo a aprovação da regularização."
    : "Confirmo a recusa da regularização.";
  const description = approve
    ? "Confirme a aprovação da regularização deste fechamento. Após aprovada, ela passará a contar nos indicadores oficiais conforme as regras da loja."
    : "Confirme a recusa da regularização deste fechamento. O fechamento permanecerá fora dos indicadores oficiais.";

  return (
    <Modal
      open={Boolean(decision)}
      onClose={onClose}
      size="md"
      referenceStyle
      title={`${actionLabel} regularização?`}
      description={`${sellerName} — ${referenceDate ? formatRequestDate("", referenceDate) : "—"}`}
      footer={
        <div className="grid w-full grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onSwitchAction}
            disabled={saving}
            className="h-9 rounded-[12px] border border-red-200 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            {approve ? "Recusar" : "Aprovar"}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!confirmed || saving}
            className={`h-9 rounded-[12px] px-4 text-sm font-medium text-white disabled:opacity-40 ${approve ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {saving ? "Processando..." : actionLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-gray-600">
        <p className="text-sm">{description}</p>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="regularization-comment">
            Comentário (opcional)
          </label>
          <textarea
            id="regularization-comment"
            rows={2}
            placeholder={`Adicione um comentário sobre a ${approve ? "aprovação" : "recusa"}...`}
            className="w-full resize-none rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => onConfirmedChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          {confirmationLabel}
        </label>
      </div>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><span className="text-gray-500">{label}: </span><span className="font-semibold text-gray-800">{value}</span></div>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] || ""}` : parts[0]?.[0] || "?";
}

function formatRequestDate(createdAt: string, referenceDate?: string) {
  const date = referenceDate ? `${referenceDate}T12:00:00` : createdAt;
  try {
    return format(parseISO(date), referenceDate ? "dd/MM/yyyy" : "dd/MM HH:mm");
  } catch {
    return "—";
  }
}

function getRequestedMetrics(values: CheckinFormData) {
  const data = values as CheckinFormData & Record<string, number | undefined>;
  const leads = data.leads ?? (data.leads_cart || 0) + (data.leads_net || 0);
  const appointments = data.agd_total ?? (data.agd_cart_today || 0) + (data.agd_net_today || 0);
  const sales = data.vnd_total ?? (data.vnd_porta_prev_day || 0) + (data.vnd_cart_prev_day || 0) + (data.vnd_net_prev_day || 0);
  const visits = data.visitas ?? data.visit_prev_day ?? (data.visitas_porta_prev_day || 0) + (data.visitas_cart_prev_day || 0) + (data.visitas_net_prev_day || 0);
  const discipline = Math.max(0, Math.min(100, Math.round(data.pontuacao_disciplina_final ?? data.pontuacao_disciplina_base ?? 0)));
  return { leads, appointments, sales, visits, discipline };
}
