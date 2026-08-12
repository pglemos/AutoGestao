// Card de estatísticas do programa — badge, métricas e próximo encontro.

import { Users, CheckCircle2, FileCheck, Calendar, ArrowRight, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

function MetricCard({ icon: Icon, completed, total, label, percent }) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">{label}</p>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-lg font-bold text-foreground">{completed}</span>
        <span className="text-xs text-muted-foreground">de {total}</span>
        <span className="ml-auto text-xs font-medium text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent} className="mt-1.5 h-1.5" />
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "A agendar";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatPeriod(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function ProgramStatsCard({ program, progressBars, currentMeeting, onSelectMeeting }) {
  if (!program) return null;

  const startDate = "2026-07-01";
  const endDate = "2027-07-01";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex-1 space-y-4">
          {/* Badge + Nome */}
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-status-success-text">
              Programa contratado
            </span>
            <div className="mt-2 flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">{program.shortName}</h2>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-status-success-text">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-primary" />
                Ativo
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{program.description}</p>
          </div>

          {/* Info */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Modalidade: <span className="font-medium text-foreground">{program.modalities.join(", ")}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Período: <span className="font-medium text-foreground">{formatPeriod(startDate)} a {formatPeriod(endDate)}</span>
            </span>
          </div>

          {/* Métricas */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <MetricCard icon={Users} completed={progressBars.journey.completed} total={progressBars.journey.total} label="Encontros realizados" percent={progressBars.journey.percent} />
            <MetricCard icon={CheckCircle2} completed={progressBars.implementations.completed} total={progressBars.implementations.total} label="Implantações concluídas" percent={progressBars.implementations.percent} />
            <MetricCard icon={FileCheck} completed={progressBars.evidences.completed} total={progressBars.evidences.total} label="Evidências aprovadas" percent={progressBars.evidences.percent} />
          </div>
        </div>

        {/* Próximo encontro */}
        {currentMeeting && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 lg:w-64 xl:w-72">
            <p className="text-xs font-medium text-muted-foreground">Próximo encontro</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Encontro {currentMeeting.number}</p>
            <p className="text-sm text-foreground">{currentMeeting.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(currentMeeting.scheduledDate)}</p>
            <a href="https://meet.google.com/mxk-consultoria" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="mt-3 w-full bg-primary hover:bg-primary/90">
                <Video className="h-3.5 w-3.5" />
                Entrar na Reunião
              </Button>
            </a>
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onSelectMeeting(currentMeeting.id)}>
              Ver detalhes
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}