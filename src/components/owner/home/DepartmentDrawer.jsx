import DetailDrawer from "@/components/owner/DetailDrawer";
import { STATUS_STYLES } from "./homeData";
import ScoreGauge from "./ScoreGauge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lightbulb, Crown, UserCog, MessageCircle } from "lucide-react";

export default function DepartmentDrawer({ department, onClose, onTalkToConsultant }) {
  const open = !!department;
  const style = department ? STATUS_STYLES[department.status] : null;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={department?.name || ""}
      description="Detalhes demonstrativos do departamento."
    >
      {department && style && (
        <div className="space-y-5">
          <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Score</p>
                <p className="text-3xl font-bold text-foreground">{department.score}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full ${style.bg} ${style.text} px-2.5 py-0.5 text-xs font-semibold`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            </div>
            <div className="relative mt-2 h-[60px]">
              <ScoreGauge value={department.score} colorClass={style.gauge} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ponto-chave</p>
            <div className="mt-1 flex items-start gap-2">
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${style.text}`} />
              <p className="text-sm text-foreground">{department.keyPoint}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indicadores</p>
            <ul className="mt-1.5 space-y-1">
              {department.indicators.map((ind, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  {ind}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Impacto</p>
            <p className="mt-1 text-sm text-foreground">{department.impact}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Possíveis causas</p>
            <ul className="mt-1.5 space-y-1">
              {department.causes.map((cause, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {cause}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Direcionamento</p>
                <p className="mt-1 text-sm text-foreground">{department.direction}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-status-warning-text" />
                <p className="text-xs font-semibold text-foreground">Responsabilidade do Dono</p>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{department.ownerRole}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5">
                <UserCog className="h-4 w-4 text-status-info-text" />
                <p className="text-xs font-semibold text-foreground">Responsabilidade do Gerente</p>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{department.managerRole}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações recomendadas</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {department.actions.map((action) => (
                <Button
                  key={action}
                  variant={action === "Falar com Consultor" ? "default" : "outline"}
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    if (action === "Falar com Consultor") {
                      onTalkToConsultant?.({
                        title: department.name,
                        contextType: "department",
                        requestType: "analysis",
                        snapshot: `Departamento: ${department.name}\nScore: ${department.score} (${style.label})\nPonto-chave: ${department.keyPoint}\nDirecionamento: ${department.direction}`,
                      });
                    }
                  }}
                >
                  {action === "Falar com Consultor" && <MessageCircle className="h-4 w-4" />}
                  {action}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}