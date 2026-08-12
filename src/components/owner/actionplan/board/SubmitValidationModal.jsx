// Modal de envio para validação — verifica regras antes de permitir.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export default function SubmitValidationModal({ action, open, onOpenChange, onConfirm }) {
  if (!action) return null;

  const errors = [];
  if ((action.progress || 0) < 100) errors.push("Progresso deve ser 100%");
  if (action.status === "blocked") errors.push("Ação não pode estar bloqueada");
  const requiredItems = (action.checklist || []).filter((i) => i.required);
  const incompleteRequired = requiredItems.filter((i) => !i.done);
  if (incompleteRequired.length > 0) errors.push(`${incompleteRequired.length} item(ns) obrigatório(s) do checklist pendente(s)`);
  if (action.evidenceRequired && (!action.evidences || action.evidences.length === 0)) {
    errors.push("Evidência obrigatória não anexada");
  }
  const canSubmit = errors.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para validação</DialogTitle>
          <DialogDescription>{action.code} — {action.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <CheckRow ok={(action.progress || 0) >= 100} label="Progresso 100%" />
          <CheckRow ok={action.status !== "blocked"} label="Sem bloqueio ativo" />
          <CheckRow ok={incompleteRequired.length === 0} label="Checklist obrigatório concluído" />
          <CheckRow ok={!action.evidenceRequired || (action.evidences && action.evidences.length > 0)} label="Evidência (quando obrigatória)" />
        </div>
        {!canSubmit && (
          <div className="rounded-md bg-status-error-surface p-3 text-sm text-status-error-text">
            <p className="font-medium">Não é possível enviar:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        {canSubmit && (
          <div className="rounded-md bg-status-success-surface p-3 text-sm text-status-success-text">
            Todos os requisitos atendidos. A ação será enviada para validação.
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onConfirm(action.id, {})} disabled={!canSubmit} className="bg-primary hover:bg-primary/90">
            Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle className="h-4 w-4 text-status-success" /> : <XCircle className="h-4 w-4 text-status-error" />}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}