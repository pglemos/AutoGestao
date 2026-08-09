// Seletor pesquisável de indicador com agrupamento por área e filtro de área.
import { useState, useMemo } from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { strategicIndicatorCatalog, AREA_LIST, DIRECTION_LABELS } from "./strategicIndicatorCatalog";
import { AREA_STYLES, normalizeText } from "./strategicUtils";

export default function StrategicIndicatorSelector({ value, onChange, areaFilter, onAreaFilterChange, compact = false }) {
  const [open, setOpen] = useState(false);

  const selected = strategicIndicatorCatalog.find((i) => i.id === value);

  const filtered = useMemo(() => {
    const list = areaFilter && areaFilter !== "all" ? strategicIndicatorCatalog.filter((i) => i.area === areaFilter) : strategicIndicatorCatalog;
    return list;
  }, [areaFilter]);

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`flex items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-sm hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 ${compact ? "h-9 min-w-0 flex-1 basis-[200px]" : "h-10 w-full"}`}
            role="combobox"
            aria-expanded={open}
            aria-controls="strategic-indicator-listbox"
          >
            <span className={`truncate ${selected ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {selected ? selected.name : "Selecione um indicador"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
          <Command
            filter={(val, search) => (normalizeText(val).includes(normalizeText(search)) ? 1 : 0)}
          >
            <div className="flex items-center border-b border-border px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput placeholder="Buscar indicador por nome, código ou área..." className="flex-1" />
            </div>
            <CommandList id="strategic-indicator-listbox" className="max-h-[320px]">
              <CommandEmpty>Nenhum indicador encontrado.</CommandEmpty>
              {AREA_LIST.map((area) => {
                const items = filtered.filter((i) => i.area === area);
                if (items.length === 0) return null;
                const style = AREA_STYLES[area];
                return (
                  <CommandGroup key={area} heading={`${area} (${items.length})`}>
                    {items.map((ind) => (
                      <CommandItem
                        key={ind.id}
                        value={`${ind.name} ${ind.code} ${ind.area}`}
                        onSelect={() => {
                          onChange(ind.id);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{ind.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {ind.code} · {DIRECTION_LABELS[ind.direction]}
                            </span>
                          </div>
                        </div>
                        <Check className={`h-4 w-4 ${value === ind.id ? "opacity-100" : "opacity-0"}`} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Select value={areaFilter || "all"} onValueChange={onAreaFilterChange}>
        <SelectTrigger className="h-9 w-[148px] shrink-0 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as áreas</SelectItem>
          {AREA_LIST.map((a) => (
            <SelectItem key={a} value={a}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}