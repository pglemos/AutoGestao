// Modal de solicitação de antecipação de encontro.

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { consultingRepository } from "./consultingRepository";
import { toast } from '@/lib/toast'

const MODALITIES = ["Online", "Presencial", "Conforme disponibilidade"];

export default function AnticipationModal({ meeting, program, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    reason: "",
    requestedModality: meeting.modality || "Online",
    date1: "",
    date2: "",
    date3: "",
    notes: "",
    participantsConfirmed: false,
  });

  const pendingItems = consultingRepository.getPendingRequiredItems(meeting.id);
  const participants = consultingRepository.getParticipants(meeting.id);
  const requiredParticipants = participants.filter((p) => p.required);
  const allParticipantsConfirmed = requiredParticipants.length > 0 && requiredParticipants.every((p) => p.confirmed);
  const canSubmit = pendingItems.length === 0 && allParticipantsConfirmed && form.reason.trim() && (form.date1 || form.date2 || form.date3);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const preferredDates = [form.date1, form.date2, form.date3].filter(Boolean).map((d) => new Date(d).toISOString());
    const prep = consultingRepository.getMeetingPreparation(meeting.id);

    consultingRepository.requestMeetingAnticipation(meeting.id, {
      requestedBy: "demo",
      requestedByName: "Daniel Santos",
      requestedModality: form.requestedModality,
      preferredDates,
      reason: form.reason,
      notes: form.notes,
      participantsConfirmed: allParticipantsConfirmed,
      preparationSnapshot: {
        progressPercent: prep.progressPercent,
        requiredItemsCompleted: prep.requiredItemsCompleted,
        requiredItemsTotal: prep.requiredItemsTotal,
      },
    });

    toast.info("Solicitação de antecipação enviada ao consultor.");
    onSubmitted?.();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent size="md" scrollable>
        <DialogHeader>
          <DialogTitle>Solicitar antecipação do encontro</DialogTitle>
          <DialogDescription>
            Encontro {meeting.number} — {meeting.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Validações */}
          {pendingItems.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-surface p-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-text" />
              <div>
                <p className="text-xs font-medium text-status-warning-text">Itens obrigatórios pendentes:</p>
                <ul className="mt-0.5 space-y-0.5">
                  {pendingItems.map((item) => (
                    <li key={item.id} className="text-xs text-status-warning-text">• {item.title}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!allParticipantsConfirmed && (
            <div className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-surface p-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-text" />
              <p className="text-xs text-status-warning-text">Participantes obrigatórios não confirmados.</p>
            </div>
          )}

          {canSubmit && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-primary">Preparação concluída. Você pode solicitar a antecipação.</p>
            </div>
          )}

          {/* Data atual */}
          <div className="rounded-md border border-border bg-muted/30 p-2.5">
            <p className="text-xs text-muted-foreground">Data atualmente agendada</p>
            <p className="text-sm font-medium text-foreground">
              {meeting.scheduledDate ? new Date(meeting.scheduledDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "A definir"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ant-reason">Motivo da antecipação *</Label>
            <Textarea id="ant-reason" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="Por que deseja antecipar este encontro?" />
          </div>

          <div className="space-y-1.5">
            <Label>Modalidade preferida</Label>
            <Select value={form.requestedModality} onValueChange={(v) => setForm({ ...form, requestedModality: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ant-date1">1ª opção</Label>
              <Input id="ant-date1" type="datetime-local" value={form.date1} onChange={(e) => setForm({ ...form, date1: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ant-date2">2ª opção</Label>
              <Input id="ant-date2" type="datetime-local" value={form.date2} onChange={(e) => setForm({ ...form, date2: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ant-date3">3ª opção</Label>
              <Input id="ant-date3" type="datetime-local" value={form.date3} onChange={(e) => setForm({ ...form, date3: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ant-notes">Observações</Label>
            <Textarea id="ant-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Informações adicionais para o consultor..." />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ant-participants"
              checked={form.participantsConfirmed}
              onChange={(e) => setForm({ ...form, participantsConfirmed: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="ant-participants" className="text-sm font-normal">
              Confirmo a disponibilidade dos participantes obrigatórios
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!canSubmit}>Enviar solicitação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}