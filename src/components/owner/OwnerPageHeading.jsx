import { useOutletContext } from "react-router-dom";
import { PageHeading } from "@/components/molecules/PageHeading";
import { MxSurfaceVisualProvider } from "@/components/module/MxSurfaceVisualContext";
import OwnerFilterButton from "@/components/owner/OwnerFilterButton";

// Cabecalho padrao das paginas do modulo Dono.
// Reaproveita o PageHeading dos demais modulos (variante manager: card branco,
// icone esmeralda e titulo em h1) e injeta o filtro de loja/periodo nas acoes,
// para nao existir um card de filtros separado do cabecalho.
export default function OwnerPageHeading({ actions, showFilter = true, ...props }) {
  let lastUpdated;
  try {
    lastUpdated = useOutletContext()?.lastUpdated;
  } catch {
    lastUpdated = undefined;
  }

  return (
    <MxSurfaceVisualProvider mode="manager">
      <PageHeading
        {...props}
        actions={(
          <>
            {actions}
            {showFilter ? <OwnerFilterButton lastUpdated={lastUpdated} /> : null}
          </>
        )}
      />
    </MxSurfaceVisualProvider>
  );
}
