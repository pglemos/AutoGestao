import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import NovoRegistroModal from "@/components/fechamento/NovoRegistroModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from '@/lib/toast'
import { Plus, Lock, Info, CalendarClock } from "lucide-react";
import { isClienteD1 } from "@/components/fechamento/ClientCard";
import moment from "moment";

const LOSS_REASONS = [
  "Cliente parou de responder", "Não compareceu", "Avaliação do usado não agradou",
  "Parcela acima da expectativa", "Comprou na concorrência", "Irá comprar em outro momento",
  "Não gostou do carro", "Outros",
];

const getD1Suggestion = (closingDate) => {
  const base = closingDate || moment().format("YYYY-MM-DD");
  return moment(base).add(1, "day").format("YYYY-MM-DD") + "T09:00";
};

const EMPTY_FORM = {
  name: "", phone: "", vehicle_sought: "", negotiated_value: "",
  appointment_datetime: moment().format("YYYY-MM-DDTHH:mm"),
  channel: "Carteira", attended: "", car_evaluated: "",
  signal: "", financing: "", sale_completed: "Em Negociação", loss_reason: "", notes: "",
};

const EMPTY_FORM_D1 = {
  name: "", phone: "", vehicle_sought: "", negotiated_value: "",
  appointment_datetime: "",
  channel: "Carteira", attended: "", car_evaluated: "",
  signal: "", financing: "", sale_completed: "Em Negociação", loss_reason: "", notes: "",
};

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

function Field({ label, required, children }) {
  return (
    <div>
      <Label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// Responsável apenas por: botão "Novo Cliente", modais criar/editar/excluir.
// A lista de clientes é renderizada pelo componente pai via ClientesListaMobile.

export default function ClientCardMobile({
  onClientsChange,
  closingDate,
  bloqueado = false,
  d1Editavel = false,
  onAuditLog,
  dailyCloseId,
  clients: clientsProp,
  onRegistroSalvo,
  // Refs externos para edição/exclusão vindos da lista
  editingClientExterno,
  onEditExternoHandled,
  deleteConfirmExterno,
  onDeleteExternoHandled,
}) {

  const today = moment().format("YYYY-MM-DD");

  const [currentUser, setCurrentUser] = useState(null);
  const [novoRegistroOpen, setNovoRegistroOpen] = useState(false);
  const [clients, setClients] = useState(clientsProp || []);
  const [loadingClients, setLoadingClients] = useState(!clientsProp);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modoD1, setModoD1] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Sync when parent passes clients
  useEffect(() => {
    if (clientsProp) {
      setClients(clientsProp);
      setLoadingClients(false);
    }
  }, [clientsProp]);

  const loadClients = async () => {
    const all = await base44.entities.Client.filter({}).catch(() => []);
    const todayClients = all.filter(c => moment(c.created_date).format("YYYY-MM-DD") === today);
    setClients(todayClients);
    setLoadingClients(false);
    onClientsChange && onClientsChange(todayClients);
  };

  useEffect(() => {
    if (!clientsProp) loadClients();
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Recebe pedido de edição vindo de fora (ClientesListaMobile)
  useEffect(() => {
    if (editingClientExterno) {
      openEdit(editingClientExterno);
      onEditExternoHandled && onEditExternoHandled();
    }
  }, [editingClientExterno]);

  // Recebe pedido de exclusão vindo de fora (ClientesListaMobile)
  useEffect(() => {
    if (deleteConfirmExterno) {
      setDeleteConfirm({ id: deleteConfirmExterno.id, name: deleteConfirmExterno.name, client: deleteConfirmExterno });
      onDeleteExternoHandled && onDeleteExternoHandled();
    }
  }, [deleteConfirmExterno]);

  const syncClients = (updated) => {
    setClients(updated);
    onClientsChange && onClientsChange(updated);
  };

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const openCreate = () => {
    setSaveError(null);
    if (d1Editavel) {
      // Modo D+1: usa formulário legado simplificado
      setModoD1(true);
      setEditingClient(null);
      setForm({ ...EMPTY_FORM_D1, appointment_datetime: getD1Suggestion(closingDate) });
      setDialogOpen(true);
    } else {
      // Modo normal: abre o NovoRegistroModal (base única)
      setNovoRegistroOpen(true);
    }
  };

  const openEdit = (c) => {
    if (bloqueado) return;
    const eD1 = isClienteD1(c, closingDate);
    if (d1Editavel && !eD1) return;
    setSaveError(null);
    setModoD1(d1Editavel);
    setEditingClient(c);
    setForm({
      name: c.name || "", phone: c.phone || "", vehicle_sought: c.vehicle_sought || "",
      negotiated_value: c.negotiated_value || "",
      appointment_datetime: c.appointment_datetime || getD1Suggestion(closingDate),
      channel: c.channel || "Carteira", attended: c.attended || "", car_evaluated: c.car_evaluated || "",
      signal: c.signal || "", financing: c.financing || "",
      sale_completed: c.sale_status === "Em Negociação" ? "Em Negociação" : c.sale_status === "Sim" ? "Sim" : "Não",
      loss_reason: c.loss_reason || "", notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const buildPayload = () => {
    const saleVal = form.sale_completed;
    if (modoD1) {
      return {
        name: form.name, phone: form.phone, vehicle_sought: form.vehicle_sought,
        negotiated_value: form.negotiated_value || "", appointment_datetime: form.appointment_datetime,
        channel: form.channel, attended: form.attended || null, car_evaluated: form.car_evaluated || null,
        signal: form.signal || "", financing: form.financing || null,
        sale_completed: false, sale_status: "Em Negociação", status: "Em Andamento",
        notes: form.notes, d1_excluido: false,
      };
    }
    return {
      name: form.name, phone: form.phone, vehicle_sought: form.vehicle_sought,
      negotiated_value: form.negotiated_value, appointment_datetime: form.appointment_datetime,
      channel: form.channel, attended: form.attended || null, car_evaluated: form.car_evaluated || null,
      signal: form.signal, financing: form.financing || null,
      sale_completed: saleVal === "Sim", sale_status: saleVal,
      loss_reason: saleVal === "Não" ? form.loss_reason : "", notes: form.notes,
      status: saleVal === "Sim" ? "Vendido" : saleVal === "Não" ? "Perdido" : "Em Andamento",
    };
  };

  const handleSave = async () => {
    setSaveError(null);
    const payload = buildPayload();
    setSaving(true);
    try {
      if (editingClient) {
        const updated = await base44.entities.Client.update(editingClient.id, payload);
        if (d1Editavel && onAuditLog) {
          if (payload.appointment_datetime && payload.appointment_datetime !== editingClient.appointment_datetime) {
            onAuditLog({ tipo_alteracao: "Data alterada", cliente_id: editingClient.id, valor_anterior: editingClient.appointment_datetime, valor_novo: payload.appointment_datetime });
          }
        }
        const next = clients.map(c => c.id === editingClient.id ? { ...c, ...updated } : c);
        syncClients(next);
        toast.info("Alterações salvas.");
      } else {
        const created = await base44.entities.Client.create(payload);
        if (d1Editavel && onAuditLog && isClienteD1(created, closingDate)) {
          onAuditLog({ tipo_alteracao: "Agendamento adicionado", cliente_id: created.id, valor_anterior: "", valor_novo: `${created.name} – ${created.channel}` });
        }
        const next = [...clients, created];
        syncClients(next);
        toast.info(d1Editavel ? "Agendamento salvo." : `${form.name} cadastrado com sucesso.`);
      }
      setSaving(false);
      setDialogOpen(false);
    } catch {
      setSaving(false);
      setSaveError("Não foi possível salvar. Tente novamente.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, client } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      if (d1Editavel && client && isClienteD1(client, closingDate)) {
        await base44.entities.Client.update(id, { d1_excluido: true, sale_status: "Não", status: "Perdido", loss_reason: "Agendamento D+1 excluído" });
        if (onAuditLog) onAuditLog({ tipo_alteracao: "Agendamento excluído", cliente_id: id, valor_anterior: client.appointment_datetime, valor_novo: "" });
        const next = clients.map(c => c.id === id ? { ...c, d1_excluido: true, sale_status: "Não", status: "Perdido" } : c);
        syncClients(next);
      } else {
        await base44.entities.Client.delete(id);
        syncClients(clients.filter(c => c.id !== id));
      }
      toast.info("Cliente excluído.");
    } catch {
      toast.info("Não foi possível excluir. Tente novamente.");
    }
  };

  const canSave = form.name.trim() && form.phone.trim() && form.vehicle_sought.trim() && form.appointment_datetime;

  return (
    <>
      {/* Botão de novo cliente — renderizado inline no step 4 do FluxoFechamento */}
      {!bloqueado && (
        <button
          onClick={openCreate}
          className="w-full flex items-center justify-center gap-2 bg-status-info hover:bg-status-info active:scale-95 transition-all text-white text-[14px] font-bold py-3.5 rounded-2xl shadow-[var(--mx-button-shadow)]"
        >
          <Plus className="w-5 h-5" />
          {d1Editavel ? "Novo Agendamento D+1" : "Novo Cliente"}
        </button>
      )}
      {d1Editavel && (
        <div className="px-3 py-2.5 bg-status-info-surface border border-status-info/20 rounded-xl flex items-center gap-2">
          <Info className="w-4 h-4 text-status-info-text flex-shrink-0" />
          <p className="text-[12px] font-semibold text-mx-navy">
            Somente registros de Agendamentos D+1 podem ser editados.
          </p>
        </div>
      )}
      {bloqueado && (
        <div className="flex items-center gap-2 py-3 px-3 bg-surface-alt rounded-xl border border-border-subtle">
          <Lock className="w-4 h-4 text-text-disabled flex-shrink-0" />
          <span className="text-[12px] text-muted-foreground font-medium">Fechamento finalizado.</span>
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!saving) { setDialogOpen(v); setSaveError(null); } }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-mx-navy font-bold text-h5">
              {editingClient
                ? (modoD1 ? "Editar Agendamento D+1" : "Editar Cliente")
                : (modoD1 ? "Novo Agendamento D+1" : "Cadastrar Novo Cliente")}
            </DialogTitle>
            {modoD1 && (
              <div className="mt-1.5 px-3 py-2 bg-status-info-surface border border-status-info/30 rounded-lg flex items-start gap-2">
                <CalendarClock className="w-4 h-4 text-status-info-text mt-0.5 flex-shrink-0" />
                <p className="text-[12px] font-semibold text-mx-navy">
                  Este cadastro será considerado um Agendamento D+1.
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 mt-2">
            <Field label="Nome do Cliente" required>
              <Input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Ex: João Santos" />
            </Field>
            <Field label="Telefone" required>
              <Input value={form.phone} onChange={e => setF("phone", formatPhone(e.target.value))} placeholder="(11) 98765-4321" maxLength={15} />
            </Field>
            <Field label="Veículo de Interesse" required>
              <Input value={form.vehicle_sought} onChange={e => setF("vehicle_sought", e.target.value)} placeholder="Ex: HB20 1.0 Comfort" />
            </Field>
            <Field label="Valor Negociado">
              <Input value={form.negotiated_value} onChange={e => setF("negotiated_value", formatCurrency(e.target.value))} placeholder="R$ 68.900,00" />
            </Field>
            <Field label="Data e Hora do Agendamento" required>
              <Input type="datetime-local" value={form.appointment_datetime} onChange={e => setF("appointment_datetime", e.target.value)} />
            </Field>
            <Field label="Canal" required>
              <Select value={form.channel} onValueChange={v => setF("channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carteira">Carteira</SelectItem>
                  <SelectItem value="Internet">Internet</SelectItem>
                  {!modoD1 && <SelectItem value="Showroom">Showroom</SelectItem>}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Compareceu">
              <Select value={form.attended || ""} onValueChange={v => setF("attended", v || "")}>
                <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Carro Avaliado">
              <Select value={form.car_evaluated || ""} onValueChange={v => setF("car_evaluated", v || "")}>
                <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sinal (R$)">
              <Input value={form.signal} onChange={e => setF("signal", formatCurrency(e.target.value))} placeholder="R$ 1.000,00" />
            </Field>
            <Field label="Financiamento">
              <Select value={form.financing || ""} onValueChange={v => setF("financing", v || "")}>
                <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Recusado">Recusado</SelectItem>
                  <SelectItem value="Não se aplica">Não se aplica</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Venda Realizada">
              {modoD1 ? (
                <div className="h-10 flex items-center px-3 bg-surface-alt border border-border rounded-lg text-body-sm text-muted-foreground font-semibold cursor-not-allowed">
                  Em Negociação
                </div>
              ) : (
                <Select value={form.sale_completed} onValueChange={v => setF("sale_completed", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>
            {form.sale_completed === "Não" && !modoD1 && (
              <Field label="Motivo da Perda">
                <Select value={form.loss_reason} onValueChange={v => setF("loss_reason", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                  <SelectContent>
                    {LOSS_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Observações">
              <Input value={form.notes} onChange={e => setF("notes", e.target.value.slice(0, 250))} placeholder="Observações..." />
            </Field>
          </div>

          {saveError && <p className="text-[12px] text-status-error font-semibold mt-3">{saveError}</p>}

          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border-subtle">
            <button
              onClick={() => { setDialogOpen(false); setSaveError(null); }}
              disabled={saving}
              className="px-5 py-2.5 text-body-sm font-semibold text-muted-foreground border border-border rounded-xl hover:bg-surface-alt transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="px-6 py-2.5 text-body-sm font-bold text-white bg-status-info hover:bg-status-info disabled:opacity-50 rounded-xl transition-colors shadow-[var(--mx-button-shadow)]"
            >
              {saving ? "Salvando..." : modoD1 ? "Salvar Agendamento" : "Salvar Cliente"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal NovoRegistro (base única) — apenas modo não-D+1 */}
      <NovoRegistroModal
        open={novoRegistroOpen}
        onClose={() => setNovoRegistroOpen(false)}
        closingDate={closingDate}
        dailyCloseId={dailyCloseId}
        currentUser={currentUser}
        onSaved={(payload) => {
          // Recarregar lista via onClientsChange (o mobile usa clientsProp do pai)
          onRegistroSalvo && onRegistroSalvo(payload);
        }}
      />

      {/* Modal exclusão */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-mx-navy font-bold">Excluir cliente?</DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-muted-foreground mt-1 leading-relaxed">
            Tem certeza que deseja excluir <strong className="text-mx-navy">{deleteConfirm?.name}</strong>?
          </p>
          <div className="flex items-center justify-end gap-3 mt-4">
            <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2 text-body-sm font-semibold text-muted-foreground border border-border rounded-xl hover:bg-surface-alt transition-colors">
              Cancelar
            </button>
            <button onClick={confirmDelete} className="px-5 py-2 text-body-sm font-bold text-status-error-foreground bg-status-error hover:bg-status-error rounded-xl transition-colors">
              Excluir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
