// Placeholder para abas ainda não construídas.
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

export default function ComingSoonTab({ title, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-warning-surface">
        <Construction className="h-7 w-7 text-status-warning-text" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Esta aba será construída na próxima etapa.
      </p>
      <Button className="mt-5" onClick={onBack}>
        Voltar para Visão Executiva
      </Button>
    </div>
  );
}