import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { CalendarDays, History, Bell, AlertTriangle } from "lucide-react";
import moment from "moment/min/moment-with-locales";
import FluxoFechamento from "@/components/fechamento/FluxoFechamento";
import BottomSection from "@/components/fechamento/BottomSection";
import ClientCard from "@/components/fechamento/ClientCard";
import RegularizarFechamentoDrawer from "@/components/fechamento/RegularizarFechamentoDrawer";
import MobileFechamento from "@/components/fechamento/MobileFechamento";

moment.locale("pt-br");

// Retorna hora atual em Brasília (UTC-3)
function nowBrasilia() {
  const utc = new Date();
  return new Date(utc.getTime() + (-3 * 60 * 60 * 1000));
}

// "open" | "blocked" | "expired"  para o dia de ontem
function checkYesterdayStatus() {
  const now = nowBrasilia();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const totalMin = h * 60 + m;
  if (totalMin <= 9 * 60 + 30) return "open";
  if (totalMin <= 12 * 60) return "blocked";
  return "expired";
}

export default function FechamentoDiario() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const now = nowBrasilia();
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const yesterdayStr = moment(todayStr).subtract(1, "day").format("YYYY-MM-DD");

  // Se antes de 12h01, permite trabalhar no fechamento de ontem; após 12h01 usa hoje
  const yesterdayStatus = checkYesterdayStatus();
  const [selectedDate, setSelectedDate] = useState(() => {
    return yesterdayStatus === "expired" ? todayStr : yesterdayStr;
  });

  const closingDate = selectedDate;
  const isWorkingOnYesterday = closingDate === yesterdayStr;

  const [dailyClose, setDailyClose] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [totalGarantiasDia, setTotalGarantiasDia] = useState(0);
  const [totalQualificadosDia, setTotalQualificadosDia] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyClients, setHistoryClients] = useState([]);
  const [historyShowAll, setHistoryShowAll] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [regularizarDate, setRegularizarDate] = useState(null);
  const [historyRegularizacoes, setHistoryRegularizacoes] = useState([]);

  // Verifica se existe liberação para ontem (quando bloqueado)
  const [liberado, setLiberado] = useState(false);

  // Horário Brasília para checar janela D+1
  function nowBrasiliaLocal() {
    const utc = new Date();
    return new Date(utc.getTime() + (-3 * 60 * 60 * 1000));
  }

  function isD1WindowOpenLocal(cd) {
    const d1Date = moment(cd).add(1, "day").format("YYYY-MM-DD");
    const now = nowBrasiliaLocal();
    const nowStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}`;
    if (nowStr < d1Date) return true;
    if (nowStr > d1Date) return false;
    const totalMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    return totalMin < 9 * 60 + 31;
  }

  const loadData = async (targetDate = selectedDate) => {
    setLoading(true);
    const isTargetYesterday = targetDate === yesterdayStr;
    const [closes, lib, me] = await Promise.all([
      base44.entities.DailyClose.filter({ date: targetDate }).catch(() => []),
      isTargetYesterday && yesterdayStatus === "blocked"
        ? base44.entities.LiberacaoFechamento.filter({ data_fechamento: yesterdayStr, status_solicitacao: "Liberado" }).catch(() => [])
        : Promise.resolve([]),
      base44.auth.me().catch(() => null),
    ]);

    const currentClose = closes[0] || null;

    // Se ontem já foi finalizado e o usuário acabou de abrir em yesterdayStr, auto-muda para hoje
    if (targetDate === yesterdayStr && currentClose?.finalizado) {
      const todayCloses = await base44.entities.DailyClose.filter({ date: todayStr }).catch(() => []);
      setSelectedDate(todayStr);
      setDailyClose(todayCloses[0] || null);
      setLiberado(false);
      setCurrentUser(me);
      setLoading(false);
      if (me) {
        const eventos = await base44.entities.EventoComercial.filter({
          vendedor_id: me.id,
          data_evento: todayStr,
        }).catch(() => []);
        setTotalGarantiasDia(eventos.filter(e => e.tipo_evento === "garantia_registrada").length);
        setTotalQualificadosDia(eventos.filter(e => e.tipo_evento === "cliente_qualificado").length);
      }
      return;
    }

    setDailyClose(currentClose);
    setLiberado(lib.length > 0);
    setCurrentUser(me);
    setLoading(false);
    // Carrega contagens de garantias e qualificados do dia via EventoComercial
    if (me) {
      const eventos = await base44.entities.EventoComercial.filter({
        vendedor_id: me.id,
        data_evento: targetDate,
      }).catch(() => []);
      setTotalGarantiasDia(eventos.filter(e => e.tipo_evento === "garantia_registrada").length);
      setTotalQualificadosDia(eventos.filter(e => e.tipo_evento === "cliente_qualificado").length);
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    loadData(newDate);
  };

  const handleDailyCloseUpdate = (updated) => {
    setDailyClose(updated);
    if (updated?.finalizado && selectedDate === yesterdayStr) {
      toast({
        title: "Fechamento de ontem concluído!",
        description: "Alternando automaticamente para o fechamento de hoje.",
      });
      handleDateChange(todayStr);
    }
  };

  // Atualiza contagens em tempo real quando um novo registro é salvo via NovoRegistroModal
  const handleRegistroSalvo = (payload) => {
    if (!payload) return;
    const { tipo } = payload;
    if (tipo === "garantia") setTotalGarantiasDia(n => n + 1);
    if (tipo === "qualificado") setTotalQualificadosDia(n => n + 1);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const startOfMonth = moment(todayStr).startOf("month").format("YYYY-MM-DD");
    const yesterday = yesterdayStr;
    const me = currentUser || await base44.auth.me().catch(() => null);
    const [all, allClientes, regs] = await Promise.all([
      base44.entities.DailyClose.filter({ date: { $gte: startOfMonth, $lte: yesterday } }, "-date", 50).catch(() => []),
      me
        ? base44.entities.CarteiraCliente.filter({ vendedor_id: me.id, ativo: true }).catch(() => [])
        : Promise.resolve([]),
      base44.entities.RegularizacaoFechamento.filter({ data_competencia: { $gte: startOfMonth, $lte: yesterday } }).catch(() => []),
    ]);
    setHistoryRecords(all);
    // Normaliza para formato legado (historyClients é usado para contar vendas por data)
    setHistoryClients(allClientes.map(c => ({
      id: c.id,
      sale_status: c.status_comercial === "Vendido" ? "Sim" : "Não",
      created_date: c.created_date,
      _data_competencia_fechamento: c._data_competencia_fechamento,
    })));
    setHistoryRegularizacoes(regs);
    setHistoryLoading(false);
  };

  useEffect(() => { loadData(); loadHistory(); }, []);

  const openHistory = () => {
    setHistoryOpen(true);
    setHistoryShowAll(false);
    loadHistory();
  };

  const D1_FIELDS = ["agendamentos_carteira", "agendamentos_internet"];

  const setCounter = async (field, newVal) => {
    // Se finalizado: só permite alterar campos D+1 durante a janela de ajuste
    if (jaFinalizado) {
      if (!d1Editavel) return; // bloqueado total
      if (!D1_FIELDS.includes(field)) return; // campo não-D+1 bloqueado
    }
    const safeVal = Math.min(999, Math.max(0, newVal));
    const baseObj = {
      date: closingDate,
      leads_carteira: 0, leads_internet: 0,
      atendimentos_showroom: 0, atendimentos_carteira: 0, atendimentos_internet: 0,
      agendamentos_carteira: 0, agendamentos_internet: 0,
    };
    const current = dailyClose || baseObj;
    const data = { ...current, [field]: safeVal };
    delete data.id; delete data.created_date; delete data.updated_date; delete data.created_by_id;

    try {
      if (dailyClose?.id) {
        const updated = await base44.entities.DailyClose.update(dailyClose.id, { [field]: safeVal });
        setDailyClose(updated);
      } else {
        const created = await base44.entities.DailyClose.create(data);
        setDailyClose(created);
      }
    } catch (err) {
      console.error("[FechamentoDiario] Falha ao salvar contador:", err);
      toast({
        title: "Não foi possível salvar esse valor.",
        description: err?.message || "Tente novamente em alguns segundos.",
        variant: "destructive",
      });
    }
  };

  const updateCounter = (field, delta) => {
    const current = dailyClose || {};
    setCounter(field, (current[field] || 0) + delta);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#005BFF] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Estado de bloqueio derivado ───────────────────────────────────────────
  const jaFinalizado = dailyClose?.finalizado === true;
  const d1WindowOpen = jaFinalizado && isD1WindowOpenLocal(closingDate) && dailyClose?.ajustes_d1_permitidos !== false;
  // bloqueado total: finalizado E janela D+1 encerrada
  const tudo_bloqueado = jaFinalizado && !d1WindowOpen;
  // d1Editavel: finalizado E janela D+1 aberta
  const d1Editavel = jaFinalizado && d1WindowOpen;

  // Função para registrar audit log
  const handleAuditLog = async ({ tipo_alteracao, cliente_id, valor_anterior, valor_novo }) => {
    if (!currentUser || !dailyClose?.id) return;
    base44.entities.D1AuditLog.create({
      usuario_id: currentUser.id,
      usuario_nome: currentUser.full_name,
      fechamento_id: dailyClose.id,
      cliente_id: cliente_id || "",
      data_hora_alteracao: new Date().toISOString(),
      tipo_alteracao,
      valor_anterior: valor_anterior || "",
      valor_novo: valor_novo || "",
    }).catch(() => {});
  };

  const dc = dailyClose || {};
  const totalLeads = (dc.leads_carteira || 0) + (dc.leads_internet || 0);
  const totalAtend = (dc.atendimentos_showroom || 0) + (dc.atendimentos_carteira || 0) + (dc.atendimentos_internet || 0);
  const totalAgend = (dc.agendamentos_carteira || 0) + (dc.agendamentos_internet || 0);
  // totalVendas: apenas registros com status_comercial = Vendido (base CarteiraCliente)
  const totalVendas = clients.filter(c =>
    c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada" || c.sale_status === "Sim"
  ).length;
  // totalFaturamento: soma apenas valor_venda de vendas realizadas (não valor_negociado de agendamentos/qualificados)
  const totalFaturamento = clients
    .filter(c => c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada" || c.sale_status === "Sim")
    .reduce((sum, c) => {
      const raw = c.valor_venda || (c.sale_status === "Sim" ? c.negotiated_value : null);
      if (!raw) return sum;
      const num = parseFloat(String(raw).replace(/[R$\s.]/g, "").replace(",", "."));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  // Contagem de fechamentos pendentes (dias sem fechamento finalizado desde início do mês até ontem)
  const startOfMonthStr = moment(todayStr).startOf("month").format("YYYY-MM-DD");
  const pendenciasCount = (() => {
    const count = [];
    let d = moment(startOfMonthStr);
    while (d.format("YYYY-MM-DD") <= yesterdayStr) {
      count.push(d.format("YYYY-MM-DD"));
      d.add(1, "day");
    }
    // Dias sem DailyClose finalizado
    return count.filter(date => {
      const dc = (historyRecords || []).find(h => h.date === date);
      const reg = (historyRegularizacoes || []).find(r => r.data_competencia === date && r.status_solicitacao === "Aprovada");
      return !dc?.finalizado && !reg;
    }).length;
  })();

  // Datas exibidas no header
  const displayDate = isWorkingOnYesterday ? yesterdayStr : todayStr;
  const displayLabel = isWorkingOnYesterday
    ? `${moment(yesterdayStr).format("DD/MM/YYYY")} (ontem)`
    : moment(todayStr).format("DD/MM/YYYY");
  const displayDow = moment(displayDate).format("dddd");

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-3 font-body sm:p-6">
      {/* ── Topbar ── */}
      <div className="flex min-h-16 w-full flex-col justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Lado esquerdo: título + data + seletor de data */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 flex-wrap">
          <CalendarDays className="h-5 w-5 shrink-0 text-blue-700" />
          <h1 className="text-[18px] sm:text-[22px] font-black text-slate-900 tracking-tight uppercase flex-shrink-0">Fechamento</h1>
          
          {/* Seletor Hoje / Ontem */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleDateChange(todayStr)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedDate === todayStr
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Hoje ({moment(todayStr).format("DD/MM")})</span>
            </button>
            <button
              type="button"
              onClick={() => handleDateChange(yesterdayStr)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedDate === yesterdayStr
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Ontem ({moment(yesterdayStr).format("DD/MM")})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[12px] bg-slate-50 border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-slate-600 capitalize">
            {displayDow}
          </div>
        </div>
        {/* Lado direito: botões */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={openHistory}
            className="relative flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-[#64748B] hover:text-[#005BFF] border border-[#E5E7EB] bg-white hover:border-[#005BFF] rounded-xl px-2.5 sm:px-4 py-2 transition-all"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico de Fechamentos</span>
            <span className="sm:hidden text-[11px]">Histórico</span>
            {/* Badge de pendências — apenas mobile */}
            {pendenciasCount > 0 && (
              <span className="sm:hidden absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#EF4444] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                {pendenciasCount}
              </span>
            )}
          </button>
          {/* Sino — apenas desktop */}
          <button
            type="button"
            onClick={() => navigate("/notificacoes")}
            aria-label="Abrir notificações"
            className="relative hidden sm:flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Bell className="w-5 h-5 text-[#64748B]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#EF4444] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4 pt-4 sm:space-y-5">
        {/* Alerta discreto: fechamento anterior pendente após 12h01 — apenas desktop */}
        {yesterdayStatus === "expired" && selectedDate === todayStr && (
          <div className="hidden sm:flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
            <p className="text-[13px] font-medium text-[#92400E]">
              Existe um fechamento anterior pendente.{" "}
              <button onClick={openHistory} className="underline font-semibold hover:text-amber-900 transition-colors">
                Acesse o Histórico de Fechamentos
              </button>{" "}
              para regularizar.
            </p>
          </div>
        )}

        {/* ── VERSÃO MOBILE (somente em telas < sm) ── */}
        <div className="sm:hidden">
          <MobileFechamento
            dc={dc}
            updateCounter={updateCounter}
            setCounter={setCounter}
            clients={clients}
            closingDate={closingDate}
            bloqueado={tudo_bloqueado}
            d1Editavel={d1Editavel}
            onAuditLog={handleAuditLog}
            dailyClose={dailyClose}
            onDailyCloseUpdate={handleDailyCloseUpdate}
            onClientsChange={setClients}
            totalLeads={totalLeads}
            totalAtend={totalAtend}
            totalAgend={totalAgend}
            totalVendas={totalVendas}
            totalFaturamento={totalFaturamento}
            liberado={liberado}
            onRegistroSalvo={handleRegistroSalvo}
          />
        </div>

        {/* ── VERSÃO DESKTOP (somente em telas >= sm) ── */}
        <div className="hidden sm:block space-y-5">
          {/* Row 1: Movimento do Dia */}
          <FluxoFechamento
            dc={dc}
            updateCounter={updateCounter}
            setCounter={setCounter}
            clients={clients}
            closingDate={closingDate}
            bloqueado={tudo_bloqueado}
            d1Editavel={d1Editavel}
            onAuditLog={handleAuditLog}
          />

          {/* Row 2: Clientes */}
          <ClientCard
            onClientsChange={setClients}
            closingDate={closingDate}
            bloqueado={tudo_bloqueado}
            d1Editavel={d1Editavel}
            onAuditLog={handleAuditLog}
            dailyCloseId={dailyClose?.id}
            dailyClose={dailyClose}
            onRegistroSalvo={handleRegistroSalvo}
          />

          {/* Row 3: Bottom */}
          <BottomSection
            totalLeads={totalLeads}
            totalAtend={totalAtend}
            totalAgend={totalAgend}
            totalVendas={totalVendas}
            totalFaturamento={totalFaturamento}
            totalGarantias={totalGarantiasDia}
            totalQualificados={totalQualificadosDia}
            clients={clients}
            agendamentosD1Carteira={dc.agendamentos_carteira || 0}
            agendamentosD1Internet={dc.agendamentos_internet || 0}
            closingDate={closingDate}
            liberado={liberado}
            penalizado={false}
            dailyClose={dailyClose}
            onDailyCloseUpdate={handleDailyCloseUpdate}
          />
        </div>
      </div>

      {/* ── Drawer: Regularizar ── */}
      <RegularizarFechamentoDrawer
        open={!!regularizarDate}
        date={regularizarDate}
        currentUser={currentUser}
        onClose={() => setRegularizarDate(null)}
        onRegularizado={(date, status) => {
          setRegularizarDate(null);
          loadHistory().then(() => setHistoryOpen(true));
        }}
      />

      {/* ── Modal: Histórico ── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] font-bold">Histórico de Fechamentos</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-slate-200 border-t-[#005BFF] rounded-full animate-spin" />
              </div>
            ) : historyRecords.length === 0 ? (
              <p className="text-[13px] text-[#64748B] text-center py-6">Nenhum fechamento registrado neste mês.</p>
            ) : (() => {
              const visible = historyShowAll ? historyRecords : historyRecords.slice(0, 7);
              const hasMore = !historyShowAll && historyRecords.length > 7;

              // Índice de regularizações por data
              const regByDate = {};
              historyRegularizacoes.forEach(r => { regByDate[r.data_competencia] = r; });

              // Dias com DailyClose registrado E finalizado (ou com status_regularizacao aprovada)
              const registeredDates = new Set(
                historyRecords
                  .filter(h => h.finalizado || h.status_regularizacao === "Regularizado Aprovado")
                  .map(h => h.date)
              );
              // Datas com qualquer DailyClose (para detectar "aguardando aprovação")
              const allCloseDates = new Set(historyRecords.map(h => h.date));

              // Dias corridos do mês até ontem que NÃO têm registro finalizado → pendentes ou aguardando
              const startOfMonth = moment(todayStr).startOf("month").format("YYYY-MM-DD");
              const pendentes = [];
              let d = moment(startOfMonth);
              while (d.format("YYYY-MM-DD") <= yesterdayStr) {
                const ds = d.format("YYYY-MM-DD");
                if (!registeredDates.has(ds)) pendentes.push(ds);
                d.add(1, "day");
              }

              return (
                <>
                  {/* Pendentes / Aguardando Aprovação primeiro */}
                  {pendentes.slice(0, historyShowAll ? undefined : 3).map(date => {
                    const reg = regByDate[date];
                    const dc = historyRecords.find(h => h.date === date);
                    const statusReg = reg?.status_solicitacao || dc?.status_regularizacao;

                    const isAguardando = statusReg === "Pendente" || dc?.status_regularizacao === "Aguardando Aprovação";
                    const isRecusado = statusReg === "Recusada" || dc?.status_regularizacao === "Regularização Recusada";

                    return (
                      <div key={`pending-${date}`} className={`flex items-center justify-between p-3 rounded-xl border ${
                        isAguardando ? "bg-amber-50 border-amber-200" :
                        isRecusado ? "bg-slate-50 border-red-200" :
                        "bg-red-50 border-red-200"
                      }`}>
                        <div className="flex items-center gap-2">
                          <CalendarDays className={`w-4 h-4 flex-shrink-0 ${isAguardando ? "text-amber-500" : "text-[#EF4444]"}`} />
                          <span className="font-semibold text-[13px] text-[#0F172A]">{moment(date).format("DD/MM/YYYY")}</span>
                          <span className="text-[11px] text-slate-400 capitalize">{moment(date).format("ddd")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {isAguardando ? (
                            <>
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                                Aguardando Aprovação
                              </span>
                              <button
                                onClick={() => { setHistoryOpen(false); setRegularizarDate(date); }}
                                className="text-[11px] font-bold text-[#005BFF] hover:underline"
                              >
                                Ver
                              </button>
                            </>
                          ) : isRecusado ? (
                            <>
                              <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full">
                                Recusada
                              </span>
                              <button
                                onClick={() => { setHistoryOpen(false); setRegularizarDate(date); }}
                                className="text-[11px] font-bold text-[#005BFF] hover:underline"
                              >
                                Regularizar
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] font-bold text-[#EF4444] bg-red-100 px-2.5 py-0.5 rounded-full">
                                Pendente de Fechamento
                              </span>
                              <button
                                onClick={() => { setHistoryOpen(false); setRegularizarDate(date); }}
                                className="text-[11px] font-bold text-[#005BFF] hover:underline"
                              >
                                Regularizar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Fechamentos registrados */}
                  {visible.map(h => {
                    const leads = (h.leads_carteira || 0) + (h.leads_internet || 0);
                    const atend = (h.atendimentos_showroom || 0) + (h.atendimentos_carteira || 0) + (h.atendimentos_internet || 0);
                    const agend = (h.agendamentos_carteira || 0) + (h.agendamentos_internet || 0);
                    const vendas = historyClients.filter(c =>
                      c.sale_status === "Sim" &&
                      (c._data_competencia_fechamento === h.date || moment(c.created_date).format("YYYY-MM-DD") === h.date)
                    ).length;
                    return (
                      <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-[#E5E7EB]">
                        <div className="flex items-center gap-2 min-w-[110px]">
                          <CalendarDays className="w-4 h-4 text-[#005BFF] flex-shrink-0" />
                          <span className="font-semibold text-[13px] text-[#0F172A]">{moment(h.date).format("DD/MM/YYYY")}</span>
                          <span className="text-[11px] text-slate-400 capitalize">{moment(h.date).format("ddd")}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[12px] text-[#64748B]">
                          <span><strong className="text-[#005BFF]">{leads}</strong> leads</span>
                          <span><strong className="text-[#6D28D9]">{atend}</strong> atend.</span>
                          <span><strong className="text-[#F59E0B]">{agend}</strong> agend.</span>
                          <span><strong className="text-[#22C55E]">{vendas}</strong> vendas</span>
                        </div>
                      </div>
                    );
                  })}

                  {hasMore && (
                    <button
                      onClick={() => setHistoryShowAll(true)}
                      className="w-full text-[12px] font-semibold text-[#005BFF] hover:underline py-2 text-center"
                    >
                      Mostrar mais ({historyRecords.length - 7} registros restantes)
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
