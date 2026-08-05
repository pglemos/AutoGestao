import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  CalendarDays,
  CalendarClock,
  BarChart3,
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
import { useAuth } from "@/hooks/useAuth";
import { useCheckinsByDateRange } from "@/hooks/useCheckins";
import { useSellersByStore } from "@/hooks/useStores";
import { useCheckinAuditor } from "@/hooks/useCheckinAuditor";
import { useStoreMetaRules } from "@/hooks/useGoals";
import { useNotifications } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { calculateReferenceDate } from "@/hooks/checkins/types";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Modal } from "@/components/organisms/Modal";
import {
  classifyDiscipline,
  classifyAppointmentCoverage,
  getClosingStatus,
} from "@/features/manager/shared/manager-metrics";
import { getDiasInfo } from "@/lib/calculations";
import { AgendaD1Panel } from "@/features/manager/daily-closing/AgendaD1Panel";
import { LeadConferenceModal } from "@/features/manager/daily-closing/LeadConferenceModal";
import { ClosingDetailsModal } from "@/features/manager/daily-closing/ClosingDetailsModal";
import { CorrigirLeadsModal } from "@/features/manager/daily-closing/CorrigirLeadsModal";
import type { buildLeadCorrectionPayload } from "@/features/manager/daily-closing/corrigir-leads";
import { ManagerHomeReturnLink } from "@/features/manager/home/ManagerHomeReturnLink";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import {
  RegularizationsListModal,
  type RegularizationRequest,
} from "@/features/manager/daily-closing/RegularizationsListModal";
import type {
  CheckinCorrectionRequest,
  CheckinWithTotals,
} from "@/types/database";
import { toast } from "@/lib/toast";
import {
  averageDiscipline,
  buildClosingSummary,
  buildDisciplineTrend,
  formatClosingMetric,
  sumNumericMetrics,
} from "./manager-closing-metrics";
import { subscribeToManagerClosingRealtime } from "./manager-closing-realtime";
import {
  resolveHistoryRowState,
  actionsForHistoryRowState,
  latestRequestForCheckin,
  type HistoryRowState,
} from "@/features/checkin/lib/checkin-history-state";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type PendingRequest = CheckinCorrectionRequest & {
  seller?: { name?: string | null; avatar_url?: string | null } | null;
};

export const PENDING_CLOSING_MESSAGE =
  "Seu Fechamento Diário está pendente. Finalize o registro do dia para que a gestão acompanhe corretamente o movimento comercial.";

export default function ManagerDailyClosing() {
  const { storeId, membership } = useAuth();
  const [date, setDate] = useState(calculateReferenceDate);
  const [historyRange, setHistoryRange] = useState<7 | 15 | 30>(7);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  // MX-22.5 (AC-6): todas as solicitações da loja (não só pending), para
  // reconciliar a taxonomia de 7 estados de checkin-history-state.ts (22.3)
  // sem alterar o contrato de `requests` (fila de aprovação, só pending).
  const [storeRequests, setStoreRequests] = useState<CheckinCorrectionRequest[]>([]);
  const [agenda, setAgenda] = useState<{ open: boolean; sellerId?: string }>({
    open: false,
  });
  const [leadConferenceOpen, setLeadConferenceOpen] = useState(false);
  const [regularizationsOpen, setRegularizationsOpen] = useState(false);
  const [regularizationDecision, setRegularizationDecision] = useState<{
    request: RegularizationRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [closingDetail, setClosingDetail] = useState<{
    seller: { id: string; name: string };
    checkin?: CheckinWithTotals;
    status: string;
  } | null>(null);
  const [reminding, setReminding] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  /** Cobrança disparada da linha: restringe o modal àquele vendedor. */
  const [reminderTarget, setReminderTarget] = useState<{ id: string; name: string } | null>(null);
  const [correctingLeads, setCorrectingLeads] = useState(false);
  /** Correção de leads aberta pela linha, sem passar pelo modal de detalhes. */
  const [leadTarget, setLeadTarget] = useState<{ seller: { id: string; name: string }; checkin: CheckinWithTotals } | null>(null);
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
    setRequestError(null);
    try {
      setRequests((await auditor.fetchPendingRequests()) as PendingRequest[]);
    } catch (loadError) {
      setRequests([]);
      setRequestError(
        loadError instanceof Error
          ? loadError.message
          : "Falha ao carregar regularizações.",
      );
    }
  }, [auditor.fetchPendingRequests]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  // MX-22.5 (AC-6): carrega todas as solicitações da loja (pending/approved/
  // rejected) para a reconciliação de taxonomia — independente de `requests`
  // (fila de aprovação, só pending), sem alterar seu contrato existente.
  const loadStoreRequests = useCallback(async () => {
    try {
      setStoreRequests(await auditor.fetchStoreRequests());
    } catch {
      setStoreRequests([]);
    }
  }, [auditor.fetchStoreRequests]);

  useEffect(() => {
    void loadStoreRequests();
  }, [loadStoreRequests]);

  const isViewingToday = date === calculateReferenceDate();
  const rows = useMemo(
    () => getClosingRows(sellers, checkins, requests, storeRequests, date, isViewingToday),
    [sellers, checkins, requests, storeRequests, date, isViewingToday],
  );
  const submitted = rows.filter((row) => row.checkin).length;
  const pending = rows.length - submitted;
  const pendingRows = rows.filter((row) => !row.checkin);
  const reminderRows = reminderTarget
    ? pendingRows.filter(({ seller }) => seller.id === reminderTarget.id)
    : pendingRows;
  const movementState = getMovementState(rows.length, submitted);
  const appointments = checkins.length
    ? checkins.reduce((sum, item) => sum + sumNumericMetrics(item.agd_cart_today, item.agd_net_today), 0)
    : null;
  const appointmentNeed = useMemo(() => {
    const goal = Number(metaRules?.monthly_goal || 0);
    if (!Number.isFinite(goal) || goal <= 0) return null;
    const days = getDiasInfo(date, metaRules?.projection_mode || "calendar");
    if (days.total <= 0) return null;
    const sales = metricHistoryCheckins.reduce(
      (sum, item) => sum + sumNumericMetrics(item.vnd_porta_prev_day, item.vnd_cart_prev_day, item.vnd_net_prev_day),
      0,
    );
    if (sales <= 0) return null;
    const appointmentsInBase = metricHistoryCheckins.reduce(
      (sum, item) => sum + sumNumericMetrics(item.agd_cart_today, item.agd_net_today),
      0,
    );
    const appointmentsPerSale = appointmentsInBase / sales;
    if (!Number.isFinite(appointmentsPerSale) || appointmentsPerSale <= 0) return null;
    return Math.ceil((goal / days.total) * appointmentsPerSale);
  }, [date, metaRules, metricHistoryCheckins]);
  const appointmentStatus = classifyAppointmentCoverage(appointments, appointmentNeed);
  const disciplineValues = checkins
    .map((item) => item.pontuacao_disciplina_final)
    .filter((value): value is number => typeof value === "number");
  const discipline = disciplineValues.length
    ? Math.round(
        disciplineValues.reduce((a, b) => a + b, 0) / disciplineValues.length,
      )
    : null;
  const trend = useMemo(
    () => buildDisciplineTrend(historyCheckins, historyStart, date),
    [historyCheckins, historyStart, date],
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
      loadStoreRequests(),
    ]);
    toast.success("Fechamento da equipe atualizado.");
  }, [loadRequests, refetch, refetchHistory, refetchMetricHistory, refetchSellers]);

  useEffect(() => {
    if (!storeId) return;

    const cleanup = subscribeToManagerClosingRealtime({
      client: {
        channel: (name) => supabase.channel(name),
        removeChannel: (channel) => supabase.removeChannel(channel as Parameters<typeof supabase.removeChannel>[0]),
      },
      storeId,
      onChange: () => {
        if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = setTimeout(() => {
          void Promise.all([
            refetch(),
            refetchHistory(),
            refetchMetricHistory(),
            refetchSellers(),
            loadRequests(),
            loadStoreRequests(),
          ])
            .then(() => setSyncWarning(null))
            .catch(() => setSyncWarning("Falha ao sincronizar automaticamente. Use Atualizar."));
        }, 500);
      },
      onStatus: (status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSyncWarning("Realtime indisponível. Use Atualizar para confirmar os dados.");
          return;
        }
        if (status === "SUBSCRIBED") setSyncWarning(null);
      },
    });

    return () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }
      cleanup();
    };
  }, [loadRequests, refetch, refetchHistory, refetchMetricHistory, refetchSellers, storeId]);

  const remindPending = async () => {
    if (!reminderRows.length) return;
    setReminding(true);
    const results = await Promise.all(
      reminderRows.map(({ seller }) =>
        sendNotification({
          recipient_id: seller.id,
          store_id: storeId || undefined,
          title: "Fechamento Diário pendente",
          message: PENDING_CLOSING_MESSAGE,
          type: "checkin",
          priority: "high",
          link: "/fechamento-diario",
        }),
      ),
    );
    const failures = results.filter((result) => result.error).length;
    if (failures)
      toast.error(`${failures} cobrança(s) não puderam ser registradas.`);
    else
      toast.success(
        `Cobrança enviada para ${reminderRows.length} vendedor(es).`,
      );
    setReminding(false);
    setReminderOpen(false);
    setReminderTarget(null);
  };

  const decide = async (
    request: PendingRequest,
    action: "approve" | "reject",
  ) => {
    const result =
      action === "approve"
        ? await auditor.approveRequest(request)
        : await auditor.rejectRequest(
            request.id,
            "Recusado pelo gerente na central de fechamento.",
          );
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      action === "approve"
        ? "Regularização aprovada."
        : "Regularização recusada.",
    );
    await Promise.all([loadRequests(), loadStoreRequests(), refetch(), refetchHistory()]);
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
      return { error: solicited.error || "Não foi possível registrar a correção de leads." };
    }
    const applied = await auditor.approveRequest({
      id: solicited.id,
    } as CheckinCorrectionRequest);
    if (applied.error) {
      return { error: applied.error };
    }
    toast.success("Leads corrigidos e auditados.");
    setCorrectingLeads(false);
    setClosingDetail(null);
    await Promise.all([loadRequests(), loadStoreRequests(), refetch(), refetchHistory()]);
    return { error: null };
  };

  if (sellersLoading || checkinsLoading) return <ManagerClosingSkeleton />;

  return (
    <div id="page-fechamento-diario" className="min-h-full" aria-label="Fechamento Diário">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 pb-20">
        <ManagerHomeReturnLink />
        <section className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Fechamento Diário
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Acompanhe o movimento comercial informado pelos vendedores,
                regularize fechamentos fora do horário e corrija volumes
                oficiais de leads.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Data">
                <input
                  id="manager-closing-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-10 border border-gray-200 rounded-[12px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Unidade">
                <select
                  aria-label="Unidade"
                  value={storeId || ""}
                  onChange={() => undefined}
                  className="border border-gray-200 rounded-[12px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                >
                  <option value={storeId || ""}>
                    {membership?.store?.name || "Unidade atual"}
                  </option>
                </select>
              </Field>
              <button
                type="button"
                className="inline-flex h-[38px] items-center gap-1 rounded-[12px] bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                onClick={refreshAll}
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            </div>
          </div>
        </section>

        {(error || requestError) && (
          <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error ||
                `Não foi possível carregar as regularizações: ${requestError}`}{" "}
              Use Atualizar para tentar novamente.
          </div>
        )}

        {syncWarning && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            {syncWarning}
          </p>
        )}

        <section
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          aria-label="Resumo do fechamento"
        >
          <SummaryCard
            title="Agendamentos"
            value={formatClosingMetric(appointments, appointments !== null)}
            detail="agendamentos gerados hoje"
            icon={CalendarDays}
            tone={
              appointmentStatus === "Bom" || appointmentStatus === "Excelente"
                ? "success"
                : appointmentStatus === "Regular"
                  ? "warning"
                  : appointmentStatus === "Ruim"
                    ? "danger"
                    : "neutral"
            }
            status={appointmentStatus || "—"}
            help="Total de agendamentos confirmados gerados pela equipe hoje. A classificação (ruim/regular/bom) compara com a necessidade de vendas do dia."
            action="Ver Agenda D+1"
            onAction={() => setAgenda({ open: true })}
          />
          <SummaryCard
            title="Pendentes Hoje"
            value={pending}
            detail="fechamentos pendentes do dia"
            icon={Clock3}
            tone="warning"
            status="—"
            help="Vendedores que ainda não enviaram o fechamento do dia. Após o prazo limite, viram pendências com prioridade de cobrança."
            action="Cobrar Pendentes"
            actionDisabled={!pendingRows.length || reminding}
            onAction={() => { setReminderTarget(null); setReminderOpen(true); }}
          />
          <SummaryCard
            title="Regularizações"
            value={requests.length}
            detail={
              requests.length ? "aguardando aprovação" : "nenhuma pendência"
            }
            icon={ShieldCheck}
            tone="info"
            status="—"
            help="Fechamentos enviados fora do prazo que aguardam sua aprovação. Aprovados contam como regularizados; recusados viram pendência."
            action="Ver Regularizações"
            actionDisabled={!requests.length}
            onAction={() =>
              setRegularizationsOpen(true)
            }
          />
          <DisciplineCard value={discipline} />
        </section>

        <section className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
          <div id="manager-closing-movement" />
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-gray-800">
              Movimento da Equipe — {format(parseISO(date), "dd/MM/yyyy")}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <RefreshCw size={13} />
                Ordenado por entrega (mais recente)
              </span>
              <button
                type="button"
                onClick={() => setLeadConferenceOpen(true)}
                className="inline-flex h-[32px] items-center gap-1.5 rounded-[12px] border border-purple-200 bg-white px-3 text-xs font-medium text-purple-700 hover:bg-purple-50"
              >
                <Wrench size={16} />
                Corrigir Leads
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
              requests={requests}
              onReview={(request, action) => {
                setRegularizationsOpen(false);
                setRegularizationDecision({ request, action });
              }}
              onOpenAgenda={(sellerId) => setAgenda({ open: true, sellerId })}
              onOpenDetails={(detail) => setClosingDetail(detail)}
              onRemind={(seller) => {
                setReminderTarget(seller);
                setReminderOpen(true);
              }}
              onCorrectLeads={(detail) => {
                setLeadTarget(detail);
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

        <section className="rounded-[16px] border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <BarChart3 size={18} className="text-status-success" />
            Comparativo de Disciplina do Fechamento
          </h2>
          <p className="mb-4 mt-0 text-xs text-gray-500">
            Comparação com equipes da rede da consultoria
          </p>
          <div className="space-y-4">
            <ComparisonRow
              label="Sua Equipe"
              value={historicalAverage}
              tone="team"
            />
            <ComparisonRow label="Média da Rede" value={null} tone="network" />
            <ComparisonRow label="Top 25% da Rede" value={null} tone="top" />
          </div>
          <p className="pt-1 text-center text-xs italic text-gray-400">
            Comparativos de rede aparecem quando houver snapshots oficiais
            disponíveis.
          </p>
        </section>

        <section className="rounded-[16px] border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold text-gray-800">
            Resumo do Fechamento
            <HelpTooltip text="Consolidação dos fechamentos do dia: atendimentos, leads e vendas por canal (showroom, carteira, internet). Os leads podem ser corrigidos pelo gerente com registro em auditoria." />
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryGroup
              label="Showroom"
              icon={Store}
              tone="blue"
                items={[["Atendimentos", formatClosingMetric(summary.showroomVisits, summary.showroomVisits !== null)]]}
            />
            <SummaryGroup
              label="Carteira"
              icon={WalletCards}
              tone="emerald"
              items={[
                ["Leads", formatClosingMetric(summary.carteiraLeads, summary.carteiraLeads !== null)],
                ["Atendimentos", formatClosingMetric(summary.carteiraVisits, summary.carteiraVisits !== null)],
              ]}
            />
            <SummaryGroup
              label="Internet"
              icon={Globe2}
              tone="purple"
              items={[
                ["Leads", formatClosingMetric(summary.internetLeads, summary.internetLeads !== null)],
                ["Atendimentos", formatClosingMetric(summary.internetVisits, summary.internetVisits !== null)],
              ]}
            />
            <SummaryGroup
              label="Vendas"
              icon={ShoppingCart}
              tone="emerald"
              items={[["Total", formatClosingMetric(summary.sales, summary.sales !== null)]]}
            />
            <SummaryGroup
              label="Qualificados"
              icon={UserRoundCheck}
              tone="amber"
              items={[["Total", "—"]]}
            />
            <SummaryGroup
              label="Garantia"
              icon={ShieldCheck}
              tone="gray"
              items={[["Total", "—"]]}
            />
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            Os leads podem ser corrigidos pelo gerente com registro em
            auditoria. Demais dados permanecem sob responsabilidade do vendedor.
          </p>
        </section>

        <AgendaD1Panel
          open={agenda.open}
          onClose={() => setAgenda({ open: false })}
          referenceDate={date}
          sellers={sellers.map((seller) => ({
            id: seller.id,
            name: seller.name,
          }))}
          initialSellerId={agenda.sellerId}
        />
        <PendingReminderModal
          open={reminderOpen}
          pendingRows={reminderRows}
          reminding={reminding}
          onClose={() => { setReminderOpen(false); setReminderTarget(null); }}
          onConfirm={() => void remindPending()}
        />
        <LeadConferenceModal
          open={leadConferenceOpen}
          onClose={() => setLeadConferenceOpen(false)}
          storeId={storeId}
          storeName={membership?.store?.name || "Unidade atual"}
          referenceDate={date}
          sellers={sellers.map((seller) => ({
            id: seller.id,
            name: seller.name,
          }))}
        />
        <RegularizationsListModal
          open={regularizationsOpen}
          requests={requests as RegularizationRequest[]}
          onClose={() => setRegularizationsOpen(false)}
          onApprove={async (request) => {
            setRegularizationsOpen(false);
            await decide(request as PendingRequest, "approve");
          }}
          onReject={async (request) => {
            setRegularizationsOpen(false);
            await decide(request as PendingRequest, "reject");
          }}
          externalDecision={regularizationDecision}
          onExternalDecisionHandled={() => setRegularizationDecision(null)}
        />
        <ClosingDetailsModal
          open={Boolean(closingDetail)}
          seller={closingDetail?.seller || { id: "", name: "" }}
          checkin={closingDetail?.checkin}
          status={closingDetail?.status || "—"}
          storeName={membership?.store?.name || "—"}
          onClose={() => setClosingDetail(null)}
          onOpenAgenda={closingDetail ? () => {
            setClosingDetail(null);
            setAgenda({ open: true, sellerId: closingDetail.seller.id });
          } : undefined}
          onCorrectLeads={closingDetail?.checkin ? () => setCorrectingLeads(true) : undefined}
        />
        <CorrigirLeadsModal
          open={correctingLeads}
          onClose={() => { setCorrectingLeads(false); setLeadTarget(null); }}
          sellerName={leadTarget?.seller.name || closingDetail?.seller.name || ""}
          checkin={leadTarget?.checkin || closingDetail?.checkin || null}
          onSubmit={handleCorrectLeads}
        />
      </div>
    </div>
  );
}

export function getClosingRows(
  sellers: Array<{ id: string; name: string }>,
  checkins: CheckinWithTotals[],
  requests: PendingRequest[],
  // MX-22.5 (AC-6): parâmetros aditivos — nenhum consumidor existente de
  // `status`/`checkin` muda de comportamento; `historyState`/`historyActions`
  // são campos novos ao lado, reaproveitando a taxonomia de 22.3.
  storeRequests: CheckinCorrectionRequest[] = [],
  date?: string,
  isToday = false,
) {
  const requestsBySeller = new Set(
    requests.map((request) => request.seller_id),
  );
  const checkinBySeller = new Map(
    checkins.map((checkin) => [checkin.seller_user_id, checkin]),
  );
  return sellers.map((seller) => {
    const checkin = checkinBySeller.get(seller.id) ?? null;
    const latestRequest = latestRequestForCheckin(storeRequests, checkin?.id);
    const historyState: HistoryRowState | null = date
      ? resolveHistoryRowState({ date, checkin, latestRequest, now: new Date(), isToday })
      : null;
    return {
      seller,
      checkin: checkin ?? undefined,
      status: getClosingStatus(
        checkin ?? undefined,
        requestsBySeller.has(seller.id),
      ),
      historyState,
      historyActions: historyState ? actionsForHistoryRowState(historyState) : [],
    };
  });
}

export function PendingReminderModal({
  open,
  pendingRows,
  reminding,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pendingRows: ReturnType<typeof getClosingRows>;
  reminding: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const footer = (
    <div className="flex w-full gap-2">
      <button type="button" onClick={onClose} className="h-9 flex-1 rounded-[12px] border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Cancelar
      </button>
      <button
        type="button"
        className="h-9 flex-1 rounded-[12px] bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
        disabled={reminding}
        onClick={onConfirm}
      >
        {reminding ? "Enviando…" : "Confirmar Cobrança"}
      </button>
    </div>
  );
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      referenceStyle
      title="Cobrar Fechamentos Pendentes"
      description={`${pendingRows.length} vendedor(es) pendente(s)`}
      footer={footer}
    >
      <div className="space-y-4">
        {pendingRows.length > 1 && <div className="rounded-[12px] bg-gray-50 p-3">
          <p className="mb-2 text-xs text-gray-500">
            Vendedores que serão cobrados:
          </p>
          <ul className="space-y-1">
            {pendingRows.map(({ seller }) => (
              <li
                key={seller.id}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <Megaphone size={14} className="text-amber-500" />
                {seller.name}
              </li>
            ))}
          </ul>
        </div>}
        <div className="rounded-[12px] border border-amber-100 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-medium text-amber-700">
            Mensagem padrão enviada:
          </p>
          <p className="text-sm italic text-gray-700">
            "{PENDING_CLOSING_MESSAGE}"
          </p>
        </div>
      </div>
    </Modal>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-normal text-gray-500">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  status,
  help,
  action,
  actionDisabled,
  onAction,
}: {
  title: string;
  value: number | string;
  detail: string;
  icon: typeof CalendarDays;
  tone: "warning" | "danger" | "success" | "info" | "neutral";
  status: string;
  help?: string;
  action: string;
  actionDisabled?: boolean;
  onAction: () => void;
}) {
  const colors = {
    warning: "border-amber-200 bg-amber-50 text-amber-600",
    danger: "border-red-200 bg-red-50 text-red-600",
    success: "border-emerald-300 bg-emerald-100 text-emerald-700",
    info: "border-blue-200 bg-blue-50 text-blue-600",
    neutral: "border-gray-100 bg-white text-gray-400",
  }[tone];
  const actionColor =
    tone === "danger" || tone === "success"
      ? "border-emerald-200 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 text-amber-700"
        : tone === "info"
          ? "border-blue-200 text-blue-600"
          : "border-gray-200 text-gray-500";
  const valueColor = {
    warning: "text-amber-700",
    danger: "text-red-700",
    success: "text-emerald-800",
    info: "text-blue-700",
    neutral: "text-gray-800",
  }[tone];
  return (
    <div className={`min-h-[164px] rounded-[16px] border shadow-sm p-3 ${colors}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <Icon size={16} className="shrink-0" />
          {title}
          <HelpTooltip text={help} />
        </h2>
        {status !== "—" ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            status === "Excelente" || status === "Bom"
              ? "bg-emerald-100 text-emerald-700"
              : status === "Regular"
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
          }`}>
            {status}
          </span>
        ) : <span className="px-2.5 py-1 rounded-full text-xs font-semibold opacity-0">—</span>}
      </div>
      <strong className={`text-3xl font-bold ${valueColor}`}>{value}</strong>
      <p className="mt-0.5 text-xs text-gray-500">{detail}</p>
      <button
        type="button"
        disabled={actionDisabled}
        onClick={onAction}
        className={`mt-3 flex h-[30px] w-full items-center justify-center gap-1.5 rounded-[8px] border bg-white px-2 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${actionColor}`}
      >
        {action === "Ver Agenda D+1" && <CalendarClock size={13} />}
        {action === "Cobrar Pendentes" && <Megaphone size={13} />}
        {action === "Ver Regularizações" && <Eye size={13} />}
        {action}
      </button>
    </div>
  );
}

function DisciplineCard({ value }: { value: number | null }) {
  const normalized = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const label = value === null ? "Sem dados oficiais" : classifyDiscipline(value)
    .split(" ")
    .map((word) => word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1))
    .join(" ");
  // O Base44 pinta o card inteiro conforme a faixa da disciplina, em vez de
  // deixar tudo azul. As faixas seguem as do MX (classifyDiscipline).
  const palette = value === null
    ? { surface: "bg-gray-50", badge: "bg-gray-100 text-gray-500", glow: "from-gray-300 to-gray-400", ring: "rgb(148 163 184)", track: "rgb(241 245 249)", inner: "bg-gray-50", text: "text-gray-400" }
    : label === "Excelente"
      ? { surface: "bg-emerald-50", badge: "bg-emerald-600 text-white", glow: "from-emerald-400 to-emerald-500", ring: "rgb(16 185 129)", track: "rgb(209 250 229)", inner: "bg-emerald-50", text: "text-emerald-600" }
      : label === "Boa"
        ? { surface: "bg-blue-50", badge: "bg-blue-100 text-blue-700", glow: "from-blue-400 to-blue-500", ring: "rgb(59 130 246)", track: "rgb(219 234 254)", inner: "bg-blue-50", text: "text-blue-500" }
        : label === "Baixa"
          ? { surface: "bg-amber-50", badge: "bg-amber-100 text-amber-700", glow: "from-amber-400 to-amber-500", ring: "rgb(245 158 11)", track: "rgb(254 243 199)", inner: "bg-amber-50", text: "text-amber-600" }
          : { surface: "bg-red-50", badge: "bg-red-100 text-red-700", glow: "from-red-400 to-red-500", ring: "rgb(239 68 68)", track: "rgb(254 226 226)", inner: "bg-red-50", text: "text-red-600" };
  return (
    <div className={`flex h-full min-h-[164px] flex-col rounded-[16px] border border-gray-100 p-3 shadow-sm ${palette.surface}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          Disciplina Média
          <HelpTooltip text="Média da pontuação de disciplina da equipe, que combina acesso à rotina, execução dos blocos e fechamento dentro do prazo. Acima de 85% é saudável." />
        </h2>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${palette.badge}`}>
          {label}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="relative">
          <div className={`absolute inset-0 scale-110 rounded-full bg-gradient-to-br opacity-20 blur-lg ${palette.glow}`} />
        <div
          role="progressbar"
          aria-label="Disciplina média da equipe"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={normalized}
          className="relative grid h-[104px] w-[104px] place-items-center rounded-full p-2"
          style={{ background: `conic-gradient(${palette.ring} ${normalized * 3.6}deg, ${palette.track} 0deg)` }}
        >
          <div className={`grid h-full w-full place-items-center rounded-full ${palette.inner}`}>
            <strong className={`text-2xl font-bold ${palette.text}`}>{value === null ? "—" : `${normalized}%`}</strong>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export function ClosingTable({
  rows,
  requests,
  onReview,
  onOpenAgenda,
  onOpenDetails,
  onRemind,
  onCorrectLeads,
}: {
  rows: ReturnType<typeof getClosingRows>;
  requests: PendingRequest[];
  onReview: (
    request: PendingRequest,
    action: "approve" | "reject",
  ) => void;
  onOpenAgenda: (sellerId: string) => void;
  onOpenDetails: (detail: { seller: { id: string; name: string }; checkin?: CheckinWithTotals; status: string }) => void;
  onRemind: (seller: { id: string; name: string }) => void;
  onCorrectLeads: (detail: { seller: { id: string; name: string }; checkin: CheckinWithTotals }) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Vendedor",
              "Status",
              "Entrega",
              "Leads",
              "Qualif.",
              "Agend.",
              "Atendi.",
              "Venda",
              "Disc.",
              "Ações",
            ].map((label) => (
              <th
                key={label}
                className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ seller, checkin, status }) => (
            <ClosingRow
              key={seller.id}
              name={seller.name}
              checkin={checkin}
              status={status}
              request={requests.find(
                (request) => request.seller_id === seller.id,
              )}
              onReview={onReview}
              onOpenAgenda={() => onOpenAgenda(seller.id)}
              onOpenDetails={() => onOpenDetails({ seller, checkin, status })}
              onRemind={() => onRemind(seller)}
              onCorrectLeads={checkin ? () => onCorrectLeads({ seller, checkin }) : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DisciplineTrendCard({
  trend,
  range,
  onRange,
}: {
  trend: Array<{ date: string; label: string; value: number | null }>;
  range: 7 | 15 | 30;
  onRange: (range: 7 | 15 | 30) => void;
}) {
  const hasData = trend.some((point) => point.value !== null);
  return (
    <section className="rounded-[16px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <TrendingUp size={18} className="text-emerald-600" />
            Evolução da Disciplina do Fechamento
          </h2>
          <p className="text-xs text-gray-500">
            Acompanhe se a equipe está mantendo consistência na prestação de
            contas diária.
          </p>
        </div>
        <div className="self-start rounded-xl bg-gray-100 p-1 sm:self-auto">
          {([7, 15, 30] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onRange(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${range === option ? "bg-emerald-600 text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              {option} dias
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 h-[280px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trend}
              margin={{ top: 18, right: 12, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--color-border-subtle)"
              />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: "var(--color-border-subtle)" }}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                width={42}
              />
              <Line
                type="monotone"
                dataKey="value"
                connectNulls
                  stroke="oklch(0.627 0.194 149.214)"
                strokeWidth={2.5}
                dot={{
                  r: 3.5,
                    fill: "oklch(0.627 0.194 149.214)",
                  strokeWidth: 0,
                }}
                label={{
                  position: "top",
                  formatter: (value) =>
                    typeof value === 'number' ? `${value}%` : '',
                  fontSize: 10,
                    fill: "oklch(0.627 0.194 149.214)",
                  fontWeight: 700,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-center text-sm text-gray-500">
            Ainda não há histórico de disciplina no período selecionado.
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs italic text-gray-400">
        O dia atual pode aparecer como parcial enquanto houver fechamentos
        pendentes ou regularizações em aberto.
      </p>
    </section>
  );
}

function ComparisonRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "team" | "network" | "top";
}) {
  const color =
    tone === "team"
      ? "bg-emerald-500"
      : tone === "top"
        ? "bg-emerald-700"
        : "bg-gray-400";
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-40 shrink-0 items-center gap-2 text-sm text-gray-600">
        {tone === "top" && <Trophy size={14} />}
        {label}
      </span>
      <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`flex h-full items-center justify-end rounded-full pr-2 text-xs font-bold text-white ${color}`}
          style={{ width: `${value || 0}%` }}
        >
          {value === null ? "" : `${value}%`}
        </div>
        {value === null && (
          <span className="absolute inset-y-0 right-2 grid place-items-center text-xs font-bold text-gray-400">
            —
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryGroup({
  label,
  icon: Icon,
  tone,
  items,
}: {
  label: string;
  icon: typeof Store;
  tone: "blue" | "emerald" | "purple" | "amber" | "gray";
  items: Array<[string, number | string]>;
}) {
  const iconTone = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    gray: "bg-gray-50 text-gray-600",
  }[tone];
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${iconTone}`}
        >
          <Icon size={14} />
        </span>
        {label}
      </h3>
      {items.map(([item, value]) => (
        <div key={item} className="mb-0.5 flex justify-between text-xs">
          <span className="text-gray-500">{item}</span>
          <strong className="text-gray-800">{value}</strong>
        </div>
      ))}
    </div>
  );
}

function DisciplineRing({ value }: { value: number | null | undefined }) {
  if (typeof value !== "number") return <span className="text-gray-400">—</span>;
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  const color = normalized < 70 ? "rgb(249 115 22)" : normalized < 90 ? "rgb(59 130 246)" : "rgb(16 185 129)";
  return <span className="grid h-11 w-11 place-items-center rounded-full p-1 text-[11px] font-bold" style={{ background: `conic-gradient(${color} ${normalized * 3.6}deg, rgb(241 245 249) 0deg)`, color }}><span className="grid h-full w-full place-items-center rounded-full bg-white">{normalized}%</span></span>;
}

function ClosingRow({
  name,
  checkin,
  status,
  request,
  onReview,
  onOpenAgenda,
  onOpenDetails,
  onRemind,
  onCorrectLeads,
}: {
  name: string;
  checkin?: CheckinWithTotals;
  status: string;
  request?: PendingRequest;
  onReview: (
    request: PendingRequest,
    action: "approve" | "reject",
  ) => void;
  onOpenAgenda: () => void;
  onOpenDetails: () => void;
  onRemind: () => void;
  onCorrectLeads?: () => void;
}) {
  const appointments = checkin
    ? sumNumericMetrics(checkin.agd_cart_today, checkin.agd_net_today)
    : null;
  const sales = checkin
    ? sumNumericMetrics(checkin.vnd_porta_prev_day, checkin.vnd_cart_prev_day, checkin.vnd_net_prev_day)
    : null;
  const visits = checkin ? sumNumericMetrics(checkin.visit_prev_day) : null;
  const discipline = checkin?.pontuacao_disciplina_final;
  return (
    <tr className="h-[66px] bg-white">
      <td className="px-4 py-3">
        <span className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{initials(name)}</span><span className="font-medium text-gray-800">{name}</span></span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex w-fit whitespace-nowrap rounded-[8px] px-2 py-1 text-xs font-medium ${status === "Finalizado" ? "bg-emerald-100 text-emerald-700" : status === "Pendente" ? "bg-amber-100 text-amber-700" : status === "Fora do horário" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {checkin?.submitted_at
          ? format(parseISO(checkin.submitted_at), "HH:mm")
          : "—"}
      </td>
      <NumberCell
        value={
          checkin ? sumNumericMetrics(checkin.leads_prev_day, checkin.leads_net_prev_day) : null
        }
      />
      <NumberCell value="—" muted />
      <td className="px-4 py-3 font-semibold">
        <button
          type="button"
          className={`underline decoration-dotted underline-offset-2 hover:text-emerald-700 ${appointments === null ? "text-gray-400" : appointments === 0 ? "text-red-600" : appointments === 1 ? "text-orange-500" : "text-emerald-600"}`}
          aria-label={`Abrir Agenda D+1 de ${name}`}
          onClick={onOpenAgenda}
        >
          {appointments === null ? "—" : appointments}
        </button>
      </td>
      <NumberCell value={visits} />
      <NumberCell value={sales} />
      <td className="px-4 py-3">
        <DisciplineRing value={discipline} />
      </td>
      <td className="px-4 py-3">
        <div className="flex min-w-max flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Detalhes ${name}`}
            onClick={onOpenDetails}
          >
            <Eye size={13} /> Detalhes
          </button>
          {/*
            Atalhos por linha do Base44: cobrar quem não entregou, corrigir os
            leads de quem já entregou e decidir a regularização pendente. Sem
            eles, o gerente tinha de sair da linha para agir.
          */}
          {request ? (
            <>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50" onClick={() => onReview(request, "approve")}><Check size={13} /> Aprovar</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50" onClick={() => onReview(request, "reject")}><X size={13} /> Recusar</button>
            </>
          ) : status === "Pendente" ? (
            <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50" aria-label={`Cobrar fechamento de ${name}`} onClick={onRemind}><Megaphone size={13} /> Cobrar</button>
          ) : onCorrectLeads ? (
            <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50" aria-label={`Corrigir leads de ${name}`} onClick={onCorrectLeads}><Wrench size={13} /> Leads</button>
          ) : <span className="text-xs text-gray-500">Somente consulta</span>}
        </div>
      </td>
    </tr>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] || ""}` : parts[0]?.[0] || "?";
}

function NumberCell({ value, muted }: { value: number | string | null; muted?: boolean }) {
  return (
    <td
      className={`px-4 py-3 text-sm ${muted ? "text-gray-400" : "text-gray-700"}`}
    >
      {value}
    </td>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-gray-500">
        {text}
      </p>
    </div>
  );
}
function ManagerClosingSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-6 px-4 pb-20 lg:px-8 lg:pb-0" aria-busy="true" aria-label="Carregando fechamento diário">
      <Skeleton className="h-20" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[420px]" />
    </div>
  );
}
