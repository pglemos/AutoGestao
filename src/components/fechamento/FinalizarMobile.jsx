import React, { useMemo, useState } from "react";
import { Lock, CheckCircle, AlertTriangle, Clock, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import moment from "moment";

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

function isD1WindowOpen(closingDate) {
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
  const now = nowBrasilia();
  const nowDateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  if (nowDateStr < d1Date) return true;
  if (nowDateStr > d1Date) return false;
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  return h * 60 + m < 9 * 60 + 31;
}

function calcDisciplineScore({ clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado }) {
  const totalPlanejado = agendamentosD1Carteira + agendamentosD1Internet;
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
  const hasBasicData = totalLeads > 0 || totalAtend > 0 || agendamentosD1Carteira > 0 || agendamentosD1Internet > 0;
  const baseScore = hasBasicData ? 70 : 40;

  const isAtivoD1 = (c) => {
    if (c.sale_status !== "Em Negociação") return false;
    if (c.channel !== "Carteira" && c.channel !== "Internet") return false;
    if (!c.appointment_datetime || c.d1_excluido === true) return false;
    return moment(c.appointment_datetime).format("YYYY-MM-DD") === d1Date;
  };

  const ativosCarteira = clients.filter(c => c.channel === "Carteira" && isAtivoD1(c)).length;
  const ativosInternet = clients.filter(c => c.channel === "Internet" && isAtivoD1(c)).length;

  // PRD: se totalPlanejado === 0, disciplina máxima = 70%
  if (totalPlanejado === 0) {
    const scoreBase = hasBasicData ? 70 : 40;
    return penalizado ? Math.max(0, scoreBase - 10) : scoreBase;
  }

  const creditos = Math.min(ativosCarteira, agendamentosD1Carteira) + Math.min(ativosInternet, agendamentosD1Internet);
  const pontosExtras = Math.round(30 * (creditos / totalPlanejado));
  const scoreBase = Math.min(100, baseScore + pontosExtras);
  return penalizado ? Math.max(0, scoreBase - 10) : scoreBase;
}

export default function FinalizarMobile({
  clients = [], agendamentosD1Carteira = 0, agendamentosD1Internet = 0,
  closingDate, totalLeads = 0, totalAtend = 0, penalizado = false,
  liberado = false, dailyClose, onDailyCloseUpdate,
}) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);

  const closingStatus = useMemo(() => checkClosingStatus(closingDate), [closingDate]);
  const jaFinalizado = dailyClose?.finalizado === true;
  const d1WindowOpen = jaFinalizado && isD1WindowOpen(closingDate) && dailyClose?.ajustes_d1_permitidos !== false;
  const d1Bloqueado = jaFinalizado && !d1WindowOpen;
  const isBlocked = closingStatus.status === "blocked" && !liberado;

  const dataExibicao = moment(closingDate).format("DD/MM/YYYY");
  const d1DateExibicao = moment(closingDate).add(1, "day").format("DD/MM/YYYY");

  const disciplineScore = useMemo(() =>
    calcDisciplineScore({ clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado }),
    [clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado]
  );

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
      const link = `${window.location.origin}/liberacao-fechamento?id=${solicitacao.id}`;
      const dataFormatada = moment(closingDate).format("DD/MM/YYYY");
      const msg = encodeURIComponent(
        `Olá, preciso de liberação para realizar meu Fechamento Diário com atraso.\n\nVendedor: ${me.full_name}\nData: ${dataFormatada}\n\nAcesse: ${link}`
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
      setSolicitacaoEnviada(true);
    } catch (e) { console.error(e); }
    setEnviando(false);
  };

  const handleConfirmarFechamento = async () => {
    setFinalizando(true);
    try {
      const me = await base44.auth.me();
      const agora = new Date().toISOString();
      const d1WindowAberta = isD1WindowOpen(closingDate);
      const abrirJanelaD1 = d1WindowAberta && !liberado;
      const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
      const limiteAjuste = `${d1Date}T09:30:59`;

      const d1Clients = clients.filter(c => {
        if (c.sale_status !== "Em Negociação") return false;
        if (c.channel !== "Carteira" && c.channel !== "Internet") return false;
        if (!c.appointment_datetime) return false;
        return moment(c.appointment_datetime).format("YYYY-MM-DD") === d1Date;
      });

      const agendaSnapshot = JSON.stringify({
        vendedor_id: me.id, vendedor_nome: me.full_name, data_agenda: d1Date,
        total_informado: agendamentosD1Carteira + agendamentosD1Internet,
        total_detalhado: d1Clients.length,
        quantidade_carteira: d1Clients.filter(c => c.channel === "Carteira").length,
        quantidade_internet: d1Clients.filter(c => c.channel === "Internet").length,
        clientes: d1Clients.map(c => ({ id: c.id, nome: c.name, horario: c.appointment_datetime, veiculo: c.vehicle_sought, canal: c.channel })),
        consolidado_em: agora, provisorio: abrirJanelaD1,
      });

      const patch = {
        finalizado: true, data_hora_finalizacao: agora,
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
    } catch (e) { console.error(e); }
    setFinalizando(false);
    setConfirmModalOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
      {/* Avisos */}
      {isBlocked && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-body-sm font-semibold text-[#EF4444] leading-snug">
              Prazo encerrado às 09h30. Solicite liberação ao seu gerente.
            </p>
            {solicitacaoEnviada ? (
              <p className="text-[12px] text-[#22C55E] font-semibold mt-2">✓ Solicitação enviada ao gerente.</p>
            ) : (
              <button
                onClick={handleAvisarGerente}
                disabled={enviando}
                className="mt-2 flex items-center gap-1.5 text-body-sm font-bold text-white bg-[#25D366] hover:bg-green-600 disabled:opacity-60 px-4 py-2 rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {enviando ? "Enviando..." : "Avisar gerente no WhatsApp"}
              </button>
            )}
          </div>
        </div>
      )}

      {liberado && !jaFinalizado && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
          <p className="text-[12px] font-semibold text-[#92400E]">
            Fechamento liberado pelo gerente. Ao finalizar, será aplicada penalização de 10% por atraso.
          </p>
        </div>
      )}

      {jaFinalizado && d1WindowOpen && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-[#005BFF] flex-shrink-0" />
          <p className="text-[12px] font-semibold text-[#1e3a5f]">
            Fechamento concluído. Os Agendamentos D+1 podem ser ajustados até 09h30 de {d1DateExibicao}.
          </p>
        </div>
      )}

      {jaFinalizado && d1Bloqueado && (
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <p className="text-[12px] font-semibold text-slate-500">
            Fechamento de {dataExibicao} encerrado e consolidado.
          </p>
        </div>
      )}

      {/* Botão principal */}
      {!jaFinalizado ? (
        <div className="space-y-3">
          <button
            onClick={() => setConfirmModalOpen(true)}
            disabled={isBlocked}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-body tracking-widest uppercase transition-all active:scale-[0.98] disabled:cursor-not-allowed shadow-md
              ${isBlocked
                ? "bg-[#EF4444] shadow-red-200 opacity-70"
                : "bg-[#22C55E] hover:bg-green-600 shadow-green-200"
              }`}
          >
            <Lock className="w-5 h-5" />
            Finalizar Fechamento do Dia
          </button>
          {!isBlocked && (
            <p className="text-[12px] text-slate-400 text-center leading-relaxed">
              Após finalizar, as informações serão enviadas para sua liderança e{" "}
              <strong className="text-slate-500">não poderão mais ser editadas</strong>.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 text-[14px] font-semibold text-[#22C55E]">
          <CheckCircle className="w-5 h-5" />
          Fechamento de {dataExibicao} finalizado às {moment(dailyClose?.data_hora_finalizacao).format("HH:mm")}.
        </div>
      )}

      {/* Modal de confirmação */}
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
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
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