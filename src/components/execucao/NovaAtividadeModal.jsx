import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { Search, UserCheck, UserX } from "lucide-react";
import moment from "moment";

const TIPOS = [
  "Atendimento",
  "Retorno",
  "Entrega",
  "Pós-venda",
  "Garantia",
  "Outra atividade comercial",
];

const PRIORIDADES = [
  { label: "Alta", value: 1 },
  { label: "Média", value: 5 },
  { label: "Baixa", value: 9 },
];

function normalizePhone(raw) {
  return (raw || "").replace(/\D/g, "");
}

export default function NovaAtividadeModal({ open, onClose, clients, onCriada, vendedorId }) {
  const { toast } = useToast();
  const [step, setStep] = useState("tipo"); // "tipo" | "form"
  const [tipo, setTipo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [nomeManual, setNomeManual] = useState("");
  const [form, setForm] = useState({
    data: moment().format("YYYY-MM-DD"),
    hora: moment().format("HH:mm"),
    prioridade: 5,
    descricao: "",
    veiculo: "",
  });
  const [saving, setSaving] = useState(false);

  const resetar = () => {
    setStep("tipo");
    setTipo("");
    setTelefone("");
    setClienteEncontrado(null);
    setNaoEncontrado(false);
    setNomeManual("");
    setForm({ data: moment().format("YYYY-MM-DD"), hora: moment().format("HH:mm"), prioridade: 5, descricao: "", veiculo: "" });
  };

  const handleClose = () => { resetar(); onClose(); };

  const handleEscolherTipo = (t) => {
    setTipo(t);
    setStep("form");
  };

  const buscarCliente = () => {
    const tel = normalizePhone(telefone);
    if (!tel) return;
    const found = clients.find(c => normalizePhone(c.phone) === tel);
    if (found) {
      setClienteEncontrado(found);
      setNaoEncontrado(false);
      setForm(f => ({
        ...f,
        veiculo: found.vehicle_sought || found.veiculo_snapshot || "",
      }));
    } else {
      setClienteEncontrado(null);
      setNaoEncontrado(true);
    }
  };

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSalvar = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const dataHora = `${form.data}T${form.hora}`;
      const nova = await base44.entities.ExecutionOpportunity.create({
        vendedor_id: vendedorId || me.id,
        cliente_id: clienteEncontrado?.id || undefined,
        tipo,
        titulo: tipo,
        descricao: form.descricao || tipo,
        data_hora_execucao: dataHora,
        prioridade: form.prioridade,
        status: "Pendente",
        telefone_snapshot: clienteEncontrado?.phone || telefone,
        nome_cliente_snapshot: clienteEncontrado?.name || nomeManual.trim() || (telefone ? "Cliente avulso" : "Atividade interna"),
        veiculo_snapshot: form.veiculo || clienteEncontrado?.vehicle_sought || "",
        criado_automaticamente: false,
        ativo: true,
      });
      toast({ title: "Atividade criada com sucesso." });
      onCriada(nova);
      handleClose();
    } catch (e) {
      console.error(e);
      toast({ title: "Não foi possível criar a atividade.", description: e?.message || "Tente novamente." });
    }
    setSaving(false);
  };

  const podesSalvar = tipo && form.data && form.hora && (!!clienteEncontrado || !naoEncontrado || nomeManual.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={v => { if (!saving) handleClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A] font-bold text-h5">Nova atividade</DialogTitle>
        </DialogHeader>

        {step === "tipo" && (
          <div className="mt-3 space-y-2">
            <p className="text-body-sm text-muted-foreground mb-3">Selecione o tipo de atividade comercial:</p>
            {TIPOS.map(t => (
              <button key={t} onClick={() => handleEscolherTipo(t)}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-[#005BFF] hover:bg-status-info-surface text-body-sm font-semibold text-[#0F172A] transition-colors">
                {t}
              </button>
            ))}
          </div>
        )}

        {step === "form" && (
          <div className="mt-3 space-y-4">
            {/* Tipo selecionado */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#005BFF] bg-status-info-surface px-3 py-1 rounded-full">{tipo}</span>
              <button onClick={() => setStep("tipo")} className="text-[12px] text-muted-foreground hover:text-muted-foreground underline">Mudar tipo</button>
            </div>

            {/* Busca de cliente por telefone */}
            <div>
              <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Cliente ou Telefone</label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={telefone}
                  onChange={e => { setTelefone(e.target.value); setClienteEncontrado(null); setNaoEncontrado(false); }}
                  placeholder="(11) 98765-4321"
                  className="flex-1"
                />
                <button onClick={buscarCliente}
                  className="px-3 py-2 rounded-xl bg-[#005BFF] text-white hover:bg-status-info transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </div>
              {clienteEncontrado && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                  <UserCheck className="w-4 h-4 text-status-success-text flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-green-800 truncate">{clienteEncontrado.name}</p>
                    <p className="text-caption text-status-success-text truncate">{clienteEncontrado.vehicle_sought || "—"}</p>
                  </div>
                </div>
              )}
              {naoEncontrado && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-status-warning-surface border border-status-warning/30 rounded-xl">
                    <UserX className="w-4 h-4 text-status-warning-text flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-status-warning-text">Cliente não encontrado.</p>
                      <Link to="/carteira" onClick={handleClose} className="text-caption text-[#005BFF] underline">
                        Abrir Carteira de Clientes para cadastrar depois
                      </Link>
                    </div>
                  </div>
                  <div>
                    <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Nome do cliente</label>
                    <Input
                      value={nomeManual}
                      onChange={e => setNomeManual(e.target.value)}
                      placeholder="Nome de quem você vai atender"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Data / Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Data</label>
                <Input type="date" value={form.data} onChange={e => setF("data", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Hora</label>
                <Input type="time" value={form.hora} onChange={e => setF("hora", e.target.value)} className="mt-1.5" />
              </div>
            </div>

            {/* Veículo */}
            <div>
              <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Veículo (opcional)</label>
              <Input value={form.veiculo} onChange={e => setF("veiculo", e.target.value)} className="mt-1.5" placeholder="Ex: HB20 1.0 Comfort" />
            </div>

            {/* Prioridade */}
            <div>
              <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Prioridade</label>
              <Select value={String(form.prioridade)} onValueChange={v => setF("prioridade", Number(v))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map(p => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Observação */}
            <div>
              <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Observação</label>
              <Input value={form.descricao} onChange={e => setF("descricao", e.target.value)} className="mt-1.5" placeholder="Descreva o objetivo desta atividade..." />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border-subtle">
              <button onClick={handleClose} disabled={saving}
                className="px-5 py-2.5 text-body-sm font-semibold text-muted-foreground border border-border rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={!podesSalvar || saving}
                className="px-6 py-2.5 text-body-sm font-bold text-white bg-[#005BFF] hover:bg-status-info disabled:opacity-50 rounded-xl transition-colors">
                {saving ? "Salvando..." : "Salvar atividade"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}