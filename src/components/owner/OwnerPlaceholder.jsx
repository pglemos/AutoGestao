import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hammer } from "lucide-react";
import { PageCanvas } from "@/design-system/page";
import OwnerPageHeading from "@/components/owner/OwnerPageHeading";

export default function OwnerPlaceholder({ title, description }) {
  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex min-h-0 flex-1 flex-col space-y-6">
      <OwnerPageHeading
        icon={Hammer}
        title={title}
        subtitle={description || "Área em preparação."}
      />
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Hammer className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>}
        <p className="mt-4 rounded-full bg-status-warning-surface px-3 py-1 text-xs font-medium text-status-warning-text">
          Esta área será construída na próxima etapa
        </p>
        <Button asChild className="mt-6 shadow">
          <Link to="/home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Link>
        </Button>
      </div>
    </PageCanvas>
  );
}