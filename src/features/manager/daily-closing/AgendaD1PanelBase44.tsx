import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import {
  CalendarClock,
  CalendarDays,
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
import { AgendaConfirmationMenu } from "./AgendaConfirmationMenu";
import {
  AGENDA_CANAL_LABEL,
  AGENDA_D1_DEFAULT_FILTERS,
  AGENDA_STATUS_LABEL,
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

type ConfirmationDraft = {
  row: AgendaD1Row;
  outcome: ConfirmationOutcome;
  note: string;
};

/**
 * Agenda D+1 do gerente. Origem canônica: agendamentos da Carteira/CRM.
 * O gerente registra contato e confirmação em auditoria, sem reescrever a agenda.
 */
export function AgendaD1Panel({
  open,
  onClose,
  referenceDate,
  sellers,
  initialSellerId,
}: AgendaD1PanelProps) {
  const { storeId, profile, membership } = useAuth();
  const { sendNotification } = useNotifications();
  const d1Date = useMemo(
    () => format(addDays(parseISO(referenceDate), 1), "yyyy-MM-dd"),
    [referenceDate],
  );
  const [rows, setRows] = useState<AgendaD1Row[]>([]);
  const [lastContactByCliente, setLastContactByCliente] = useState<
    Map<string, string>
  >(new Map());
  const [lastStatusByCliente, setLastStatusByCliente] = useState<
    Map<string, string>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AgendaD1Filters>({
    ...AGENDA_D1_DEFAULT_FILTERS,
    sellerId: initialSellerId || "all",
  });
  const [confirmationStatus, setConfirmationStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationDraft | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFilters({
      ...AGENDA_D1_DEFAULT_FILTERS,
      sellerId: initialSellerId || "all",
    });
    setConfirmationStatus("all");
    setSearch("");
    setConfirmation(null);
  }, [open, initialSellerId]);

  const fetchAgenda = useCallback(async () => {
    if (!storeId || !open) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("agendamentos")
      .select(
        "id, data_hora, canal, tipo, status, observacoes, seller_user_id, cliente:clientes(id, nome, telefone, telefone_normalizado, ultima_interacao), oportunidade:oportunidades(veiculo_interesse)",
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

    const active = dedupeActiveAppointments(
      (data || []) as unknown as AgendaD1Row[],
    );
    setRows(active);

    const clienteIds = active
      .map((item) => item.cliente?.id)
      .filter((id): id is string => Boolean(id));

    if (clienteIds.length) {
      const { data: logs, error: logsError } = await supabase
        .from("d1_audit_log")
        .select("cliente_id, created_at, tipo_alteracao, valor_novo")
        .in("cliente_id", clienteIds)
        .order("created_at", { ascending: false });

      if (logsError) {
        setError(`Agenda carregada, mas a auditoria falhou: ${logsError.message}`);
      }

      const contactMap = new Map<string, string>();
      const statusMap = new Map<string, string>();
      for (const log of logs || []) {
        if (!log.cliente_id || contactMap.has(log.cliente_id)) continue;
        contactMap.set(log.cliente_id, log.created_at);
        statusMap.set(
          log.cliente_id,
          normalizeManagerConfirmationStatus(log.tipo_alteracao, log.valor_novo),
        );
      }
      setLastContactByCliente(contactMap);
      setLastStatusByCliente(statusMap);
    } else {
      setLastContactByCliente(new Map());
      setLastStatusByCliente(new Map());
    }

    setLoading(false);
  }, [d1Date, open, storeId]);

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
      const managerStatus = getManagerStatus(row, lastStatusByCliente);
      if (confirmationStatus !== "all" && managerStatus !== confirmationStatus) {
        return false;
      }
      if (!normalizedSearch) return true;
      return [
        row.cliente?.nome,
        row.cliente?.telefone,
        row.oportunidade?.veiculo_interesse,
        sellerNameById.get(row.seller_user_id),
        format(parseISO(row.data_hora), "HH:mm"),
      ].some((value) =>
        value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
      );
    });
  }, [
    confirmationStatus,
    filters,
    lastStatusByCliente,
    rows,
    search,
    sellerNameById,
  ]);

  const registerLog = useCallback(
    async (
      row: AgendaD1Row,
      changeType: string,
      previousValue: string | null,
      nextValue: string,
    ) => {
      if (!profile?.id) return { error: "Sessão inválida." };
      const { error: insertError } = await supabase.from("d1_audit_log").insert({
        usuario_id: profile.id,
        usuario_nome: profile.name || null,
        cliente_id: row.cliente?.id || null,
        tipo_alteracao: changeType,
        valor_anterior: previousValue,
        valor_novo: nextValue,
      });
      if (insertError) return { error: insertError.message };

      if (row.cliente?.id) {
        const now = new Date().toISOString();
        setLastContactByCliente((current) =>
          new Map(current).set(row.cliente!.id, now),
        );
        setLastStatusByCliente((current) =>
          new Map(current).set(
            row.cliente!.id,
            normalizeManagerConfirmationStatus(changeType, nextValue),
          ),
        );
      }
      return { error: null };
    },
    [profile?.id, profile?.name],
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

      const results = await Promise.all([
        registerLog(
          row,
          "agenda_d1_whatsapp",
          getManagerStatus(row, lastStatusByCliente),
          "WhatsApp aberto pelo gerente",
        ),
        storeId && profile?.id
          ? supabase
              .from("logs_compartilhamento_whatsapp")
              .insert({
                store_id: storeId,
                user_id: profile.id,
                message_text: message,
                reference_date: d1Date,
                shared_via: "whatsapp",
                source: "agenda_d1_gerente",
              })
              .then((result) => ({ error: result.error?.message || null }))
          : Promise.resolve({ error: null }),
      ]);

      const failure = results.find((result) => result.error);
      if (failure?.error) {
        toast.error(`Contato aberto, mas o log falhou: ${failure.error}`);
      } else {
        toast.success("WhatsApp aberto e contato registrado.");
      }
    },
    [
      d1Date,
      lastStatusByCliente,
      membership?.store?.name,
      profile?.id,
      registerLog,
      storeId,
    ],
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
      const result = await registerLog(
        row,
        "agenda_d1_telefone",
        getManagerStatus(row, lastStatusByCliente),
        "Ligação iniciada pelo gerente",
      );
      if (result.error) {
        toast.error(`Ligação iniciada, mas o log falhou: ${result.error}`);
      } else {
        toast.success("Ligação registrada.");
      }
    },
    [lastStatusByCliente, registerLog],
  );

  const saveConfirmation = useCallback(async () => {
    if (!confirmation) return;
    if (confirmation.outcome === "Outro" && !confirmation.note.trim()) {
      toast.error('Descreva a observação para o resultado "Outro".');
      return;
    }

    setSaving(true);
    const nextValue = confirmation.note.trim()
      ? `${confirmation.outcome} — ${confirmation.note.trim()}`
      : confirmation.outcome;
    const previousValue = getManagerStatus(
      confirmation.row,
      lastStatusByCliente,
    );
    const result = await registerLog(
      confirmation.row,
      "agenda_d1_confirmacao",
      previousValue,
      nextValue,
    );

    if (result.error) {
      toast.error(`Não foi possível registrar: ${result.error}`);
      setSaving(false);
      return;
    }

    if (
      confirmation.outcome === "Solicitou reagendamento" ||
      confirmation.outcome === "Cancelou"
    ) {
      const notificationResult = await sendNotification({
        recipient_id: confirmation.row.seller_user_id,
        store_id: storeId || undefined,
        title:
          confirmation.outcome === "Cancelou"
            ? "Cliente cancelou agendamento D+1"
            : "Cliente pediu reagendamento (D+1)",
        message: `${confirmation.row.cliente?.nome || "Cliente"} — ${format(
          parseISO(confirmation.row.data_hora),
          "dd/MM HH:mm",
        )}. ${nextValue}. A agenda original não foi alterada: atualize pela Carteira.`,
        type: "agenda",
        priority: "high",
        link: "/carteira",
      });
      if (notificationResult.error) {
        toast.error("Registro salvo, mas o aviso ao vendedor falhou.");
      }
    }

    toast.success("Contato registrado na auditoria D+1.");
    setConfirmation(null);
    setSaving(false);
  }, [confirmation, lastStatusByCliente, registerLog, sendNotification, storeId]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="3xl"
        className="sm:max-w-[1152px]"
        referenceStyle
        title="Agenda D+1"
        description="Clientes agendados para amanhã a partir dos fechamentos da equipe."
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                Agenda D+1 parcial
              </span>
              <p className="mt-1 text-xs text-gray-400">
                Atualizada em tempo real até o encerramento da janela de ajuste.
              </p>
            </div>
            <p className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <CalendarClock size={16} />
              Data D+1:
              <strong className="text-gray-800">
                {format(parseISO(d1Date), "dd/MM/yyyy")}
              </strong>
            </p>
          </div>

          <div
            className="rounded-2xl bg-gray-50 p-4"
            role="group"
            aria-label="Filtros da Agenda D+1"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Filter size={16} /> Filtros
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <FilterSelect
                label="Vendedor"
                value={filters.sellerId}
                onChange={(value) =>
                  setFilters((current) => ({ ...current, sellerId: value }))
                }
              >
                <option value="all">Vendedor</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Canal"
                value={filters.canal}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    canal: value as AgendaD1Filters["canal"],
                  }))
                }
              >
                <option value="all">Canal</option>
                {Object.entries(AGENDA_CANAL_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Tipo de agendamento"
                value={filters.tipo}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    tipo: value as AgendaD1Filters["tipo"],
                  }))
                }
              >
                <option value="all">Tipo de agendamento</option>
                {Object.entries(AGENDA_TIPO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {formatAppointmentType(label)}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Status de confirmação"
                value={confirmationStatus}
                onChange={setConfirmationStatus}
              >
                <option value="all">Status de confirmação</option>
                {[
                  "Pendente",
                  "WhatsApp aberto",
                  "Reforço enviado",
                  "Confirmado",
                  "Sem resposta",
                  "Solicitou reagendamento",
                  "Cancelou",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </FilterSelect>
              <label className="relative block">
                <span className="sr-only">Buscar agenda D+1</span>
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  aria-label="Buscar agenda D+1"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar (cliente, veículo, horário)..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
              <p>Não foi possível carregar a Agenda D+1: {error}</p>
              <button
                type="button"
                onClick={() => void fetchAgenda()}
                className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-red-50"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : visible.length === 0 ? (
            <div className="grid min-h-[220px] place-items-center p-8 text-center">
              <div>
                <CalendarDays size={42} className="mx-auto text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  {rows.length === 0
                    ? "Nenhum cliente agendado para D+1."
                    : "Nenhum agendamento corresponde aos filtros."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
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
                        className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {visible.map((row) => {
                    const lastContact = row.cliente
                      ? lastContactByCliente.get(row.cliente.id) ||
                        row.cliente.ultima_interacao
                      : null;
                    const managerStatus = getManagerStatus(
                      row,
                      lastStatusByCliente,
                    );
                    return (
                      <tr key={row.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {format(parseISO(row.data_hora), "HH:mm")}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {row.cliente?.nome || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.cliente?.telefone || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.oportunidade?.veiculo_interesse || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.canal ? AGENDA_CANAL_LABEL[row.canal] : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {sellerNameById.get(row.seller_user_id) ||
                            "Vendedor da equipe"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {formatAppointmentType(AGENDA_TIPO_LABEL[row.tipo])}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${statusBadgeClass(managerStatus)}`}
                          >
                            {managerStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {lastContact
                            ? format(parseISO(lastContact), "dd/MM HH:mm")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <button
                              type="button"
                              aria-label={`WhatsApp para ${row.cliente?.nome || "cliente"}`}
                              onClick={() => void openWhatsapp(row)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              <MessageCircle size={14} /> WhatsApp
                            </button>
                            <button
                              type="button"
                              aria-label={`Ligar para ${row.cliente?.nome || "cliente"}`}
                              onClick={() => void callPhone(row)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              <Phone size={14} /> Telefone
                            </button>
                            <AgendaConfirmationMenu
                              disabled={saving}
                              onSelect={(outcome) =>
                                setConfirmation({ row, outcome, note: "" })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400">
            A Carteira de Clientes permanece a base oficial. O gerente não altera
            o agendamento original: apenas confirma com o cliente e registra o
            status gerencial de confirmação.
          </p>
        </div>
      </Modal>

      <ConfirmationDialog
        draft={confirmation}
        sellerName={
          confirmation
            ? sellerNameById.get(confirmation.row.seller_user_id) ||
              "Vendedor da equipe"
            : ""
        }
        saving={saving}
        onChange={setConfirmation}
        onClose={() => {
          if (!saving) setConfirmation(null);
        }}
        onSave={saveConfirmation}
      />
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {children}
      </select>
    </label>
  );
}

function ConfirmationDialog({
  draft,
  sellerName,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  draft: ConfirmationDraft | null;
  sellerName: string;
  saving: boolean;
  onChange: React.Dispatch<React.SetStateAction<ConfirmationDraft | null>>;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}) {
  if (!draft) return null;
  const noteRequired = draft.outcome === "Outro";

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      referenceStyle
      title="Registrar confirmação do agendamento"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Cliente" value={draft.row.cliente?.nome || "—"} />
          <Detail label="Vendedor" value={sellerName} />
          <Detail
            label="Tipo de agendamento"
            value={formatAppointmentType(AGENDA_TIPO_LABEL[draft.row.tipo])}
          />
          <Detail
            label="Data / Horário"
            value={format(parseISO(draft.row.data_hora), "dd/MM/yyyy HH:mm")}
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-600">
            Status da confirmação
          </span>
          <select
            value={draft.outcome}
            onChange={(event) =>
              onChange((current) =>
                current
                  ? {
                      ...current,
                      outcome: event.target.value as ConfirmationOutcome,
                    }
                  : current,
              )
            }
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {CONFIRMATION_OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-600">
            {noteRequired ? "Observação (obrigatória)" : "Observação"}
          </span>
          <textarea
            value={draft.note}
            onChange={(event) =>
              onChange((current) =>
                current ? { ...current, note: event.target.value } : current,
              )
            }
            rows={3}
            placeholder="Observações gerenciais (opcional)..."
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        {(draft.outcome === "Solicitou reagendamento" ||
          draft.outcome === "Cancelou") && (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            A agenda original não será alterada. O vendedor receberá um aviso para
            atualizar o registro pela Carteira.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-xl px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || (noteRequired && !draft.note.trim())}
            className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-200"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="mb-0.5 text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}

function getManagerStatus(
  row: AgendaD1Row,
  statuses: Map<string, string>,
): string {
  if (row.cliente?.id) {
    const status = statuses.get(row.cliente.id);
    if (status) return status;
  }
  return row.status === "confirmado" ? "Confirmado" : "Pendente";
}

function normalizeManagerConfirmationStatus(
  changeType: string | null,
  value: string | null,
) {
  if (changeType === "agenda_d1_whatsapp") return "WhatsApp aberto";
  if (!value) return "Pendente";
  return (
    ["Confirmado", "Sem resposta", "Solicitou reagendamento", "Cancelou"].find(
      (status) => value.startsWith(status),
    ) || "Reforço enviado"
  );
}

function statusBadgeClass(status: string) {
  if (status === "Confirmado") return "bg-emerald-100 text-emerald-700";
  if (status === "Cancelou") return "bg-red-100 text-red-700";
  if (status === "Solicitou reagendamento") return "bg-blue-100 text-blue-700";
  if (status === "Sem resposta" || status === "Pendente") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-gray-100 text-gray-600";
}

function formatAppointmentType(label: string) {
  return label === "Visita" ? "Visita Presencial" : label;
}
