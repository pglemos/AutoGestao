import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { base44 } from "@/api/base44Client";
import { calcularProximaAcao } from "./carteiraUtils";
import { toast } from "@/lib/toast";

const MOMENTOS_CADASTRO = [
  { value: "Novo contato", label: "Só demonstrou interesse" },
  { value: "Cliente morno em aquecimento", label: "Está comparando opções" },
  { value: "Cliente quente sem visita", label: "Quer comprar em breve" },
  { value: "Visita agendada", label: "Já tem visita agendada" },
  { value: "Proposta enviada", label: "Já recebeu proposta" },
  { value: "Em negociação", label: "Está negociando" },
  { value: "Venda realizada", label: "Comprou" },
  { value: "Perda registrada", label: "Perdi a venda" },
  { value: "Pós-venda ativo", label: "É pós-venda" },
  { value: "Garantia em acompanhamento", label: "É garantia" },
  { value: "Oportunidade futura de troca", label: "É oportunidade futura" },
];

const TEMP_AUTO = {
  "Novo contato": "Morno",
  "Cliente morno em aquecimento": "Morno",
  "Cliente quente sem visita": "Quente",
  "Visita agendada": "Quente",
  "Proposta enviada": "Quente",
  "Em negociação": "Quente",
  "Venda realizada": "Frio",
  "Perda registrada": "Frio",
  "Pós-venda ativo": "Frio",
  "Garantia em acompanhamento": "Frio",
  "Oportunidade futura de troca": "Morno",
};

function formatarWhatsapp(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function situacaoDoMomento(momento) {
  if (momento === "Em negociação") return "Em negociação ativa";
  if (momento === "Perda registrada") return "Venda perdida";
  if (momento === "Oportunidade futura de troca") return "Oportunidade futura";
  return momento;
}

export default function NovoClienteModal({ open, onClose, onCriado, vendedorId }) {
  const [form, setForm] = useState({
    nome: "", whatsapp: "", canal_comercial: "Internet", canal_origem: "Internet",
    veiculo_interesse: "", valor_negociado: "", momento: "Novo contato", situacao_atual: "Novo contato",
    visita_agendada_em: "", proposta_enviada: false, financiamento: "nao_aplica",
    interesse_troca: false, veiculo_troca: "", valor_troca: "", interesse_financiamento: false, observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSalvar() {
    const phoneDigits = String(form.whatsapp || "").replace(/\D/g, "");
    if (!form.nome || phoneDigits.length < 10) {
      toast.error("Informe um WhatsApp válido.", { description: "Use DDD e número com 10 ou 11 dígitos." });
      return;
    }
    setSaving(true);
    const temperatura = TEMP_AUTO[form.momento] || "Morno";
    const payload = {
      ...form,
      whatsapp: phoneDigits,
      telefone: phoneDigits,
      situacao_atual: situacaoDoMomento(form.momento),
      financiamento: form.financiamento || (form.interesse_financiamento ? "pendente" : "nao_aplica"),
      canal_comercial: form.canal_comercial || "Internet",
      canal_origem: form.canal_comercial || form.canal_origem || "Internet",
      temperatura,
      vendedor_id: vendedorId || "",
      ativo: true,
      ultimo_contato: new Date().toISOString(),
      historico: {
        tipo: "Cadastro",
        descricao: "Cliente cadastrado na carteira.",
        momento_novo: form.momento,
      },
    };
    payload.proxima_acao = calcularProximaAcao(payload);

    let criado;
    try {
      criado = await base44.entities.CarteiraCliente.create(payload);
    } catch (error) {
      toast.error("Não foi possível adicionar o cliente.", { description: "Confira sua conexão e tente novamente." });
      return;
    } finally {
      setSaving(false);
    }

    onCriado(criado);
    onClose();
    setForm({ nome: "", whatsapp: "", canal_comercial: "Internet", canal_origem: "Internet", veiculo_interesse: "", valor_negociado: "", momento: "Novo contato", situacao_atual: "Novo contato", visita_agendada_em: "", proposta_enviada: false, financiamento: "nao_aplica", interesse_troca: false, veiculo_troca: "", valor_troca: "", interesse_financiamento: false, observacoes: "" });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-mx-navy text-lg font-black">Novo Cliente</DialogTitle>
          <p className="text-sm text-muted-foreground">Adicione um cliente à sua carteira de desenvolvimento.</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Nome *</label>
              <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">WhatsApp *</label>
              <Input value={form.whatsapp} onChange={e => set("whatsapp", formatarWhatsapp(e.target.value))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Canal</label>
              <select value={form.canal_comercial} onChange={e => setForm(p => ({ ...p, canal_comercial: e.target.value, canal_origem: e.target.value }))} className="w-full h-9 rounded-xl border border-input bg-transparent px-3 text-sm">
                {["Internet", "Carteira", "Porta"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Veículo de Interesse</label>
              <Input value={form.veiculo_interesse} onChange={e => set("veiculo_interesse", e.target.value)} placeholder="Ex: Corolla XEI 2023" />
            </div>
            {["Proposta enviada", "Em negociação", "Venda realizada"].includes(form.momento) && (
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Orçamento</label>
                <Input type="number" min="0" value={form.valor_negociado} onChange={e => set("valor_negociado", e.target.value)} placeholder="Ex: 60000" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Em que momento esse cliente está?</label>
            <div className="grid grid-cols-1 gap-1.5">
              {MOMENTOS_CADASTRO.map(m => (
                <button key={m.value} onClick={() => setForm(p => ({ ...p, momento: m.value, situacao_atual: situacaoDoMomento(m.value), proposta_enviada: m.value === "Proposta enviada" || p.proposta_enviada }))}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${form.momento === m.value ? "border-status-info bg-status-info-surface text-status-info-text font-semibold" : "border-border-subtle text-muted-foreground hover:border-border hover:bg-surface-alt"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {form.momento === "Visita agendada" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Data e hora da visita</label>
              <Input type="datetime-local" value={form.visita_agendada_em} onChange={e => set("visita_agendada_em", e.target.value)} />
            </div>
          )}

          <div className="flex gap-4">
            {[{ k: "interesse_troca", l: "Interesse em troca?" }, { k: "proposta_enviada", l: "Proposta enviada?" }, { k: "interesse_financiamento", l: "Interesse em financiamento?" }].map(({ k, l }) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} className="rounded" />
                {l}
              </label>
            ))}
          </div>

          {(form.interesse_financiamento || form.interesse_troca) && (
            <div className="grid grid-cols-2 gap-3">
              {form.interesse_financiamento && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Financiamento</label>
                  <select value={form.financiamento} onChange={e => setForm(p => ({ ...p, financiamento: e.target.value, interesse_financiamento: e.target.value !== "nao_aplica" }))} className="w-full h-9 rounded-xl border border-input bg-transparent px-3 text-sm">
                    <option value="nao_aplica">Não se aplica</option>
                    <option value="pendente">Em análise</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="reprovado">Recusado</option>
                  </select>
                </div>
              )}
              {form.interesse_troca && <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Veículo na troca</label>
                <Input value={form.veiculo_troca} onChange={e => set("veiculo_troca", e.target.value)} placeholder="Ex: Polo 2018" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Valor da troca</label>
                <Input type="number" min="0" value={form.valor_troca} onChange={e => set("valor_troca", e.target.value)} placeholder="Ex: 30000" />
              </div>
              </>}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Observação inicial</label>
            <Textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Contexto do primeiro contato..." rows={2} className="resize-none" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving || !form.nome || !form.whatsapp} className="flex-1 rounded-xl bg-status-info hover:bg-status-info text-white">
              {saving ? "Salvando..." : "Adicionar cliente"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
