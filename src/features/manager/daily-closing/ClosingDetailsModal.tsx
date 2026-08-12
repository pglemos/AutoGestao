import { CalendarClock, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ReactNode } from "react";
import { Modal } from "@/components/organisms/Modal";
import type { CheckinWithTotals } from "@/types/database";

type ClosingDetailsModalProps = {
  open: boolean;
  seller: { id: string; name: string };
  checkin?: Partial<CheckinWithTotals> | null;
  status: string;
  storeName?: string;
  onOpenAgenda?: () => void;
  onCorrectLeads?: () => void;
  onClose: () => void;
};

export function ClosingDetailsModal({
  open,
  seller,
  checkin,
  status,
  storeName = "—",
  onOpenAgenda,
  onCorrectLeads,
  onClose,
}: ClosingDetailsModalProps) {
  const referenceDate = checkin?.reference_date || "";
  const delivery = checkin?.submitted_at ? formatDateTime(checkin.submitted_at) : "—";
  const discipline = typeof checkin?.pontuacao_disciplina_final === "number"
    ? `${checkin.pontuacao_disciplina_final}%`
    : "—";
  const appointments = sumMetrics(checkin?.agd_cart_today, checkin?.agd_net_today);
  const sales = sumMetrics(checkin?.vnd_porta_prev_day, checkin?.vnd_cart_prev_day, checkin?.vnd_net_prev_day);
  const leads = sumMetrics(checkin?.leads_prev_day, checkin?.leads_net_prev_day);
  const visits = metric(checkin?.visit_prev_day);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      referenceStyle
      title={`Detalhes do Fechamento — ${seller.name}`}
      description={referenceDate ? formatDate(referenceDate) : "—"}
      footer={onOpenAgenda || onCorrectLeads ? (
        <div className="flex flex-wrap justify-end gap-2">
          {onCorrectLeads && (
            <button type="button" onClick={onCorrectLeads} className="inline-flex h-9 items-center gap-1.5 rounded-mx-md border border-status-warning/30 bg-white px-3 text-sm font-medium text-status-warning-text hover:bg-status-warning-surface">
              <Pencil size={15} /> Corrigir leads
            </button>
          )}
          {onOpenAgenda && (
            <button type="button" onClick={onOpenAgenda} className="inline-flex h-9 items-center gap-1.5 rounded-mx-md border border-status-success/30 bg-white px-3 text-sm font-medium text-status-success-text hover:bg-status-success-surface">
              <CalendarClock size={15} /> Ver Agenda D+1 deste vendedor
            </button>
          )}
        </div>
      ) : undefined}
    >
      <div className="space-y-5">
        <Section title="Dados Gerais">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Vendedor" value={seller.name} />
            <Field label="Unidade" value={storeName} />
            <Field label="Data" value={referenceDate ? formatDate(referenceDate) : "—"} />
            <Field label="Status" value={status} />
            <Field label="Horário de entrega" value={delivery} />
            <Field label="Disciplina" value={<Discipline value={discipline} />} />
          </div>
        </Section>

        <Section title="Movimento por Canal">
          <div className="space-y-2">
            <Channel name="Showroom" values={[["Atendimentos", metric(checkin?.visit_prev_day)]]} />
            <Channel name="Carteira" values={[["Leads", metric(checkin?.leads_prev_day)], ["Agendamentos", metric(checkin?.agd_cart_today)]]} />
            <Channel name="Internet" values={[["Leads", metric(checkin?.leads_net_prev_day)], ["Agendamentos", metric(checkin?.agd_net_today)]]} />
          </div>
        </Section>

        <Section title="Registros do Dia">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Leads cadastrados" value={leads} />
            <Field label="Agendamentos cadastrados" value={appointments} />
            <Field label="Vendas cadastradas" value={sales} />
            <Field label="Atendimentos cadastrados" value={visits} />
          </div>
        </Section>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section><h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>{children}</section>;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return <div className="rounded-mx-xl bg-gray-50 p-2.5"><p className="mb-0.5 text-xs text-muted-foreground">{label}</p><div className="text-sm font-medium text-foreground">{value}</div></div>;
}

function Channel({ name, values }: { name: string; values: Array<[string, number | string]> }) {
  return <div className="rounded-mx-xl bg-gray-50 p-3"><p className="mb-2 text-xs font-semibold text-muted-foreground">{name}</p><div className="flex flex-wrap gap-4">{values.map(([label, value]) => <div key={label}><span className="text-xs text-muted-foreground">{label}: </span><span className="text-sm font-semibold text-foreground">{value}</span></div>)}</div></div>;
}

function Discipline({ value }: { value: string }) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return <>{value}</>;
  const color = numeric < 70 ? "rgb(249 115 22)" : numeric < 90 ? "rgb(59 130 246)" : "rgb(16 185 129)";
  return <span aria-label={`Disciplina ${value}`} className="grid h-14 w-14 place-items-center rounded-full p-1 text-xs font-bold" style={{ background: `conic-gradient(${color} ${numeric * 3.6}deg, rgb(241 245 249) 0deg)`, color }}><span className="grid h-full w-full place-items-center rounded-full bg-gray-50">{value}</span></span>;
}

function metric(value: number | null | undefined): number | string {
  return typeof value === "number" && Number.isFinite(value) ? value : "—";
}

function sumMetrics(...values: Array<number | null | undefined>): number | string {
  return values.every(value => typeof value === "number" && Number.isFinite(value))
    ? values.reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0)
    : "—";
}

function formatDate(value: string) {
  try { return format(parseISO(value), "dd/MM/yyyy"); } catch { return "—"; }
}

function formatDateTime(value: string) {
  try { return format(parseISO(value), "dd/MM/yyyy HH:mm"); } catch { return "—"; }
}
