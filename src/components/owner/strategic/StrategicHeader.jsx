import { Target } from "lucide-react";
import OwnerPageHeading from "@/components/owner/OwnerPageHeading";

// Cabecalho do Plano Estrategico no padrao dos demais modulos.
export default function StrategicHeader() {
  return (
    <OwnerPageHeading
      icon={Target}
      title="Planejamento Estratégico"
      subtitle="Acompanhe metas, resultados e evolução dos principais indicadores da empresa."
    />
  );
}
