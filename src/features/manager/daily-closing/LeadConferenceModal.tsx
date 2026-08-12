import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, History, RotateCcw, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Modal } from "@/components/organisms/Modal";
import type { CheckinWithTotals } from "@/types/database";
import {
  LEAD_CONFERENCE_PERIOD_LABELS,
  buildLeadConferenceRows,
  getLeadConferencePeriod,
  getLeadConferenceRowDifference,
  summarizeLeadConference,
  toLeadConferencePayload,
  type LeadConferencePeriod,
  type LeadConferencePeriodType,
  type LeadConferenceRow,
  type LeadConferenceSeller,
} from "./lead-conference";

interface LeadConferenceHistoryRow {
  id: string;
  period_start: string;
  period_end: string;
  total_mx: number;
  total_official: number;
  total_difference: number;
  divergent_sellers: number;
  created_at: string;
  manager?: { name?: string | null } | null;
}

interface LeadConferenceModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string | null;
  referenceDate: string;
  sellers: LeadConferenceSeller[];
  storeName: string;
}

export function LeadConferenceModal({
  open,
  onClose,
  storeId,
  referenceDate,
  sellers,
  storeName,
}: LeadConferenceModalProps) {
  const [periodType, setPeriodType] =
    useState<LeadConferencePeriodType>("current_month");
  const [customPeriod, setCustomPeriod] = useState<LeadConferencePeriod>(() =>
    getLeadConferencePeriod("current_month", referenceDate),
  );
  const [rows, setRows] = useState<LeadConferenceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<LeadConferenceHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fetchSequence = useRef(0);

  const period = useMemo(
    () => getLeadConferencePeriod(periodType, referenceDate, customPeriod),
    [periodType, referenceDate, customPeriod],
  );
  const summary = useMemo(() => summarizeLeadConference(rows), [rows]);

  const fetchRows = useCallback(async () => {
    if (!open || !storeId) return;
    const sequence = ++fetchSequence.current;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase.rpc(
      "get_lancamentos_por_loja_periodo",
      {
        p_store_id: storeId,
        p_start_date: period.start,
        p_end_date: period.end,
        p_scope: "daily",
      },
    );
    if (sequence !== fetchSequence.current) return;
    if (fetchError) {
      setRows([]);
      setError(fetchError.message);
    } else {
      setRows(
        buildLeadConferenceRows(sellers, (data || []) as CheckinWithTotals[]),
      );
    }
    setLoading(false);
  }, [open, storeId, period.start, period.end, sellers]);

  useEffect(() => {
    if (!open) return;
    setPeriodType("current_month");
    setCustomPeriod(getLeadConferencePeriod("current_month", referenceDate));
    setHistoryOpen(false);
  }, [open, referenceDate]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const updateOfficial = (
    sellerId: string,
    field: "internetOfficial" | "carteiraOfficial",
    value: string,
  ) => {
    const parsed = value === "" ? null : Math.max(0, Math.trunc(Number(value)));
    setRows((current) =>
      current.map((row) =>
        row.sellerId === sellerId
          ? { ...row, [field]: Number.isFinite(parsed) ? parsed : null }
          : row,
      ),
    );
  };

  const clearRow = (sellerId: string) => {
    setRows((current) =>
      current.map((row) =>
        row.sellerId === sellerId
          ? { ...row, internetOfficial: null, carteiraOfficial: null }
          : row,
      ),
    );
  };

  const save = async () => {
    if (!storeId || !summary.complete) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.rpc(
      "save_manager_lead_conference",
      {
        p_store_id: storeId,
        p_period_type: periodType,
        p_period_start: period.start,
        p_period_end: period.end,
        p_items: toLeadConferencePayload(rows),
      },
    );
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    toast.success("Conferência de leads salva com auditoria.");
    onClose();
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    if (!storeId) return;
    setHistoryLoading(true);
    const { data, error: historyError } = await supabase
      .from("manager_lead_conferences")
      .select(
        "id, period_start, period_end, total_mx, total_official, total_difference, divergent_sellers, created_at, manager:usuarios!manager_user_id(name)",
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (historyError) {
      toast.error(
        `Não foi possível carregar o histórico: ${historyError.message}`,
      );
      setHistory([]);
    } else {
      setHistory((data || []) as unknown as LeadConferenceHistoryRow[]);
    }
    setHistoryLoading(false);
  };

  const footer = (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-mx-md border border-border bg-white px-3 text-sm font-medium text-foreground hover:bg-gray-50" onClick={() => void openHistory()}>
        <History size={16} />
        Ver Histórico
      </button>
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-mx-md bg-status-info px-3 text-sm font-medium text-white hover:bg-status-info disabled:opacity-40"
        disabled={!summary.complete || saving || loading}
        onClick={() => void save()}
      >
        <Save size={16} />
        {saving ? "Salvando…" : "Salvar Conferência"}
      </button>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="3xl"
        referenceStyle
        className={historyOpen ? "brightness-75" : undefined}
        title="Conferência de Leads"
        description="Informe os volumes oficiais do CRM externo e compare com os leads registrados pela equipe."
        footer={footer}
      >
        <div className="space-y-4">
          <section className="rounded-mx-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <CalendarDays size={17} />
              Período da Conferência
            </div>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="text-xs text-muted-foreground">
                <span className="mb-1 block">Tipo de período</span>
                <select
                  value={periodType}
                  onChange={(event) =>
                    setPeriodType(
                      event.target.value as LeadConferencePeriodType,
                    )
                  }
                  className="h-10 min-w-[220px] rounded-mx-xl border border-border bg-white px-3 text-sm text-foreground"
                >
                  {Object.entries(LEAD_CONFERENCE_PERIOD_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              {periodType === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <PeriodInput
                    label="Início"
                    value={customPeriod.start}
                    onChange={(start) =>
                      setCustomPeriod((current) => ({ ...current, start }))
                    }
                  />
                  <PeriodInput
                    label="Fim"
                    value={customPeriod.end}
                    onChange={(end) =>
                      setCustomPeriod((current) => ({ ...current, end }))
                    }
                  />
                </div>
              )}
              <div className="rounded-mx-xl border border-border bg-white px-3 py-2 text-sm text-muted-foreground">
                Período:{" "}
                <strong className="text-foreground">
                  {format(parseISO(period.start), "dd/MM/yyyy")} a{" "}
                  {format(parseISO(period.end), "dd/MM/yyyy")}
                </strong>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ConferenceMetric
              label="Leads registrados no MX"
              value={summary.totalMx}
            />
            <ConferenceMetric
              label="Leads oficiais informados"
              value={summary.totalOfficial}
              tone="blue"
            />
            <ConferenceMetric
              label="Diferença total"
              value={formatDifference(summary.totalDifference)}
              tone={summary.totalDifference === null || summary.totalDifference === 0 ? "green" : "orange"}
            />
            <ConferenceMetric
              label="Vendedores com divergência"
              value={summary.divergentSellers}
              tone="orange"
            />
          </section>

          <div className="rounded-mx-xl border border-status-info/30 bg-status-info-surface px-3 py-2 text-center text-sm font-semibold text-status-info-text">
            Informe os volumes oficiais consultados no CRM externo.
          </div>

          {error && (
            <div
              className="rounded-mx-xl border border-status-error/30 bg-status-error-surface p-3 text-sm text-status-error-text"
              role="alert"
            >
              {error}
            </div>
          )}
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum vendedor ativo encontrado nesta unidade.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-mx-2xl border border-border-subtle">
              <table className="w-full text-sm min-w-[1120px]">
                <thead className="bg-gray-50 border-b border-border-subtle">
                  <tr>
                    {[
                      "Vendedor",
                      "Unidade",
                      "Internet MX",
                      "Internet Of.",
                      "Dif. Int.",
                      "Carteira MX",
                      "Carteira Of.",
                      "Dif. Cart.",
                      "Dif. Total",
                      "Status",
                      "Ações",
                    ].map((label) => (
                      <th
                        key={label}
                        className="text-left px-3 py-3 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {rows.map((row) => (
                    <ConferenceRow
                      key={row.sellerId}
                      row={row}
                      storeName={storeName}
                      onChange={updateOfficial}
                      onClear={clearRow}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        size="xl"
        referenceStyle
        title="Histórico de Conferências"
        description="Conferências de leads realizadas"
      >
        {historyLoading ? (
          <Skeleton className="h-52" />
        ) : history.length === 0 ? (
          <div className="grid min-h-52 place-items-center text-center">
            <div>
              <History size={42} className="mx-auto text-text-disabled" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma conferência de leads foi realizada.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <article
                key={item.id}
                className="rounded-mx-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong>
                      {format(parseISO(item.period_start), "dd/MM/yyyy")} a{" "}
                      {format(parseISO(item.period_end), "dd/MM/yyyy")}
                    </strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.manager?.name || "Gestor"} ·{" "}
                      {format(parseISO(item.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-mx-md px-2 py-1 text-xs font-medium ${item.divergent_sellers ? "bg-status-warning-surface text-status-warning-text" : "bg-status-success-surface text-status-success-text"}`}>
                    {item.divergent_sellers} divergência(s)
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <span>
                    MX <strong className="block">{item.total_mx}</strong>
                  </span>
                  <span>
                    Oficial{" "}
                    <strong className="block">{item.total_official}</strong>
                  </span>
                  <span>
                    Diferença{" "}
                    <strong className="block">
                      {formatDifference(item.total_difference)}
                    </strong>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

function PeriodInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      <span className="mb-1 block">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-mx-xl border border-border bg-white px-3 text-sm"
      />
    </label>
  );
}

function ConferenceMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string | null;
  tone?: "neutral" | "blue" | "green" | "orange";
}) {
  const colors =
    tone === "blue"
      ? "border-status-info/30 bg-status-info-surface"
      : tone === "green"
        ? "border-status-success/30 bg-status-success-surface"
      : tone === "orange"
        ? "border-status-warning/30 bg-status-warning-surface"
        : "border-border-subtle bg-white text-foreground";
  return (
    <div className={`rounded-mx-2xl border p-4 ${colors}`}>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <strong className="block text-2xl font-bold">
        {value === null ? "—" : value}
      </strong>
    </div>
  );
}

function ConferenceRow({
  row,
  storeName,
  onChange,
  onClear,
}: {
  row: LeadConferenceRow;
  storeName: string;
  onChange: (
    sellerId: string,
    field: "internetOfficial" | "carteiraOfficial",
    value: string,
  ) => void;
  onClear: (sellerId: string) => void;
}) {
  const internetDiff =
    row.internetOfficial === null
      ? null
      : row.internetOfficial - row.internetMx;
  const carteiraDiff =
    row.carteiraOfficial === null
      ? null
      : row.carteiraOfficial - row.carteiraMx;
  const totalDiff = getLeadConferenceRowDifference(row);
  const complete = totalDiff !== null;
  return (
    <tr>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-status-success-surface text-xs font-bold text-status-success-text">
            {getInitials(row.sellerName)}
          </span>
          <strong className="text-sm font-medium text-foreground whitespace-nowrap">{row.sellerName}</strong>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {storeName}
      </td>
      <NumberValue value={row.internetMx} />
      <OfficialInput
        value={row.internetOfficial}
        label={`Internet oficial de ${row.sellerName}`}
        onChange={(value) => onChange(row.sellerId, "internetOfficial", value)}
      />
      <DifferenceValue value={internetDiff} />
      <NumberValue value={row.carteiraMx} />
      <OfficialInput
        value={row.carteiraOfficial}
        label={`Carteira oficial de ${row.sellerName}`}
        onChange={(value) => onChange(row.sellerId, "carteiraOfficial", value)}
      />
      <DifferenceValue value={carteiraDiff} />
      <DifferenceValue value={totalDiff} />
      <td className="px-3 py-3">
        {!complete ? (
          <span className="inline-flex rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-muted-foreground">
            Não conferido
          </span>
        ) : (
          <span className={`inline-flex rounded-mx-md px-2 py-1 text-xs font-medium ${totalDiff === 0 ? "bg-status-success-surface text-status-success-text" : "bg-status-warning-surface text-status-warning-text"}`}>
            {totalDiff === 0 ? "Conferido" : "Divergente"}
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onClear(row.sellerId)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 px-2 py-1 rounded-lg"
        >
          <RotateCcw size={13} />
          Limpar
        </button>
      </td>
    </tr>
  );
}

function NumberValue({ value }: { value: number }) {
  return <td className="px-3 py-3 text-sm text-foreground">{value}</td>;
}
function OfficialInput({
  value,
  label,
  onChange,
}: {
  value: number | null;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <td className="px-3 py-3">
      <input
        type="number"
        min={0}
        step={1}
        aria-label={label}
        placeholder="—"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-20 rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info"
      />
    </td>
  );
}
function DifferenceValue({ value }: { value: number | null }) {
  return (
    <td
      className={`px-3 py-3 text-sm font-semibold ${value === null ? "text-muted-foreground" : value === 0 ? "text-status-success-text" : "text-status-warning-text"}`}
    >
      {formatDifference(value)}
    </td>
  );
}
function formatDifference(value: number | null) {
  return value === null ? "—" : value > 0 ? `+${value}` : String(value);
}
function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
}
