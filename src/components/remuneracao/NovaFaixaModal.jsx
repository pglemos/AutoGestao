import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const TIPOS = ["Valor fixo por veículo", "Percentual sobre valor vendido"];

export default function NovaFaixaModal({ open, onClose, onSaved, politicas, me }) {
  const [form, setForm] = useState({
    politica_id: "",
    politica_nome: "",
    quantidade_inicial: "",
    quantidade_final: "",
    tipo: "Valor fixo por veículo",
    valor: "",
    status: "Ativa",
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const set = (k, v) => { setErro(""); setForm(f => ({ ...f, [k]: v })); };

  const handleSave = async () => {
    const qi = Number(form.quantidade_inicial);
    const qf = form.quantidade_final !== "" ? Number(form.quantidade_final) : null;
    const val = Number(form.valor);
    if (!form.politica_id) return setErro("Selecione uma política.");
    if (!qi || qi < 1) return setErro("Quantidade inicial inválida.");
    if (qf !== null && qf < qi) return setErro("Quantidade final deve ser maior que a inicial.");
    if (!val || val <= 0) return setErro("Valor deve ser positivo.");
    setSaving(true);
    const payload = {
      politica_id: form.politica_id,
      politica_nome: form.politica_nome,
      quantidade_inicial: qi,
      tipo: form.tipo,
      valor: val,
      status: form.status,
    };
    if (qf !== null) payload.quantidade_final = qf;
    const saved = await base44.entities.FaixaComissao.create(payload);
    await base44.entities.HistoricoRemuneracao.create({
      usuario_id: me?.id || "",
      usuario_nome: me?.full_name || "",
      acao: "Faixa criada",
      entidade: "FaixaComissao",
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
          <DialogTitle className="text-h5 font-bold text-[#0F172A]">Nova Faixa de Comissão</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Política vinculada *</Label>
            <Select value={form.politica_id} onValueChange={v => {
              const p = politicas.find(x => x.id === v);
              set("politica_id", v);
              setForm(f => ({ ...f, politica_id: v, politica_nome: p?.nome || "" }));
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione a política" /></SelectTrigger>
              <SelectContent>
                {politicas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>De (veículos) *</Label>
              <Input type="number" min={1} value={form.quantidade_inicial} onChange={e => set("quantidade_inicial", e.target.value)} placeholder="1" />
            </div>
            <div>
              <Label>Até (opcional = em diante)</Label>
              <Input type="number" min={1} value={form.quantidade_final} onChange={e => set("quantidade_final", e.target.value)} placeholder="em diante" />
            </div>
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
            <Label>{form.tipo === "Percentual sobre valor vendido" ? "Percentual (%) *" : "Valor por veículo (R$) *"}</Label>
            <Input type="number" min={0} step="0.01" value={form.valor} onChange={e => set("valor", e.target.value)} placeholder={form.tipo === "Percentual sobre valor vendido" ? "0,5" : "350"} />
          </div>
          {erro && <p className="text-status-error-text text-[12px]">{erro}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 bg-[#00A896] hover:bg-[#008f7e] text-white" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar faixa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}