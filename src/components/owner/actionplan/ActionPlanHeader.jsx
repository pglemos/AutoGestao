// Cabeçalho compacto do Plano de Ação.
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActionPlanHeader({ onNewAction, onExport }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
              Plano de Ação
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Transforme as prioridades estratégicas em execução.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" onClick={onNewAction} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Nova Ação
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Fonte:</span>
          <span className="font-medium text-foreground">Plano de Ação centralizado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Atualização:</span>
          <span className="font-medium text-foreground">dados reais do Supabase</span>
        </div>
      </div>
    </section>
  );
}
