import { salesGoal } from "./homeData";
import { Target, TrendingDown, ArrowUpRight } from "lucide-react";
import { toast } from '@/lib/toast'

export default function SalesGoalBlock() {

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Meta de Venda do Mês</h2>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Atingimento</span>
            <span className="text-sm font-semibold text-foreground">{salesGoal.achievement}%</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${salesGoal.achievement}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-primary/5 p-2.5 text-center">
            <p className="text-xs text-muted-foreground">Vendidos</p>
            <p className="mt-0.5 text-xl font-bold text-primary">{salesGoal.sold}</p>
          </div>
          <div className="rounded-lg bg-status-error-surface p-2.5 text-center">
            <p className="text-xs text-muted-foreground">Faltam</p>
            <p className="mt-0.5 text-xl font-bold text-status-error-text">{salesGoal.remaining}</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2.5 text-center">
            <p className="text-xs text-muted-foreground">Ritmo ideal</p>
            <p className="mt-0.5 text-sm font-bold text-foreground">{salesGoal.idealPace}/dia</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Projeção atual</p>
            <p className="text-sm font-semibold text-foreground">{salesGoal.projection} veículos</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-status-warning-surface px-2.5 py-1">
            <TrendingDown className="h-3.5 w-3.5 text-status-warning-text" />
            <span className="text-xs font-medium text-status-warning-text">Abaixo da meta</span>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-surface p-3">
          <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-text" />
          <p className="text-xs text-status-warning-text">{salesGoal.message}</p>
        </div>
        <button
          onClick={() =>
            toast.info("Diagnóstico comercial", { description: "Consulte o diagnóstico comercial com dados reais na Visão Geral do Dono." })
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          {salesGoal.action}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
