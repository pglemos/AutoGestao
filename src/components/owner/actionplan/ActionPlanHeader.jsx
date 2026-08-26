// Cabeçalho do Plano de Ação no padrão dos demais módulos.
import { Plus, Download, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import OwnerPageHeading from "@/components/owner/OwnerPageHeading";

export default function ActionPlanHeader({ onNewAction, onExport }) {
  return (
    <OwnerPageHeading
      icon={ListChecks}
      title="Plano de Ação"
      subtitle="Transforme as prioridades estratégicas em execução."
      actions={(
        <>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          {/* Sem handler não há criação: o Dono executa o plano que a MX criou. */}
          {onNewAction ? (
            <Button size="sm" onClick={onNewAction} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Nova Ação
            </Button>
          ) : null}
        </>
      )}
    />
  );
}
