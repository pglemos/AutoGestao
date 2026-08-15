// Filtros compactos da Visão Geral em uma única linha.
import { Search, X } from "lucide-react";
import { Input } from '@/components/atoms/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AREA_LIST } from "./strategicIndicatorCatalog";

const RESULT_OPTIONS = [
  { value: "above", label: "Acima da Meta" },
  { value: "below", label: "Abaixo da Meta" },
  { value: "critical", label: "Crítico" },
];

export default function StrategicPlanOverviewFilters({ search, onSearchChange, area, onAreaChange, result, onResultChange, onClear, total, filtered }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar indicador..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9"
        />
      </div>
      <Select value={area} onValueChange={onAreaChange}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Área" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as áreas</SelectItem>
          {AREA_LIST.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={result} onValueChange={onResultChange}>
        <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Resultado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os resultados</SelectItem>
          {RESULT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onClear} className="h-9">
        <X className="h-4 w-4" /> Limpar
      </Button>
      <span className="text-xs text-muted-foreground">{filtered} de {total}</span>
    </div>
  );
}