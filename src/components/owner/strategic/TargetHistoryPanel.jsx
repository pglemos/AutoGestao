// Painel recolhível de histórico de alterações de metas.
import { useState, useEffect, Fragment } from "react";
import { ChevronDown, ChevronRight, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strategicPlanRepository } from "./strategicPlanLiveRepository";
import { MONTHS, formatCellValue } from "./strategicUtils";
import { formatDateTime } from "@/lib/owner-b44/format";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/owner-b44/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TargetHistoryPanel({ indicatorId, year, onRestored }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setHistory(strategicPlanRepository.getTargetHistory(indicatorId, year));
  };

  useEffect(() => {
    if (open) load();
  }, [open, indicatorId, year]);

  const restore = async (id) => {
    try {
      await strategicPlanRepository.restoreHistoryVersion(id, user);
      toast({ title: "Versão restaurada com sucesso." });
      setConfirmId(null);
      load();
      onRestored?.();
    } catch (error) {
      toast({ title: "Não foi possível restaurar a versão.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
      setConfirmId(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Histórico de alterações</h4>
          {history.length > 0 && <span className="text-xs text-muted-foreground">({history.length})</span>}
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t border-border p-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada para este indicador.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => {
                const changedMonths = h.previousValues
                  .map((v, i) => (v !== h.newValues[i] ? i : -1))
                  .filter((i) => i >= 0);
                return (
                  <div key={h.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">{formatDateTime(h.timestamp)}</p>
                        <p className="text-xs text-muted-foreground">Por: {h.user}</p>
                        {changedMonths.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Meses alterados: {changedMonths.map((i) => MONTHS[i]).join(", ")}
                          </p>
                        )}
                        {h.note && <p className="mt-1 text-xs italic text-muted-foreground">"{h.note}"</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(h.id)} className="text-xs">
                        <RotateCcw className="h-3 w-3" /> Restaurar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Os valores atuais serão substituídos pelos valores desta versão. Um novo evento de histórico será criado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && restore(confirmId)}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
