// Identificação do indicador com badges de metadados.
import { Badge } from "@/components/atoms/Badge";
import { DIRECTION_LABELS, AGGREGATION_LABELS, FORMAT_LABELS } from "./strategicIndicatorCatalog";
import { MONTHS_FULL, SELECTED_MONTH_INDEX, REFERENCE_YEAR, AREA_STYLES } from "./strategicUtils";

export default function StrategicIndicatorHeader({ indicator }) {
  if (!indicator) return null;
  const style = AREA_STYLES[indicator.area] || {};
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground">{indicator.name}</h3>
    </div>
  );
}