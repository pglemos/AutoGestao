import { useEffect, useState } from "react";
import { base44 } from "@/features/owner-base44/b44adapter";
import { useOwner } from "@/components/owner/OwnerContext";
import { useAuth } from "@/lib/owner-b44/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REQUEST_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/owner-b44/status";
import { CheckCircle2, Paperclip } from "lucide-react";

const requestTypeOptions = Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

export default function ConsultantRequestModal() {
  const { consultantModal, closeConsultantModal, currentCompany, unitId, period, currentUnits } = useOwner();
  const { user } = useAuth();
  const ctx = consultantModal.context;

  const [subject, setSubject] = useState("");
  const [requestType, setRequestType] = useState("question");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // pré-preenche quando aberto a partir de um contexto
  useEffect(() => {
    if (consultantModal.open && ctx) {
      setSubject(ctx.title ? `Sobre: ${ctx.title}` : "");
      setRequestType(ctx.requestType || "decision_discussion");
      setMessage(ctx.snapshot ? `Contexto anexado:\n${ctx.snapshot}\n\n` : "");
      setPriority(ctx.priority || "medium");
      setDone(false);
      setSubmitError("");
    } else if (consultantModal.open && !ctx) {
      setSubject("");
      setRequestType("question");
      setMessage("");
      setPriority("medium");
      setDone(false);
      setSubmitError("");
    }
  }, [consultantModal.open, ctx]);

  const unitName =
    unitId === "all" ? "Todas as unidades" : currentUnits.find((u) => u.id === unitId)?.name || "—";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentCompany) return;
    const targetUnitId = unitId === "all" ? currentUnits[0]?.id : unitId;
    const canUseTargetUnit = targetUnitId && currentUnits.some((unit) => unit.id === targetUnitId);
    if (!canUseTargetUnit) {
      setSubmitError("Selecione uma unidade acessível antes de enviar a solicitação.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await base44.entities.ConsultantRequest.create({
        company_id: currentCompany.id,
        unit_id: targetUnitId,
        created_by: user?.id,
        created_by_name: user?.full_name || user?.email,
        request_type: requestType,
        subject,
        message,
        priority,
        context_type: ctx?.contextType || "general",
        context_id: ctx?.contextId || "",
        context_snapshot: ctx?.snapshot || "",
        status: "open",
      });
      setDone(true);
    } catch {
      setSubmitError("Não foi possível enviar a solicitação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    closeConsultantModal();
    setDone(false);
    setSubmitError("");
  };

  return (
    <Dialog open={consultantModal.open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Falar com Consultor</DialogTitle>
          <DialogDescription>
            Envie uma solicitação ao consultor responsável pela sua empresa.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">Solicitação enviada</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Seu consultor receberá a solicitação. O histórico ficará registrado no ambiente de Consultoria.
            </p>
            <Button className="mt-5" onClick={handleClose}>
              Concluir
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contexto anexado */}
            {ctx && (
              <div className="rounded-lg border border-border bg-muted/60 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  Contexto anexado automaticamente
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{ctx.snapshot || ctx.title}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cr-subject">Assunto *</Label>
                <Input
                  id="cr-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Resumo da solicitação"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo da solicitação *</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {requestTypeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cr-message">Mensagem *</Label>
              <Textarea
                id="cr-message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva o que você precisa do consultor."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input value={currentCompany?.name || "—"} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Input value={unitName} disabled />
              </div>
            </div>

            {submitError && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !subject || !message}>
                {submitting ? "Enviando..." : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
