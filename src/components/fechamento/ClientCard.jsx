import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Star, ChevronDown, ChevronUp, Lock, Info, CalendarClock } from "lucide-react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import moment from "moment";
import { ModalSemCanal, ModalSemAtendimento, AvisoClienteExistente } from "@/components/fechamento/CoerenciaVendaModal";
import NovoRegistroModal from "@/components/fechamento/NovoRegistroModal";

// ── Helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_STYLE = {
  Carteira: "bg-brand-primary-subtle text-brand-primary-hover",
  Internet: "bg-status-info-surface text-status-info-text",
  Porta: "bg-status-warning-surface text-status-warning-text",
};

const SALE_STYLE = {
  "Venda Realizada": "bg-brand-primary-subtle text-brand-primary-hover",
  "Em Negociação": "bg-status-warning-surface text-status-warning-text",
  "Venda perdida": "bg-status-error-surface text-status-error-text",
  "Qualificado": "bg-status-info-surface text-status-info-text",
  "Garantia Registrada": "bg-status-warning-surface text-status-warning-text",
};

function Badge({ label, className }) {
  return <span className={`inline-block text-caption font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${className}`}>{label}</span>;
}

function formatCurrency(raw) {
  const num = raw.replace(/\D/g, "");
  if (!num) return "";
  const val = (parseInt(num, 10) / 100).toFixed(2);
  return "R$ " + parseFloat(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function formatPhone(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

const LOSS_REASONS = [
  "Cliente parou de responder",
  "Não compareceu",
  "Avaliação do usado não agradou",
  "Parcela acima da expectativa",
  "Comprou na concorrência",
  "Irá comprar em outro momento",
  "Não gostou do carro",
  "Outros",
];

const TABLE_HEADERS = [
  "Nome do Cliente", "Telefone", "Veículo", "Valor",
  "Data", "Canal", "Troca?",
  "Ficha?", "Status", "Ações",
];

const getD1Suggestion = (closingDate) => {
  const base = closingDate || moment().format("YYYY-MM-DD");
  return moment(base).add(1, "day").format("YYYY-MM-DD") + "T09:00";
};

// Verifica se um cliente da Carteira é D+1 para a data de fechamento
export function isClienteD1(cliente, closingDate) {
  if (!cliente) return false;
  if (cliente.status_comercial === "Vendido" || cliente.status_comercial === "Perdido" || cliente.status_comercial === "Cancelada") return false;
  if (!cliente.visita_agendada_em) return false;
  if (cliente._d1_excluido === true) return false;
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
  return moment(cliente.visita_agendada_em).format("YYYY-MM-DD") === d1Date;
}

// Detecta o tipo canônico do registro para ordenação e exibição
function detectarTipoRegistro(c) {
  const situacao = c.situacao_atual || "";
  const statusComercial = c.status_comercial || "";
  if (situacao === "Garantia em acompanhamento" || statusComercial === "Garantia") return "garantia";
  if (situacao === "Venda realizada" || statusComercial === "Vendido") return "venda";
  if (situacao === "Necessidade em qualificação") return "qualificado";
  if (statusComercial === "Agendado" || situacao === "Visita agendada") return "agendamento";
  if (situacao === "Venda perdida" || statusComercial === "Perdido") return "perdido";
  return "agendamento"; // default
}

// Converte registro CarteiraCliente → exibição compatível com a tabela
function clienteParaExibicao(c) {
  const tipo = detectarTipoRegistro(c);

  // Status display por tipo
  const SALE_DISPLAY_MAP = {
    garantia: "Garantia Registrada",
    venda: "Venda Realizada",
    qualificado: "Qualificado",
    perdido: "Venda perdida",
    agendamento: "Em Negociação",
  };
  const saleDisplay = SALE_DISPLAY_MAP[tipo] || "Em Negociação";

  // Veículo por tipo
  let veiculoDisplay = "—";
  if (tipo === "garantia") {
    veiculoDisplay = c.veiculo_comprado || c.veiculo_interesse || "—";
  } else if (tipo === "venda") {
    veiculoDisplay = c.veiculo_comprado || c.veiculo_interesse || "—";
  } else {
    veiculoDisplay = c.veiculo_interesse || "—";
  }

  // Data por tipo
  let dataDisplay = null;
  if (tipo === "venda") dataDisplay = c.data_venda || c.created_date;
  else if (tipo === "garantia") dataDisplay = c.data_venda || c.ultima_acao_em || c.created_date;
  else if (c.visita_agendada_em) dataDisplay = c.visita_agendada_em;
  else dataDisplay = c.data_cadastro_mx || c.created_date;

  // Valor por tipo
  let valorDisplay = "—";
  if (tipo === "venda") valorDisplay = c.valor_venda || c.valor_negociado || "—";
  else if (tipo === "garantia") valorDisplay = "—";
  else if (tipo === "qualificado") valorDisplay = c.valor_negociado || "—";
  else valorDisplay = c.valor_negociado || "—";

  return { ...c, _tipo: tipo, _saleDisplay: saleDisplay, _dataDisplay: dataDisplay, _valorDisplay: valorDisplay, _veiculoDisplay: veiculoDisplay };
}

const EMPTY_FORM = {
  nome: "", whatsapp: "", veiculo_interesse: "", valor_negociado: "",
  visita_agendada_em: moment().format("YYYY-MM-DDTHH:mm"),
  canal_comercial: "Carteira", interesse_troca: false, interesse_financiamento: false,
  situacao_atual: "Em negociação ativa", motivo_perda: "", observacoes: "",
};

const EMPTY_FORM_D1 = {
  nome: "", whatsapp: "", veiculo_interesse: "", valor_negociado: "",
  visita_agendada_em: "",
  canal_comercial: "Carteira", interesse_troca: false, interesse_financiamento: false,
  situacao_atual: "Em negociação ativa", motivo_perda: "", observacoes: "",
};

function Field({ label, required, children }) {
  return (
    <div>
      <Label className="text-caption font-bold text-[#64748B] uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClientCard({ onClientsChange, closingDate, bloqueado = false, d1Editavel = false, onAuditLog, dailyCloseId, dailyClose, onRegistroSalvo }) {
  const { toast } = useToast();
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");

  const [clientes, setClientes] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reagendConfirm, setReagendConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState(null);
  const [modoD1, setModoD1] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [novoRegistroOpen, setNovoRegistroOpen] = useState(false);

  // Coerência: estado dos modais e cliente existente encontrado
  const [coerenciaModal, setCoerenciaModal] = useState(null); // null | "sem_canal" | "sem_atendimento"
  const [pendingPayload, setPendingPayload] = useState(null);
  const [clienteExistenteNome, setClienteExistenteNome] = useState(null);

  const loadClientes = async () => {
    try {
      const me = await base44.auth.me();
      setCurrentUser(me);
      // Busca todos os registros da Carteira vinculados a este fechamento (por competência OU por origem)
      const [porCompetencia, porOrigem] = await Promise.all([
        base44.entities.CarteiraCliente.filter({
          vendedor_id: me.id,
          _data_competencia_fechamento: closingDate,
        }).catch(() => []),
        base44.entities.CarteiraCliente.filter({
          vendedor_id: me.id,
          origem_detalhada: `Fechamento ${closingDate}`,
        }).catch(() => []),
      ]);
      // Merge sem duplicatas (por id), priorizando porCompetencia
      const mapaIds = new Map();
      [...porCompetencia, ...porOrigem].forEach(c => { if (!mapaIds.has(c.id)) mapaIds.set(c.id, c); });
      // Apenas registros ativos (ativo !== false)
      const doFechamento = Array.from(mapaIds.values()).filter(c => c.ativo !== false);
      const lista = doFechamento.map(clienteParaExibicao);
      setClientes(lista);
      setLoadingClients(false);
      onClientsChange && onClientsChange(toCompatClient(lista));
    } catch {
      setLoadingClients(false);
    }
  };

  useEffect(() => { loadClientes(); }, [closingDate]);

  // Converte CarteiraCliente[] para formato legado esperado pelos KPIs
  // PRD: sale_status "Sim" = venda, "Não" = perdida, "Em Negociação" = em negociação
  function toCompatClient(lista) {
    return lista.map(c => {
      const isVendido = c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada";
      const isPerdido = c.status_comercial === "Perdido" || c.situacao_atual === "Venda perdida";
      return {
        id: c.id,
        name: c.nome,
        phone: c.whatsapp || c.telefone,
        vehicle_sought: c.veiculo_interesse,
        negotiated_value: c.valor_negociado,
        valor_venda: c.valor_venda,
        appointment_datetime: c.visita_agendada_em,
        channel: c.canal_comercial || "Carteira",
        attended: c.situacao_atual === "Visita realizada" ? "Sim" : "",
        car_evaluated: c.interesse_troca ? "Sim" : "Não",
        financing: c.interesse_financiamento ? "Aprovado" : "Não se aplica",
        sale_completed: isVendido,
        sale_status: isVendido ? "Sim" : isPerdido ? "Não" : "Em Negociação",
        loss_reason: c.motivo_perda,
        notes: c.observacoes,
        status: isVendido ? "Vendido" : isPerdido ? "Perdido" : "Em Andamento",
        status_comercial: c.status_comercial,
        situacao_atual: c.situacao_atual,
        d1_excluido: c._d1_excluido,
      };
    });
  }

  const syncClientes = (lista) => {
    setClientes(lista);
    onClientsChange && onClientsChange(toCompatClient(lista));
  };

  // Ordena registros: Agendamentos (por data crescente) → Vendas → Qualificados → Garantias
  const ordenarClientes = (lista) => {
    const getOrdem = (c) => {
      const tipo = c._tipo || "agendamento";
      if (tipo === "agendamento") return 0; // agendamentos ficam todos no grupo 0, ordenados por data
      if (tipo === "venda") return 1;
      if (tipo === "qualificado") return 2;
      if (tipo === "garantia") return 3;
      return 4;
    };
    return [...lista].sort((a, b) => {
      const oa = getOrdem(a), ob = getOrdem(b);
      if (oa !== ob) return oa - ob;
      // Dentro do mesmo grupo, ordenar por data crescente
      const da = a._dataDisplay || a.created_date || "";
      const db = b._dataDisplay || b.created_date || "";
      return da < db ? -1 : da > db ? 1 : 0;
    });
  };

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const openCreate = () => {
    setSaveError(null);
    setClienteExistenteNome(null);
    if (d1Editavel) {
      // Modo D+1: usa formulário antigo simplificado
      setModoD1(true);
      setEditingCliente(null);
      setForm({ ...EMPTY_FORM_D1, visita_agendada_em: getD1Suggestion(closingDate) });
      setDialogOpen(true);
    } else {
      // Modo normal: abre novo modal de tipo de registro
      setNovoRegistroOpen(true);
    }
  };

  const openEdit = (c, e) => {
    e.stopPropagation();
    if (bloqueado) return;
    const eD1 = isClienteD1(c, closingDate);
    if (d1Editavel && !eD1) return;
    setSaveError(null);
    setClienteExistenteNome(null);
    setModoD1(d1Editavel);
    setEditingCliente(c);
    setForm({
      nome: c.nome || "",
      whatsapp: c.whatsapp || c.telefone || "",
      veiculo_interesse: c.veiculo_interesse || "",
      valor_negociado: c.valor_negociado || "",
      visita_agendada_em: c.visita_agendada_em || getD1Suggestion(closingDate),
      canal_comercial: c.canal_comercial || "Carteira",
      interesse_troca: !!c.interesse_troca,
      interesse_financiamento: !!c.interesse_financiamento,
      situacao_atual: c.situacao_atual || "Em negociação ativa",
      motivo_perda: c.motivo_perda || "",
      observacoes: c.observacoes || "",
    });
    setDialogOpen(true);
  };

  const buildPayload = () => {
    const base = {
      nome: form.nome,
      whatsapp: form.whatsapp,
      veiculo_interesse: form.veiculo_interesse,
      valor_negociado: form.valor_negociado || "",
      visita_agendada_em: form.visita_agendada_em || null,
      canal_comercial: form.canal_comercial,
      interesse_troca: form.interesse_troca,
      interesse_financiamento: form.interesse_financiamento,
      observacoes: form.observacoes,
      ultimo_contato: new Date().toISOString(),
      // Tag para recuperar clientes deste fechamento
      _data_competencia_fechamento: closingDate,
      origem_detalhada: `Fechamento ${closingDate}`,
    };
    if (modoD1) {
      // D+1 = sempre Em Negociação (PRD seção 7)
      return {
        ...base,
        situacao_atual: "Em negociação ativa",
        status_comercial: "Em negociação",
        temperatura: "Quente",
      };
    }
    const s = form.situacao_atual;
    // PRD seções 5.1, 5.2, 5.3: mapeamento correto de situação → status_comercial
    let statusComercial = "Em negociação"; // default: Em Negociação
    let situacaoCarteira = s;
    let temperatura = "Morno";
    if (s === "Venda realizada") {
      statusComercial = "Vendido";
      situacaoCarteira = "Venda realizada";
      temperatura = "Quente";
    } else if (s === "Venda perdida") {
      statusComercial = "Perdido";
      situacaoCarteira = "Venda perdida";
      temperatura = "Frio";
    } else if (s === "Qualificado") {
      statusComercial = "Em negociação";
      situacaoCarteira = "Necessidade em qualificação";
      temperatura = "Quente";
    } else {
      // Em negociação / Visitou — permanece ativo
      statusComercial = "Em negociação";
      temperatura = "Quente";
    }
    return {
      ...base,
      situacao_atual: situacaoCarteira,
      status_comercial: statusComercial,
      temperatura,
      motivo_perda: s === "Venda perdida" ? form.motivo_perda : "",
      // Funil, faturamento, comissão futura alimentados pelo status_comercial = Vendido
    };
  };

  const isReagendamento = (original, payload) => {
    if (!d1Editavel) return false;
    if (!isClienteD1(original, closingDate)) return false;
    return !isClienteD1({ ...original, ...payload }, closingDate);
  };

  // Retorna atendimentos do dia por canal a partir do DailyClose
  const getAtendimentosDia = () => ({
    Showroom: dailyClose?.atendimentos_showroom || 0,
    Carteira: dailyClose?.atendimentos_carteira || 0,
    Internet: dailyClose?.atendimentos_internet || 0,
  });

  // Calcula canal sugerido quando só há atendimento em um canal
  const getCanalSugerido = (atend) => {
    const comAtend = Object.entries(atend).filter(([, v]) => v > 0);
    return comAtend.length === 1 ? comAtend[0][0] : null;
  };

  // Busca cliente existente na Carteira pelo telefone
  const buscarClienteExistente = async (whatsapp) => {
    if (!whatsapp || !currentUser) return null;
    const tel = whatsapp.replace(/\D/g, "");
    const existentes = await base44.entities.CarteiraCliente.filter({ vendedor_id: currentUser.id }).catch(() => []);
    return existentes.find(c => (c.whatsapp || c.telefone || "").replace(/\D/g, "") === tel && c.ativo !== false && c._data_competencia_fechamento !== closingDate) || null;
  };

  const handleSave = async () => {
    setSaveError(null);
    const payload = buildPayload();
    if (editingCliente && isReagendamento(editingCliente, payload)) {
      setReagendConfirm({ id: editingCliente.id, clientName: editingCliente.nome, novaData: payload.visita_agendada_em, novoCanal: payload.canal_comercial, payload });
      return;
    }

    // ── Validação de coerência apenas para Venda realizada ─────────────────
    const isVenda = payload.status_comercial === "Vendido";
    if (isVenda && !modoD1) {
      // CASO 4: verificar cliente existente na Carteira pelo telefone
      const existente = await buscarClienteExistente(form.whatsapp);
      setClienteExistenteNome(existente ? existente.nome : null);

      const atend = getAtendimentosDia();
      const canal = payload.canal_comercial;

      // CASO 2: Venda sem canal informado
      if (!canal) {
        setPendingPayload(payload);
        setCoerenciaModal("sem_canal");
        return;
      }

      // CASO 3: Venda com canal, mas sem atendimento no canal hoje
      const atendNoCanal = atend[canal] || 0;
      if (atendNoCanal === 0) {
        setPendingPayload(payload);
        setCoerenciaModal("sem_atendimento");
        return;
      }
    }

    await executarSave(payload);
  };

  // ── Handlers dos modais de coerência ─────────────────────────────────────

  const fecharCoerencia = () => { setCoerenciaModal(null); setPendingPayload(null); };

  // Caso 2 — confirmou sugestão de canal
  const onConfirmarSugestaoCanal = (canal) => {
    const p = { ...pendingPayload, canal_comercial: canal, canalOrigemConfirmado: true, origemConfirmacaoVenda: "Atendimento do dia", vendaDeAtendimentoAnterior: false, alertaCoerenciaResolvido: true };
    fecharCoerencia();
    executarSave(p);
  };

  // Caso 2 — escolheu outro canal
  const onEscolherOutroCanal = (canal) => {
    const p = { ...pendingPayload, canal_comercial: canal, canalOrigemConfirmado: true, origemConfirmacaoVenda: "Informado manualmente", vendaDeAtendimentoAnterior: false, alertaCoerenciaResolvido: true };
    fecharCoerencia();
    executarSave(p);
  };

  // Caso 2 — salvar sem canal
  const onSalvarSemCanal = () => {
    const p = { ...pendingPayload, canalOrigemConfirmado: false, origemConfirmacaoVenda: "Não informado", alertaCoerenciaResolvido: true };
    fecharCoerencia();
    executarSave(p);
  };

  // Caso 3 — atendimento anterior
  const onAtendimentoAnterior = () => {
    const p = { ...pendingPayload, vendaDeAtendimentoAnterior: true, canalOrigemConfirmado: true, origemConfirmacaoVenda: "Atendimento anterior", alertaCoerenciaResolvido: true };
    fecharCoerencia();
    executarSave(p);
  };

  // Caso 3 — vincular carteira (fecha modal, deixa vendedor buscar manualmente — salva como atendimento anterior)
  const onVincularCarteira = () => {
    const p = { ...pendingPayload, vendaDeAtendimentoAnterior: true, canalOrigemConfirmado: true, origemConfirmacaoVenda: "Cliente existente na Carteira", alertaCoerenciaResolvido: true };
    fecharCoerencia();
    executarSave(p);
  };

  // Caso 3 — corrigir (fecha modal, volta para o formulário)
  const onCorrigir = () => { fecharCoerencia(); };

  // Caso 3 — salvar mesmo assim
  const onSalvarMesmoAssim = () => {
    const p = { ...pendingPayload, vendaDeAtendimentoAnterior: true, canalOrigemConfirmado: false, origemConfirmacaoVenda: "Informado manualmente", alertaCoerenciaResolvido: true };
    fecharCoerencia();
    executarSave(p);
  };

  const executarSave = async (payload, clienteOriginal) => {
    setSaving(true);
    setSaveError(null);
    const original = clienteOriginal || editingCliente;
    try {
      if (original) {
        const anteriorD1 = isClienteD1(original, closingDate);
        const updated = await base44.entities.CarteiraCliente.update(original.id, payload);
        const novoD1 = isClienteD1({ ...original, ...payload }, closingDate);
        // Audit logs
        if (d1Editavel && onAuditLog) {
          if (payload.canal_comercial && payload.canal_comercial !== original.canal_comercial) {
            onAuditLog({ tipo_alteracao: "Canal alterado", cliente_id: original.id, valor_anterior: original.canal_comercial, valor_novo: payload.canal_comercial });
          }
          if (payload.visita_agendada_em && payload.visita_agendada_em !== original.visita_agendada_em) {
            onAuditLog({ tipo_alteracao: "Data alterada", cliente_id: original.id, valor_anterior: original.visita_agendada_em, valor_novo: payload.visita_agendada_em });
          }
          if (anteriorD1 && !novoD1) onAuditLog({ tipo_alteracao: "Agendamento saiu do D+1", cliente_id: original.id, valor_anterior: original.visita_agendada_em, valor_novo: payload.visita_agendada_em });
          if (!anteriorD1 && novoD1) onAuditLog({ tipo_alteracao: "Agendamento entrou no D+1", cliente_id: original.id, valor_anterior: original.visita_agendada_em, valor_novo: payload.visita_agendada_em });
        }
        await base44.entities.CarteiraHistorico.create({
          cliente_id: original.id, vendedor_id: currentUser?.id,
          tipo: "Atualização via Fechamento", descricao: `Dados atualizados no fechamento de ${closingDate}.`,
        }).catch(() => {});
        const next = clientes.map(c => c.id === original.id ? clienteParaExibicao({ ...c, ...updated }) : c);
        syncClientes(next);
        toast({ title: "Alterações salvas." });
      } else {
        // Novo cliente — cria sempre um novo registro no fechamento
        // (não reutiliza existentes pelo WhatsApp para evitar sobrescrever dados de outros fechamentos)
        const created = await base44.entities.CarteiraCliente.create({
          ...payload,
          vendedor_id: currentUser?.id,
          canal_entrada: payload.canal_comercial,
          ativo: true,
        });
        await base44.entities.CarteiraHistorico.create({
          cliente_id: created.id, vendedor_id: currentUser?.id,
          tipo: "Cadastro via Fechamento", descricao: `Cliente cadastrado no fechamento de ${closingDate}.`,
        }).catch(() => {});
        if (d1Editavel && onAuditLog && isClienteD1(created, closingDate)) {
          onAuditLog({ tipo_alteracao: "Agendamento adicionado", cliente_id: created.id, valor_anterior: "", valor_novo: `${created.nome} – ${created.canal_comercial}` });
        }
        try {
          const next = [...clientes, clienteParaExibicao(created)];
          syncClientes(next);
        } catch (syncErr) {
          console.warn("[ClientCard] Registro salvo, mas a atualização local falhou. Recarregando lista:", syncErr);
          await loadClientes();
        }
        toast({ title: d1Editavel ? "Agendamento salvo." : `${form.nome} cadastrado na Carteira.` });
      }
      setSaving(false);
      setDialogOpen(false);
      setReagendConfirm(null);
    } catch (err) {
      console.error("[ClientCard] Falha ao salvar registro:", err);
      setSaving(false);
      const message = err?.message || err?.details || err?.hint || "Não foi possível salvar. Tente novamente.";
      setSaveError(message);
    }
  };

  const confirmarReagendamento = async () => {
    if (!reagendConfirm) return;
    const { id, payload } = reagendConfirm;
    const original = clientes.find(c => c.id === id);
    setReagendConfirm(null);
    await executarSave(payload, original);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    const clienteToDelete = clientes.find(c => c.id === id);
    setDeleteConfirm(null);
    try {
      if (d1Editavel && clienteToDelete && isClienteD1(clienteToDelete, closingDate)) {
        // Soft-delete D+1: preserva o registro na Carteira, apenas retira do D+1
        await base44.entities.CarteiraCliente.update(id, {
          _d1_excluido: true,
          situacao_atual: "Venda perdida",
          status_comercial: "Perdido",
          motivo_perda: "Agendamento D+1 excluído",
        });
        if (onAuditLog) {
          onAuditLog({ tipo_alteracao: "Agendamento excluído", cliente_id: id, valor_anterior: clienteToDelete.visita_agendada_em, valor_novo: "" });
          onAuditLog({ tipo_alteracao: "Agendamento saiu do D+1", cliente_id: id, valor_anterior: clienteToDelete.visita_agendada_em, valor_novo: "" });
        }
        const next = clientes.map(c => c.id === id
          ? clienteParaExibicao({ ...c, _d1_excluido: true, situacao_atual: "Venda perdida", status_comercial: "Perdido" })
          : c
        );
        syncClientes(next);
      } else {
        // Remove do fechamento marcando como inativo (mantém na Carteira com histórico)
        await base44.entities.CarteiraCliente.update(id, { ativo: false });
        const next = clientes.filter(c => c.id !== id);
        syncClientes(next);
      }
      toast({ title: d1Editavel ? "Agendamento excluído." : "Registro removido do fechamento." });
    } catch {
      toast({ title: "Não foi possível excluir. Tente novamente." });
    }
  };

  const podeEditar = (c) => {
    if (bloqueado) return false;
    if (d1Editavel) return isClienteD1(c, closingDate);
    return true;
  };

  const podeExcluir = (c) => {
    if (bloqueado) return false;
    if (d1Editavel) return isClienteD1(c, closingDate);
    return true;
  };

  const displayVal = (v, fallback = "—") => v || fallback;

  // Badge de tipo ao lado do nome
  const TIPO_BADGE_FIXED = {
    venda: { label: "$", cls: "text-status-success-text bg-brand-primary-subtle" },
    qualificado: { label: "Q", cls: "text-status-info-text bg-status-info-surface" },
    garantia: { label: "!", cls: "text-status-warning-text bg-status-warning-surface" },
    perdido: { label: "✕", cls: "text-muted-foreground bg-muted" },
  };

  const getTipoBadge = (c) => {
    const tipo = c._tipo || "agendamento";
    if (tipo === "agendamento" && c.visita_agendada_em) {
      const diffDias = moment(c.visita_agendada_em).startOf("day").diff(moment(closingDate).startOf("day"), "days");
      if (diffDias >= 1) {
        return { label: `D+${diffDias}`, cls: diffDias === 1 ? "text-status-info-text bg-status-info-surface" : "text-status-info-text bg-status-info-surface" };
      }
      return null;
    }
    return TIPO_BADGE_FIXED[tipo] || null;
  };

  const renderRow = (c) => {
    const saleDisplay = c._saleDisplay || "Em Negociação";
    const tipo = c._tipo || "agendamento";
    const isGarantia = tipo === "garantia";
    const isExpanded = expandedId === c.id;
    const canEdit = podeEditar(c);
    const canDelete = podeExcluir(c);
    const eD1 = isClienteD1(c, closingDate);
    const rowDim = (bloqueado || d1Editavel) && !eD1;
    const tipoBadge = getTipoBadge(c);

    return (
      <React.Fragment key={c.id}>
        <tr
          onClick={() => canEdit && setExpandedId(isExpanded ? null : c.id)}
          className={`border-b border-[#F1F5F9] transition-colors group ${
            rowDim ? "opacity-40 cursor-default"
            : isExpanded ? "bg-status-info-surface/30 cursor-pointer"
            : "hover:bg-[#F8FAFC] cursor-pointer"
          }`}
        >
          <td className="px-4 py-3 font-semibold text-[#0F172A] whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              {canEdit
                ? isExpanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-status-info-text flex-shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-text-disabled group-hover:text-muted-foreground flex-shrink-0" />
                : <Lock className="w-3.5 h-3.5 text-text-disabled flex-shrink-0" />
              }
              {c.nome}
              {tipoBadge && (
                <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full ml-1 ${tipoBadge.cls}`}>
                  {tipoBadge.label}
                </span>
              )}
            </div>
          </td>
          <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{displayVal(c.whatsapp || c.telefone)}</td>
          <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{c._veiculoDisplay || "—"}</td>
          <td className="px-4 py-3 text-[#0F172A] font-medium whitespace-nowrap">{c._valorDisplay || "—"}</td>
          <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
            {c._dataDisplay ? moment(c._dataDisplay).format("DD/MM/YYYY") : "—"}
          </td>
          <td className="px-4 py-3">
            {isGarantia ? <span className="text-[#64748B] text-body-sm">—</span> : <Badge label={c.canal_comercial || "—"} className={CHANNEL_STYLE[c.canal_comercial] || "bg-muted text-muted-foreground"} />}
          </td>
          <td className="px-4 py-3">
            {isGarantia ? <span className="text-[#64748B] text-body-sm">—</span> : <Badge label={c.interesse_troca ? "Sim" : "Não"} className={c.interesse_troca ? "bg-brand-primary-subtle text-brand-primary-hover" : "bg-status-error-surface text-status-error-text"} />}
          </td>
          <td className="px-4 py-3">
            {isGarantia ? <span className="text-[#64748B] text-body-sm">—</span> : <Badge label={c.interesse_financiamento ? "Sim" : "Não"} className={c.interesse_financiamento ? "bg-brand-primary-subtle text-brand-primary-hover" : "bg-muted text-muted-foreground"} />}
          </td>
          <td className="px-4 py-3"><Badge label={saleDisplay} className={SALE_STYLE[saleDisplay] || "bg-muted text-muted-foreground"} /></td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <button onClick={(e) => canEdit && openEdit(c, e)} disabled={!canEdit}
                className={`p-1.5 rounded-lg transition-colors ${canEdit ? "hover:bg-status-info-surface text-status-info-text" : "text-text-disabled cursor-not-allowed"}`}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); canDelete && setDeleteConfirm({ id: c.id, name: c.nome }); }} disabled={!canDelete}
                className={`p-1.5 rounded-lg transition-colors ${canDelete ? "hover:bg-status-error-surface text-[#EF4444]" : "text-text-disabled cursor-not-allowed"}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        </tr>
      </React.Fragment>
    );
  };

  // PRD: data do agendamento obrigatória apenas quando Em Negociação/Visitou; não exigir para Venda Realizada/Perdida
  const precisaData = form.situacao_atual !== "Venda realizada" && form.situacao_atual !== "Venda perdida";
  const canSave = form.nome.trim() && form.whatsapp.trim() && form.veiculo_interesse.trim() && (!precisaData || form.visita_agendada_em);

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-5 h-5 rounded-full bg-status-info text-white text-caption font-bold flex items-center justify-center flex-shrink-0">4</span>
              <h2 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wide">Cadastrar Venda/Agendamentos</h2>
              <InfoTooltip text="Registros criados aqui são salvos diretamente na Carteira de Clientes — base única do sistema. Nenhum dado é duplicado." />
            </div>
            <p className="text-[12px] text-[#64748B] mt-0.5">Clientes são salvos na Carteira de Clientes (base única).</p>
          </div>
          {!bloqueado && (
            <button onClick={openCreate}
              className="flex items-center gap-1.5 bg-status-info hover:bg-status-info active:scale-95 transition-all text-white text-body-sm font-bold px-4 py-2 rounded-xl shadow-[var(--mx-button-shadow)] ml-4 flex-shrink-0">
              <Plus className="w-4 h-4" />
              {d1Editavel ? "Novo Agendamento D+1" : "Novo Cliente"}
            </button>
          )}
        </div>

        {d1Editavel && (
          <div className="px-6 py-2.5 bg-status-info-surface border-b border-status-info/20 flex items-center gap-2">
            <Info className="w-4 h-4 text-status-info-text flex-shrink-0" />
            <p className="text-[12px] font-semibold text-[#1e3a5f]">
              Fechamento concluído. Somente registros <span className="text-status-info-text">D+1</span> podem ser editados.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                {TABLE_HEADERS.map(h => (
                  <th key={h} className="text-left text-caption font-bold text-[#64748B] uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingClients ? (
                <tr><td colSpan={10} className="text-center py-14">
                  <div className="w-6 h-6 border-4 border-border border-t-status-info rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-status-info-surface flex items-center justify-center">
                      <Plus className="w-5 h-5 text-status-info-text" />
                    </div>
                    <p className="text-body-sm text-[#64748B] font-medium">Nenhum cliente neste fechamento.</p>
                    <p className="text-[12px] text-text-disabled">Clique em "Novo Cliente" para adicionar.</p>
                  </div>
                </td></tr>
              ) : ordenarClientes(clientes).map(renderRow)}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-status-info-surface/40 border-t border-status-info/60">
          <p className="text-[12px] text-status-info-text flex items-center gap-1.5 font-medium">
            <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
            Clientes cadastrados ajudam a aumentar sua pontuação em Disciplina (30% dos pontos).
          </p>
        </div>
      </div>

      {/* ── Modal: Criar / Editar ── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!saving) { setDialogOpen(v); setSaveError(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] font-bold text-h5">
              {editingCliente
                ? (modoD1 ? "Editar Agendamento D+1" : "Editar Cliente")
                : (modoD1 ? "Novo Agendamento D+1" : "Cadastrar Novo Cliente")}
            </DialogTitle>
            {modoD1 ? (
              <div className="mt-1.5 px-3 py-2 bg-status-info-surface border border-status-info/30 rounded-lg flex items-start gap-2">
                <CalendarClock className="w-4 h-4 text-status-info-text mt-0.5 flex-shrink-0" />
                <p className="text-[12px] font-semibold text-[#1e3a5f]">
                  Este cadastro será considerado um Agendamento D+1 e salvo na Carteira de Clientes.
                </p>
              </div>
            ) : (
              <p className="text-body-sm text-[#64748B] mt-0.5 font-normal">
                Dados salvos diretamente na Carteira de Clientes (base única do sistema).
              </p>
            )}
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <Field label="Nome do Cliente" required>
              <Input value={form.nome} onChange={e => setF("nome", e.target.value.toUpperCase())} placeholder="Ex: JOÃO SANTOS" />
            </Field>
            <Field label="WhatsApp / Telefone" required>
              <Input value={form.whatsapp} onChange={e => setF("whatsapp", formatPhone(e.target.value))} placeholder="(11) 98765-4321" maxLength={15} />
            </Field>
            <Field label="Veículo de Interesse" required>
              <Input value={form.veiculo_interesse} onChange={e => setF("veiculo_interesse", e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT" />
            </Field>
            <Field label="Valor Negociado">
              <Input value={form.valor_negociado} onChange={e => setF("valor_negociado", formatCurrency(e.target.value))} placeholder="R$ 68.900,00" />
            </Field>
            <Field label="Data e Hora do Agendamento" required>
              <Input type="datetime-local" value={form.visita_agendada_em} onChange={e => setF("visita_agendada_em", e.target.value)} />
            </Field>
            <Field label="Canal Comercial" required>
              <Select value={form.canal_comercial} onValueChange={v => setF("canal_comercial", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carteira">Carteira</SelectItem>
                  <SelectItem value="Internet">Internet</SelectItem>
                  {!modoD1 && <SelectItem value="Porta">Porta</SelectItem>}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Interesse em Troca">
              <Select value={form.interesse_troca ? "Sim" : "Não"} onValueChange={v => setF("interesse_troca", v === "Sim")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Interesse em Financiamento">
              <Select value={form.interesse_financiamento ? "Sim" : "Não"} onValueChange={v => setF("interesse_financiamento", v === "Sim")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Situação Comercial">
              {modoD1 ? (
                <div className="h-10 flex items-center px-3 bg-surface-alt border border-border rounded-lg text-body-sm text-muted-foreground font-semibold cursor-not-allowed">
                  Em negociação ativa
                </div>
              ) : (
                <Select value={form.situacao_atual} onValueChange={v => setF("situacao_atual", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em negociação ativa">Em negociação</SelectItem>
                    <SelectItem value="Visita realizada">Visitou</SelectItem>
                    <SelectItem value="Qualificado">Qualificado</SelectItem>
                    <SelectItem value="Venda realizada">Venda realizada</SelectItem>
                    <SelectItem value="Venda perdida">Venda perdida</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>
            {form.situacao_atual === "Venda perdida" && !modoD1 && (
              <Field label="Motivo da Perda">
                <Select value={form.motivo_perda} onValueChange={v => setF("motivo_perda", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                  <SelectContent>
                    {LOSS_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Observações">
              <Input value={form.observacoes} onChange={e => setF("observacoes", e.target.value.slice(0, 250))} placeholder="Ex: Cliente ficou de avaliar o usado." />
            </Field>
          </div>
          <AvisoClienteExistente nome={clienteExistenteNome} />

          {saveError && <p className="text-[12px] text-[#EF4444] font-semibold mt-3 px-1">{saveError}</p>}

          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border-subtle">
            <button onClick={() => { setDialogOpen(false); setSaveError(null); }} disabled={saving}
              className="px-5 py-2.5 text-body-sm font-semibold text-[#64748B] border border-[#E5E7EB] rounded-xl hover:bg-surface-alt transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!canSave || saving}
              className="px-6 py-2.5 text-body-sm font-bold text-white bg-status-info hover:bg-status-info disabled:opacity-50 rounded-xl transition-colors shadow-[var(--mx-button-shadow)]">
              {saving ? "Salvando..." : modoD1 ? "Salvar Agendamento" : "Salvar na Carteira"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Confirmar Reagendamento ── */}
      <Dialog open={!!reagendConfirm} onOpenChange={v => { if (!v && !saving) setReagendConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] font-bold">Confirmar reagendamento?</DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-[#64748B] mt-1 leading-relaxed">
            <strong className="text-[#0F172A]">{reagendConfirm?.clientName}</strong> deixará de fazer parte dos Agendamentos D+1 desta data e continuará disponível na Carteira de Clientes.
          </p>
          {saveError && <p className="text-[12px] text-[#EF4444] font-semibold mt-2">{saveError}</p>}
          <div className="flex items-center justify-end gap-3 mt-4">
            <button onClick={() => setReagendConfirm(null)} disabled={saving}
              className="px-5 py-2 text-body-sm font-semibold text-[#64748B] border border-[#E5E7EB] rounded-xl hover:bg-surface-alt transition-colors">
              Cancelar
            </button>
            <button onClick={confirmarReagendamento} disabled={saving}
              className="px-5 py-2 text-body-sm font-bold text-white bg-[#005BFF] hover:bg-status-info disabled:opacity-50 rounded-xl transition-colors">
              {saving ? "Salvando..." : "Confirmar Reagendamento"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Confirmar Exclusão ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] font-bold">Remover do fechamento?</DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-[#64748B] mt-1 leading-relaxed">
            O registro de <strong className="text-[#0F172A]">{deleteConfirm?.name}</strong> será removido deste fechamento. O cliente e seu histórico permanecem na Carteira.
          </p>
          <div className="flex items-center justify-end gap-3 mt-4">
            <button onClick={() => setDeleteConfirm(null)}
              className="px-5 py-2 text-body-sm font-semibold text-[#64748B] border border-[#E5E7EB] rounded-xl hover:bg-surface-alt transition-colors">
              Cancelar
            </button>
            <button onClick={confirmDelete}
              className="px-5 py-2 text-body-sm font-bold text-white bg-[#EF4444] hover:bg-status-error rounded-xl transition-colors">
              Remover
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Novo Registro (Agendamento/Venda/Garantia/Qualificado) ── */}
      <NovoRegistroModal
        open={novoRegistroOpen}
        onClose={() => setNovoRegistroOpen(false)}
        closingDate={closingDate}
        dailyCloseId={dailyCloseId}
        currentUser={currentUser}
        onSaved={(payload) => {
          loadClientes();
          onRegistroSalvo && onRegistroSalvo(payload);
        }}
      />

      {/* ── Modais de Coerência ── */}
      <ModalSemCanal
        open={coerenciaModal === "sem_canal"}
        canalSugerido={coerenciaModal === "sem_canal" ? getCanalSugerido(getAtendimentosDia()) : null}
        onConfirmarSugestao={onConfirmarSugestaoCanal}
        onEscolherOutro={onEscolherOutroCanal}
        onSalvarSemCanal={onSalvarSemCanal}
      />
      <ModalSemAtendimento
        open={coerenciaModal === "sem_atendimento"}
        canal={pendingPayload?.canal_comercial || ""}
        onAtendimentoAnterior={onAtendimentoAnterior}
        onVincularCarteira={onVincularCarteira}
        onCorrigir={onCorrigir}
        onSalvarMesmoAssim={onSalvarMesmoAssim}
      />
    </>
  );
}
