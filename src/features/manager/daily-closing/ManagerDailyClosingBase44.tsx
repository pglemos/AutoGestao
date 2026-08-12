import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  Globe2,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trophy,
  TrendingUp,
  UserRoundCheck,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { PageCanvas } from "@/design-system/page";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useCheckinsByDateRange } from "@/hooks/useCheckins";
import { useSellersByStore } from "@/hooks/useStores";
import { useCheckinAuditor } from "@/hooks/useCheckinAuditor";
import { useStoreMetaRules } from "@/hooks/useGoals";
import { useNotifications } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { calculateReferenceDate } from "@/hooks/checkins/types";
import { getDiasInfo } from "@/lib/calculations";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Modal } from "@/components/organisms/Modal";
import { ManagerHomeReturnLink } from "@/features/manager/home/ManagerHomeReturnLink";
import {
  classifyAppointmentCoverage,
  classifyDiscipline,
} from "@/features/manager/shared/manager-metrics";
import type {
  CheckinCorrectionRequest,
  CheckinFormData,
  CheckinWithTotals,
} from "@/types/database";
import { AgendaD1Panel } from "./AgendaD1Panel";
import { LeadConferenceModal } from "./LeadConferenceModal";
import { ClosingDetailsModal } from "./ClosingDetailsModal";
import { CorrigirLeadsModal } from "./CorrigirLeadsModal";
import type { buildLeadCorrectionPayload } from "./corrigir-leads";
import {
  RegularizationsListModal,
  type RegularizationRequest,
} from "./RegularizationsListModal";
import { RegularizationDecisionModal } from "./RegularizationDecisionModal";
import { RegularizeLateModal } from "./RegularizeLateModal";
import {
  averageDiscipline,
  buildClosingSummary,
  buildDisciplineTrend,
  formatClosingMetric,
  sumNumericMetrics,
} from "./manager-closing-metrics";
import { subscribeToManagerClosingRealtime } from "./manager-closing-realtime";

export const PENDING_CLOSING_MESSAGE =
  "Seu Fechamento Diário está pendente. Finalize o registro do dia para que a gestão acompanhe corretamente o movimento comercial.";

type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

type ManagerCorrectionRequest = CheckinCorrectionRequest & {
  status: RequestStatus;
  requested_values: CheckinFormData;
  created_at: string;
  seller?: { name?: string | null; avatar_url?: string | null } | null;
};

type ClosingStatus =
  | "Finalizado"
  | "Pendente"
  | "Fora do horário"
  | "Aguardando aprovação"
  | "Regularizado aprovado"
  | "Regularização recusada";

type ClosingRowModel = {
  seller: { id: string; name: string };
  checkin?: CheckinWithTotals;
  request?: ManagerCorrectionRequest;
  status: ClosingStatus;
};

type RowDecision = {
  request: ManagerCorrectionRequest;
  action: "approve" | "reject";
};

type LateRegularization = {
  seller: { id: string; name: string };
  checkin: CheckinWithTotals;
};

export default function ManagerDailyClosing() {
  const { storeId, membership, profile } = useAuth();
  const [date, setDate] = useState(calculateReferenceDate);
  const [historyRange, setHistoryRange] = useState<7 | 15 | 30>(7);
  const [requests, setRequests] = useState<ManagerCorrectionRequest[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<{ open: boolean; sellerId?: string }>({
    open: false,
  });
  const [leadConferenceOpen, setLeadConferenceOpen] = useState(false);
  const [regularizationsOpen, setRegularizationsOpen] = useState(false);
  const [closingDetail, setClosingDetail] = useState<{
    seller: { id: string; name: string };
    checkin?: CheckinWithTotals;
    status: string;
  } | null>(null);
  const [correctingLeads, setCorrectingLeads] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [rowDecision, setRowDecision] = useState<RowDecision | null>(null);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [lateRegularization, setLateRegularization] =
    useState<LateRegularization | null>(null);
  const [regularizingLate, setRegularizingLate] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const historyStart = format(
    subDays(parseISO(date), historyRange - 1),
    "yyyy-MM-dd",
  );
  const metricHistoryStart = format(
    subDays(parseISO(date), 29),
    "yyyy-MM-dd",
  );

  const {
    sellers,
    loading: sellersLoading,
    refetch: refetchSellers,
  } = useSellersByStore(storeId);
  const {
    checkins,
    loading: checkinsLoading,
    error,
    refetch,
  } = useCheckinsByDateRange(storeId, date, date);
  const { checkins: historyCheckins, refetch: refetchHistory } =
    useCheckinsByDateRange(storeId, historyStart, date);
  const {
    checkins: metricHistoryCheckins,
    refetch: refetchMetricHistory,
  } = useCheckinsByDateRange(storeId, metricHistoryStart, date);
  const { metaRules } = useStoreMetaRules(storeId || undefined);
  const auditor = useCheckinAuditor(storeId || undefined);
  const { sendNotification } = useNotifications();

  const loadRequests = useCallback(async () => {
    if (!storeId) {
      setRequests([]);
      return;
    }
    setRequestError(null);
    const { data, error: loadError } = await supabase
      .from("solicitacoes_correcao_lancamento")
      .select(
        "*, seller:usuarios!checkin_correction_requests_seller_id_fkey(name, avatar_url)",
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(250);

    if (loadError) {
      setRequests([]);
      setRequestError(loadError.message);
      return;
    }
    setRequests((data || []) as unknown as ManagerCorrectionRequest[]);
  }, [storeId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const requestByCheckin = useMemo(() => {
    const map = new Map<string, ManagerCorrectionRequest>();
    for (const request of requests) {
      if (!map.has(request.checkin_id)) map.set(request.checkin_id, request);
    }
    return map;
  }, [requests]);

  const rows = useMemo<ClosingRowModel[]>(() => {
    const checkinBySeller = new Map(
      checkins.map((checkin) => [checkin.seller_user_id, checkin]),
    );
    return sellers
      .map((seller) => {
        const checkin = checkinBySeller.get(seller.id);
        const request = checkin ? requestByCheckin.get(checkin.id) : undefined;
        return {
          seller,
          checkin,
          request,
          status: deriveClosingStatus(checkin, request),
        };
      })
      .sort((left, right) => {
        const leftTime = left.checkin?.submitted_at || "";
        const rightTime = right.checkin?.submitted_at || "";
        return rightTime.localeCompare(leftTime);
      });
  }, [checkins, requestByCheckin, sellers]);

  const pendingRows = rows.filter((row) => row.status === "Pendente");
  const pendingRequests = requests.filter(
    (request) =>
      request.status === "pending" &&
      checkins.some((checkin) => checkin.id === request.checkin_id),
  );
  const submitted = rows.filter((row) => Boolean(row.checkin)).length;
  const movementState = getMovementState(rows.length, submitted);

  const appointments = checkins.length
    ? checkins.reduce(
        (sum, item) =>
          sum + sumNumericMetrics(item.agd_cart_today, item.agd_net_today),
        0,
      )
    : null;

  const appointmentNeed = useMemo(() => {
    const goal = Number(metaRules?.monthly_goal || 0);
    if (!Number.isFinite(goal) || goal <= 0) return null;
    const days = getDiasInfo(date, metaRules?.projection_mode || "calendar");
    if (days.total <= 0) return null;

    const sales = metricHistoryCheckins.reduce(
      (sum, item) =>
        sum +
        sumNumericMetrics(
          item.vnd_porta_prev_day,
          item.vnd_cart_prev_day,
          item.vnd_net_prev_day,
        ),
      0,
    );
    if (sales <= 0) return null;

    const appointmentsInBase = metricHistoryCheckins.reduce(
      (sum, item) =>
        sum + sumNumericMetrics(item.agd_cart_today, item.agd_net_today),
      0,
    );
    const appointmentsPerSale = appointmentsInBase / sales;
    if (!Number.isFinite(appointmentsPerSale) || appointmentsPerSale <= 0) {
      return null;
    }
    return Math.ceil((goal / days.total) * appointmentsPerSale);
  }, [date, metaRules, metricHistoryCheckins]);

  const appointmentStatus = classifyAppointmentCoverage(
    appointments,
    appointmentNeed,
  );
  const disciplineValues = checkins
    .map((item) => item.pontuacao_disciplina_final)
    .filter((value): value is number => typeof value === "number");
  const discipline = averageDiscipline(disciplineValues);
  const trend = useMemo(
    () => buildDisciplineTrend(historyCheckins, historyStart, date),
    [date, historyCheckins, historyStart],
  );
  const historicalAverage = averageDiscipline(
    trend
      .map((point) => point.value)
      .filter((value): value is number => value !== null),
  );
  const summary = useMemo(() => buildClosingSummary(checkins), [checkins]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetch(),
      refetchHistory(),
      refetchMetricHistory(),
      refetchSellers(),
      loadRequests(),
    ]);
    toast.success("Fechamento da equipe atualizado.");
  }, [
    loadRequests,
    refetch,
    refetchHistory,
    refetchMetricHistory,
    refetchSellers,
  ]);

  useEffect(() => {
    if (!storeId) return;
    const cleanup = subscribeToManagerClosingRealtime({
      client: {
        channel: (name) => supabase.channel(name),
        removeChannel: (channel) =>
          supabase.removeChannel(
            channel as Parameters<typeof supabase.removeChannel>[0],
          ),
      },
      storeId,
      onChange: () => {
        if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = setTimeout(() => {
          void refreshAll()
            .then(() => setSyncWarning(null))
            .catch(() =>
              setSyncWarning(
                "Falha ao sincronizar automaticamente. Use Atualizar.",
              ),
            );
        }, 500);
      },
      onStatus: (status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSyncWarning(
            "Realtime indisponível. Use Atualizar para confirmar os dados.",
          );
        } else if (status === "SUBSCRIBED") {
          setSyncWarning(null);
        }
      },
    });

    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      cleanup();
    };
  }, [refreshAll, storeId]);

  const sendClosingReminder = useCallback(
    async (row: ClosingRowModel) => {
      if (!storeId) return { error: "Loja não identificada.", duplicate: false };
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: existing, error: existingError } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("recipient_id", row.seller.id)
        .eq("store_id", storeId)
        .eq("title", "Fechamento Diário pendente")
        .gte("created_at", since)
        .limit(1);

      if (existingError) {
        return { error: existingError.message, duplicate: false };
      }
      if (existing?.length) return { error: null, duplicate: true };

      const result = await sendNotification({
        recipient_id: row.seller.id,
        store_id: storeId,
        title: "Fechamento Diário pendente",
        message: PENDING_CLOSING_MESSAGE,
        type: "checkin",
        priority: "high",
        link: "/fechamento-diario",
      });
      return { error: result.error, duplicate: false };
    },
    [sendNotification, storeId],
  );

  const remindPending = async () => {
    if (!pendingRows.length) return;
    setReminding(true);
    const results = await Promise.all(pendingRows.map(sendClosingReminder));
    const failures = results.filter((result) => result.error).length;
    const duplicates = results.filter((result) => result.duplicate).length;

    if (failures) {
      toast.error(`${failures} cobrança(s) não puderam ser registradas.`);
    } else if (duplicates === pendingRows.length) {
      toast.info("As cobranças já foram registradas recentemente.");
    } else {
      toast.success(
        `Cobrança registrada para ${pendingRows.length - duplicates} vendedor(es).`,
      );
    }
    setReminding(false);
    setReminderOpen(false);
  };

  const remindOne = async (row: ClosingRowModel) => {
    const result = await sendClosingReminder(row);
    if (result.error) toast.error(result.error);
    else if (result.duplicate) toast.info("Cobrança já registrada recentemente.");
    else toast.success(`Cobrança registrada para ${row.seller.name}.`);
  };

  const recordDecisionComment = useCallback(
    async (
      request: ManagerCorrectionRequest,
      action: "approve" | "reject",
      comment: string,
    ) => {
      if (!comment || !storeId) return;
      const { error: logError } = await supabase
        .from("logs_auditoria_loja")
        .insert({
          store_id: storeId,
          changed_by: profile?.id || null,
          changes: {
            type: "regularization_decision_comment",
            request_id: request.id,
            action,
            comment,
          },
        });
      if (logError) {
        toast.warning("Decisão aplicada, mas o comentário não pôde ser auditado.");
      }
    },
    [profile?.id, storeId],
  );

  const decide = useCallback(
    async (
      request: ManagerCorrectionRequest,
      action: "approve" | "reject",
      comment: string,
    ) => {
      const result =
        action === "approve"
          ? await auditor.approveRequest(request)
          : await auditor.rejectRequest(request.id, comment);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      await recordDecisionComment(request, action, comment);
      toast.success(
        action === "approve"
          ? "Regularização aprovada."
          : "Regularização recusada.",
      );
      await Promise.all([loadRequests(), refetch(), refetchHistory()]);
    },
    [auditor, loadRequests, recordDecisionComment, refetch, refetchHistory],
  );

  const confirmRowDecision = async (comment: string) => {
    if (!rowDecision) return;
    setDecisionSaving(true);
    try {
      await decide(rowDecision.request, rowDecision.action, comment);
      setRowDecision(null);
    } finally {
      setDecisionSaving(false);
    }
  };

  const requestLateRegularization = async (observation: string) => {
    if (!lateRegularization) return;
    setRegularizingLate(true);
    const { checkin } = lateRegularization;
    const requestedValues = {
      reference_date: checkin.reference_date,
      leads_prev_day: checkin.leads_prev_day,
      agd_cart_prev_day: checkin.agd_cart_prev_day,
      agd_net_prev_day: checkin.agd_net_prev_day,
      agd_cart_today: checkin.agd_cart_today,
      agd_net_today: checkin.agd_net_today,
      vnd_porta_prev_day: checkin.vnd_porta_prev_day,
      vnd_cart_prev_day: checkin.vnd_cart_prev_day,
      vnd_net_prev_day: checkin.vnd_net_prev_day,
      visit_prev_day: checkin.visit_prev_day,
      zero_reason: checkin.zero_reason,
      note: [
        checkin.note,
        `Regularização fora do prazo: ${observation}`,
      ]
        .filter(Boolean)
        .join("\n"),
    } as CheckinFormData;

    const result = await auditor.requestCorrection(
      checkin.id,
      requestedValues,
      observation,
    );
    if (result.error) {
      toast.error(result.error);
      setRegularizingLate(false);
      return;
    }

    toast.success("Regularização enviada para aprovação.");
    setLateRegularization(null);
    setRegularizingLate(false);
    await loadRequests();
  };

  const handleCorrectLeads = async (
    payload: ReturnType<typeof buildLeadCorrectionPayload>,
    reason: string,
  ): Promise<{ error: string | null }> => {
    if (!closingDetail?.checkin?.id) {
      return { error: "Fechamento não encontrado para este vendedor." };
    }
    const solicited = await auditor.requestCorrection(
      closingDetail.checkin.id,
      payload,
      reason,
    );
    if (solicited.error || !solicited.id) {
      return {
        error:
          solicited.error || "Não foi possível registrar a correção de leads.",
      };
    }
    const applied = await auditor.approveRequest({
      id: solicited.id,
    } as CheckinCorrectionRequest);
    if (applied.error) return { error: applied.error };

    toast.success("Leads corrigidos e auditados.");
    setCorrectingLeads(false);
    setClosingDetail(null);
    await Promise.all([loadRequests(), refetch(), refetchHistory()]);
    return { error: null };
  };

  if (sellersLoading || checkinsLoading) return <ManagerClosingSkeleton />;

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="actions" aria-busy={false} className="flex flex-col gap-5">
        <ManagerHomeReturnLink />

        <header className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-foreground">Fechamento Diário</h1>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                Acompanhe o movimento comercial informado pelos vendedores,
                regularize fechamentos fora do horário e corrija volumes oficiais
                de leads.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block text-xs text-muted-foreground">
                <span className="mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Data
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-[36px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                <span className="mb-1 flex items-center gap-1">
                  <Building2 size={12} /> Unidade
                </span>
                <select
                  aria-label="Unidade"
                  value={storeId || ""}
                  disabled
                  className="h-[36px] min-w-[140px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-foreground opacity-100"
                >
                  <option value={storeId || ""}>
                    {membership?.store?.name || "Unidade atual"}
                  </option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void refreshAll()}
                className="inline-flex h-[36px] items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
          </div>
        </header>

        {(error || requestError) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error || `Não foi possível carregar as regularizações: ${requestError}`}
            {" "}Use Atualizar para tentar novamente.
          </div>
        )}
        {syncWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            {syncWarning}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do fechamento">
          <SummaryCard
            title="Agendamentos"
            value={formatClosingMetric(appointments, appointments !== null)}
            detail="agendamentos gerados hoje"
            icon={CalendarDays}
            tone={appointmentTone(appointmentStatus)}
            status={appointmentStatus || "—"}
            action="Ver Agenda D+1"
            onAction={() => setAgenda({ open: true })}
          />
          <SummaryCard
            title="Pendentes Hoje"
            value={pendingRows.length}
            detail="fechamentos pendentes do dia"
            icon={Clock3}
            tone="warning"
            action="Cobrar Pendentes"
            actionDisabled={!pendingRows.length || reminding}
            onAction={() => setReminderOpen(true)}
          />
          <SummaryCard
            title="Regularizações"
            value={pendingRequests.length}
            detail="aguardando aprovação"
            icon={ShieldCheck}
            tone="blue"
            action="Ver Regularizações"
            actionDisabled={!pendingRequests.length}
            onAction={() => setRegularizationsOpen(true)}
          />
          <DisciplineCard value={discipline} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div id="manager-closing-movement" />
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Movimento da Equipe — {format(parseISO(date), "dd/MM/yyyy")}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw size={13} /> Ordenado por entrega (mais recente)
              </span>
              <button
                type="button"
                onClick={() => setLeadConferenceOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 text-xs font-medium text-purple-700 shadow-sm hover:bg-purple-50"
              >
                <Wrench size={15} /> Corrigir Leads
              </button>
            </div>
          </div>

          {movementState === "no-sellers" ? (
            <Empty text="Nenhum vendedor vinculado a este gerente." />
          ) : movementState === "empty" ? (
            <Empty text="Ainda não há fechamentos enviados para a data selecionada." />
          ) : (
            <ClosingTable
              rows={rows}
              onOpenAgenda={(sellerId) => setAgenda({ open: true, sellerId })}
              onOpenDetails={(row) =>
                setClosingDetail({
                  seller: row.seller,
                  checkin: row.checkin,
                  status: row.status,
                })
              }
              onRemind={(row) => void remindOne(row)}
              onRegularize={(row) => {
                if (row.checkin) {
                  setLateRegularization({
                    seller: row.seller,
                    checkin: row.checkin,
                  });
                }
              }}
              onDecide={(row, action) => {
                if (row.request) setRowDecision({ request: row.request, action });
              }}
              onCorrectLeads={(row) => {
                setClosingDetail({
                  seller: row.seller,
                  checkin: row.checkin,
                  status: row.status,
                });
                setCorrectingLeads(true);
              }}
            />
          )}
        </section>

        <DisciplineTrendCard
          trend={trend}
          range={historyRange}
          onRange={setHistoryRange}
        />

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BarChart3 size={18} className="text-emerald-600" />
            Comparativo de Disciplina do Fechamento
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparação com equipes da rede da consultoria
          </p>
          <div className="mt-5 space-y-3">
            <ComparisonRow label="Sua Equipe" value={historicalAverage} tone="team" />
            <ComparisonRow label="Média da Rede" value={null} tone="network" />
            <ComparisonRow label="Top 25% da Rede" value={null} tone="top" />
          </div>
          <p className="mt-4 text-center text-xs italic text-muted-foreground">
            Comparativos de rede aparecem quando houver snapshots oficiais disponíveis.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Resumo do Fechamento</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-6">
            <SummaryGroup label="Showroom" icon={Store} tone="blue" items={[["Atendimentos", formatClosingMetric(summary.showroomVisits, summary.showroomVisits !== null)]]} />
            <SummaryGroup label="Carteira" icon={WalletCards} tone="emerald" items={[["Leads", formatClosingMetric(summary.carteiraLeads, summary.carteiraLeads !== null)], ["Atendimentos", formatClosingMetric(summary.carteiraVisits, summary.carteiraVisits !== null)]]} />
            <SummaryGroup label="Internet" icon={Globe2} tone="purple" items={[["Leads", formatClosingMetric(summary.internetLeads, summary.internetLeads !== null)], ["Atendimentos", formatClosingMetric(summary.internetVisits, summary.internetVisits !== null)]]} />
            <SummaryGroup label="Vendas" icon={ShoppingCart} tone="emerald" items={[["Total", formatClosingMetric(summary.sales, summary.sales !== null)]]} />
            <SummaryGroup label="Qualificados" icon={UserRoundCheck} tone="amber" items={[["Total", "—"]]} />
            <SummaryGroup label="Garantia" icon={ShieldCheck} tone="slate" items={[["Total", "—"]]} />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Os leads podem ser corrigidos pelo gerente com registro em auditoria. Demais dados permanecem sob responsabilidade do vendedor.
          </p>
        </section>

        <AgendaD1Panel
          open={agenda.open}
          onClose={() => setAgenda({ open: false })}
          referenceDate={date}
          sellers={sellers.map((seller) => ({ id: seller.id, name: seller.name }))}
          initialSellerId={agenda.sellerId}
        />
        <PendingReminderModal
          open={reminderOpen}
          pendingRows={pendingRows}
          reminding={reminding}
          onClose={() => setReminderOpen(false)}
          onConfirm={() => void remindPending()}
        />
        <LeadConferenceModal
          open={leadConferenceOpen}
          onClose={() => setLeadConferenceOpen(false)}
          storeId={storeId}
          storeName={membership?.store?.name || "Unidade atual"}
          referenceDate={date}
          sellers={sellers.map((seller) => ({ id: seller.id, name: seller.name }))}
        />
        <RegularizationsListModal
          open={regularizationsOpen}
          requests={pendingRequests as unknown as RegularizationRequest[]}
          onClose={() => setRegularizationsOpen(false)}
          onApprove={async (request) => {
            await decide(request as ManagerCorrectionRequest, "approve", "");
            setRegularizationsOpen(false);
          }}
          onReject={async (request) => {
            await decide(request as ManagerCorrectionRequest, "reject", "");
            setRegularizationsOpen(false);
          }}
        />
        <RegularizationDecisionModal
          open={Boolean(rowDecision)}
          action={rowDecision?.action || "approve"}
          request={(rowDecision?.request || null) as unknown as RegularizationRequest | null}
          saving={decisionSaving}
          onClose={() => {
            if (!decisionSaving) setRowDecision(null);
          }}
          onConfirm={confirmRowDecision}
        />
        <RegularizeLateModal
          open={Boolean(lateRegularization)}
          sellerName={lateRegularization?.seller.name || ""}
          referenceDate={lateRegularization?.checkin.reference_date || date}
          submittedAt={lateRegularization?.checkin.submitted_at}
          saving={regularizingLate}
          onClose={() => {
            if (!regularizingLate) setLateRegularization(null);
          }}
          onSubmit={requestLateRegularization}
        />
        <ClosingDetailsModal
          open={Boolean(closingDetail)}
          seller={closingDetail?.seller || { id: "", name: "" }}
          checkin={closingDetail?.checkin}
          status={closingDetail?.status || "—"}
          onClose={() => setClosingDetail(null)}
          onOpenAgenda={
            closingDetail
              ? () => {
                  const sellerId = closingDetail.seller.id;
                  setClosingDetail(null);
                  setAgenda({ open: true, sellerId });
                }
              : undefined
          }
        />
        <CorrigirLeadsModal
          open={correctingLeads}
          onClose={() => setCorrectingLeads(false)}
          sellerName={closingDetail?.seller.name || ""}
          checkin={closingDetail?.checkin || null}
          onSubmit={handleCorrectLeads}
        />
    </PageCanvas>
  );
}

export function getMovementState(
  sellerCount: number,
  submittedCount: number,
): "no-sellers" | "empty" | "table" {
  if (sellerCount === 0) return "no-sellers";
  if (submittedCount === 0) return "empty";
  return "table";
}

export function PendingReminderModal({
  open,
  pendingRows,
  reminding,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pendingRows: ClosingRowModel[];
  reminding: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      referenceStyle
      title="Cobrar Fechamentos Pendentes"
      description={`${pendingRows.length} vendedor(es) pendente(s)`}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button type="button" disabled={reminding} onClick={onConfirm} className="h-11 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:bg-amber-200">
            {reminding ? "Enviando..." : "Confirmar Cobrança"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-3 text-sm text-muted-foreground">Vendedores que serão cobrados:</p>
          <ul className="space-y-2">
            {pendingRows.map(({ seller }) => (
              <li key={seller.id} className="flex items-center gap-2 text-sm text-foreground">
                <Megaphone size={15} className="text-amber-500" /> {seller.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-700">Mensagem padrão enviada:</p>
          <p className="mt-2 text-sm italic leading-6 text-foreground">“{PENDING_CLOSING_MESSAGE}”</p>
        </div>
      </div>
    </Modal>
  );
}

function deriveClosingStatus(
  checkin: CheckinWithTotals | undefined,
  request: ManagerCorrectionRequest | undefined,
): ClosingStatus {
  if (!checkin) return "Pendente";
  if (request?.status === "pending") return "Aguardando aprovação";
  if (request?.status === "approved") return "Regularizado aprovado";
  if (request?.status === "rejected") return "Regularização recusada";
  if (
    checkin.submitted_late ||
    checkin.finalizado_apos_prazo ||
    checkin.submission_status === "late"
  ) {
    return "Fora do horário";
  }
  return "Finalizado";
}

function appointmentTone(status: string | null) {
  if (status === "Excelente" || status === "Bom") return "success" as const;
  if (status === "Regular") return "warning" as const;
  if (status === "Ruim") return "danger" as const;
  return "neutral" as const;
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  status,
  action,
  actionDisabled,
  onAction,
}: {
  title: string;
  value: number | string;
  detail: string;
  icon: typeof CalendarDays;
  tone: "warning" | "danger" | "success" | "blue" | "neutral";
  status?: string;
  action: string;
  actionDisabled?: boolean;
  onAction: () => void;
}) {
  const tones = {
    warning: "border-amber-200 bg-amber-50 text-amber-600",
    danger: "border-red-200 bg-red-50 text-red-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-600",
    blue: "border-blue-200 bg-blue-50 text-blue-600",
    neutral: "border-gray-100 bg-white text-muted-foreground",
  }[tone];
  const actionTone = tone === "warning" ? "border-amber-200 text-amber-700" : tone === "blue" ? "border-blue-200 text-blue-700" : "border-emerald-200 text-emerald-700";
  return (
    <article className={`flex h-[164px] flex-col rounded-2xl border p-3 shadow-sm ${tones}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Icon size={16} /> {title}</h2>
        {status && status !== "—" && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "Excelente" || status === "Bom" ? "bg-emerald-100 text-emerald-700" : status === "Regular" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{status}</span>}
      </div>
      <strong className="mt-2 text-3xl text-foreground">{value}</strong>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      <button type="button" disabled={actionDisabled} onClick={onAction} className={`mt-auto inline-flex h-[28px] items-center justify-center gap-1.5 rounded-lg border bg-white px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${actionTone}`}>
        {action === "Ver Agenda D+1" && <CalendarClock size={14} />}
        {action === "Cobrar Pendentes" && <Megaphone size={14} />}
        {action === "Ver Regularizações" && <Eye size={14} />}
        {action}
      </button>
    </article>
  );
}

function DisciplineCard({ value }: { value: number | null }) {
  const normalized = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const label = value === null ? "Sem dados" : classifyDiscipline(value);
  const color = normalized >= 90 ? "#10b981" : normalized >= 70 ? "#3b82f6" : normalized >= 40 ? "#f97316" : "#ef4444";
  const background = normalized >= 90 ? "bg-emerald-50 border-emerald-100" : normalized >= 70 ? "bg-blue-50 border-blue-100" : normalized >= 40 ? "bg-orange-50 border-orange-100" : "bg-red-50 border-red-100";
  return (
    <article className={`flex h-[164px] flex-col rounded-2xl border p-3 shadow-sm ${background}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-muted-foreground">Disciplina Média</h2>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-foreground">{label}</span>
      </div>
      <div className="mx-auto mt-1">
        <div role="progressbar" aria-label="Disciplina média da equipe" aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalized} className="grid h-24 w-24 place-items-center rounded-full p-2" style={{ background: `conic-gradient(${color} ${normalized * 3.6}deg, rgba(255,255,255,.8) 0deg)` }}>
          <div className="grid h-full w-full place-items-center rounded-full bg-white/80"><strong className="text-2xl font-bold" style={{ color }}>{value === null ? "—" : `${normalized}%`}</strong></div>
        </div>
      </div>
    </article>
  );
}

function ClosingTable({ rows, onOpenAgenda, onOpenDetails, onRemind, onRegularize, onDecide, onCorrectLeads }: {
  rows: ClosingRowModel[];
  onOpenAgenda: (sellerId: string) => void;
  onOpenDetails: (row: ClosingRowModel) => void;
  onRemind: (row: ClosingRowModel) => void;
  onRegularize: (row: ClosingRowModel) => void;
  onDecide: (row: ClosingRowModel, action: "approve" | "reject") => void;
  onCorrectLeads: (row: ClosingRowModel) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="border-b border-gray-100 bg-gray-50"><tr>{["Vendedor", "Status", "Entrega", "Leads", "Qualif.", "Agend.", "Atendi.", "Venda", "Disc.", "Ações"].map((label) => <th key={label} className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => <ClosingRow key={row.seller.id} row={row} onOpenAgenda={() => onOpenAgenda(row.seller.id)} onOpenDetails={() => onOpenDetails(row)} onRemind={() => onRemind(row)} onRegularize={() => onRegularize(row)} onDecide={(action) => onDecide(row, action)} onCorrectLeads={() => onCorrectLeads(row)} />)}
        </tbody>
      </table>
    </div>
  );
}

function ClosingRow({ row, onOpenAgenda, onOpenDetails, onRemind, onRegularize, onDecide, onCorrectLeads }: {
  row: ClosingRowModel;
  onOpenAgenda: () => void;
  onOpenDetails: () => void;
  onRemind: () => void;
  onRegularize: () => void;
  onDecide: (action: "approve" | "reject") => void;
  onCorrectLeads: () => void;
}) {
  const { checkin, status } = row;
  const appointments = checkin ? sumNumericMetrics(checkin.agd_cart_today, checkin.agd_net_today) : null;
  const leads = checkin ? sumNumericMetrics(checkin.leads_prev_day, checkin.leads_net_prev_day) : null;
  const sales = checkin ? sumNumericMetrics(checkin.vnd_porta_prev_day, checkin.vnd_cart_prev_day, checkin.vnd_net_prev_day) : null;
  const visits = checkin ? sumNumericMetrics(checkin.visit_prev_day) : null;
  const discipline = checkin?.pontuacao_disciplina_final;
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{initials(row.seller.name)}</span><span className="font-semibold text-foreground">{row.seller.name}</span></div></td>
      <td className="px-4 py-3"><StatusBadge status={status} /></td>
      <td className="px-4 py-3 text-muted-foreground">{checkin?.submitted_at ? format(parseISO(checkin.submitted_at), "HH:mm") : "—"}</td>
      <MetricCell value={leads} />
      <MetricCell value="—" muted />
      <td className="px-4 py-3"><button type="button" onClick={onOpenAgenda} className={`font-semibold underline decoration-dotted underline-offset-4 ${appointments === null ? "text-muted-foreground" : appointments === 0 ? "text-red-600" : appointments === 1 ? "text-orange-600" : "text-emerald-600"}`}>{appointments ?? "—"}</button></td>
      <MetricCell value={visits} />
      <MetricCell value={sales} />
      <td className="px-4 py-3"><MiniDiscipline value={typeof discipline === "number" ? discipline : null} /></td>
      <td className="px-4 py-3"><div className="flex items-center justify-end gap-2 whitespace-nowrap"><ActionButton icon={Eye} label="Detalhes" onClick={onOpenDetails} tone="gray" />{status === "Pendente" && <ActionButton icon={Megaphone} label="Cobrar" onClick={onRemind} tone="orange" />}{(status === "Fora do horário" || status === "Regularização recusada") && <ActionButton icon={RefreshCw} label="Regularizar" onClick={onRegularize} tone="blue" />}{status === "Aguardando aprovação" && <><ActionButton icon={Check} label="Aprovar" onClick={() => onDecide("approve")} tone="green" /><ActionButton icon={X} label="Recusar" onClick={() => onDecide("reject")} tone="red" /></>}{(status === "Finalizado" || status === "Regularizado aprovado") && <ActionButton icon={Wrench} label="Leads" onClick={onCorrectLeads} tone="purple" />}</div></td>
    </tr>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone }: { icon: typeof Eye; label: string; onClick: () => void; tone: "gray" | "orange" | "blue" | "green" | "red" | "purple" }) {
  const toneClass = { gray: "text-muted-foreground hover:bg-gray-50", orange: "text-orange-700 hover:bg-orange-50", blue: "text-blue-700 hover:bg-blue-50", green: "text-emerald-700 hover:bg-emerald-50", red: "text-red-700 hover:bg-red-50", purple: "text-purple-700 hover:bg-purple-50" }[tone];
  return <button type="button" onClick={onClick} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium ${toneClass}`}><Icon size={13} /> {label}</button>;
}

function StatusBadge({ status }: { status: ClosingStatus }) {
  const classes: Record<ClosingStatus, string> = { Finalizado: "bg-emerald-100 text-emerald-700", Pendente: "bg-amber-100 text-amber-700", "Fora do horário": "bg-red-100 text-red-700", "Aguardando aprovação": "bg-blue-100 text-blue-700", "Regularizado aprovado": "bg-teal-100 text-teal-700", "Regularização recusada": "bg-red-100 text-red-700" };
  return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${classes[status]}`}>{status}</span>;
}

function MiniDiscipline({ value }: { value: number | null }) {
  const normalized = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const color = normalized >= 90 ? "#10b981" : normalized >= 70 ? "#3b82f6" : normalized >= 40 ? "#f97316" : "#ef4444";
  return <div className="grid h-10 w-10 place-items-center rounded-full p-1" style={{ background: `conic-gradient(${color} ${normalized * 3.6}deg, #f3f4f6 0deg)` }}><div className="grid h-full w-full place-items-center rounded-full bg-white"><span className="text-caption font-bold" style={{ color }}>{value === null ? "—" : `${normalized}%`}</span></div></div>;
}

function MetricCell({ value, muted = false }: { value: number | string | null; muted?: boolean }) {
  return <td className={`px-4 py-3 font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value ?? "—"}</td>;
}

function DisciplineTrendCard({ trend, range, onRange }: { trend: Array<{ date: string; label: string; value: number | null }>; range: 7 | 15 | 30; onRange: (range: 7 | 15 | 30) => void }) {
  const hasData = trend.some((point) => point.value !== null);
  return <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="flex items-center gap-2 text-base font-semibold text-foreground"><TrendingUp size={18} className="text-emerald-600" /> Evolução da Disciplina do Fechamento <HelpTooltip text="Gráfico de evolução percentual da equipe na realização pontual dos fechamentos diários ao longo do período selecionado (7, 15 ou 30 dias)." /></h2><p className="mt-1 text-sm text-muted-foreground">Acompanhe se a equipe está mantendo consistência na prestação de contas diária.</p></div><div className="flex rounded-xl bg-gray-50 p-1">{([7, 15, 30] as const).map((option) => <button key={option} type="button" onClick={() => onRange(option)} className={`rounded-lg px-3 py-2 text-xs font-medium ${range === option ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:bg-white"}`}>{option} dias</button>)}</div></div><div className="mt-4 h-[236px]">{hasData ? <ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 18, right: 12, bottom: 0, left: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="label" axisLine={{ stroke: "#e5e7eb" }} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} /><YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: "#9ca3af" }} width={42} /><Line type="monotone" dataKey="value" connectNulls stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5, fill: "#10b981", strokeWidth: 0 }} /></LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">Ainda não há histórico de disciplina no período selecionado.</div>}</div><p className="mt-3 text-center text-xs italic text-muted-foreground">O dia atual pode aparecer como parcial enquanto houver fechamentos pendentes ou regularizações em aberto.</p></section>;
}

function ComparisonRow({ label, value, tone }: { label: string; value: number | null; tone: "team" | "network" | "top" }) {
  const color = tone === "team" ? "bg-emerald-500" : tone === "top" ? "bg-emerald-700" : "bg-slate-400";
  return <div className="grid grid-cols-[150px_1fr] items-center gap-3"><span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">{tone === "top" && <Trophy size={14} />}{label}</span><div className="relative h-6 overflow-hidden rounded-full bg-gray-100"><div className={`flex h-full items-center justify-end rounded-full pr-2 text-xs font-semibold text-white ${color}`} style={{ width: `${value || 0}%` }}>{value === null ? "" : `${value}%`}</div>{value === null && <span className="absolute inset-y-0 right-2 grid place-items-center text-xs font-medium text-muted-foreground">—</span>}</div></div>;
}

function SummaryGroup({ label, icon: Icon, tone, items }: { label: string; icon: typeof Store; tone: "blue" | "emerald" | "purple" | "amber" | "slate"; items: Array<[string, number | string]> }) {
  const iconTone = { blue: "bg-blue-50 text-blue-600", emerald: "bg-emerald-50 text-emerald-600", purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600", slate: "bg-slate-50 text-muted-foreground" }[tone];
  return <div className="min-h-[88px] rounded-xl bg-gray-50 p-3"><h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${iconTone}`}><Icon size={15} /></span>{label}</h3>{items.map(([item, value]) => <div key={item} className="mt-2 flex justify-between gap-2 text-xs"><span className="text-muted-foreground">{item}</span><strong className="text-foreground">{value}</strong></div>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-[148px] place-items-center p-8 text-center"><p className="text-sm font-medium text-muted-foreground">{text}</p></div>;
}

function ManagerClosingSkeleton() {
  return <PageCanvas as="div" width="dashboard" bottomClearance="actions" className="flex flex-col gap-5" aria-busy="true"><Skeleton className="h-36" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[164px]" />)}</div><Skeleton className="h-[420px]" /></PageCanvas>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] || ""}` : parts[0]?.[0] || "?";
}
