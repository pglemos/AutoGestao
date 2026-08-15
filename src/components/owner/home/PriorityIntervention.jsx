import { useState } from "react";
import { priorityIntervention, STATUS_STYLES } from "./homeData";
import { AlertTriangle, Search, ClipboardList, UserCog, MessageCircle, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionContent } from "@/components/molecules/SectionCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const ACTION_ICONS = {
  search: Search,
  clipboard: ClipboardList,
  user: UserCog,
  message: MessageCircle,
};

export default function PriorityIntervention({ onTalkToConsultant }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const style = STATUS_STYLES[priorityIntervention.status];

  const handleAction = (action) => {
    if (action.consultant) {
      onTalkToConsultant?.({
        title: priorityIntervention.title,
        contextType: "department",
        requestType: "analysis",
        snapshot: `Intervenção prioritária: ${priorityIntervention.title}\nSituação: ${priorityIntervention.situation}\nDirecionamento: ${priorityIntervention.direction}`,
      });
      return;
    }
    setSelectedAction(action);
    setConfirmed(false);
  };

  const handleClose = () => {
    setSelectedAction(null);
    setConfirmed(false);
  };

  return (
    <SectionCard className={`border-2 ${style.border}`}>
      <SectionContent className="p-5 lg:p-6">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.bg}`}>
          <Zap className={`h-4 w-4 ${style.text}`} />
        </div>
        <h2 className="text-base font-semibold text-foreground">Intervenção prioritária</h2>
      </div>

      <div className={`mt-4 rounded-xl border ${style.border} ${style.bg} p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${style.text}`} />
            <div>
              <p className="font-semibold text-foreground">{priorityIntervention.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{priorityIntervention.situation}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full ${style.bg} ${style.text} px-2.5 py-0.5 text-xs font-semibold`}>
            {style.label}
          </span>
        </div>
        <div className="mt-3 space-y-1">
          {priorityIntervention.details.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`h-1 w-1 rounded-full ${style.dot}`} />
              {d}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Por que isso importa</p>
        <p className="mt-1 text-sm text-foreground">{priorityIntervention.why}</p>
      </div>

      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Direcionamento MX</p>
        <p className="mt-1 text-sm text-foreground">{priorityIntervention.direction}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Impacto estimado</p>
        <ul className="mt-1.5 space-y-1">
          {priorityIntervention.impact.map((imp, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {imp}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {priorityIntervention.actions.map((action) => {
          const Icon = ACTION_ICONS[action.icon] || Search;
          return (
            <Button
              key={action.label}
              variant={action.consultant ? "default" : "outline"}
              size="sm"
              className="justify-start"
              onClick={() => handleAction(action)}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>

      <Dialog open={!!selectedAction} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-md">
          {confirmed ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">Ação registrada</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                "{selectedAction?.label}" foi iniciada. O status será atualizado visualmente no modelo demonstrativo.
              </p>
              <Button className="mt-5" onClick={handleClose}>
                Concluir
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAction?.label}</DialogTitle>
                <DialogDescription>
                  Esta é uma ação demonstrativa. Ao confirmar, o status será atualizado visualmente.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-border bg-muted/60 p-3">
                <p className="text-xs font-medium text-foreground">Contexto</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {priorityIntervention.title} — {priorityIntervention.situation}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={() => setConfirmed(true)}>Confirmar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </SectionContent>
    </SectionCard>
  );
}