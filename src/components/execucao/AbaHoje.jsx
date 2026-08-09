import React, { useState, useMemo, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  MessageCircle, Phone, UserRound, Plus, ChevronDown,
  AlertTriangle, Calendar, Inbox, Sparkles, CheckCircle2,
  Clock, Users, RefreshCw, Gift, Shield, Truck, MoreVertical,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment/min/moment-with-locales";
import ResolverModal from "./ResolverModal";
import NovaAtividadeModal from "./NovaAtividadeModal";
import PendenciasDrawer from "./PendenciasDrawer";
import FichaClienteSheet from "@/components/carteira/FichaClienteSheet";

const CE_WA_KEY = "ce_whatsapp_saida";

moment.locale("pt-br");

// ── Constantes ─────────────────────────────────────────────────────────────────

const TIPO_COLOR_BAR = {
  "Atendimento": "bg-blue-500",
  "Retorno": "bg-amber-500",
  "Documentação": "bg-slate-400",
  "Entrega": "bg-purple-500",
  "Pós-venda": "bg-teal-500",
  "Aniversário": "bg-indigo-500",
  "Garantia": "bg-orange-500",
  "Outra atividade comercial": "bg-slate-400",
};

const TIPO_COLOR_BADGE = {
  "Atendimento": "bg-blue-50 text-blue-700",
  "Retorno": "bg-amber-50 text-amber-700",
  "Documentação": "bg-slate-100 text-slate-600",
  "Entrega": "bg-purple-50 text-purple-700",
  "Pós-venda": "bg-teal-50 text-teal-700",
  "Aniversário": "bg-indigo-50 text-indigo-700",
  "Garantia": "bg-orange-50 text-orange-700",
  "Outra atividade comercial": "bg-slate-100 text-slate-600",
};

const TIPO_ICON = {
  "Atendimento": Calendar,
  "Retorno": RefreshCw,
  "Documentação": Shield,
  "Entrega": Truck,
  "Pós-venda": Users,
  "Aniversário": Gift,
  "Garantia": Shield,
  "Outra atividade comercial": MoreVertical,
};

// Prioridade base por tipo (menor = mais urgente)
const TIPO_PRIORIDADE_BASE = {
  "Atendimento": 1,
  "Entrega": 2,
  "Garantia": 3,
  "Retorno": 4,
  "Pós-venda": 5,
  "Aniversário": 6,
  "Documentação": 7,
  "Outra atividade comercial": 8,
};

const FILTROS = [
  { id: "todos", label: "Todas" },
  { id: "Atendimento", label: "Agendamentos" },
  { id: "Entrega", label: "Entregas" },
  { id: "Garantia", label: "Garantias" },
  { id: "Retorno", label: "Retornos" },
  { id: "Pós-venda", label: "Pós-venda" },
  { id: "Outra atividade comercial", label: "Comercial" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarIniciais(nome) {
  if (!nome) return "?";
  return nome.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function buildOportunidadesDeClientes(clients, hoje) {
  return clients
    .filter(c => {
      if (c.sale_status !== "Em Negociação") return false;
      if (!c.appointment_datetime) return false;
      return moment(c.appointment_datetime).format("YYYY-MM-DD") === hoje;
    })
    .map(c => ({
      id: `client_${c.id}`,
      _clienteId: c.id,
      _fromClient: true,
      tipo: "Atendimento",
      titulo: "Atendimento",
      descricao: c.vehicle_sought ? `Interesse em ${c.vehicle_sought}` : "Negociação em andamento",
      data_hora_execucao: c.appointment_datetime,
      prioridade: 1,
      status: "Pendente",
      telefone_snapshot: c.phone,
      nome_cliente_snapshot: c.name,
      veiculo_snapshot: c.vehicle_sought,
      cliente_id: c.id,
      ativo: true,
      _clienteObj: c,
    }));
}

function buildAniversarios(clients, hoje) {
  const [m, d] = [moment(hoje).month() + 1, moment(hoje).date()];
  return clients
    .filter(c => {
      if (!c.birth_date && !c.dataAniversario) return false;
      const aniv = c.birth_date || c.dataAniversario;
      const anivMoment = moment(aniv, ["YYYY-MM-DD", "MM-DD"]);
      return anivMoment.month() + 1 === m && anivMoment.date() === d;
    })
    .map(c => ({
      id: `aniv_${c.id}`,
      _clienteId: c.id,
      _fromClient: true,
      tipo: "Aniversário",
      titulo: "Aniversário",
      descricao: "Parabenize o cliente hoje!",
      data_hora_execucao: `${hoje}T09:00`,
      prioridade: 8,
      status: "Pendente",
      telefone_snapshot: c.phone,
      nome_cliente_snapshot: c.name,
      veiculo_snapshot: c.vehicle_sought,
      cliente_id: c.id,
      ativo: true,
      _clienteObj: c,
    }));
}

function sortOportunidades(lista, ordenar) {
  return [...lista].sort((a, b) => {
    if (ordenar === "horario") {
      return (a.data_hora_execucao || "").localeCompare(b.data_hora_execucao || "");
    }
    if (ordenar === "tipo") {
      return (a.tipo || "").localeCompare(b.tipo || "");
    }
    if (ordenar === "cliente") {
      return (a.nome_cliente_snapshot || "").localeCompare(b.nome_cliente_snapshot || "");
    }
    // Prioridade (padrão): vencido primeiro, depois por tipo, depois horário
    const aVencido = moment(a.data_hora_execucao).isBefore(moment()) ? 0 : 1;
    const bVencido = moment(b.data_hora_execucao).isBefore(moment()) ? 0 : 1;
    if (aVencido !== bVencido) return aVencido - bVencido;
    const pa = TIPO_PRIORIDADE_BASE[a.tipo] || 10;
    const pb = TIPO_PRIORIDADE_BASE[b.tipo] || 10;
    if (pa !== pb) return pa - pb;
    return (a.data_hora_execucao || "").localeCompare(b.data_hora_execucao || "");
  });
}

// ── Componente de Card de Oportunidade ────────────────────────────────────────

function OportunidadeCard({ op, onResolver, onAbrirCliente, onWhatsApp, isMobile }) {
  const Icon = TIPO_ICON[op.tipo] || Calendar;
  const hora = op.data_hora_execucao ? moment(op.data_hora_execucao).format("HH:mm") : "—";
  const isVencido = op.data_hora_execucao && moment(op.data_hora_execucao).isBefore(moment());
  const tel = (op.telefone_snapshot || "").replace(/\D/g, "");
  const waUrl = tel ? `https://wa.me/55${tel}` : null;
  const msgAniversario = op.tipo === "Aniversário"
    ? `Olá ${op.nome_cliente_snapshot ? op.nome_cliente_snapshot.split(" ")[0] : ""}! Feliz aniversário! Que este dia seja especial. Conte comigo para o que precisar! 🎉`
    : null;

  function handleWaClick(e) {
    if (onWhatsApp) onWhatsApp(op);
  }

  if (isMobile) {
    return (
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isVencido ? "border-red-200" : "border-slate-200"}`}>
        <div className={`h-1 w-full ${TIPO_COLOR_BAR[op.tipo] || "bg-slate-300"}`} />
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${TIPO_COLOR_BADGE[op.tipo] || "bg-slate-100 text-slate-500"}`}>{op.tipo}</span>
              {isVencido && <span className="text-caption font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Vencido</span>}
            </div>
            <div className="flex items-center gap-1 text-caption font-bold text-slate-400">
              <Clock className="w-3 h-3" />{hora}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-[12px] font-bold text-slate-500 flex-shrink-0">
              {avatarIniciais(op.nome_cliente_snapshot)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[14px] text-[#0F172A] truncate">{op.nome_cliente_snapshot || "—"}</p>
              {op.veiculo_snapshot && <p className="text-[12px] text-slate-400 truncate">{op.veiculo_snapshot}</p>}
            </div>
          </div>
          {op.descricao && <p className="text-[12px] text-slate-500 mb-3">{op.descricao}</p>}

          <div className="flex items-center gap-2 flex-wrap">
            {waUrl && (
              <a href={msgAniversario ? `${waUrl}?text=${encodeURIComponent(msgAniversario)}` : waUrl}
                target="_blank" rel="noopener noreferrer"
                onClick={handleWaClick}
                className="flex items-center gap-1 text-caption font-bold text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </a>
            )}
            {tel && (
              <a href={`tel:${tel}`}
                className="flex items-center gap-1 text-caption font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">
                <Phone className="w-3 h-3" /> Ligar
              </a>
            )}
            {op.cliente_id && (
              <button onClick={() => onAbrirCliente(op)}
                className="flex items-center gap-1 text-caption font-bold text-[#005BFF] border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                <UserRound className="w-3 h-3" /> Cliente
              </button>
            )}
            <button onClick={() => onResolver(op)}
              className="ml-auto flex items-center gap-1 text-[12px] font-bold text-white bg-[#005BFF] hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors">
              Resolver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex group transition-shadow hover:shadow-md ${isVencido ? "border-red-200" : "border-slate-200"}`}>
      <div className={`w-1.5 flex-shrink-0 ${TIPO_COLOR_BAR[op.tipo] || "bg-slate-300"}`} />
      <div className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0">
        {/* Ícone e horário */}
        <div className="flex-shrink-0 text-center w-12">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1 ${TIPO_COLOR_BADGE[op.tipo] || "bg-slate-100"}`}>
            <Icon className="w-4 h-4" />
          </div>
          <p className={`text-caption font-bold ${isVencido ? "text-red-500" : "text-slate-400"}`}>{hora}</p>
        </div>

        {/* Avatar + nome + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[12px] font-bold text-slate-500 flex-shrink-0">
            {avatarIniciais(op.nome_cliente_snapshot)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[14px] text-[#0F172A] truncate">{op.nome_cliente_snapshot || "—"}</p>
              <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${TIPO_COLOR_BADGE[op.tipo] || "bg-slate-100 text-slate-500"}`}>{op.tipo}</span>
              {isVencido && <span className="text-caption font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Vencido</span>}
            </div>
            {op.veiculo_snapshot && <p className="text-[12px] text-slate-400 truncate">{op.veiculo_snapshot}</p>}
            {op.descricao && <p className="text-[12px] text-slate-500 truncate">{op.descricao}</p>}
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {waUrl && (
            <a href={msgAniversario ? `${waUrl}?text=${encodeURIComponent(msgAniversario)}` : waUrl}
              target="_blank" rel="noopener noreferrer"
              onClick={handleWaClick}
              title="WhatsApp"
              className="p-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
          {tel && (
            <a href={`tel:${tel}`} title="Ligar"
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
              <Phone className="w-4 h-4" />
            </a>
          )}
          {op.cliente_id && (
            <button onClick={() => onAbrirCliente(op)} title="Abrir cliente"
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#005BFF] transition-colors">
              <UserRound className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onResolver(op)}
            className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-[#005BFF] hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors ml-1">
            Resolver
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AbaHoje({ clients, dailyClose, onClientsChange, isMobile, profile, onGoToRotina }) {
  const { toast } = useToast();
  const hoje = useMemo(() => moment().format("YYYY-MM-DD"), []);

  const [oportunidades, setOportunidades] = useState([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [resolverTarget, setResolverTarget] = useState(null);
  const [fichaCliente, setFichaCliente] = useState(null); // { clienteId, clienteObj }
  const [novaAtividade, setNovaAtividade] = useState(false);
  const [pendenciasOpen, setPendenciasOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [ordenar, setOrdenar] = useState("prioridade");
  const [resolvidasIds, setResolvidasIds] = useState(new Set());

  // Carregar oportunidades: ExecutionOpportunity + AtividadeExecucao
  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me();

        // ExecutionOpportunity (legado / manual)
        const execOps = await base44.entities.ExecutionOpportunity.filter({ ativo: true }).catch(() => []);
        const filtradas = execOps.filter(op => op.vendedor_id === me.id || !op.vendedor_id);

        // AtividadeExecucao (criadas pelo Fechamento Diário e outros módulos)
        const atividades = await base44.entities.AtividadeExecucao.filter({
          vendedor_id: me.id,
          ativo: true,
        }).catch(() => []);

        // Normalizar AtividadeExecucao para o mesmo shape de ExecutionOpportunity
        const TIPO_MAP = {
          garantia: "Garantia",
          entrega: "Entrega",
          agendamento: "Atendimento",
          retorno: "Retorno",
          pos_venda: "Pós-venda",
          comercial: "Outra atividade comercial",
        };
        const atividadesNorm = atividades.map(a => ({
          id: a.id,
          _fromAtividade: true,
          tipo: TIPO_MAP[a.tipo_atividade] || "Outra atividade comercial",
          titulo: a.titulo || "",
          descricao: a.descricao || "",
          objetivo: a.objetivo || "",
          data_hora_execucao: a.data_hora_execucao,
          prioridade: a.prioridade || 5,
          status: a.status_atividade,
          telefone_snapshot: a.telefone_snapshot,
          nome_cliente_snapshot: a.nome_cliente_snapshot,
          veiculo_snapshot: a.veiculo_snapshot,
          cliente_id: a.cliente_id,
          evento_id: a.evento_id,
          ativo: a.ativo,
        }));

        // Merge: evitar duplicatas pelo cliente_id + tipo
        const ids = new Set(filtradas.map(op => `${op.cliente_id}_${op.tipo}`));
        const atividadesSemDup = atividadesNorm.filter(a =>
          !ids.has(`${a.cliente_id}_${a.tipo}`) || a.tipo === "Garantia"
        );

        setOportunidades([...filtradas, ...atividadesSemDup]);
      } catch (e) {
        console.error(e);
      }
      setLoadingOps(false);
    };
    load();
  }, []);

  // Oportunidades derivadas dos clientes (Atendimentos agendados hoje)
  const opsDeClientes = useMemo(() => buildOportunidadesDeClientes(clients, hoje), [clients, hoje]);

  // Aniversários
  const opsAniversarios = useMemo(() => buildAniversarios(clients, hoje), [clients, hoje]);

  // Oportunidades da entidade — split por data
  const opsEntityHoje = useMemo(() =>
    oportunidades.filter(op => {
      if (!op.ativo) return false;
      if (op.status === "Resolvida" || op.status === "Cancelada") return false;
      return moment(op.data_hora_execucao).format("YYYY-MM-DD") === hoje;
    }), [oportunidades, hoje]);

  const opsEntityPendentes = useMemo(() =>
    oportunidades.filter(op => {
      if (!op.ativo) return false;
      if (op.status === "Resolvida" || op.status === "Cancelada") return false;
      return moment(op.data_hora_execucao).format("YYYY-MM-DD") < hoje;
    }), [oportunidades, hoje]);

  // Merge lista de hoje: clientes + aniversários + entidade, sem duplicar
  const listaHoje = useMemo(() => {
    const ids = new Set(opsEntityHoje.map(op => op.cliente_id).filter(Boolean));
    // Não incluir oportunidade de cliente se já existe oportunidade de entidade para ele
    const opsClientesFiltrados = opsDeClientes.filter(op => !ids.has(op.cliente_id));
    const idsAniv = new Set(opsEntityHoje.filter(op => op.tipo === "Aniversário").map(op => op.cliente_id));
    const anivFiltrados = opsAniversarios.filter(op => !idsAniv.has(op.cliente_id));

    const todos = [...opsClientesFiltrados, ...anivFiltrados, ...opsEntityHoje];
    // Remover resolvidos localmente
    return todos.filter(op => !resolvidasIds.has(op.id));
  }, [opsDeClientes, opsAniversarios, opsEntityHoje, resolvidasIds]);

  // Pendências anteriores
  const pendenciasAnteriores = useMemo(() => {
    const opsClientesPendentes = clients.filter(c => {
      if (c.sale_status !== "Em Negociação") return false;
      if (!c.appointment_datetime) return false;
      const data = moment(c.appointment_datetime).format("YYYY-MM-DD");
      return data < hoje;
    }).map(c => ({
      id: `client_pend_${c.id}`,
      _clienteId: c.id,
      _fromClient: true,
      tipo: "Atendimento",
      descricao: c.vehicle_sought ? `Interesse em ${c.vehicle_sought}` : "Negociação em andamento",
      data_hora_execucao: c.appointment_datetime,
      status: "Pendente",
      telefone_snapshot: c.phone,
      nome_cliente_snapshot: c.name,
      veiculo_snapshot: c.vehicle_sought,
      cliente_id: c.id,
    }));
    return [...opsClientesPendentes, ...opsEntityPendentes].filter(op => !resolvidasIds.has(op.id));
  }, [clients, opsEntityPendentes, hoje, resolvidasIds]);

  // Filtro + ordenação
  const listaFiltrada = useMemo(() => {
    const filtrada = filtroTipo === "todos" ? listaHoje : listaHoje.filter(op => op.tipo === filtroTipo);
    return sortOportunidades(filtrada, ordenar);
  }, [listaHoje, filtroTipo, ordenar]);

  // Contadores por tipo para os filtros
  const contagemPorTipo = useMemo(() => {
    const map = {};
    listaHoje.forEach(op => { map[op.tipo] = (map[op.tipo] || 0) + 1; });
    return map;
  }, [listaHoje]);

  // Callbacks
  const handleResolvida = useCallback((id, status, novaData) => {
    setResolvidasIds(prev => new Set([...prev, id]));
    // Se reagendou para hoje, recarregar
    if (status === "Reagendada" && novaData) {
      const novaDataStr = moment(novaData).format("YYYY-MM-DD");
      if (novaDataStr === hoje) {
        base44.entities.ExecutionOpportunity.filter({ ativo: true }).then(all => {
          setOportunidades(all);
          setResolvidasIds(new Set());
        }).catch(() => {});
      }
    }
    // Atualizar lista de clientes se foi de cliente
    if (id.startsWith("client_")) {
      const clientId = id.replace("client_pend_", "").replace("client_", "");
      if (status === "Resolvida") {
        onClientsChange && onClientsChange(prev => prev.map(c =>
          c.id === clientId ? { ...c, sale_status: "Sim" } : c
        ));
      }
    }
  }, [hoje]);

  const handleCriada = useCallback((nova) => {
    setOportunidades(prev => [...prev, nova]);
  }, []);

  const handleAbrirCliente = useCallback((op) => {
    setFichaCliente({ clienteId: op.cliente_id, clienteObj: op._clienteObj || null });
  }, []);

  // ── Retorno automático do WhatsApp ─────────────────────────────────────────
  const handleWhatsApp = useCallback((op) => {
    sessionStorage.setItem(CE_WA_KEY, JSON.stringify({
      opId: op.id,
      clienteId: op.cliente_id,
      tipo: op.tipo,
      ts: Date.now(),
    }));
  }, []);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      const raw = sessionStorage.getItem(CE_WA_KEY);
      if (!raw) return;
      const dados = JSON.parse(raw);
      const elapsed = Date.now() - dados.ts;
      if (elapsed <= 120000) {
        sessionStorage.removeItem(CE_WA_KEY);
        // encontrar a atividade correspondente para abrir o resolver
        setResolverTarget(prev => {
          if (prev) return prev; // já tem um aberto
          // busca na lista atual
          const encontrada = [...listaHoje].find(o => o.id === dados.opId);
          return encontrada || null;
        });
      } else {
        sessionStorage.removeItem(CE_WA_KEY);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [listaHoje]);

  const totalHoje = listaHoje.length;

  return (
    <div className="space-y-5">
      {/* ── Aviso de pendências ── */}
      {pendenciasAnteriores.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-body-sm font-semibold text-amber-800 flex-1">
            Você possui {pendenciasAnteriores.length} pendência{pendenciasAnteriores.length > 1 ? "s" : ""} de dias anteriores.
          </p>
          <button onClick={() => setPendenciasOpen(true)}
            className="text-[12px] font-bold text-[#005BFF] hover:underline flex-shrink-0">
            Ver pendências
          </button>
        </div>
      )}

      {/* ── Indicadores / Filtros compactos ── */}
      {totalHoje > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {FILTROS.map(f => {
            const count = f.id === "todos" ? totalHoje : (contagemPorTipo[f.id] || 0);
            // Oculta chips com 0 para não poluir — exceto "todos"
            if (f.id !== "todos" && count === 0) return null;
            const ativo = filtroTipo === f.id;
            return (
              <button key={f.id} onClick={() => setFiltroTipo(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-bold transition-colors ${
                  ativo
                    ? "bg-[#005BFF] text-white border-[#005BFF]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#005BFF] hover:text-[#005BFF]"
                }`}>
                {f.label}
                <span className={`text-caption px-1.5 py-0.5 rounded-full font-bold ${ativo ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Área principal ── */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-[14px] font-bold text-[#0F172A]">O que você não pode deixar de fazer hoje</h3>
            <p className="text-[12px] text-slate-400">Atividades vencidas ou previstas para hoje. Execute e registre o resultado.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={ordenar} onValueChange={setOrdenar}>
              <SelectTrigger className="h-8 text-[12px] font-semibold border-slate-200 rounded-xl w-[148px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prioridade">Prioridade</SelectItem>
                <SelectItem value="horario">Horário</SelectItem>
                <SelectItem value="tipo">Tipo</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={() => setNovaAtividade(true)}
              className="flex items-center gap-1.5 bg-[#005BFF] hover:bg-blue-700 text-white text-[12px] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-blue-100">
              <Plus className="w-4 h-4" /> Nova atividade
            </button>
          </div>
        </div>

        {/* Lista */}
        {loadingOps ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-[#005BFF] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-body-sm text-slate-400">Carregando oportunidades...</p>
          </div>
        ) : listaFiltrada.length === 0 ? (
          totalHoje === 0 ? (
            // Estado vazio completo
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-[#005BFF]" />
              </div>
              <p className="text-[16px] font-bold text-[#0F172A] mb-1">Tela limpa por hoje.</p>
              <p className="text-body-sm text-slate-400 mb-5 max-w-sm mx-auto">
                Você não possui oportunidades pendentes para executar agora.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {onGoToRotina && (
                  <button onClick={onGoToRotina}
                    className="flex items-center gap-1.5 px-4 py-2 text-body-sm font-bold text-[#005BFF] border border-[#005BFF] rounded-xl hover:bg-blue-50 transition-colors">
                    <Sparkles className="w-4 h-4" /> Ver Rotina do Dia
                  </button>
                )}
                <Link to="/carteira"
                  className="flex items-center gap-1.5 px-4 py-2 text-body-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <Users className="w-4 h-4" /> Abrir Carteira
                </Link>
                <button onClick={() => setNovaAtividade(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-body-sm font-bold text-white bg-[#005BFF] rounded-xl hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" /> Nova atividade
                </button>
              </div>
            </div>
          ) : (
            // Filtro sem resultados
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
              <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-body-sm text-slate-400">Nenhuma oportunidade do tipo <strong>{filtroTipo}</strong> para hoje.</p>
              <button onClick={() => setFiltroTipo("todos")} className="text-[12px] text-[#005BFF] font-bold mt-2 hover:underline">Ver todas</button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {listaFiltrada.map(op => (
              <OportunidadeCard key={op.id} op={op} onResolver={setResolverTarget} onAbrirCliente={handleAbrirCliente} onWhatsApp={handleWhatsApp} isMobile={isMobile} />
            ))}

            {/* Todas resolvidas (quando tinha e agora zerou) */}
            {listaHoje.length > 0 && listaFiltrada.length === 0 && filtroTipo === "todos" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-[#005BFF] mx-auto mb-3" />
                <p className="text-body font-bold text-[#0F172A] mb-1">Todas as oportunidades de hoje foram resolvidas.</p>
                <p className="text-[12px] text-slate-400 mb-5 max-w-sm mx-auto">
                  Novas oportunidades aparecerão aqui conforme sua agenda, carteira e processos comerciais forem atualizados.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {onGoToRotina && (
                    <button onClick={onGoToRotina}
                      className="flex items-center gap-1.5 px-4 py-2 text-body-sm font-bold text-[#005BFF] border border-[#005BFF] rounded-xl hover:bg-blue-50 transition-colors">
                      <Sparkles className="w-4 h-4" /> Ver Rotina do Dia
                    </button>
                  )}
                  <Link to="/carteira"
                    className="flex items-center gap-1.5 px-4 py-2 text-body-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <Users className="w-4 h-4" /> Abrir Carteira
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      <FichaClienteSheet
        open={!!fichaCliente}
        clienteId={fichaCliente?.clienteId}
        onClose={() => setFichaCliente(null)}
      />

      {resolverTarget && (
        <ResolverModal
          oportunidade={resolverTarget}
          open
          onClose={() => setResolverTarget(null)}
          onResolvida={handleResolvida}
        />
      )}

      <NovaAtividadeModal
        open={novaAtividade}
        onClose={() => setNovaAtividade(false)}
        clients={clients}
        onCriada={handleCriada}
        vendedorId={profile?.id}
      />

      <PendenciasDrawer
        open={pendenciasOpen}
        onClose={() => setPendenciasOpen(false)}
        pendencias={pendenciasAnteriores}
        onResolvida={handleResolvida}
        onReagendada={(id, novaData) => {
          const novaDataStr = moment(novaData).format("YYYY-MM-DD");
          if (novaDataStr === hoje) {
            setOportunidades(prev => prev.map(op =>
              op.id === id ? { ...op, data_hora_execucao: novaData, status: "Reagendada" } : op
            ));
          }
          setResolvidasIds(prev => new Set([...prev, id]));
        }}
      />
    </div>
  );
}