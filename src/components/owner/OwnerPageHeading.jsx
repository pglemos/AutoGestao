import { PageHeading } from "@/components/molecules/PageHeading";
import { MxSurfaceVisualProvider } from "@/components/module/MxSurfaceVisualContext";

// Cabecalho padrao das paginas do modulo Dono.
// Reaproveita o PageHeading dos demais modulos (variante manager: card branco,
// icone esmeralda e titulo em h1) para manter o mesmo padrao visual do sistema.
export default function OwnerPageHeading(props) {
  return (
    <MxSurfaceVisualProvider mode="manager">
      <PageHeading {...props} />
    </MxSurfaceVisualProvider>
  );
}
