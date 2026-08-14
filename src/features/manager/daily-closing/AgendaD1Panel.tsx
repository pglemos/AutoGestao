import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, format, parseISO } from "date-fns";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Filter,
  MessageCircle,
  Phone,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useData";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Modal } from "@/components/organisms/Modal";
import {
  AGENDA_CANAL_LABEL,
  AGENDA_D1_DEFAULT_FILTERS,
  AGENDA_TIPO_LABEL,
  CONFIRMATION_OUTCOMES,
  buildWhatsappMessage,
  buildWhatsappUrl,
  dedupeActiveAppointments,
  extractMeetLink,
  filterAgenda,
  normalizePhoneBr,
  type AgendaD1Filters,
  type AgendaD1Row,
  type ConfirmationOutcome,
} from "./agenda-d1";

type CanonicalConfirmationStatus =
  | "pendente"
  | "whatsapp_aberto"
  | "confirmado"
  | "sem_resposta"
  | "solicitou_reagendamento"
  | "cancelou"
  | "outro";

const CONFIRMATION_STATUS_BY_OUTCOME: Record<
  ConfirmationOutcome,
  CanonicalConfirmationStatus
> = {
  'Confirmado': 'confirmado',
  'Sem resposta': 'sem_resposta',
  'Solicitou reagendamento': 'solicitou_reagendamento',
  'Cancelou': 'cancelou',
  'Outro': 'outro',
};

interface SellerOption {
  id: string;
  name: string;
}

export interface AgendaD1PanelProps {
  open: boolean;
  onClose: () => void;
  referenceDate: string;
  sellers: SellerOption[];
  initialSellerId?: string;
}

/**
 * Agenda D+1 do gerente. Origem canônica: agendamentos do CRM/carteira.
 * O gerente não altera a agenda do vendedor: contatos e confirmações usam
 * RPCs canônicas auditadas; reagendamento/cancelamento notifica o vendedor.
 */
export function AgendaD1Panel({
  open,
  onClose,
  referenceDate,
  sellers,
  initialSellerId,
}: AgendaD1PanelProps) {
  const { storeId, membership } = useAuth();
  const { sendNotification } = useNotifications();
  const d1Date = useMemo(
    () => format(addDays(parseISO(referenceDate), 1), "yyyy-MM-dd"),
    [referenceDate],
  );
  const [rows, setRows] = useState<AgendaD1Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AgendaD1Filters>({
    ...AGENDA_D1_DEFAULT_FILTERS,
    sellerId: initialSellerId || "all",
  });
  const [confirmationStatus, setConfirmationStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<{
    rowId: string;
    outcome: ConfirmationOutcome | "";
    note: string;
  } | null>(null);
  const [confirmMenuRowId, setConfirmMenuRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFilters({
      ...AGENDA_D1_DEFAULT_FILTERS,
      sellerId: initialSellerId || "all",
    });
    setConfirmationStatus("all");
    setSearch("");
    setConfirmMenuRowId(null);
    setConfirming(null);
  }, [open, initialSellerId]);

  const fetchAgenda = useCallback(async () => {
    if (!storeId || !open) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("agendamentos")
      .select(
        "id, data_hora, canal, tipo, status, observacoes, seller_user_id, confirmation_status, confirmation_note, last_contact_at, cliente:clientes(id, nome, telefone, telefone_normalizado, ultima_interacao), oportunidade:oportunidades(veiculo_interesse)",
      )
      .eq("loja_id", storeId)
      .gte("data_hora", `${d1Date}T00:00:00-03:00`)
      .lte("data_hora", `${d1Date}T23:59:59-03:00`)
      .order("data_hora");

    if (fetchError) {
      setError(fetchError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(
      dedupeActiveAppointments((data || []) as unknown as AgendaD1Row[]),
    );
    setLoading(false);
  }, [storeId, open, d1Date]);

  useEffect(() => {
    void fetchAgenda();
  }, [fetchAgenda]);

  const sellerNameById = useMemo(
    () => new Map(sellers.map((seller) => [seller.id, seller.name])),
    [sellers],
  );

  const visible = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return filterAgenda(rows, {
      ...filters,
      status: "all",
      periodo: "all",
    }).filter((row) => {
      const managerStatus = canonicalConfirmationLabel(row.confirmation_status);
      if (confirmationStatus !== "all" && managerStatus !== confirmationStatus) {
        return false;
      }
      if (!normalizedSearch) return true;
      return [
        row.cliente?.nome,
        row.oportunidade?.veiculo_interesse,
        format(parseISO(row.data_hora), "HH:mm"),
      ].some((value) =>
        value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
      );
    });
  }, [rows, filters, search, confirmationStatus]);

  const patchCanonicalRow = useCallback(
    (
      row: AgendaD1Row,
      patch: Pick<
        AgendaD1Row,
        "confirmation_status" | "confirmation_note" | "last_contact_at"
      >,
    ) => {
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, ...patch } : item,
        ),
      );
    },
    [],
  );

  const recordContactAction = useCallback(
    async (
      row: AgendaD1Row,
      actionType: "whatsapp_opened" | "phone_opened",
    ) => {
      const { error: rpcError } = await supabase.rpc('record_d1_contact_action', {
        p_appointment_id: row.id,
        p_action_type: actionType,
        p_message_preview: null,
        p_note: null,
        p_metadata: {
          source: "agenda_d1_gerente",
          reference_date: d1Date,
        },
      });
      if (rpcError) return { error: rpcError.message };

      patchCanonicalRow(row, {
        confirmation_status: row.confirmation_status,
        confirmation_note: row.confirmation_note,
        last_contact_at: new Date().toISOString(),
      });
      return { error: null };
    },
    [d1Date, patchCanonicalRow],
  );

  const updateCanonicalConfirmation = useCallback(
    async (
      row: AgendaD1Row,
      status: CanonicalConfirmationStatus,
      note: string | null,
    ) => {
      const { error: rpcError } = await supabase.rpc('update_d1_confirmation', {
        p_appointment_id: row.id,
        p_confirmation_status: status,
        p_note: note,
      });
      if (rpcError) return { error: rpcError.message };

      patchCanonicalRow(row, {
        confirmation_status: status,
        confirmation_note: note,
        last_contact_at: new Date().toISOString(),
      });
      return { error: null };
    },
    [patchCanonicalRow],
  );

  const openWhatsapp = useCallback(
    async (row: AgendaD1Row) => {
      const phone = normalizePhoneBr(
        row.cliente?.telefone_normalizado || row.cliente?.telefone,
      );
      if (!phone || !row.cliente) {
        toast.error("Cliente sem telefone válido para WhatsApp.");
        return;
      }

      const message = buildWhatsappMessage({
        clienteNome: row.cliente.nome,
        tipo: row.tipo,
        dataHora: row.data_hora,
        lojaNome: membership?.store?.name || null,
        meetLink: extractMeetLink(row.observacoes),
      });
      window.open(buildWhatsappUrl(phone, message), "_blank", "noopener");

      const contactResult = await recordContactAction(row, "whatsapp_opened");
      if (contactResult.error) {
        toast.error(
          `Contato aberto, mas a auditoria falhou: ${contactResult.error}`,
        );
        return;
      }

      if (
        !row.confirmation_status ||
        row.confirmation_status === "pendente" ||
        row.confirmation_status === "whatsapp_aberto"
      ) {
        const statusResult = await updateCanonicalConfirmation(
          row,
          "whatsapp_aberto",
          null,
        );
        if (statusResult.error) {
          toast.error(
            `Contato auditado, mas o status não foi atualizado: ${statusResult.error}`,
          );
          return;
        }
      }

      toast.success("WhatsApp aberto e contato registrado.");
    },
    [membership?.store?.name, recordContactAction, updateCanonicalConfirmation],
  );

  const callPhone = useCallback(
    async (row: AgendaD1Row) => {
      const phone = normalizePhoneBr(
        row.cliente?.telefone_normalizado || row.cliente?.telefone,
      );
      if (!phone) {
        toast.error("Cliente sem telefone válido.");
        return;
      }

      window.location.href = `tel:+${phone}`;
      const { error: auditError } = await recordContactAction(
        row,
        "phone_opened",
      );
      if (auditError) {
        toast.error(`Ligação iniciada, mas a auditoria falhou: ${auditError}`);
      } else {
        toast.success("Ligação registrada.");
      }
    },
    [recordContactAction],
  );

  const saveConfirmation = useCallback(
    async (row: AgendaD1Row, outcome: ConfirmationOutcome, note = "") => {
      if (outcome === "Outro" && !note.trim()) {
        toast.error('Descreva a observação para o resultado "Outro".');
        return;
      }

      setSaving(true);
      try {
        const canonicalStatus = CONFIRMATION_STATUS_BY_OUTCOME[outcome];
        const normalizedNote = note.trim() || null;
        const { error: confirmationError } = await updateCanonicalConfirmation(
          row,
          canonicalStatus,
          normalizedNote,
        );
        if (confirmationError) {
          toast.error(`Não foi possível registrar: ${confirmationError}`);
          return;
        }

        const outcomeDescription = normalizedNote
          ? `${outcome} — ${normalizedNote}`
          : outcome;
        if (
          outcome === "Solicitou reagendamento" ||
          outcome === "Cancelou"
        ) {
          const { error: notificationError } = await sendNotification({
            recipient_id: row.seller_user_id,
            store_id: storeId || undefined,
            title:
              outcome === "Cancelou"
                ? "Cliente cancelou agendamento D+1"
                : "Cliente pediu reagendamento (D+1)",
            message: `${row.cliente?.nome || "Cliente"} — ${format(parseISO(row.data_hora), "dd/MM HH:mm")}. ${outcomeDescription}. A agenda original não foi alterada: atualize pela Carteira.`,
            type: "agenda",
            priority: "high",
            link: "/carteira",
          });
          if (notificationError) {
            toast.error("Registro salvo, mas o aviso ao vendedor falhou.");
          }
        }

        toast.success("Contato registrado na auditoria D+1.");
        setConfirming(null);
      } finally {
        setSaving(false);
      }
    },
    [sendNotification, storeId, updateCanonicalConfirmation],
  );

  const confirmationRow = confirming
    ? rows.find((row) => row.id === confirming.rowId) || null
    : null;

  const filterSelectClass = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-success";

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="3xl"
        className="sm:!max-w-[1152px]"
        referenceStyle
        title="Agenda D+1"
        description="Clientes agendados para amanhã a partir dos fechamentos da equipe."
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-block rounded-mx-md bg-status-warning-surface px-2.5 py-1 text-xs font-medium text-status-warning-text">
                Agenda D+1 parcial
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizada em tempo real até o encerramento da janela de ajuste.
              </p>
            </div>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock size={13} />
              Data D+1:{" "}
              <strong className="text-foreground">
                {format(parseISO(d1Date), "dd/MM/yyyy")}
              </strong>
            </p>
          </div>

          <div
            className="rounded-2xl bg-surface-alt p-4 space-y-3"
            role="group"
            aria-label="Filtros da Agenda D+1"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Filter size={14} /> Filtros
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select
                aria-label="Vendedor"
                className={filterSelectClass}
                value={filters.sellerId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sellerId: event.target.value,
                  }))
                }
              >
                <option value="all">Vendedor</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Canal"
                className={filterSelectClass}
                value={filters.canal}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    canal: event.target.value as AgendaD1Filters["canal"],
                  }))
                }
              >
                <option value="all">Canal</option>
                {Object.entries(AGENDA_CANAL_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Tipo de agendamento"
                className={filterSelectClass}
                value={filters.tipo}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    tipo: event.target.value as AgendaD1Filters["tipo"],
                  }))
                }
              >
                <option value="all">Tipo de agendamento</option>
                {Object.entries(AGENDA_TIPO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label === "Visita" ? "Visita Presencial" : label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Status de confirmação"
                className={filterSelectClass}
                value={confirmationStatus}
                onChange={(event) => setConfirmationStatus(event.target.value)}
              >
                <option value="all">Status de confirmação</option>
                {[
                  "Pendente",
                  "WhatsApp aberto",
                  "Confirmado",
                  "Sem resposta",
                  "Solicitou reagendamento",
                  "Cancelou",
                  "Outro",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <input
                  aria-label="Buscar agenda D+1"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar (cliente, veículo, horário)..."
                  className={`${filterSelectClass} pl-8`}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-mx-xl border border-status-error/30 bg-status-error-surface p-4">
              <p className="text-sm text-status-error-text">
                Não foi possível carregar a Agenda D+1: {error}
              </p>
              <button
                type="button"
                className="mt-3 rounded-mx-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt"
                onClick={() => void fetchAgenda()}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-mx-sm" aria-busy="true">
              <Skeleton className="h-mx-12" />
              <Skeleton className="h-mx-12" />
              <Skeleton className="h-mx-12" />
            </div>
          ) : visible.length === 0 ? (
            <div className="grid min-h-[220px] place-items-center p-mx-xl text-center">
              <div>
                <CalendarDays size={42} className="mx-auto text-border-default" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {rows.length === 0
                    ? "Nenhum cliente agendado para D+1."
                    : "Nenhum agendamento corresponde aos filtros."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border-subtle">
              <table className="w-full text-sm">
                <thead className="border-b border-border-subtle bg-surface-alt text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {[
                      "Horário",
                      "Cliente",
                      "Telefone",
                      "Veículo",
                      "Canal",
                      "Vendedor",
                      "Tipo",
                      "Status",
                      "Últ. contato",
                      "Ações",
                    ].map((label) => (
                      <th
                        key={label}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {visible.map((row) => {
                    const lastContact =
                      row.last_contact_at || row.cliente?.ultima_interacao || null;
                    const managerConfirmationStatus = canonicalConfirmationLabel(
                      row.confirmation_status,
                    );
                    return (
                      <FragmentRow key={row.id}>
                        <tr className="align-top bg-white transition-colors hover:bg-surface-alt">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                            {format(parseISO(row.data_hora), "HH:mm")}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {row.cliente?.nome || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {row.cliente?.telefone || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.oportunidade?.veiculo_interesse || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.canal ? AGENDA_CANAL_LABEL[row.canal] : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {sellerNameById.get(row.seller_user_id) ||
                              "Vendedor da equipe"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-foreground">
                              {AGENDA_TIPO_LABEL[row.tipo] === "Visita"
                                ? "Visita Presencial"
                                : AGENDA_TIPO_LABEL[row.tipo]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-lg px-2 py-1 text-xs font-medium ${confirmationStatusClass(managerConfirmationStatus)}`}
                            >
                              {managerConfirmationStatus}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {lastContact
                              ? format(parseISO(lastContact), "dd/MM HH:mm")
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="flex items-center gap-1 rounded-lg bg-status-success-surface px-2 py-1 text-xs font-medium text-status-success-text hover:bg-status-success-surface"
                                aria-label={`WhatsApp para ${row.cliente?.nome || "cliente"}`}
                                onClick={() => void openWhatsapp(row)}
                              >
                                <MessageCircle size={13} /> WhatsApp
                              </button>
                              <button
                                type="button"
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                                aria-label={`Ligar para ${row.cliente?.nome || "cliente"}`}
                                onClick={() => void callPhone(row)}
                              >
                                <Phone size={13} /> Telefone
                              </button>
                              <div className="relative">
                                <button
                                  type="button"
                                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-status-success-text hover:bg-status-success-surface"
                                  onClick={() =>
                                    setConfirmMenuRowId((current) =>
                                      current === row.id ? null : row.id,
                                    )
                                  }
                                >
                                  <CheckCircle size={13} /> Confirmar <ChevronDown size={12} />
                                </button>
                                {confirmMenuRowId === row.id && (
                                  <>
                                    <button
                                      type="button"
                                      aria-label="Fechar opções de confirmação"
                                      className="fixed inset-0 z-[var(--mx-z-overlay)] cursor-default"
                                      onClick={() => setConfirmMenuRowId(null)}
                                    />
                                    <div className="absolute right-0 top-full z-[var(--mx-z-popover)] mt-1 min-w-[208px] rounded-mx-xl border border-border bg-white py-1 shadow-lg" role="menu" aria-label="Resultado da confirmação">
                                      {CONFIRMATION_OUTCOMES.map((outcome) => (
                                        <button
                                          key={outcome}
                                          type="button"
                                          role="menuitem"
                                          className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-status-success-surface hover:text-status-success-text"
                                          onClick={() => {
                                            setConfirmMenuRowId(null);
                                            if (outcome === "Outro") {
                                              setConfirming({
                                                rowId: row.id,
                                                outcome,
                                                note: "",
                                              });
                                            } else {
                                              void saveConfirmation(row, outcome);
                                            }
                                          }}
                                        >
                                          {outcome}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </FragmentRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="block text-xs text-muted-foreground">
            A Carteira de Clientes permanece a base oficial. O gerente não altera
            o agendamento original: apenas confirma com o cliente e registra o
            status gerencial de confirmação.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmationRow && confirming)}
        onClose={() => setConfirming(null)}
        size="sm"
        referenceStyle
        title="Confirmar agendamento — Outro"
      >
        {confirmationRow && confirming && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ConfirmationInfo
                label="Cliente"
                value={confirmationRow.cliente?.nome || "—"}
              />
              <ConfirmationInfo
                label="Vendedor"
                value={
                  sellerNameById.get(confirmationRow.seller_user_id) || "—"
                }
              />
              <ConfirmationInfo
                label="Tipo de agendamento"
                value={AGENDA_TIPO_LABEL[confirmationRow.tipo] || "—"}
              />
              <ConfirmationInfo
                label="Data / Horário"
                value={format(
                  parseISO(confirmationRow.data_hora),
                  "dd/MM/yyyy HH:mm",
                )}
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
                htmlFor="agenda-other-status"
              >
                Status da confirmação
              </label>
              <select
                id="agenda-other-status"
                value="Outro"
                disabled
                className="w-full rounded-mx-xl border border-border bg-white px-3 py-2 text-sm text-foreground"
              >
                <option>Outro</option>
              </select>
            </div>
            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
                htmlFor="agenda-other-note"
              >
                Descreva a situação *
              </label>
              <textarea
                id="agenda-other-note"
                rows={3}
                value={confirming.note}
                onChange={(event) =>
                  setConfirming((current) =>
                    current
                      ? { ...current, note: event.target.value }
                      : current,
                  )
                }
                placeholder="Descreva a situação observada..."
                className="w-full resize-none rounded-mx-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-success"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-mx-xl px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveConfirmation(
                    confirmationRow,
                    "Outro",
                    confirming.note,
                  )
                }
                className="rounded-mx-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover disabled:opacity-40"
              >
                {saving ? "Salvando..." : "Registrar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function ConfirmationInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-mx-xl bg-surface-alt p-3">
      <p className="mb-0.5 text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

function canonicalConfirmationLabel(status: string | null | undefined) {
  return {
    pendente: "Pendente",
    whatsapp_aberto: "WhatsApp aberto",
    confirmado: "Confirmado",
    sem_resposta: "Sem resposta",
    solicitou_reagendamento: "Solicitou reagendamento",
    cancelou: "Cancelou",
    outro: "Outro",
  }[status || "pendente"] || "Pendente";
}

function confirmationStatusClass(status: string) {
  return {
    Pendente: "bg-status-warning-surface text-status-warning-text",
    "WhatsApp aberto": "bg-status-info-surface text-status-info-text",
    Confirmado: "bg-status-success-surface text-status-success-text",
    "Sem resposta": "bg-muted text-muted-foreground",
    "Solicitou reagendamento": "bg-status-warning-surface text-status-warning-text",
    Cancelou: "bg-status-error-surface text-status-error-text",
    Outro: "bg-status-info-surface text-status-info-text",
  }[status] || "bg-muted text-muted-foreground";
}
