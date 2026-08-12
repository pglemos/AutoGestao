// Focos atuais do ciclo — 4 cards temáticos com ícone, descrição e progresso.

import { Workflow, Search, GraduationCap, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const FOCUSES = [
  { id: "processes", title: "Estruturação de Processos", description: "Padronização dos processos comerciais, operacionais e financeiros.", icon: Workflow, theme: "primary", progress: 42 },
  { id: "diagnosis", title: "Diagnóstico e Prioridades", description: "Identificação de gargalos e definição de prioridades do ciclo.", icon: Search, theme: "blue", progress: 65 },
  { id: "preparation", title: "Preparação Autônoma", description: "Aulas, checklists e evidências para acelerar os encontros.", icon: GraduationCap, theme: "amber", progress: 25 },
  { id: "culture", title: "Cultura de Resultados", description: "Indicadores, metas e acompanhamento gerencial contínuo.", icon: Target, theme: "purple", progress: 30 },
];

const THEME_CLASSES = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  blue: { bg: "bg-status-info-surface", text: "text-status-info-text" },
  amber: { bg: "bg-status-warning-surface", text: "text-status-warning-text" },
  purple: { bg: "bg-status-info-surface", text: "text-status-info-text" },
};

export default function CycleFocuses() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Focos atuais do ciclo</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FOCUSES.map((f) => {
          const theme = THEME_CLASSES[f.theme];
          const Icon = f.icon;
          return (
            <div key={f.id} className="rounded-lg border border-border bg-muted/20 p-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.bg}`}>
                <Icon className={`h-4 w-4 ${theme.text}`} />
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{f.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{f.description}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <Progress value={f.progress} className="h-1.5 flex-1" />
                <span className="text-xs font-medium text-muted-foreground">{f.progress}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}