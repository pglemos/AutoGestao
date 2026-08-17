import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { base44 } from "@/api/base44Client";
import { Zap, X, ChevronDown, ChevronUp, AlertCircle, Clock, CheckCircle2, Pencil } from "lucide-react";
import AlterarProximoPasso from "./AlterarProximoPasso";
import moment from "moment/min/moment-with-locales";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { CancelarVendaModal } from "@/features/crm/components/CancelarVendaModal";
import { formatCurrencyInput } from "@/lib/currency-mask";

moment.locale("pt-br");
import {
  SITUACOES_ATUAIS, TEMPERATURAS, CANAIS_COMERCIAIS, STATUS_COMERCIAIS,
  calcularObjetivoEProximoPasso, calcularScore, explicacaoCliente, tempColor,
  SITUACOES_ENCERRADAS_SEM_VENDA, SITUACOES_TERMINAIS,
} from "./carteiraUtils";

/**
 * Controla a exibição do botão de cancelar no frontend.
 * A regra de verdade está no backend (RPC cancelar_venda).
 */
function dentroMesCancelamento(closedAt) {
  if (!closedAt) return false;
  const closed = new Date(closedAt);
  const now = new Date();
  return closed.getFullYear() === now.getFullYear() && closed.getMonth() === now.getMonth();
}

// ─── QUALIDADE DA OPORTUNIDADE ───────────────────────────────────────────────
function calcularQualidade(cliente) {
  const s = cliente.situacao_atual || cliente.momento || "";
  const temVeiculo = !!cliente.veiculo_interesse;
  const temValor = !!cliente.valor_negociado;
  const temContato = !!cliente.ultimo_contato;
  const temVisita = !!cliente.visita_agendada_em;

  if (["Financiamento aprovado sem compra", "Em negociação ativa", "Vai pensar"].includes(s))
    return { label: "Excelente oportunidade", color: "bg-brand-primary-subtle text-brand-primary-hover border-brand-primary/30" };
  if (["Visita agendada", "Visita hoje", "Visita a confirmar", "Visita realizada", "Proposta enviada"].includes(s))
    return { label: "Boa oportunidade", color: "bg-status-info-surface text-status-info-text border-status-info/30" };
  if (temVeiculo && (temValor || temVisita))
    return { label: "Em desenvolvimento", color: "bg-status-warning-surface text-status-warning-text border-status-warning/30" };
  if (temContato && temVeiculo)
    return { label: "Precisa de informação", color: "bg-status-warning-surface text-status-warning-text border-status-warning/30" };
  if (SITUACOES_ENCERRADAS_SEM_VENDA.includes(s))
    return { label: "Recuperação", color: "bg-status-error-surface text-status-error-text border-status-error/30" };
  return { label: "Nova oportunidade", color: "bg-surface-alt text-muted-foreground border-border" };
}

// ─── URGÊNCIA DA AÇÃO ─────────────────────────────────────────────────────────
function calcularUrgencia(cliente) {
  const s = cliente.situacao_atual || cliente.momento || "";
  const proxData = cliente.proxima_acao_data;
  const visitaData = cliente.visita_agendada_em;

  const hoje = moment().startOf("day");
  const isHoje = (d) => d && moment(d).isSame(hoje, "day");
  const isVencido = (d) => d && moment(d).isBefore(hoje);
  const amanha = moment().add(1, "day").startOf("day");
  const isAmanha = (d) => d && moment(d).isSame(amanha, "day");

  if (["Cliente respondeu", "Aguardando ação do vendedor", "Visita hoje", "Financiamento aprovado sem compra"].includes(s))
    return { label: "Ação imediata", color: "bg-status-error-surface text-status-error-text border-status-error/30" };
  if (isVencido(proxData) || isVencido(visitaData))
    return { label: "Próximo passo vencido", color: "bg-status-error-surface text-status-error-text border-status-error/30" };
  if (isHoje(proxData) || isHoje(visitaData))
    return { label: "Ação para hoje", color: "bg-status-warning-surface text-status-warning-text border-status-warning/30" };
  if (["Visita agendada", "Visita a confirmar"].includes(s))
    return { label: "Visita próxima", color: "bg-status-info-surface text-status-info-text border-status-info/30" };
  if (isAmanha(proxData) || isAmanha(visitaData))
    return { label: "Acompanhar amanhã", color: "bg-status-warning-surface text-status-warning-text border-status-warning/30" };
  return { label: "Sem urgência imediata", color: "bg-surface-alt text-muted-foreground border-border" };
}

// ─── O QUE FALTA PARA EVOLUIR ────────────────────────────────────────────────
function calcularPendencias(cliente) {
  const s = cliente.situacao_atual || cliente.momento || "";
  const items = [];
  const diasSemContato = cliente.ultimo_contato
    ? moment().diff(moment(cliente.ultimo_contato), "days") : 99;

  if (!cliente.valor_negociado && !SITUACOES_TERMINAIS.includes(s))
    items.push("Confirmar orçamento");
  if (cliente.interesse_financiamento == null && !SITUACOES_TERMINAIS.includes(s))
    items.push("Definir forma de pagamento");
  if (cliente.interesse_troca == null && !SITUACOES_TERMINAIS.includes(s))
    items.push("Entender se possui troca");
  if (!cliente.visita_agendada_em && ["Cliente quente sem visita", "Veículo definido", "Necessidade em qualificação", "Cliente respondeu"].includes(s))
    items.push("Agendar visita");
  if (["Visita agendada", "Visita a confirmar"].includes(s))
    items.push("Confirmar visita");
  if (["Proposta enviada", "Proposta sem retorno"].includes(s))
    items.push("Retomar proposta");
  if (cliente.motivo_perda && cliente.motivo_perda.toLowerCase().includes("preço"))
    items.push("Resolver objeção de preço");
  if (cliente.motivo_perda && (cliente.motivo_perda.toLowerCase().includes("parcela") || cliente.motivo_perda.toLowerCase().includes("financiamento")))
    items.push("Revisar condição de financiamento");
  if (cliente.motivo_perda && cliente.motivo_perda.toLowerCase().includes("avaliação"))
    items.push("Resolver avaliação do usado");
  if (diasSemContato >= 4 && !SITUACOES_TERMINAIS.includes(s))
    items.push("Recuperar contato");
  if (!cliente.proxima_acao_data && !SITUACOES_TERMINAIS.includes(s))
    items.push("Registrar próximo passo");

  return items;
}

// ─── MOTIVO DA RECOMENDAÇÃO ───────────────────────────────────────────────────
function motivoRecomendacao(cliente) {
  return explicacaoCliente(cliente);
}

// ─── FIELD ROW (leitura) ─────────────────────────────────────────────────────
function FieldRow({ label, value, vazio = "Não informado" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
      {value
        ? <span className="text-body-sm text-foreground font-medium">{value}</span>
        : <span className="text-[12px] text-text-disabled italic">{vazio}</span>
      }
    </div>
  );
}

// ─── BLOCO COLAPSÁVEL ────────────────────────────────────────────────────────
function Bloco({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border-subtle rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-alt hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 py-4">{children}</div>}
    </div>
  );
}

// ─── FORMULÁRIO DE EDIÇÃO ─────────────────────────────────────────────────────
function FormularioEdicao({ form, setForm, onSalvar, onCancelar, salvando }) {
  const campo = (k, l, span2 = false, type = "text", placeholder = "") => (
    <div key={k} className={span2 ? "col-span-2" : ""}>
      <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{l}</label>
      <Input
        type={type}
        value={form[k] != null ? (type === "datetime-local" ? String(form[k]).slice(0, 16) : form[k]) : ""}
        onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
        placeholder={placeholder}
        className=""
      />
    </div>
  );

  const CANAIS_OPTS = Array.from(new Set([...CANAIS_COMERCIAIS, "Porta", "Showroom", "Internet", "Carteira"]));
  const MODALIDADE_OPTS = ["Visita na loja", "Atendimento externo", "Videochamada", "Não informado"];
  const URGENCIA_OPTS = ["Imediato", "30 dias", "60 dias", "90 dias", "Sem prazo", "Não informado"];

  return (
    <div className="space-y-4 bg-surface-alt rounded-2xl p-4">
      <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Editar informações</p>

      {/* Dados Principais */}
      <div className="grid grid-cols-2 gap-3">
        {campo("nome", "Nome", true, "text", "Ex: JOÃO SANTOS")}
        {campo("whatsapp", "WhatsApp", false, "text", "(11) 98765-4321")}
        {campo("telefone", "Telefone", false, "text", "(11) 98765-4321")}
        {campo("email", "E-mail", true, "text", "email@exemplo.com")}
      </div>

      {/* Origem e Atendimento */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Origem (canal)</label>
          <select
            value={form.canal_comercial || "Internet"}
            onChange={e => setForm(p => ({ ...p, canal_comercial: e.target.value }))}
            className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm"
          >
            {CANAIS_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {campo("origem_detalhada", "Origem Detalhada", false, "text", "Ex: Indicação, Tráfego Pago...")}
        <div>
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Temperatura</label>
          <select
            value={form.temperatura || "Morno"}
            onChange={e => setForm(p => ({ ...p, temperatura: e.target.value }))}
            className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm"
          >
            {TEMPERATURAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Urgência da Compra</label>
          <select
            value={form.urgencia_compra || form.urgencia || "Não informado"}
            onChange={e => setForm(p => ({ ...p, urgencia_compra: e.target.value, urgencia: e.target.value }))}
            className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm"
          >
            {URGENCIA_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Veículo e Negociação */}
      <div className="grid grid-cols-2 gap-3">
        {campo("veiculo_interesse", "Veículo de interesse", true, "text", "Ex: HB20 1.0 COMFORT")}
        {campo("valor_negociado", "Orçamento / Valor Negociado", false, "text", "R$ 68.900,00")}
        <div>
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Financiamento</label>
          <select
            value={form.financiamento || "Não se aplica"}
            onChange={e => setForm(p => ({ ...p, financiamento: e.target.value, interesse_financiamento: e.target.value !== "Não se aplica" }))}
            className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm"
          >
            <option value="Não se aplica">Não se aplica</option>
            <option value="Em análise">Em análise</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Reprovado">Reprovado</option>
          </select>
        </div>
        {campo("veiculo_troca", "Veículo na troca", false, "text", "Ex: GOL 1.0 2018")}
        {campo("valor_troca", "Valor da troca", false, "text", "R$ 35.000,00")}
        <div>
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Modalidade Preferida</label>
          <select
            value={form.preferencia_modalidade || form.modalidade || "Não informado"}
            onChange={e => setForm(p => ({ ...p, preferencia_modalidade: e.target.value, modalidade: e.target.value }))}
            className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm"
          >
            {MODALIDADE_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Dados de Venda & Entrega */}
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        {campo("placa_veiculo", "Placa do Veículo", false, "text", "Ex: ABC-1234")}
        {campo("veiculo_comprado", "Veículo Comprado / Vendido", false, "text", "Ex: HB20 1.0 COMFORT 2024")}
        {campo("data_venda", "Data da Venda", false, "date")}
        <div>
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Valor da Venda</label>
          <Input
            type="text"
            value={form.valor_venda || ""}
            onChange={e => setForm(p => ({ ...p, valor_venda: formatCurrencyInput(e.target.value) }))}
            placeholder="R$ 68.900,00"
          />
        </div>
        {campo("data_entrega_prevista", "Data e Hora Entrega Prevista", true, "datetime-local")}
      </div>

      {/* Situação e Agenda */}
      <div>
        <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Situação atual</label>
        <select value={form.situacao_atual || ""} onChange={e => setForm(p => ({ ...p, situacao_atual: e.target.value }))} className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm">
          {SITUACOES_ATUAIS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Próximo passo</label>
          <Input value={form.proximo_passo || ""} onChange={e => setForm(p => ({ ...p, proximo_passo: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Data do próximo passo</label>
          <Input type="datetime-local" value={form.proxima_acao_data ? form.proxima_acao_data.slice(0, 16) : ""} onChange={e => setForm(p => ({ ...p, proxima_acao_data: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Data e Hora da Visita / Agendamento</label>
          <Input type="datetime-local" value={form.visita_agendada_em ? form.visita_agendada_em.slice(0, 16) : ""} onChange={e => setForm(p => ({ ...p, visita_agendada_em: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">Interesses</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!(form.interesse_troca || form.possui_troca)}
            onChange={e => setForm(p => ({ ...p, interesse_troca: e.target.checked, possui_troca: e.target.checked }))}
            className="rounded"
          />
          <span className="text-sm text-muted-foreground">Possui troca</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.interesse_financiamento}
            onChange={e => setForm(p => ({ ...p, interesse_financiamento: e.target.checked }))}
            className="rounded"
          />
          <span className="text-sm text-muted-foreground">Interesse em financiamento</span>
        </label>
      </div>

      <div>
        <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Objeções / Motivo de perda</label>
        <Input value={form.motivo_perda || ""} onChange={e => setForm(p => ({ ...p, motivo_perda: e.target.value }))} placeholder="Ex: preço, parcela, avaliação..." />
      </div>

      <div>
        <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Observações</label>
        <Textarea value={form.observacoes || ""} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} className="resize-none" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onCancelar} className="flex-1 rounded-xl" disabled={salvando}>Cancelar</Button>
        <Button onClick={onSalvar} className="flex-1 rounded-xl bg-status-info hover:bg-status-info text-white" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FichaClienteSheet({ clienteId, open, onClose, onAtualizado, onExecutar }) {
  const { role, supabaseUser } = useAuth();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState([]);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [alterarPassoOpen, setAlterarPassoOpen] = useState(false);
  const [passoPrefill, setPassoPrefill] = useState(null);
  const [cancelarVendaOpen, setCancelarVendaOpen] = useState(false);
  const [cancelandoVenda, setCancelandoVenda] = useState(false);

  useEffect(() => {
    if (!open || !clienteId) return;
    setLoading(true);
    setEditando(false);
    Promise.all([
      base44.entities.CarteiraCliente.get(clienteId),
      base44.entities.CarteiraHistorico.filter({ cliente_id: clienteId }, "-created_date", 30),
    ]).then(([c, h]) => {
      setCliente(c);
      setForm(c);
      setHistorico(h || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, clienteId]);

  async function salvarEdicao() {
    setSalvando(true);
    const { objetivo, proximoPasso } = calcularObjetivoEProximoPasso(form);
    const isVenda = form.situacao_atual === "Venda realizada";
    const atualizado = {
      ...form,
      objetivo_atual: isVenda ? null : (form.objetivo_atual || objetivo),
      proximo_passo: isVenda ? null : (form.proximo_passo || proximoPasso),
      proxima_acao_data: isVenda ? null : form.proxima_acao_data,
      historico: {
        tipo: isVenda ? "Venda realizada" : "Ficha atualizada",
        descricao: isVenda ? "Venda confirmada através da edição da ficha." : "Dados do cliente editados manualmente.",
        momento_anterior: cliente?.situacao_atual,
        momento_novo: form.situacao_atual,
      },
    };

    if (isVenda) {
      atualizado.status_comercial = "Vendido";
      atualizado.vendido = true;
      atualizado.etapa = "ganho";
      atualizado.ativo = false;
    }

    let persistido;
    try {
      persistido = await base44.entities.CarteiraCliente.update(clienteId, atualizado);
    } catch (error) {
      toast.error("Não foi possível salvar a ficha.", { description: "As alterações foram preservadas. Tente novamente." });
      return;
    } finally {
      setSalvando(false);
    }

    setCliente(persistido);
    setForm(persistido);
    base44.entities.CarteiraHistorico.filter({ cliente_id: clienteId }, "-created_date", 30)
      .then(h => setHistorico(h || [])).catch(() => {});
    setEditando(false);
    if (onAtualizado) onAtualizado(persistido);
  }

  async function confirmarCancelarVenda(motivo) {
    const oppId = cliente?.oportunidade_id || cliente?.oportunidade_cancelada_id;
    if (!oppId) {
      toast.error("Não foi possível cancelar a venda.", { description: "ID da oportunidade de venda não encontrado." });
      return;
    }
    setCancelandoVenda(true);
    try {
      const atualizado = await base44.entities.CarteiraCliente.cancelarVenda(oppId, motivo);
      toast.info("Venda cancelada com sucesso.");
      setCancelarVendaOpen(false);
      if (atualizado) {
        setCliente(atualizado);
        setForm(atualizado);
        if (onAtualizado) onAtualizado(atualizado);
      }
    } catch (error) {
      toast.error("Não foi possível cancelar a venda.", { description: error?.message || "Tente novamente." });
    } finally {
      setCancelandoVenda(false);
    }
  }

  function handlePassoSalvo(atualizado) {
    setCliente(atualizado);
    setForm(atualizado);
    setAlterarPassoOpen(false);
    setPassoPrefill(null);
    // Reload histórico
    base44.entities.CarteiraHistorico.filter({ cliente_id: clienteId }, "-created_date", 30)
      .then(h => setHistorico(h || [])).catch(() => {});
    if (onAtualizado) onAtualizado(atualizado);
  }

  function abrirAlterarPasso(prefill) {
    setPassoPrefill(prefill || null);
    setAlterarPassoOpen(true);
  }

  const qualidade = useMemo(() => cliente ? calcularQualidade(cliente) : null, [cliente]);
  const urgencia = useMemo(() => cliente ? calcularUrgencia(cliente) : null, [cliente]);
  const pendencias = useMemo(() => cliente ? calcularPendencias(cliente) : [], [cliente]);
  const { objetivo, proximoPasso } = useMemo(() => cliente ? calcularObjetivoEProximoPasso(cliente) : { objetivo: "—", proximoPasso: "—" }, [cliente]);
  const motivo = useMemo(() => cliente ? motivoRecomendacao(cliente) : "", [cliente]);
  const { score } = useMemo(() => cliente ? calcularScore(cliente) : { score: 0 }, [cliente]);
  const isGlobalAdmin = role === "administrador_mx" || role === "administrador_geral" || role === "consultor_mx";
  const isVendaAtiva = cliente?.etapa === "ganho";
  const isOwnClient = cliente?.vendedor_id === supabaseUser?.id;

  let podeCancelarVenda = false;
  if (isVendaAtiva) {
    if (isGlobalAdmin || role === "gerente" || role === "dono") {
      podeCancelarVenda = true;
    } else if (role === "vendedor" && isOwnClient && dentroMesCancelamento(cliente?.closed_at)) {
      podeCancelarVenda = true;
    }
  }

  const situacao = cliente?.situacao_atual || cliente?.momento || "—";
  // Venda cancelada é estado encerrado: o próximo passo antigo pertencia à
  // venda revertida e não pode ser executado nem editado a partir da ficha.
  const isVendaCancelada = situacao === "Venda cancelada";
  const canal = cliente?.canal_comercial || cliente?.canal_origem || "—";
  const tel = (cliente?.whatsapp || cliente?.telefone || "").replace(/\D/g, "");
  const iniciais = (cliente?.nome || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-4 border-border border-t-status-info rounded-full animate-spin" />
          </div>
        ) : !cliente ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Cliente não encontrado.</div>
        ) : (
          <div className="flex flex-col flex-1 overflow-y-auto">

            {/* ── BLOCO 1: CABEÇALHO ────────────────────────────────────── */}
            <div className="px-5 pt-5 pb-4 border-b border-border-subtle space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-status-info-surface flex items-center justify-center text-base font-black text-status-info-text shrink-0">
                  {iniciais}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-h5 font-black text-mx-navy leading-tight">{cliente.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {canal}{cliente.origem_detalhada ? ` · ${cliente.origem_detalhada}` : ""} · Cadastrado {moment(cliente.created_date).format("DD/MM/YYYY")}
                  </p>
                  {cliente.whatsapp && (
                    <p className="text-xs text-muted-foreground mt-0.5">📱 {cliente.whatsapp}</p>
                  )}
                  {cliente.veiculo_interesse && (
                    <p className="text-xs font-semibold text-mx-navy mt-1">🚗 {cliente.veiculo_interesse}</p>
                  )}
                </div>
              </div>

              {/* Situação + Temperatura */}
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-caption font-bold px-2.5 py-1 rounded-full border ${tempColor(cliente.temperatura)}`}>{cliente.temperatura || "Morno"}</span>
                <span className="text-caption font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">{situacao}</span>
              </div>

              {/* Venda cancelada — motivo, data e responsável ficam visíveis
                  para que ninguém precise consultar a auditoria para entender
                  por que o cliente saiu da esteira. */}
              {isVendaCancelada && (
                <div className="rounded-xl border border-status-warning/30 bg-status-warning-surface px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-status-warning-text mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-caption font-bold text-status-warning-text">
                        Venda cancelada
                        {cliente.cancelada_em ? ` em ${moment(cliente.cancelada_em).format("DD/MM/YYYY [às] HH:mm")}` : ""}
                      </p>
                      <p className="text-caption text-status-warning-text mt-0.5">
                        Motivo: {cliente.motivo_cancelamento || "Não informado"}
                      </p>
                      <p className="text-caption text-status-warning-text mt-0.5">
                        Oportunidade encerrada. O histórico da venda foi preservado.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Qualidade x Urgência */}
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-xl border px-3 py-2 ${qualidade.color}`}>
                  <p className="text-caption font-bold uppercase tracking-wide opacity-60 mb-0.5">Qualidade</p>
                  <p className="text-xs font-bold">{qualidade.label}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${urgencia.color}`}>
                  <p className="text-caption font-bold uppercase tracking-wide opacity-60 mb-0.5">Urgência</p>
                  <p className="text-xs font-bold">{urgencia.label}</p>
                </div>
              </div>
            </div>

            {/* ── CONTEÚDO ───────────────────────────────────────────────── */}
            <div className="px-5 py-4 space-y-3 flex-1">

              {/* Formulário de edição (inline) */}
              {editando && (
                <FormularioEdicao
                  form={form}
                  setForm={setForm}
                  onSalvar={salvarEdicao}
                  onCancelar={() => { setEditando(false); setForm(cliente); }}
                  salvando={salvando}
                />
              )}

              {/* ── BLOCO 2: PRÓXIMA AÇÃO RECOMENDADA ──────────────────── */}
              {!editando && (
                <div className="bg-status-info-surface border border-status-info/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-status-info-text" />
                    <p className="text-xs font-black text-status-info-text uppercase tracking-wide">Mentor Comercial</p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide">Mentor recomenda</p>
                      <p className="text-sm font-bold text-mx-navy mt-0.5">{cliente.proximo_passo || proximoPasso}</p>
                    </div>
                    <div>
                      <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide">Objetivo</p>
                      <p className="text-sm font-semibold text-muted-foreground mt-0.5">{cliente.objetivo_atual || objetivo}</p>
                    </div>
                    {motivo && (
                      <div>
                        <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide">Motivo</p>
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{motivo}</p>
                      </div>
                    )}
                    {cliente.proxima_acao_data && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        Programado para {moment(cliente.proxima_acao_data).format("DD/MM/YYYY [às] HH:mm")}
                      </div>
                    )}
                    {cliente.visita_agendada_em && (
                      <div className="flex items-center gap-1.5 text-xs text-status-info-text font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        Visita: {moment(cliente.visita_agendada_em).format("DD/MM/YYYY [às] HH:mm")}
                      </div>
                    )}
                  </div>

                  {/* Venda cancelada não tem próximo passo a executar nem a
                      alterar: o passo antigo pertencia à venda revertida. */}
                  {!isVendaCancelada && (
                    <div className="flex gap-2 pt-1 flex-wrap">
                      {onExecutar && (
                        <Button
                          onClick={() => { onClose(); onExecutar(cliente); }}
                          className="flex-1 rounded-xl bg-status-info hover:bg-status-info text-white text-sm gap-2"
                        >
                          <Zap className="w-3.5 h-3.5" /> Executar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => abrirAlterarPasso(null)}
                        className="rounded-xl text-sm border-border text-muted-foreground hover:bg-surface-alt gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Alterar próximo passo
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ── BLOCO 3: O QUE FALTA PARA EVOLUIR ─────────────────── */}
              {!editando && pendencias.length > 0 && (
                <Bloco title="O que falta para evoluir" icon="⚠️">
                  <div className="space-y-2">
                    {pendencias.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-3.5 h-3.5 text-status-warning-text mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground">{p}</span>
                        </div>
                        <button
                          onClick={() => abrirAlterarPasso(p)}
                          className="text-caption font-semibold text-status-info-text hover:underline whitespace-nowrap shrink-0"
                        >
                          Definir →
                        </button>
                      </div>
                    ))}
                  </div>
                </Bloco>
              )}

              {/* Sem pendências numa oportunidade encerrada não é sucesso: não
                  há nada a evoluir porque a oportunidade acabou. Verde aqui
                  leria como "venda bem qualificada" logo abaixo do aviso de
                  cancelamento. */}
              {!editando && pendencias.length === 0 && !isVendaCancelada && (
                <div className="flex items-center gap-2 px-4 py-3 bg-brand-primary-subtle border border-brand-primary/20 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4 text-status-success-text shrink-0" />
                  <p className="text-sm text-brand-primary-hover font-medium">Oportunidade bem qualificada. Execute o próximo passo.</p>
                </div>
              )}

              {/* ── BLOCO 4: O QUE SABEMOS ──────────────────────────────── */}
              {!editando && (
                <Bloco title="O que sabemos" icon="📋" defaultOpen={false}>
                  <div className="space-y-5">

                    {/* Interesse */}
                    <div>
                      <p className="text-caption font-black text-muted-foreground uppercase tracking-wide mb-2">Interesse</p>
                      <div className="grid grid-cols-2 gap-3">
                        <FieldRow label="Veículo" value={cliente.veiculo_interesse} />
                        <FieldRow label="Orçamento" value={cliente.valor_negociado} />
                      </div>
                      {cliente.observacoes && (
                        <div className="mt-2 p-2.5 bg-surface-alt rounded-xl">
                          <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Observações</p>
                          <p className="text-xs text-muted-foreground">{cliente.observacoes}</p>
                        </div>
                      )}
                    </div>

                    {/* Compra */}
                    <div>
                      <p className="text-caption font-black text-muted-foreground uppercase tracking-wide mb-2">Compra</p>
                      <div className="grid grid-cols-2 gap-3">
                        <FieldRow label="Orçamento" value={cliente.valor_negociado} />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-caption font-bold text-muted-foreground uppercase tracking-wide">Possui troca</span>
                          {cliente.interesse_troca != null
                            ? <span className="text-body-sm text-foreground font-medium">{cliente.interesse_troca ? "Sim" : "Não"}</span>
                            : <span className="text-[12px] text-text-disabled italic">Não informado</span>
                          }
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-caption font-bold text-muted-foreground uppercase tracking-wide">Financiamento</span>
                          {cliente.interesse_financiamento != null
                            ? <span className="text-body-sm text-foreground font-medium">{cliente.interesse_financiamento ? "Sim" : "Não"}</span>
                            : <span className="text-[12px] text-text-disabled italic">Não informado</span>
                          }
                        </div>
                        {cliente.proposta_enviada && (
                          <div className="col-span-2">
                            <span className="text-caption bg-status-info-surface text-status-info-text px-2.5 py-1 rounded-full font-semibold border border-status-info/20">✓ Proposta enviada</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dados de contato */}
                    <div>
                      <p className="text-caption font-black text-muted-foreground uppercase tracking-wide mb-2">Contato</p>
                      <div className="grid grid-cols-2 gap-3">
                        <FieldRow label="WhatsApp" value={cliente.whatsapp} />
                        <FieldRow label="Telefone" value={cliente.telefone} />
                        <FieldRow label="E-mail" value={cliente.email} />
                        <FieldRow label="Último contato" value={cliente.ultimo_contato ? moment(cliente.ultimo_contato).fromNow() : null} />
                      </div>
                    </div>

                    {/* Objeções */}
                    {cliente.motivo_perda && (
                      <div>
                        <p className="text-caption font-black text-muted-foreground uppercase tracking-wide mb-2">Objeções</p>
                        <div className="bg-status-error-surface border border-status-error/20 rounded-xl px-3 py-2">
                          <p className="text-sm text-status-error-text">{cliente.motivo_perda}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Bloco>
              )}

              {/* ── BLOCO 5: HISTÓRICO ──────────────────────────────────── */}
              {!editando && (
                <Bloco title="Histórico da oportunidade" icon="🕐" defaultOpen={false}>
                  {historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ação registrada ainda.</p>
                  ) : (
                    <div className="space-y-0">
                      {historico.map((h, idx) => (
                        <div key={h.id} className="flex items-start gap-3 pb-4 last:pb-0 relative">
                          {/* Linha vertical */}
                          {idx < historico.length - 1 && (
                            <div className="absolute left-[7px] top-5 bottom-0 w-px bg-muted" />
                          )}
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-status-info bg-white shrink-0 mt-0.5 relative z-[var(--mx-z-sticky)]" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-foreground">{h.tipo}</p>
                              <span className="text-caption text-text-disabled shrink-0">{moment(h.created_date).format("DD/MM HH:mm")}</span>
                            </div>
                            {h.descricao && <p className="text-xs text-muted-foreground mt-0.5">{h.descricao}</p>}
                            {h.resultado && (
                              <span className="inline-block mt-1 text-caption font-semibold text-status-info-text bg-status-info-surface px-2 py-0.5 rounded-full">
                                → {h.resultado}
                              </span>
                            )}
                            {h.momento_novo && h.momento_novo !== h.momento_anterior && (
                              <p className="text-caption text-muted-foreground mt-0.5 italic">{h.momento_anterior} → {h.momento_novo}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Bloco>
              )}
            </div>

            {/* ── BARRA DE AÇÕES FIXA ────────────────────────────────────── */}
            <div className="sticky bottom-0 bg-white border-t border-border-subtle px-5 py-3 flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setEditando(e => !e); if (editando) setForm(cliente); }}
                className="rounded-xl text-sm gap-1.5 border-border"
              >
                <Pencil className="w-3.5 h-3.5" /> {editando ? "Cancelar edição" : "Editar"}
              </Button>
              {podeCancelarVenda && !editando && (
                <Button
                  variant="outline"
                  onClick={() => setCancelarVendaOpen(true)}
                  className="rounded-xl text-sm border-status-error/30 text-status-error-text hover:bg-status-error-surface"
                >
                  Cancelar venda
                </Button>
              )}
              {onExecutar && !editando && !isVendaCancelada && (
                <Button
                  onClick={() => { onClose(); onExecutar(cliente); }}
                  className="flex-1 rounded-xl bg-status-info hover:bg-status-info text-white text-sm gap-2"
                >
                  <Zap className="w-3.5 h-3.5" /> Executar próximo passo
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} className="rounded-xl text-sm text-muted-foreground hover:text-muted-foreground px-3">
                <X className="w-4 h-4" />
              </Button>
            </div>

          </div>
        )}
      </DialogContent>

      {cliente && (
        <AlterarProximoPasso
          open={alterarPassoOpen}
          onClose={() => { setAlterarPassoOpen(false); setPassoPrefill(null); }}
          cliente={passoPrefill ? { ...cliente, _prefill: passoPrefill } : cliente}
          pendencias={pendencias}
          onSalvo={handlePassoSalvo}
        />
      )}

      <CancelarVendaModal
        open={cancelarVendaOpen}
        saving={cancelandoVenda}
        resumo={cliente ? {
          cliente: cliente.nome,
          veiculo: cliente.veiculo_interesse || null,
          valor: Number(cliente.valor_negociado || 0),
        } : null}
        onConfirm={confirmarCancelarVenda}
        onClose={() => setCancelarVendaOpen(false)}
      />
    </Dialog>
  );
}
