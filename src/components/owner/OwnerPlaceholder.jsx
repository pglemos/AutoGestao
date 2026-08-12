import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hammer } from "lucide-react";

export default function OwnerPlaceholder({ title, description }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Hammer className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
      {description && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>}
      <p className="mt-4 rounded-full bg-status-warning-surface px-3 py-1 text-xs font-medium text-status-warning-text">
        Esta área será construída na próxima etapa
      </p>
      <Button asChild className="mt-6 shadow">
        <Link to="/home">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Início
        </Link>
      </Button>
    </div>
  );
}