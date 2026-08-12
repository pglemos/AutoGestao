import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function ReagendarPendenciaModal({ oportunidade, open, onClose, onReagendada }) {
  const { toast } = useToast();
  const [novaData, setNovaData] = useState("");
  const [saving, setSaving] = useState(false);

  if (!oportunidade) return null;

  const handleSalvar = async () => {
    if (!novaData) return;
    setSaving(true);
    try {
      await base44.entities.ExecutionOpportunity.update(oportunidade.id, {
        data_hora_execucao: novaData,
        status: "Reagendada",
        status_detalhe: "Reagendada manualmente",
        ativo: true,
      });
      if (oportunidade.cliente_id) {
        await base44.entities.Client.update(oportunidade.cliente_id, {
          appointment_datetime: novaData,
        });
      }
      toast({ title: "Atividade reagendada." });
      onReagendada(oportunidade.id, novaData);
      onClose();
    } catch (e) {
      toast({ title: "Erro ao reagendar." });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!saving) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-mx-navy font-bold">Reagendar atividade</DialogTitle>
        </DialogHeader>
        <p className="text-body-sm text-muted-foreground mt-1">{oportunidade.nome_cliente_snapshot} — {oportunidade.tipo}</p>
        <div className="mt-3">
          <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Nova data e horário</label>
          <Input type="datetime-local" value={novaData} onChange={e => setNovaData(e.target.value)} className="mt-1.5" />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-body-sm font-semibold text-muted-foreground border border-border rounded-xl hover:bg-surface-alt">
            Cancelar
          </button>
          <button onClick={handleSalvar} disabled={!novaData || saving}
            className="px-5 py-2 text-body-sm font-bold text-white bg-status-info hover:bg-status-info disabled:opacity-50 rounded-xl">
            {saving ? "Salvando..." : "Reagendar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}