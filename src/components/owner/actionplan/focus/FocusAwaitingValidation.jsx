// Seção "Aguardando validação" — ações prontas para revisão final.
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ChevronRight, FileCheck } from "lucide-react";
import { DEPT_STYLES } from "../actionPlanConstants";

export default function FocusAwaitingValidation({ actions, onValidate }) {
  const awaiting = actions.filter((a) => a.status === "awaiting_validation");

  return (
    <section className="rounded-xl border border-orange-200 bg-orange-50/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100">
          <ClipboardCheck className="h-4 w-4 text-orange-600" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Aguardando validação</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 px-1.5 text-xs font-bold text-orange-700">
          {awaiting.length}
        </span>
      </div>

      {awaiting.length === 0 ? (
        <div className="rounded-lg border border-dashed border-orange-200 bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação aguardando validação.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {awaiting.map((action) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            return (
              <div
                key={action.id}
                className="relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${dept.sideBar}`} />
                <div className="pl-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{action.code}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${dept.badge}`}>{dept.label}</span>
                  </div>

                  <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">{action.title}</h3>

                  <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>Resp.: <span className="font-medium text-foreground">{action.responsible}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileCheck className="h-3 w-3 text-emerald-500" />
                      <span>Evidência entregue</span>
                      <span>·</span>
                      <span>Enviado: {action.lastUpdate}</span>
                    </div>
                    {action.expectedImpact && (
                      <p className="line-clamp-1">
                        <span className="font-medium text-foreground">Impacto esperado:</span> {action.expectedImpact}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={() => onValidate(action, "validate")} className="bg-orange-600 hover:bg-orange-700">
                      Validar <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}