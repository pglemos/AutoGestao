import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const TIPOS = [
  "Loja bateu meta", "Melhor vendedor do mês", "Melhor vendedor do trimestre",
  "Melhor vendedor do semestre", "Melhor vendedor do ano", "Campanha específica", "Outro"
];

export default function NovaBonificacaoModal({ open, onClose, onSaved, me }) {
  const [form, setForm] = useState({
    nome: "", tipo: "Loja bateu meta", criterio: "", valor: "",
    data_inicio: "", data_fim: "", aplicavel_para: "",
    loja_nome: "", departamento: "", cargo: "", vendedor_nome: "",
    status: "Ativa", observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome || !form.valor || !form.data_inicio) return;
    setSaving(true);
    const payload = { ...form, valor: Number(form.valor) };
    ["loja_nome", "departamento", "cargo", "vendedor_nome", "data_fim", "observacoes", "criterio", "aplicavel_para"].forEach(k => {
      if (!payload[k]) delete payload[k];
    });
    const saved = await base44.entities.BonificacaoRemuneracao.create(payload);
    await base44.entities.HistoricoRemuneracao.create({
      usuario_id: me?.id || "",
      usuario_nome: me?.full_name || "",
      acao: "Bonificação criada",
      entidade: "BonificacaoRemuneracao",
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
          <DialogTitle className="text-h5 font-bold text-mx-navy">Nova Bonificação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nome da bonificação *</Label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Loja bateu meta" />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Critério</Label>
            <Input value={form.criterio} onChange={e => set("criterio", e.target.value)} placeholder="Ex: Loja atingir 100% da meta mensal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" min={0} value={form.valor} onChange={e => set("valor", e.target.value)} placeholder="Ex: 500" />
            </div>
            <div>
              <Label>Aplicável para</Label>
              <Input value={form.aplicavel_para} onChange={e => set("aplicavel_para", e.target.value)} placeholder="Ex: Equipe de vendas" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de início *</Label>
              <Input type="date" value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)} />
            </div>
            <div>
              <Label>Data de fim</Label>
              <Input type="date" value={form.data_fim} onChange={e => set("data_fim", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Loja (opcional)</Label>
              <Input value={form.loja_nome} onChange={e => set("loja_nome", e.target.value)} placeholder="Ex: Matriz" />
            </div>
            <div>
              <Label>Departamento (opcional)</Label>
              <Input value={form.departamento} onChange={e => set("departamento", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cargo (opcional)</Label>
              <Input value={form.cargo} onChange={e => set("cargo", e.target.value)} />
            </div>
            <div>
              <Label>Vendedor específico (opcional)</Label>
              <Input value={form.vendedor_nome} onChange={e => set("vendedor_nome", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativa">Ativa</SelectItem>
                <SelectItem value="Inativa">Inativa</SelectItem>
                <SelectItem value="Encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Informações adicionais..." />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 bg-status-success hover:bg-status-success text-white" onClick={handleSave} disabled={saving || !form.nome || !form.valor || !form.data_inicio}>
              {saving ? "Salvando..." : "Salvar bonificação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}