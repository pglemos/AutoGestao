import { useState } from "react";
import { ownerActions } from "./homeData";
import { Clock, Check, UserCog, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from '@/lib/toast'
import { SectionCard, SectionHeader, SectionContent } from "@/components/molecules/SectionCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function OwnerActionsBlock() {
  const [done, setDone] = useState({});
  const [delegated, setDelegated] = useState({});
  const [detail, setDetail] = useState(null);

  const toggleDone = (i) => setDone((p) => ({ ...p, [i]: !p[i] }));
  const toggleDelegated = (i) => setDelegated((p) => ({ ...p, [i]: !p[i] }));

  return (
    <SectionCard>
      <SectionHeader>
        <h2 className="text-base font-semibold text-foreground">Próximas ações do Dono</h2>
      </SectionHeader>
      <SectionContent className="p-5">
      <div className="space-y-2">
        {ownerActions.map((action, i) => {
          const isDone = done[i];
          const isDelegated = delegated[i];
          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                isDone ? "border-primary/20 bg-primary/5" : isDelegated ? "border-status-info/30 bg-status-info-surface" : "border-border bg-background"
              }`}
            >
              <div className="flex w-12 shrink-0 flex-col items-center">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="mt-0.5 text-xs font-semibold text-foreground">{action.time}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm text-foreground ${isDone ? "line-through opacity-60" : ""}`}>{action.title}</p>
                {isDone && <span className="text-xs font-medium text-primary">Concluído</span>}
                {isDelegated && !isDone && <span className="text-xs font-medium text-status-info-text">Delegado</span>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleDone(i)} aria-label="Concluir">
                  <Check className={`h-4 w-4 ${isDone ? "text-primary" : "text-muted-foreground"}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleDelegated(i)} aria-label="Delegar">
                  <UserCog className={`h-4 w-4 ${isDelegated ? "text-status-info-text" : "text-muted-foreground"}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetail(action)} aria-label="Detalhes">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => toast.info("Agenda", { description: "Consulte a agenda real na Visão Geral do Dono." })}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Ver agenda completa
      </button>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da ação</DialogTitle>
            <DialogDescription>Modelo demonstrativo — sem regras de produção.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Horário</p>
              <p className="text-sm text-foreground">{detail?.time}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ação</p>
              <p className="text-sm text-foreground">{detail?.title}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDetail(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </SectionContent>
    </SectionCard>
  );
}
