// Modal de confirmação de participantes do encontro.

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle } from "lucide-react";
import { consultingRepository } from "./consultingRepository";
import { useToast } from "@/components/ui/use-toast";

export default function ParticipantsModal({ meeting, onClose, onConfirmed }) {
  const { toast } = useToast();
  const [participants, setParticipants] = useState(
    consultingRepository.getParticipants(meeting.id).map((p) => ({ ...p, note: p.note || "" }))
  );

  const toggleConfirm = (role) => {
    setParticipants(participants.map((p) =>
      p.role === role ? { ...p, confirmed: !p.confirmed } : p
    ));
  };

  const handleNoteChange = (role, note) => {
    setParticipants(participants.map((p) =>
      p.role === role ? { ...p, note } : p
    ));
  };

  const handleConfirm = () => {
    consultingRepository.confirmParticipants(meeting.id, { participants });
    toast({ title: "Participantes confirmados", description: "O checklist foi atualizado." });
    onConfirmed?.();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Confirmar participantes</DialogTitle>
          <DialogDescription>
            Encontro {meeting.number} — {meeting.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {participants.map((p) => (
            <div key={p.role} className="rounded-lg border border-border bg-card p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{p.role}</span>
                    {p.required ? (
                      <span className="rounded-full bg-status-warning-surface px-1.5 py-0.5 text-caption font-medium text-status-warning-text">Obrigatório</span>
                    ) : (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground">Opcional</span>
                    )}
                  </div>
                </div>
                <button onClick={() => toggleConfirm(p.role)} className="shrink-0">
                  {p.confirmed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground" />
                  )}
                </button>
              </div>
              {p.confirmed && (
                <div className="mt-2">
                  <Label className="text-xs">Observação</Label>
                  <Textarea
                    value={p.note}
                    onChange={(e) => handleNoteChange(p.role, e.target.value)}
                    rows={1}
                    className="mt-1 min-h-[36px] text-xs"
                    placeholder="Observação sobre a participação..."
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar participantes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}