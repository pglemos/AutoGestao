import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  X, CalendarDays, AlertTriangle, CheckCircle2, Store, Users, Globe, ShoppingCart,
  Plus, Pencil, Trash2, Star, Send
} from "lucide-react";
import moment from "moment/min/moment-with-locales";

moment.locale("pt-br");

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  "Cliente parou de responder", "Não compareceu", "Avaliação do usado não agradou",
  "Parcela acima da expectativa", "Comprou na concorrência", "Irá comprar em outro momento",
  "Não gostou do carro", "Outros",
];

const SALE_STYLE = {
  "Venda realizada": "bg-green-100 text-green-700",
  "Em negociação": "bg-status-warning-surface text-status-warning-text",
  "Em negociação ativa": "bg-status-warning-surface text-status-warning-text",
  "Venda perdida": "bg-status-error-surface text-status-error-text",
};

const CHANNEL_STYLE = {
  Carteira: "bg-green-100 text-green-700",
  Internet: "bg-status-info-surface text-status-info-text",
  Porta: "bg-status-warning-surface text-status-warning-text",
};

function Badge({ label, className }) {
  return <span className={`inline-block text-caption font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${className}`}>{label}</span>;
}

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

// ── Stepper numérico ──────────────────────────────────────────────────────────

function NumStepper({ value, onChange }) {
  const [inputVal, setInputVal] = useState(null);
  const handleFocus = (e) => { setInputVal(String(value)); setTimeout(() => e.target.select(), 0); };
  const handleChange = (e) => { setInputVal(e.target.value.replace(/\D/g, "")); };
  const commit = () => {
    const num = inputVal === "" || inputVal === null ? 0 : parseInt(inputVal, 10);
    onChange(Math.min(999, Math.max(0, isNaN(num) ? 0 : num)));
    setInputVal(null);
  };
  return (
 <div className="grid grid-cols-[44px_minmax(44px,1fr)_44px] items-center border border-border rounded-xl shadow-sm h-11 focus-within:border-status-info/50 transition-all bg-white overflow-hidden">
 <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="w-11 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-50 border-r border-border transition-colors text-[20px] font-light">−</button>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*"
        value={inputVal !== null ? inputVal : String(value)}
        onFocus={handleFocus} onChange={handleChange} onBlur={commit}
        onKeyDown={e => (e.key === "Enter" || e.key === "Tab") && commit()}
 className="w-full min-w-0 text-center font-bold text-[16px] text-foreground bg-transparent border-none outline-none h-full tabular-nums"
        style={{ boxShadow: "none" }}
      />
 <button type="button" onClick={() => onChange(Math.min(999, value + 1))} className="w-11 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-50 border-l border-border transition-colors text-[20px] font-light">+</button>
    </div>
  );
}

function FieldRow({ label, value, onChange }) {
  return (
 <div className="grid grid-cols-[minmax(0,1fr)_144px] items-center gap-3">
 <span className="text-body-sm font-semibold leading-tight text-muted-foreground min-w-0">{label}</span>
 <div className="w-36 min-w-36">
        <NumStepper value={value} onChange={onChange} />
      </div>
    </div>
  );
}

// ── Bloco Movimento do Dia ────────────────────────────────────────────────────

function MovimentoDia({ form, onChange }) {
  const set = (key, val) => onChange({ ...form, [key]: val });
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h3 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wide">Movimento do Dia</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">Informe os atendimentos realizados neste dia</p>
      </div>
      <div className="p-5 space-y-6">
        {/* Showroom */}
        <div className="bg-status-warning-surface rounded-xl border border-status-warning/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-status-warning flex items-center justify-center flex-shrink-0"><Store className="w-4 h-4 text-white" /></div>
            <span className="text-body-sm font-bold text-status-warning-text uppercase tracking-wide">Showroom</span>
          </div>
          <FieldRow label="Atendimentos" value={form.atendimentos_showroom} onChange={v => set("atendimentos_showroom", v)} />
        </div>
        {/* Carteira */}
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-white" /></div>
            <span className="text-body-sm font-bold text-green-700 uppercase tracking-wide">Carteira</span>
          </div>
          <FieldRow label="Leads recebidos" value={form.leads_carteira} onChange={v => set("leads_carteira", v)} />
          <FieldRow label="Atendimentos" value={form.atendimentos_carteira} onChange={v => set("atendimentos_carteira", v)} />
          <FieldRow label="Agendamentos D+1" value={form.agendamentos_carteira} onChange={v => set("agendamentos_carteira", v)} />
        </div>
        {/* Internet */}
        <div className="bg-status-info-surface rounded-xl border border-status-info/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-status-info flex items-center justify-center flex-shrink-0"><Globe className="w-4 h-4 text-white" /></div>
            <span className="text-body-sm font-bold text-status-info-text uppercase tracking-wide">Internet</span>
          </div>
          <FieldRow label="Leads recebidos" value={form.leads_internet} onChange={v => set("leads_internet", v)} />
          <FieldRow label="Atendimentos" value={form.atendimentos_internet} onChange={v => set("atendimentos_internet", v)} />
          <FieldRow label="Agendamentos D+1" value={form.agendamentos_internet} onChange={v => set("agendamentos_internet", v)} />
        </div>
      </div>
    </div>
  );
}

// ── Bloco Clientes (simplificado para regularização) ─────────────────────────

const EMPTY_FORM = {
  nome: "", whatsapp: "", veiculo_interesse: "", valor_negociado: "",
  visita_agendada_em: "", canal_comercial: "Carteira",
  interesse_troca: false, interesse_financiamento: false,
  situacao_atual: "Em negociação ativa", motivo_perda: "", observacoes: "",
};

function ClientesBloco({ closingDate, currentUser, clientes, onClientesChange }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const openCreate = () => { setEditingCliente(null); setForm({ ...EMPTY_FORM, visita_agendada_em: moment(closingDate).format("YYYY-MM-DDTHH:mm") }); setDialogOpen(true); };
  const openEdit = (c) => {
    setEditingCliente(c);
    setForm({
      nome: c.nome || "", whatsapp: c.whatsapp || "",
      veiculo_interesse: c.veiculo_interesse || "", valor_negociado: c.valor_negociado || "",
      visita_agendada_em: c.visita_agendada_em || "",
      canal_comercial: c.canal_comercial || "Carteira",
      interesse_troca: !!c.interesse_troca, interesse_financiamento: !!c.interesse_financiamento,
      situacao_atual: c.situacao_atual || "Em negociação ativa",
      motivo_perda: c.motivo_perda || "", observacoes: c.observacoes || "",
    });
    setDialogOpen(true);
  };

  const buildPayload = () => {
    const s = form.situacao_atual;
    let statusComercial = "Em negociação";
    let temperatura = "Morno";
    if (s === "Venda realizada") { statusComercial = "Vendido"; temperatura = "Quente"; }
    else if (s === "Venda perdida") { statusComercial = "Perdido"; temperatura = "Frio"; }
    else { statusComercial = "Em negociação"; temperatura = "Quente"; }
    return {
      nome: form.nome, whatsapp: form.whatsapp,
      veiculo_interesse: form.veiculo_interesse, valor_negociado: form.valor_negociado || "",
      visita_agendada_em: form.visita_agendada_em || null,
      canal_comercial: form.canal_comercial,
      interesse_troca: form.interesse_troca, interesse_financiamento: form.interesse_financiamento,
      situacao_atual: form.situacao_atual, status_comercial: statusComercial, temperatura,
      motivo_perda: s === "Venda perdida" ? form.motivo_perda : "",
      observacoes: form.observacoes,
      _data_competencia_fechamento: closingDate,
      origem_detalhada: `Regularização ${closingDate}`,
      ultimo_contato: new Date().toISOString(),
    };
  };

  const canSave = form.nome.trim() && form.whatsapp.trim() && form.veiculo_interesse.trim();

  const handleSave = async () => {
    setSaving(true);
    const payload = buildPayload();
    try {
      if (editingCliente) {
        const updated = await base44.entities.CarteiraCliente.update(editingCliente.id, payload);
        onClientesChange(clientes.map(c => c.id === editingCliente.id ? { ...c, ...updated } : c));
        toast({ title: "Alterações salvas." });
      } else {
        const created = await base44.entities.CarteiraCliente.create({ ...payload, vendedor_id: currentUser?.id, canal_entrada: payload.canal_comercial, ativo: true });
        await base44.entities.CarteiraHistorico.create({ cliente_id: created.id, vendedor_id: currentUser?.id, tipo: "Cadastro via Regularização", descricao: `Cliente cadastrado na regularização de ${closingDate}.` }).catch(() => {});
        onClientesChange([...clientes, created]);
        toast({ title: `${form.nome} cadastrado na Carteira.` });
      }
      setSaving(false);
      setDialogOpen(false);
    } catch {
      setSaving(false);
      toast({ title: "Não foi possível salvar. Tente novamente." });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await base44.entities.CarteiraCliente.update(deleteConfirm.id, { ativo: false }).catch(() => {});
    onClientesChange(clientes.filter(c => c.id !== deleteConfirm.id));
    setDeleteConfirm(null);
    toast({ title: "Registro removido." });
  };

  const getSaleLabel = (c) => {
    if (c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada") return "Venda realizada";
    if (c.status_comercial === "Perdido" || c.situacao_atual === "Venda perdida") return "Venda perdida";
    return c.situacao_atual || "Em negociação";
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-caption font-bold flex items-center justify-center"><ShoppingCart className="w-3 h-3" /></div>
              <h3 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wide">Cadastrar Venda / Agendamentos</h3>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">Clientes são salvos na Carteira de Clientes (base única).</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-body-sm font-bold px-4 py-2 rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>

        <div className="p-5">
          {clientes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center"><Plus className="w-5 h-5 text-purple-300" /></div>
              <p className="text-body-sm text-muted-foreground font-medium">Nenhum cliente neste fechamento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientes.map(c => {
                const saleLabel = getSaleLabel(c);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-border-subtle gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <p className="text-body-sm font-bold text-[#0F172A] truncate">{c.nome}</p>
                        <p className="text-caption text-muted-foreground truncate">{c.whatsapp} · {c.veiculo_interesse || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge label={c.canal_comercial || "—"} className={CHANNEL_STYLE[c.canal_comercial] || "bg-slate-100 text-muted-foreground"} />
                      <Badge label={saleLabel} className={SALE_STYLE[saleLabel] || "bg-slate-100 text-muted-foreground"} />
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-status-info-surface text-status-info-text transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm({ id: c.id, name: c.nome })} className="p-1.5 rounded-lg hover:bg-status-error-surface text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-purple-50/40 border-t border-purple-100/60">
          <p className="text-[12px] text-purple-700 flex items-center gap-1.5 font-medium"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />Clientes cadastrados ajudam a calcular a pontuação de Disciplina.</p>
        </div>
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!saving) setDialogOpen(v); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] font-bold text-h5">
              {editingCliente ? "Editar Cliente" : "Cadastrar Novo Cliente"}
            </DialogTitle>
            <p className="text-body-sm text-muted-foreground font-normal">Dados salvos diretamente na Carteira de Clientes.</p>
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
            <Field label="Data e Hora do Agendamento">
              <Input type="datetime-local" value={form.visita_agendada_em} onChange={e => setF("visita_agendada_em", e.target.value)} />
            </Field>
            <Field label="Canal Comercial" required>
              <Select value={form.canal_comercial} onValueChange={v => setF("canal_comercial", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carteira">Carteira</SelectItem>
                  <SelectItem value="Internet">Internet</SelectItem>
                  <SelectItem value="Porta">Porta</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Interesse em Troca">
              <Select value={form.interesse_troca ? "Sim" : "Não"} onValueChange={v => setF("interesse_troca", v === "Sim")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Interesse em Financiamento">
              <Select value={form.interesse_financiamento ? "Sim" : "Não"} onValueChange={v => setF("interesse_financiamento", v === "Sim")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Situação Comercial">
              <Select value={form.situacao_atual} onValueChange={v => setF("situacao_atual", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em negociação ativa">Em negociação</SelectItem>
                  <SelectItem value="Visita realizada">Visitou</SelectItem>
                  <SelectItem value="Venda realizada">Venda realizada</SelectItem>
                  <SelectItem value="Venda perdida">Venda perdida</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.situacao_atual === "Venda perdida" && (
              <Field label="Motivo da Perda">
                <Select value={form.motivo_perda} onValueChange={v => setF("motivo_perda", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                  <SelectContent>{LOSS_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Observações">
              <Input value={form.observacoes} onChange={e => setF("observacoes", e.target.value.slice(0, 250))} placeholder="Ex: Cliente ficou de avaliar o usado." />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border-subtle">
            <button onClick={() => setDialogOpen(false)} disabled={saving} className="px-5 py-2.5 text-body-sm font-semibold text-muted-foreground border border-border rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!canSave || saving} className="px-6 py-2.5 text-body-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition-colors">
              {saving ? "Salvando..." : "Salvar na Carteira"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-bold">Remover do fechamento?</DialogTitle></DialogHeader>
          <p className="text-body-sm text-muted-foreground mt-1">O registro de <strong>{deleteConfirm?.name}</strong> será removido deste fechamento. O cliente permanece na Carteira.</p>
          <div className="flex items-center justify-end gap-3 mt-4">
            <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2 text-body-sm font-semibold text-muted-foreground border border-border rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={confirmDelete} className="px-5 py-2 text-body-sm font-bold text-white bg-status-error hover:bg-status-error rounded-xl transition-colors">Remover</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Bloco Resumo ──────────────────────────────────────────────────────────────

function ResumoDia({ form, clientes }) {
  const totalLeads = form.leads_carteira + form.leads_internet;
  const totalAtend = form.atendimentos_showroom + form.atendimentos_carteira + form.atendimentos_internet;
  const totalAgend = form.agendamentos_carteira + form.agendamentos_internet;
  const totalVendas = clientes.filter(c => c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada").length;
  const totalFaturamento = clientes
    .filter(c => c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada")
    .reduce((sum, c) => {
      if (!c.valor_negociado) return sum;
      const num = parseFloat(c.valor_negociado.replace(/[R$\s.]/g, "").replace(",", "."));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  const stats = [
    { label: "Leads", value: totalLeads, color: "text-status-info-text" },
    { label: "Atendimentos", value: totalAtend, color: "text-purple-600" },
    { label: "Agendamentos D+1", value: totalAgend, color: "text-status-warning-text" },
    { label: "Vendas", value: totalVendas, color: "text-green-600" },
    { label: "Faturamento", value: totalFaturamento > 0 ? "R$ " + totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—", color: "text-green-700" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h3 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wide">Resumo do Dia</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 divide-x divide-y sm:divide-y-0 divide-border-subtle">
        {stats.map(s => (
          <div key={s.label} className="p-4 text-center">
            <p className={`text-h3 font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-caption text-muted-foreground font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bloco Disciplina ──────────────────────────────────────────────────────────

function DisciplinaBloco({ form, clientes }) {
  const totalAgend = form.agendamentos_carteira + form.agendamentos_internet;
  // Calcula quantos clientes têm agendamento D+1
  const agendDetalhados = clientes.filter(c => {
    if (c.status_comercial === "Vendido" || c.status_comercial === "Perdido" || c.status_comercial === "Cancelada") return false;
    if (!c.visita_agendada_em) return false;
    return true;
  }).length;

  // Pontuação base: 70% se preencheu movimento, +30% proporcional aos agendamentos detalhados
  const temMovimento = (form.atendimentos_showroom + form.atendimentos_carteira + form.atendimentos_internet + form.leads_carteira + form.leads_internet) > 0;
  const baseScore = temMovimento ? 70 : 0;
  const bonusScore = totalAgend > 0 ? Math.round(Math.min(agendDetalhados / totalAgend, 1) * 30) : 0;
  const scoreCalc = baseScore + bonusScore;
  const scoreFinal = Math.max(0, scoreCalc - 10); // -10 por atraso

  const scoreColor = scoreFinal >= 80 ? "text-green-600" : scoreFinal >= 50 ? "text-status-warning-text" : "text-status-error-text";
  const ringColor = scoreFinal >= 80 ? "#22C55E" : scoreFinal >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h3 className="text-[14px] font-bold text-[#0F172A] uppercase tracking-wide">Disciplina — Fechamento Diário</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">Estimativa com penalização de -10% por atraso</p>
      </div>
      <div className="p-5 flex items-center gap-6">
        {/* Anel */}
        <div className="relative flex-shrink-0 w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="8" />
            <circle cx="40" cy="40" r="32" fill="none" stroke={ringColor} strokeWidth="8"
              strokeDasharray={`${Math.PI * 64 * scoreFinal / 100} ${Math.PI * 64}`}
              strokeLinecap="round" className="transition-all duration-700"
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-[18px] font-bold tabular-nums ${scoreColor}`}>{scoreFinal}%</span>
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex justify-between text-body-sm">
            <span className="text-muted-foreground">Pontuação base</span>
            <span className="font-bold text-[#0F172A]">{scoreCalc}%</span>
          </div>
          <div className="flex justify-between text-body-sm">
            <span className="text-status-error font-medium">Penalização por atraso</span>
            <span className="font-bold text-status-error">-10%</span>
          </div>
          <div className="flex justify-between text-body-sm border-t border-border-subtle pt-2">
            <span className="font-bold text-[#0F172A]">Estimativa após aprovação</span>
            <span className={`font-bold text-body ${scoreColor}`}>{scoreFinal}%</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-muted-foreground">Agendamentos D+1</span>
            <span className="font-semibold text-muted-foreground">{agendDetalhados} de {totalAgend} detalhados</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────

const EMPTY_MVMT = {
  leads_carteira: 0, leads_internet: 0,
  atendimentos_showroom: 0, atendimentos_carteira: 0, atendimentos_internet: 0,
  agendamentos_carteira: 0, agendamentos_internet: 0,
};

export default function RegularizarFechamentoDrawer({ open, onClose, date, currentUser, onRegularizado }) {
  const [movimento, setMovimento] = useState(EMPTY_MVMT);
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [regularizacaoExistente, setRegularizacaoExistente] = useState(null);
  const statusReg = regularizacaoExistente?.status_solicitacao;
  const jaEnviado = statusReg === "Pendente";
  const aprovado = statusReg === "Aprovada";
  const recusado = statusReg === "Recusada";

  useEffect(() => {
    if (!open || !date || !currentUser) return;
    setSucesso(false);
    setCarregando(true);
    Promise.all([
      base44.entities.DailyClose.filter({ date }).catch(() => []),
      base44.entities.RegularizacaoFechamento.filter({ data_competencia: date }).catch(() => []),
      base44.entities.CarteiraCliente.filter({ vendedor_id: currentUser.id, _data_competencia_fechamento: date }).catch(() => []),
      base44.entities.CarteiraCliente.filter({ vendedor_id: currentUser.id, origem_detalhada: `Regularização ${date}` }).catch(() => []),
    ]).then(([closes, regs, porCompetencia, porOrigem]) => {
      const reg = regs[0] || null;
      setRegularizacaoExistente(reg);
      const source = reg || closes[0];
      if (source) {
        setMovimento({
          leads_carteira: source.leads_carteira || 0,
          leads_internet: source.leads_internet || 0,
          atendimentos_showroom: source.atendimentos_showroom || 0,
          atendimentos_carteira: source.atendimentos_carteira || 0,
          atendimentos_internet: source.atendimentos_internet || 0,
          agendamentos_carteira: source.agendamentos_carteira || 0,
          agendamentos_internet: source.agendamentos_internet || 0,
        });
      } else {
        setMovimento(EMPTY_MVMT);
      }
      // Merge clientes sem duplicatas
      const mapaIds = new Map();
      [...porCompetencia, ...porOrigem].forEach(c => { if (!mapaIds.has(c.id)) mapaIds.set(c.id, c); });
      setClientes(Array.from(mapaIds.values()).filter(c => c.ativo !== false));
      setCarregando(false);
    }).catch(() => setCarregando(false));
  }, [open, date, currentUser]);

  const totalVendas = clientes.filter(c => c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada").length;
  const totalFaturamento = clientes
    .filter(c => c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada")
    .reduce((sum, c) => {
      if (!c.valor_negociado) return sum;
      const num = parseFloat(c.valor_negociado.replace(/[R$\s.]/g, "").replace(",", "."));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  const scoreFinalEstimado = useMemo(() => {
    const temMovimento = (movimento.atendimentos_showroom + movimento.atendimentos_carteira + movimento.atendimentos_internet + movimento.leads_carteira + movimento.leads_internet) > 0;
    const baseScore = temMovimento ? 70 : 0;
    const totalAgend = movimento.agendamentos_carteira + movimento.agendamentos_internet;
    const agendDetalhados = clientes.filter(c => c.visita_agendada_em && c.status_comercial !== "Vendido" && c.status_comercial !== "Perdido" && c.status_comercial !== "Cancelada").length;
    const bonusScore = totalAgend > 0 ? Math.round(Math.min(agendDetalhados / totalAgend, 1) * 30) : 0;
    return Math.max(0, baseScore + bonusScore - 10);
  }, [movimento, clientes]);

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      const agora = new Date().toISOString();
      const payload = {
        ...movimento,
        data_competencia: date,
        vendedor_id: currentUser?.id || "",
        vendedor_nome: currentUser?.full_name || "",
        data_hora_envio: agora,
        status_solicitacao: "Pendente",
        tipo_solicitacao: "Regularização de Fechamento",
        contabilizar_no_sistema: false,
        regularizado_fora_do_prazo: true,
        enviado_para_aprovacao: true,
        pontuacao_disciplina_calculada: scoreFinalEstimado + 10,
        pontuacao_disciplina_com_penalizacao: scoreFinalEstimado,
      };

      if (regularizacaoExistente?.id) {
        await base44.entities.RegularizacaoFechamento.update(regularizacaoExistente.id, payload);
      } else {
        await base44.entities.RegularizacaoFechamento.create(payload);
      }

      // Criar/atualizar DailyClose como rascunho
      const closes = await base44.entities.DailyClose.filter({ date }).catch(() => []);
      if (closes[0]?.id) {
        await base44.entities.DailyClose.update(closes[0].id, { ...movimento, status_regularizacao: "Aguardando Aprovação" });
      } else {
        await base44.entities.DailyClose.create({ date, ...movimento, finalizado: false, status_regularizacao: "Aguardando Aprovação" });
      }

      setConfirmOpen(false);
      setSucesso(true);
      if (onRegularizado) onRegularizado(date, "Aguardando Aprovação");
    } catch (e) {
      console.error(e);
    }
    setEnviando(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-0 z-50 flex items-stretch sm:items-start sm:justify-end pointer-events-none">
        <div className="pointer-events-auto w-full sm:w-[720px] h-full bg-[#F8FAFC] flex flex-col shadow-2xl sm:rounded-l-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-border px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-[#005BFF] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] font-bold text-[#0F172A]">Regularizar Fechamento</h2>
                <span className="text-caption font-bold text-status-error-text bg-status-error-surface border border-status-error/30 px-2 py-0.5 rounded-full">Fechamento atrasado</span>
              </div>
              <p className="text-body-sm text-muted-foreground mt-0.5">
                {moment(date).format("DD/MM/YYYY")} — <span className="capitalize">{moment(date).format("dddd")}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {carregando ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-border border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : sucesso ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
                <div className="w-16 h-16 rounded-full bg-status-warning-surface border border-status-warning/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-status-warning" />
                </div>
                <div>
                  <p className="text-[18px] font-bold text-[#0F172A]">Regularização enviada!</p>
                  <p className="text-body-sm text-muted-foreground mt-1 max-w-sm">O fechamento foi salvo e está aguardando aprovação do responsável. Ele só contará nos indicadores após a aprovação.</p>
                </div>
                <button onClick={onClose} className="px-8 py-3 rounded-xl bg-[#005BFF] text-white text-[14px] font-bold hover:bg-status-info transition-colors mt-2">
                  Fechar
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-5">
                {/* Alerta status existente */}
                {jaEnviado && (
                  <div className="bg-status-warning-surface border border-status-warning/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-body-sm font-bold text-status-warning-text">Aguardando Aprovação</p>
                      <p className="text-[12px] text-status-warning-text mt-0.5">Você já enviou a regularização deste dia. Você pode atualizar os dados e reenviar se necessário.</p>
                    </div>
                  </div>
                )}
                {aprovado && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-body-sm font-bold text-green-800">Esta regularização já foi aprovada.</p>
                  </div>
                )}
                {recusado && (
                  <div className="bg-status-error-surface border border-status-error/30 rounded-xl p-4">
                    <p className="text-body-sm font-bold text-status-error-text">Regularização recusada.</p>
                    {regularizacaoExistente?.motivo_recusa && (
                      <p className="text-[12px] text-status-error-text mt-1">Motivo: {regularizacaoExistente.motivo_recusa}</p>
                    )}
                    <p className="text-[12px] text-status-error-text mt-1">Você pode enviar uma nova regularização abaixo.</p>
                  </div>
                )}

                {/* Blocos */}
                <MovimentoDia form={movimento} onChange={setMovimento} />
                <ClientesBloco closingDate={date} currentUser={currentUser} clientes={clientes} onClientesChange={setClientes} />
                <ResumoDia form={movimento} clientes={clientes} />
                <DisciplinaBloco form={movimento} clientes={clientes} />
              </div>
            )}
          </div>

          {/* Footer */}
          {!sucesso && !aprovado && !carregando && (
            <div className="bg-white border-t border-border px-5 py-4 flex items-center justify-end gap-3 flex-shrink-0">
              <button onClick={onClose} className="px-5 py-2.5 text-body-sm font-semibold text-muted-foreground border border-border rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => setConfirmOpen(true)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#005BFF] hover:bg-status-info text-white text-body-sm font-bold transition-colors shadow-sm">
                <Send className="w-4 h-4" /> Enviar Regularização
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação */}
      <Dialog open={confirmOpen} onOpenChange={v => { if (!enviando) setConfirmOpen(v); }}>
        <DialogContent className="sm:max-w-sm z-[60]">
          <DialogHeader>
            <DialogTitle className="font-bold text-[#0F172A]">Enviar regularização para aprovação?</DialogTitle>
          </DialogHeader>
          <div className="bg-status-warning-surface border border-status-warning/30 rounded-xl p-4 mt-2">
            <p className="text-body-sm text-status-warning-text leading-relaxed">
              Este fechamento foi realizado fora do prazo. Ele será salvo, mas só contará nos indicadores após aprovação do responsável.
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setConfirmOpen(false)} disabled={enviando} className="flex-1 py-2.5 rounded-xl border border-border text-body-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors">
              Não, voltar
            </button>
            <button onClick={handleEnviar} disabled={enviando} className="flex-1 py-2.5 rounded-xl bg-[#005BFF] hover:bg-status-info text-white text-body-sm font-bold transition-colors">
              {enviando ? "Enviando..." : "Sim, enviar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
