import React, { useMemo, useState } from "react";
import { Info, Lock, AlertTriangle, CheckCircle, MessageCircle, Clock } from "lucide-react";
import DisciplineRing from "@/components/fechamento/DisciplineRing";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DisciplinaModal from "@/components/fechamento/DisciplinaModal";
import { ModalMaisVendasQueAtendimentos, detectarDivergencias } from "@/components/fechamento/CoerenciaVendaModal";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment/min/moment-with-locales";

moment.locale("pt-br");

// ── Discipline calculation ────────────────────────────────────────────────────
// Após finalização, usa planejados (fotografia) vs ativos (registros reais) por canal.
// Fórmula: 70% base + até 30% por detalhamento = MIN(ativos,planejados)/totalPlanejado * 30

function calcDiscipline({ clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado }) {
  const totalPlanejado = agendamentosD1Carteira + agendamentosD1Internet;
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");

  const hasBasicData = totalLeads > 0 || totalAtend > 0 || agendamentosD1Carteira > 0 || agendamentosD1Internet > 0;
  // Base sempre 70% se preencheu dados; 40% se não preencheu nada
  const baseScore = hasBasicData ? 70 : 40;

  // Agendamentos D+1 válidos: Em Negociação + canal Carteira/Internet + data = D+1 + não excluído
  const isAtivoD1 = (c) => {
    if (c.sale_status !== "Em Negociação") return false;
    if (c.channel !== "Carteira" && c.channel !== "Internet") return false;
    if (!c.appointment_datetime) return false;
    if (c.d1_excluido === true) return false;
    return moment(c.appointment_datetime).format("YYYY-MM-DD") === d1Date;
  };

  const ativosCarteira = clients.filter(c => c.channel === "Carteira" && isAtivoD1(c)).length;
  const ativosInternet = clients.filter(c => c.channel === "Internet" && isAtivoD1(c)).length;
  const totalAtivos = ativosCarteira + ativosInternet;

  // PRD: se totalPlanejado === 0, disciplina máxima = 70% (não ganha os 30% extras)
  if (totalPlanejado === 0) {
    const scoreBase = hasBasicData ? 70 : 40;
    const score = penalizado ? Math.max(0, scoreBase - 10) : scoreBase;
    return {
      score,
      message: penalizado
        ? "Fechamento realizado fora do prazo. Penalização de 10% aplicada."
        : hasBasicData
          ? "Fechamento completo. Nenhum agendamento D+1 informado — máximo de 70%."
          : "Preencha os números do fechamento para iniciar a pontuação.",
      creditos: totalAtivos,
      totalD1: 0,
      planejados: 0,
      penalizado,
    };
  }

  // Créditos por canal: MIN(ativos, planejados) por canal — PRD seção 9.2
  const creditosCarteira = Math.min(ativosCarteira, agendamentosD1Carteira);
  const creditosInternet = Math.min(ativosInternet, agendamentosD1Internet);
  const totalCreditos = creditosCarteira + creditosInternet;

  const pontosExtras = Math.round(30 * (totalCreditos / totalPlanejado));
  const scoreBase = Math.min(100, baseScore + pontosExtras);
  const score = penalizado ? Math.max(0, scoreBase - 10) : scoreBase;

  const message = penalizado
    ? "Fechamento realizado fora do prazo. Penalização de 10% aplicada."
    : score >= 100
      ? "Fechamento completo. Todos os agendamentos D+1 foram detalhados corretamente."
      : score > 70
        ? `Cadastre mais agendamentos D+1 para aumentar sua pontuação (${totalCreditos}/${totalPlanejado} detalhados).`
        : "Você informou agendamentos D+1 mas não os cadastrou. Cadastre para ganhar até +30%.";

  return { score, message, creditos: totalCreditos, totalD1: totalPlanejado, planejados: totalPlanejado, penalizado };
}

// ── Horário Brasília (America/Sao_Paulo) ──────────────────────────────────────

function nowBrasilia() {
  const utc = new Date();
  return new Date(utc.getTime() + (-3 * 60 * 60 * 1000));
}

function checkClosingStatus(closingDate) {
  const now = nowBrasilia();
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const yesterdayStr = moment(todayStr).subtract(1, "day").format("YYYY-MM-DD");

  if (closingDate === todayStr) return { status: "open" };
  if (closingDate !== yesterdayStr) return { status: "open" };

  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const totalMin = h * 60 + m;

  if (totalMin <= 9 * 60 + 30) return { status: "open" };
  if (totalMin <= 12 * 60) return { status: "blocked" };
  return { status: "expired" };
}

// Calcula se a janela de ajuste D+1 ainda está aberta (antes de 09h31 do dia D+1)
function isD1WindowOpen(closingDate) {
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
  const now = nowBrasilia();
  const nowDateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  if (nowDateStr < d1Date) return true;  // ainda não chegou o dia D+1
  if (nowDateStr > d1Date) return false; // já passou o dia D+1

  // Estamos no dia D+1 — verificar se é antes de 09h31
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const totalMin = h * 60 + m;
  return totalMin < 9 * 60 + 31; // antes de 09h31
}

// ── Sub-components ────────────────────────────────────────────────────────────



const StatItem = ({ value, label, color }) => (
  <div className="flex flex-col items-center gap-1.5 flex-1">
    <span className={`font-bold leading-none tabular-nums text-h2 ${color}`}>{value}</span>
    <span className="text-caption text-[#64748B] text-center leading-tight font-medium">{label}</span>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BottomSection({
  totalLeads, totalAtend, totalAgend, totalVendas, totalFaturamento,
  totalGarantias = 0, totalQualificados = 0,
  clients = [], agendamentosD1Carteira = 0, agendamentosD1Internet = 0,
  closingDate, penalizado = false, liberado = false,
  dailyClose, onDailyCloseUpdate,
}) {
  const { toast } = useToast();
  // dailyClose necessário para detectar divergências de atendimento por canal
  const faturamentoStr = totalFaturamento > 0
    ? `R$ ${totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "R$ 0";

  const { score: disciplineScore, message: disciplineMsg, creditos, totalD1 } = useMemo(() =>
    calcDiscipline({ clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado }),
    [clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado]
  );

  const agendamentosFuturos = useMemo(() => {
    const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
    return clients.filter(c =>
      c.sale_status === "Em Negociação" &&
      (c.channel === "Carteira" || c.channel === "Internet") &&
      c.appointment_datetime &&
      !c.d1_excluido &&
      moment(c.appointment_datetime).format("YYYY-MM-DD") > d1Date
    ).length;
  }, [clients, closingDate]);

  const closingStatus = useMemo(() => checkClosingStatus(closingDate), [closingDate]);
  const [disciplinaModalOpen, setDisciplinaModalOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [coerenciaFinalModalOpen, setCoerenciaFinalModalOpen] = useState(false);
  const [coerenciaDivergencias, setCoerenciaDivergencias] = useState([]);

  const isBlocked = closingStatus.status === "blocked" && !liberado;
  const isOpen = !isBlocked;

  // Estado derivado do DailyClose
  const jaFinalizado = dailyClose?.finalizado === true;

  // Janela de ajuste D+1: finalizado E dentro do prazo E sem penalização de finalização após 09h30
  const d1WindowOpen = jaFinalizado && isD1WindowOpen(closingDate) && dailyClose?.ajustes_d1_permitidos !== false;

  // D+1 bloqueado se: finalizado E (janela fechou OU não tem permissão)
  const d1Bloqueado = jaFinalizado && !d1WindowOpen;

  const handleAvisarGerente = async () => {
    setEnviando(true);
    try {
      const me = await base44.auth.me();
      const agora = new Date().toISOString();
      const solicitacao = await base44.entities.LiberacaoFechamento.create({
        vendedor_id: me.id,
        vendedor_nome: me.full_name,
        data_fechamento: closingDate,
        data_hora_solicitacao: agora,
        status_solicitacao: "Pendente",
        tipo_solicitacao: "Liberação de Fechamento Diário",
      });

      const appUrl = window.location.origin;
      const link = `${appUrl}/liberacao-fechamento?id=${solicitacao.id}`;
      const dataFormatada = moment(closingDate).format("DD/MM/YYYY");
      const agoraFormatado = moment(agora).format("DD/MM/YYYY [às] HH:mm");
      const msg = encodeURIComponent(
        `Olá, preciso de liberação para realizar meu Fechamento Diário com atraso.\n\n` +
        `Vendedor: ${me.full_name}\n` +
        `Data do fechamento: ${dataFormatada}\n` +
        `Horário da solicitação: ${agoraFormatado}\n` +
        `Motivo: Fechamento não realizado até 09h30.\n\n` +
        `Por favor, acesse o sistema para liberar:\n${link}`
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
      setSolicitacaoEnviada(true);
    } catch (e) {
      console.error(e);
      toast({
        title: "Não foi possível finalizar.",
        description: e?.message || "Tente novamente ou solicite liberação ao gerente.",
        variant: "destructive",
      });
    }
    setEnviando(false);
  };

  const handleFinalizarClick = () => {
    if (jaFinalizado) return;
    // Valida coerência antes de abrir o modal de confirmação
    const divs = detectarDivergencias(clients, dailyClose);
    if (divs.length > 0) {
      setCoerenciaDivergencias(divs);
      setCoerenciaFinalModalOpen(true);
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleConfirmarFechamento = async () => {
    setFinalizando(true);
    try {
      const me = await base44.auth.me();
      const agora = new Date().toISOString();

      // Verifica se a finalização acontece após 09h31 de hoje (para saber se abre janela D+1)
      const d1WindowAberta = isD1WindowOpen(closingDate);

      // Se liberado pelo gerente e está após 09h30, NÃO abre janela de ajuste
      const abrirJanelaD1 = d1WindowAberta && !liberado;

      const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
      const limiteAjuste = `${d1Date}T09:30:59`;

      // Snapshot da agenda D+1 no momento da finalização
      const d1Clients = clients.filter(c => {
        if (c.sale_status !== "Em Negociação") return false;
        if (c.channel !== "Carteira" && c.channel !== "Internet") return false;
        if (!c.appointment_datetime) return false;
        return moment(c.appointment_datetime).format("YYYY-MM-DD") === d1Date;
      });

      const agendaSnapshot = JSON.stringify({
        vendedor_id: me.id,
        vendedor_nome: me.full_name,
        data_agenda: d1Date,
        total_informado: agendamentosD1Carteira + agendamentosD1Internet,
        total_detalhado: d1Clients.length,
        quantidade_carteira: d1Clients.filter(c => c.channel === "Carteira").length,
        quantidade_internet: d1Clients.filter(c => c.channel === "Internet").length,
        clientes: d1Clients.map(c => ({
          id: c.id,
          nome: c.name,
          horario: c.appointment_datetime,
          veiculo: c.vehicle_sought,
          canal: c.channel,
        })),
        consolidado_em: agora,
        provisorio: abrirJanelaD1,
      });

      const patch = {
        finalizado: true,
        data_hora_finalizacao: agora,
        ajustes_d1_permitidos: abrirJanelaD1,
        data_hora_limite_ajuste_d1: abrirJanelaD1 ? limiteAjuste : agora,
        pontuacao_disciplina_provisoria: disciplineScore,
        agenda_d1_consolidada: agendaSnapshot,
      };

      let updated;
      if (dailyClose?.id) {
        updated = await base44.entities.DailyClose.update(dailyClose.id, patch);
      } else {
        updated = await base44.entities.DailyClose.create({ date: closingDate, ...patch });
      }

      onDailyCloseUpdate && onDailyCloseUpdate(updated);
    } catch (e) {
      console.error(e);
    }
    setFinalizando(false);
    setConfirmModalOpen(false);
  };

  const dataExibicao = moment(closingDate).format("DD/MM/YYYY");
  const d1DateExibicao = moment(closingDate).add(1, "day").format("DD/MM/YYYY");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-5">
        {/* Resumo do Dia Anterior */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <p className="text-caption font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">Resumo do Dia Anterior</p>
          <div className="flex items-start gap-2 divide-x divide-border-subtle">
            <StatItem value={totalLeads} label="Leads Recebidos" color="text-[#005BFF]" />
            <div className="flex-1 flex flex-col items-center gap-1.5 pl-2">
              <span className="text-h2 font-bold leading-none tabular-nums text-[#6D28D9]">{totalAtend}</span>
              <span className="text-caption text-[#64748B] text-center leading-tight font-medium">Atendimentos</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5 pl-2">
              <span className="text-h2 font-bold leading-none tabular-nums text-[#F59E0B]">{totalAgend}</span>
              <span className="text-caption text-[#64748B] text-center leading-tight font-medium">Agendamentos D+1</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5 pl-2">
              <span className="text-h2 font-bold leading-none tabular-nums text-[#EF4444]">{totalVendas}</span>
              <span className="text-caption text-[#64748B] text-center leading-tight font-medium">Vendas Realizadas</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
            <span className="text-caption font-bold text-muted-foreground uppercase tracking-[0.12em]">Faturamento</span>
            <span className="text-[20px] font-bold tabular-nums text-[#22C55E]">{faturamentoStr}</span>
          </div>
        </div>

        {/* Disciplina */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-center gap-6">
          <div title="Você cadastrou todos os seus agendamentos. Para a Disciplina do Fechamento, apenas os D+1 são considerados." className="cursor-help">
            <DisciplineRing score={disciplineScore} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Disciplina – Fechamento Diário</p>

            {totalD1 > 0 && (
              <p className="text-caption text-muted-foreground mb-1.5">
                Agendamentos D+1 detalhados: <strong className="text-[#0F172A]">{creditos}</strong> de <strong className="text-[#0F172A]">{totalD1}</strong>
                {d1WindowOpen && <span className="text-[#F59E0B] ml-1">(provisório)</span>}
              </p>
            )}
            {agendamentosFuturos > 0 && (
              <p className="text-caption text-muted-foreground mb-1.5">
                Agendamentos futuros: <strong className="text-[#0F172A]">{agendamentosFuturos}</strong>{" "}
                <span className="text-green-600">✓ Já contabilizado na Qualidade da Carteira</span>
              </p>
            )}

            {disciplineMsg && (
              <div className="flex items-start gap-1.5 mb-3">
                {penalizado ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                ) : disciplineScore >= 100 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0 mt-0.5" />
                ) : null}
                <p className={`text-[12px] leading-relaxed font-medium ${
                  penalizado ? "text-[#EF4444]"
                  : disciplineScore >= 100 ? "text-[#22C55E]"
                  : "text-[#64748B]"
                }`}>
                  {disciplineMsg}
                </p>
              </div>
            )}

            {!penalizado && (
              <div className="text-caption text-muted-foreground mb-2">
                70% base + {disciplineScore - 70 < 0 ? 0 : disciplineScore - 70}% detalhamento
                {totalD1 > 0 && ` (${disciplineScore >= 100 ? 30 : disciplineScore - 70}/30 pontos extras)`}
              </div>
            )}

            <button
              onClick={() => setDisciplinaModalOpen(true)}
              className="text-[12px] text-[#005BFF] font-semibold hover:underline flex items-center gap-1 transition-colors"
            >
              Saiba mais <Info className="w-3 h-3" />
            </button>
          </div>
        </div>

        <DisciplinaModal open={disciplinaModalOpen} onClose={() => setDisciplinaModalOpen(false)} />
      </div>

      {/* Finalizar */}
      <div className="bg-white rounded-2xl border border-border shadow-sm px-6 py-4">
        {/* Aviso de atraso (bloqueado, 09h31–12h00) */}
        {isBlocked && (
          <div className="flex items-start gap-3 bg-status-error-surface border border-status-error/30 rounded-xl px-4 py-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-body-sm font-semibold text-[#EF4444] leading-snug">
                Prazo encerrado às 09h30. Solicite liberação ao seu gerente para finalizar este fechamento.
              </p>
              {solicitacaoEnviada ? (
                <p className="text-[12px] text-[#22C55E] font-semibold mt-2">✓ Solicitação enviada ao gerente.</p>
              ) : (
                <button
                  onClick={handleAvisarGerente}
                  disabled={enviando}
                  className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-white bg-[#25D366] hover:bg-green-600 disabled:opacity-60 px-4 py-1.5 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {enviando ? "Enviando..." : "Avisar gerente no WhatsApp"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Aviso discreto: liberado pelo gerente */}
        {liberado && !jaFinalizado && (
          <div className="flex items-center gap-2 bg-status-warning-surface border border-status-warning/30 rounded-xl px-4 py-2.5 mb-4">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
            <p className="text-[12px] font-semibold text-[#92400E]">
              Fechamento liberado pelo gerente. Ao finalizar, será aplicada penalização de 10% por atraso.
            </p>
          </div>
        )}

        {/* Aviso: fechamento concluído, janela D+1 aberta */}
        {jaFinalizado && d1WindowOpen && (
          <div className="flex items-center gap-2 bg-status-info-surface border border-status-info/30 rounded-xl px-4 py-2.5 mb-4">
            <Clock className="w-4 h-4 text-[#005BFF] flex-shrink-0" />
            <p className="text-[12px] font-semibold text-[#1e3a5f]">
              Fechamento concluído. Os Agendamentos D+1 podem ser ajustados até 09h30 de {d1DateExibicao}.
            </p>
          </div>
        )}

        {/* Aviso: tudo bloqueado */}
        {jaFinalizado && d1Bloqueado && (
          <div className="flex items-center gap-2 bg-slate-50 border border-border rounded-xl px-4 py-2.5 mb-4">
            <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-[12px] font-semibold text-muted-foreground">
              Fechamento de {dataExibicao} encerrado e consolidado.
            </p>
          </div>
        )}

        <div className="flex items-center gap-6">
          {!jaFinalizado ? (
            <>
              <button
                onClick={handleFinalizarClick}
                disabled={isBlocked}
                className={`flex items-center gap-3 transition-all text-white font-bold tracking-widest text-body-sm px-10 h-[52px] rounded-xl shadow-md flex-shrink-0 uppercase active:scale-[0.98] disabled:cursor-not-allowed
                  ${isBlocked
                    ? "bg-[#EF4444] shadow-red-200 opacity-70 cursor-not-allowed"
                    : "bg-[#22C55E] hover:bg-green-600 shadow-green-200"
                  }`}
              >
                <Lock className="w-4 h-4" />
                Finalizar Fechamento do Dia
              </button>
              {!isBlocked && (
                <p className="text-[12px] text-[#64748B] leading-relaxed">
                  Após finalizar, as informações serão enviadas para sua liderança e{" "}
                  <strong className="text-muted-foreground">não poderão mais ser editadas</strong>.
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-body-sm font-semibold text-[#22C55E]">
              <CheckCircle className="w-5 h-5" />
              Fechamento de {dataExibicao} finalizado às {moment(dailyClose?.data_hora_finalizacao).format("HH:mm")}.
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de Coerência Final ── */}
      <ModalMaisVendasQueAtendimentos
        open={coerenciaFinalModalOpen}
        divergencias={coerenciaDivergencias}
        onRevisar={() => setCoerenciaFinalModalOpen(false)}
        onConfirmar={() => { setCoerenciaFinalModalOpen(false); setConfirmModalOpen(true); }}
      />

      {/* ── Modal de Confirmação ── */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] font-bold text-h5 leading-snug">
              Confirma que não haverá mais registros Hoje?
            </DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-[#64748B] leading-relaxed mt-1">
            Ao concluir, leads, atendimentos, vendas e demais informações referentes ao dia{" "}
            <strong className="text-[#0F172A]">{dataExibicao}</strong> serão encerrados e não poderão mais ser alterados.
          </p>
          <p className="text-body-sm text-[#64748B] leading-relaxed mt-2">
            Até 09h30 de {d1DateExibicao}, você poderá corrigir somente as informações de{" "}
            <strong className="text-[#0F172A]">Agendamentos D+1</strong>.
          </p>
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border-subtle">
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="px-5 py-2.5 text-body-sm font-semibold text-[#64748B] border border-[#E5E7EB] rounded-xl hover:bg-slate-50 transition-colors"
            >
              Não, voltar
            </button>
            <button
              onClick={handleConfirmarFechamento}
              disabled={finalizando}
              className="px-6 py-2.5 text-body-sm font-bold text-white bg-[#22C55E] hover:bg-green-600 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-green-100"
            >
              {finalizando ? "Finalizando..." : "Sim, concluir"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
