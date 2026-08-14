import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Select } from "@/components/atoms/Select";
import { base44 } from "@/api/base44Client";

export default function NovaPremiacaoModal({ open, onClose, onSaved, politicas, me }) {
  const [form, setForm] = useState({
    politica_id: "",
    politica_nome: "",
    quantidade_vendas_necessarias: "",
    valor_premio: "",
    tipo_premiacao: "Acumulativa",
    status: "Ativa",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.politica_id || !form.quantidade_vendas_necessarias || !form.valor_premio) return;
    setSaving(true);
    const payload = {
      politica_id: form.politica_id,
      politica_nome: form.politica_nome,
      quantidade_vendas_necessarias: Number(form.quantidade_vendas_necessarias),
      valor_premio: Number(form.valor_premio),
      tipo_premiacao: form.tipo_premiacao,
      status: form.status,
    };
    const saved = await base44.entities.PremiacaoRemuneracao.create(payload);
    await base44.entities.HistoricoRemuneracao.create({
      usuario_id: me?.id || "",
      usuario_nome: me?.full_name || "",
      acao: "Premiação criada",
      entidade: "PremiacaoRemuneracao",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h5 font-bold text-mx-navy">Nova Premiação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Política vinculada *</Label>
            <Select value={form.politica_id || ""} onChange={e => {
              const v = e.target.value;
              const p = politicas.find(x => x.id === v);
              setForm(f => ({ ...f, politica_id: v, politica_nome: p?.nome || "" }));
            }} aria-label="Política vinculada">
              <option value="" disabled>Selecione a política</option>
              {politicas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </div>
          <div>
            <Label>Quantidade de vendas necessárias *</Label>
            <Input type="number" min={1} value={form.quantidade_vendas_necessarias} onChange={e => set("quantidade_vendas_necessarias", e.target.value)} placeholder="Ex: 10" />
          </div>
          <div>
            <Label>Valor do prêmio (R$) *</Label>
            <Input type="number" min={0} value={form.valor_premio} onChange={e => set("valor_premio", e.target.value)} placeholder="Ex: 1000" />
          </div>
          <div>
            <Label>Tipo de premiação</Label>
            <Select value={form.tipo_premiacao} onChange={e => set("tipo_premiacao", e.target.value)} aria-label="Tipo de premiação">
              <option value="Acumulativa">Acumulativa</option>
              <option value="Substitutiva">Substitutiva</option>
            </Select>
            <p className="text-caption text-muted-foreground mt-1">
              {form.tipo_premiacao === "Acumulativa"
                ? "Mantém prêmios anteriores e soma o novo."
                : "O novo prêmio substitui o anterior."}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 bg-status-success hover:bg-status-success text-white" onClick={handleSave} disabled={saving || !form.politica_id || !form.quantidade_vendas_necessarias || !form.valor_premio}>
              {saving ? "Salvando..." : "Salvar premiação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}