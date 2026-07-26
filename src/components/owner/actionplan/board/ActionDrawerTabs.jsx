// Drawer de ação com 4 abas internas: Resumo, Execução, Evidências, Histórico e Impacto.
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { actionPlanLiveRepository } from "../actionPlanLiveRepository";
import { QUICK_ACTIONS } from "../actionPlanConstants";
import SummaryTab from "./SummaryTab";
import ExecutionTab from "./ExecutionTab";
import EvidenceTab from "./EvidenceTab";
import HistoryTab from "./HistoryTab";

export default function ActionDrawerTabs({ action, open, onOpenChange, onQuickAction, onReload, user, initialTab }) {
  const [currentAction, setCurrentAction] = useState(action);
  const [tab, setTab] = useState("resumo");

  useEffect(() => {
    if (action) {
      setCurrentAction(action);
      setTab(initialTab || "resumo");
    }
  }, [action, initialTab]);

  if (!currentAction) return null;

  const reload = async () => {
    const updated = await actionPlanLiveRepository.getActionById(currentAction.id);
    if (updated) setCurrentAction(updated);
    if (onReload) await onReload();
  };

  const quickActions = QUICK_ACTIONS[currentAction.status] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{currentAction.code}</span>
          </div>
          <DialogTitle className="text-left">{currentAction.title}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="resumo" className="whitespace-nowrap text-xs">Resumo</TabsTrigger>
            <TabsTrigger value="execucao" className="whitespace-nowrap text-xs">Execução</TabsTrigger>
            <TabsTrigger value="evidencias" className="whitespace-nowrap text-xs">Evidências</TabsTrigger>
            <TabsTrigger value="historico" className="whitespace-nowrap text-xs">Histórico e Impacto</TabsTrigger>
          </TabsList>
          <TabsContent value="resumo" className="mt-3"><SummaryTab action={currentAction} /></TabsContent>
          <TabsContent value="execucao" className="mt-3"><ExecutionTab action={currentAction} onReload={reload} onQuickAction={onQuickAction} user={user} /></TabsContent>
          <TabsContent value="evidencias" className="mt-3"><EvidenceTab action={currentAction} onReload={reload} user={user} /></TabsContent>
          <TabsContent value="historico" className="mt-3"><HistoryTab action={currentAction} onReload={reload} user={user} /></TabsContent>
        </Tabs>

        <div className="mt-4 flex min-w-0 flex-wrap gap-2 border-t border-border pt-4">
          {quickActions.filter((qa) => {
            if (qa.value === "open") return false;
            if (tab === "execucao" && ["progress", "block", "unblock"].includes(qa.value)) return false;
            return true;
          }).map((qa) => {
            const isPrimary = qa.value === "approve" || qa.value === "validate" || qa.value === "start" || qa.value === "submitValidation";
            const isDanger = qa.value === "cancel" || qa.value === "block";
            return (
              <Button
                key={qa.value}
                size="sm"
                variant={isPrimary ? "default" : isDanger ? "outline" : "outline"}
                onClick={() => onQuickAction(currentAction, qa.value)}
                className={isPrimary ? "bg-primary hover:bg-primary/90" : isDanger ? "text-red-600 hover:text-red-700" : ""}
              >
                {qa.label}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
