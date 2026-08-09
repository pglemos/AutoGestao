import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

const TIPOS_COMISSAO = [
  "Comissão fixa por veículo",
  "Comissão percentual sobre valor vendido",
  "Comissão por faixa de volume",
  "Comissão mista",
];
const PERIODOS = ["Mensal", "Quinzenal", "Semanal", "Personalizado"];
const STATUS_OPTS = ["Ativa", "Rascunho", "Inativa"];

export default function NovaPoliticaModal({ open, onClose, onSaved, me }) {
  const [form, setForm] = useState({
    nome: "",
    loja_nome: "",
    departamento: "Vendas",
    cargo: "Vendedor",
    vendedor_nome: "",
    tipo_comissao: "Comissão por faixa de volume",
    periodo_apuracao: "Mensal",
    data_inicio: "",
    data_fim: "",
    aplicar_faixa_sobre_todos_veiculos: true,
    status: "Ativa",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome || !form.data_inicio) return;
    setSaving(true);
    const payload = { ...form, created_by: me?.id };
    if (!payload.data_fim) delete payload.data_fim;
    if (!payload.vendedor_nome) delete payload.vendedor_nome;
    const saved = await base44.entities.PoliticaRemuneracao.create(payload);
    // log histórico
    await base44.entities.HistoricoRemuneracao.create({
      usuario_id: me?.id || "",
      usuario_nome: me?.full_name || "",
      acao: "Política criada",
      entidade: "PoliticaRemuneracao",
      entidade_id: saved.id,
      dados_antes: "",
      dados_depois: JSON.stringify(saved),
    }).catch(() => {});
    setSaving(false);
    onSaved(saved);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-h5 font-bold text-[#0F172A]">Nova Política de Remuneração</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nome da política *</Label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Vendedores Loja Matriz - Julho/2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Loja</Label>
              <Input value={form.loja_nome} onChange={e => set("loja_nome", e.target.value)} placeholder="Ex: Matriz" />
            </div>
            <div>
              <Label>Departamento</Label>
              <Input value={form.departamento} onChange={e => set("departamento", e.target.value)} placeholder="Ex: Vendas" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={e => set("cargo", e.target.value)} placeholder="Ex: Vendedor" />
            </div>
            <div>
              <Label>Vendedor específico (opcional)</Label>
              <Input value={form.vendedor_nome} onChange={e => set("vendedor_nome", e.target.value)} placeholder="Nome do vendedor" />
            </div>
          </div>
          <div>
            <Label>Tipo de comissão *</Label>
            <Select value={form.tipo_comissao} onValueChange={v => set("tipo_comissao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_COMISSAO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Período de apuração *</Label>
            <Select value={form.periodo_apuracao} onValueChange={v => set("periodo_apuracao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de início *</Label>
              <Input type="date" value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)} />
            </div>
            <div>
              <Label>Data de fim (opcional)</Label>
              <Input type="date" value={form.data_fim} onChange={e => set("data_fim", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.tipo_comissao === "Comissão por faixa de volume" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-body-sm font-bold text-[#0F172A]">Aplicar faixa sobre todos os veículos</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">Ao atingir nova faixa, todos os veículos do período são recalculados</p>
                </div>
                <Switch checked={form.aplicar_faixa_sobre_todos_veiculos} onCheckedChange={v => set("aplicar_faixa_sobre_todos_veiculos", v)} />
              </div>
              <p className="text-caption text-blue-600 bg-blue-100 rounded-lg p-2 leading-relaxed">
                Exemplo: política define R$450 por veículo entre 5–6 vendas e R$550 entre 7–8. Ao atingir 7 vendas, todos os 7 veículos passam a pagar R$550 cada.
              </p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 bg-[#00A896] hover:bg-[#008f7e] text-white" onClick={handleSave} disabled={saving || !form.nome || !form.data_inicio}>
              {saving ? "Salvando..." : "Salvar política"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}