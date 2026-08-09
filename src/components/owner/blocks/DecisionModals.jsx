import { useState } from "react";
import { base44 } from "@/features/owner/ownerRepository";
import { useOwner } from "@/components/owner/OwnerContext";
import { useAuth } from "@/features/owner/lib/ownerAuth";
import { logAudit } from "@/features/owner/lib/ownerAudit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import DetailDrawer from "@/components/owner/DetailDrawer";
import StatusBadge from "@/components/owner/StatusBadge";
import { formatBRL, formatDate, relativeDayLabel, formatDateTime } from "@/features/owner/lib/ownerFormatters";
import { IMPACT_LABELS, DEPARTMENT_LABELS } from "@/features/owner/lib/ownerStatus";

const deptLabel = (d) => DEPARTMENT_LABELS[d] || d || "—";

// ===== Drawer de Análise =====
export function DecisionAnalyzeDrawer({ decision, open, onOpenChange, onConsultant }) {
  if (!decision) return null;
  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={decision.title}
      description={`Análise completa da decisão • ${relativeDayLabel(decision.due_date)}`}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onConsultant(decision)}>
            Falar com Consultor
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status atual</span>
          <StatusBadge status={decision.status} />
        </div>

        <Block title="Contexto">
          <p className="text-sm text-muted-foreground">{decision.context}</p>
        </Block>

        <div className="grid grid-cols-2 gap-3">
          <Block title="Departamento">
            <p className="text-sm text-foreground">{deptLabel(decision.department)}</p>
          </Block>
          <Block title="Impacto">
            <p className="text-sm text-foreground">{IMPACT_LABELS[decision.impact_level] || "—"}</p>
          </Block>
          <Block title="Origem">
            <p className="text-sm text-foreground">{sourceLabel(decision.source_type)}</p>
          </Block>
          <Block title="Prazo">
            <p className="text-sm text-foreground">{formatDate(decision.due_date)} ({relativeDayLabel(decision.due_date)})</p>
          </Block>
        </div>

        {decision.financial_impact ? (
          <Block title="Impacto financeiro">
            <p className="text-sm font-semibold text-foreground">{formatBRL(decision.financial_impact)}</p>
          </Block>
        ) : null}

        {decision.recommendation && (
          <Block title="Recomendação">
            <p className="text-sm text-foreground">{decision.recommendation}</p>
          </Block>
        )}

        {decision.responsible_name && (
          <Block title="Responsável operacional">
            <p className="text-sm text-foreground">{decision.responsible_name}</p>
          </Block>
        )}

        <div className="rounded-md bg-muted/60 px-3 py-2 text-caption text-muted-foreground/80">
          Origem do dado: {sourceLabel(decision.source_type)} • Atualizado: {formatDateTime(decision.updated_date)}
        </div>
      </div>
    </DetailDrawer>
  );
}

// ===== Modal Aprovar =====
export function ApproveDecisionModal({ decision, open, onOpenChange, onDone }) {
  const { currentCompany } = useOwner();
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const prev = decision.status;
      await base44.entities.Decision.update(decision.id, {
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        notes,
      });
      await logAudit({
        companyId: currentCompany?.id,
        user,
        entityType: "Decision",
        entityId: decision.id,
        eventType: "approved",
        previousStatus: prev,
        newStatus: "approved",
        notes,
      });
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Aprovar decisão</DialogTitle>
          <DialogDescription>
            Confirme a aprovação de “{decision?.title}”. Esta ação será registrada com data, horário e responsável.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ap-notes">Observação (opcional)</Label>
            <Textarea
              id="ap-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione uma orientação ou justificativa."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting} className="bg-primary hover:bg-primary/90">
            {submitting ? "Aprovando..." : "Confirmar aprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Modal Delegar =====
export function DelegateDecisionModal({ decision, open, onOpenChange, onDone }) {
  const { currentCompany } = useOwner();
  const { user } = useAuth();
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [guidance, setGuidance] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!responsible) return;
    setSubmitting(true);
    try {
      const prev = decision.status;
      await base44.entities.Decision.update(decision.id, {
        status: "delegated",
        delegated_to: responsible,
        delegated_due_date: dueDate,
        notes: guidance,
        responsible_name: responsible,
      });
      await logAudit({
        companyId: currentCompany?.id,
        user,
        entityType: "Decision",
        entityId: decision.id,
        eventType: "delegated",
        previousStatus: prev,
        newStatus: "delegated",
        notes: `Delegado para ${responsible}. Prazo: ${dueDate}. Orientação: ${guidance}`,
      });
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Delegar decisão</DialogTitle>
          <DialogDescription>Defina o responsável, o prazo e a orientação para a execução.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dg-responsible">Responsável *</Label>
            <Input
              id="dg-responsible"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dg-due">Prazo *</Label>
            <Input id="dg-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dg-guide">Orientação</Label>
            <Textarea
              id="dg-guide"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="Oriente o responsável sobre o que deve ser feito."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting || !responsible}>
            {submitting ? "Delegando..." : "Delegar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Modal Transformar em Ação =====
export function ConvertToActionModal({ decision, open, onOpenChange, onDone }) {
  const { currentCompany, unitId } = useOwner();
  const { user } = useAuth();
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!responsible || !dueDate) return;
    setSubmitting(true);
    try {
      const prev = decision.status;
      const action = await base44.entities.ActionItem.create({
        company_id: decision.company_id,
        unit_id: decision.unit_id || (unitId === "all" ? "" : unitId),
        source_type: "decision",
        source_id: decision.id,
        title: decision.title,
        description: decision.context,
        context: decision.context,
        department: decision.department,
        responsible_name: responsible,
        due_date: dueDate,
        impact_level: decision.impact_level || "medium",
        budget: decision.financial_impact || 0,
        status: "pending",
        is_demo: decision.is_demo,
      });
      await base44.entities.Decision.update(decision.id, {
        status: "converted_action",
        notes: `Convertida em ação (ID: ${action.id})`,
      });
      await logAudit({
        companyId: currentCompany?.id,
        user,
        entityType: "Decision",
        entityId: decision.id,
        eventType: "converted_action",
        previousStatus: prev,
        newStatus: "converted_action",
        notes: `Ação criada: ${action.id}`,
      });
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Transformar decisão em ação</DialogTitle>
          <DialogDescription>
            Será criada uma ação vinculada a esta decisão, com título, contexto, origem, departamento e impacto já preenchidos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
            <p><span className="font-medium text-foreground">Título:</span> {decision?.title}</p>
            <p><span className="font-medium text-foreground">Departamento:</span> {deptLabel(decision?.department)}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cv-responsible">Responsável *</Label>
            <Input
              id="cv-responsible"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cv-due">Prazo *</Label>
            <Input id="cv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting || !responsible || !dueDate}>
            {submitting ? "Criando ação..." : "Criar ação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <p className="mb-1 text-caption font-medium uppercase tracking-wide text-muted-foreground/80">{title}</p>
      {children}
    </div>
  );
}

const sourceLabel = (s) => ({
  action: "Plano de Ação",
  alert: "Alerta executivo",
  consulting: "Consultoria",
  manual: "Manual",
})[s] || s || "—";
