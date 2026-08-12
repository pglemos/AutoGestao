// Resumo do ciclo: card principal + 5 indicadores.
import { Clock, AlertTriangle, Ban, PlayCircle, CheckCircle2 } from "lucide-react";
import { CYCLE_INFO } from "./actionPlanConstants";
import { cycleProgress, countByStatus, countLate, countBlocked, countRequiresOwner } from "./actionPlanUtils";

export default function CycleSummary({ actions }) {
  const progress = cycleProgress(actions);
  const awaiting = countRequiresOwner(actions);
  const late = countLate(actions);
  const blocked = countBlocked(actions);
  const inProgress = countByStatus(actions, "in_progress");
  const completed = countByStatus(actions, "completed");

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {/* Card principal */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-2 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Execução do ciclo</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{progress}%</p>
            <p className="text-xs text-muted-foreground">Progresso médio das {actions.length} ações</p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center">
            <div className="relative h-14 w-14">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                <circle
                  cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-primary"
                  strokeDasharray={`${(progress / 100) * 150.8} 150.8`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Início: {CYCLE_INFO.startDate}</span>
          <span>Fim: {CYCLE_INFO.endDate}</span>
          <span>{CYCLE_INFO.daysRemaining} dias restantes</span>
          <span className="inline-flex items-center gap-1 font-medium text-status-warning-text">
            <AlertTriangle className="h-3 w-3" /> Status: {CYCLE_INFO.status}
          </span>
        </div>
      </div>

      <SummaryCard icon={Clock} label="Aguardando você" value={awaiting} colorClass="text-violet-600" bgClass="bg-violet-50" />
      <SummaryCard icon={AlertTriangle} label="Atrasadas" value={late} colorClass="text-status-error-text" bgClass="bg-status-error-surface" />
      <SummaryCard icon={Ban} label="Bloqueadas" value={blocked} colorClass="text-status-error-text" bgClass="bg-status-error-surface" />
      <SummaryCard icon={PlayCircle} label="Em andamento" value={inProgress} colorClass="text-status-info-text" bgClass="bg-status-info-surface" />
      <SummaryCard icon={CheckCircle2} label="Concluídas" value={completed} colorClass="text-status-success-text" bgClass="bg-status-success-surface" />
    </section>
  );
}

function SummaryCard({ icon: Icon, label, value, colorClass, bgClass }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${bgClass}`}>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}