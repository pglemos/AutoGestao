import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionContent } from "@/components/molecules/SectionCard";

export default function ConsultantCard({ onTalkToConsultant }) {
  return (
    <SectionCard className="bg-gradient-to-br from-primary/5 to-card">
      <SectionContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">Consultor MX</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Precisa de ajuda para decidir? Fale com seu consultor usando o contexto desta tela.
            </p>
            <Button
              className="mt-3"
              onClick={() =>
                onTalkToConsultant?.({
                  title: "Tela Início — Dono",
                  contextType: "general",
                  requestType: "decision_discussion",
                  snapshot: "Quero analisar a estratégia para os 11 veículos acima de 60 dias.",
                })
              }
            >
              Perguntar
            </Button>
          </div>
        </div>
      </SectionContent>
    </SectionCard>
  );
}