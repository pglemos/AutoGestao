// Cabeçalho do Calendário: navegação, seletor de visualização, Hoje, Nova Ação, Exportar.
import { ChevronLeft, ChevronRight, Plus, Download, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMonthYear, formatWeekRange } from "./calendarUtils";

const VIEW_OPTIONS = [
  { value: "month", label: "Mês" },
  { value: "week", label: "Semana" },
  { value: "agenda", label: "Agenda" },
];

export default function CalendarHeader({
  viewMode,
  onViewModeChange,
  refDate,
  onPrev,
  onNext,
  onToday,
  onNewAction,
  onExportCalendar,
  onExportAgenda,
  onPrint,
}) {
  const periodTitle = viewMode === "month" ? formatMonthYear(refDate) : viewMode === "week" ? formatWeekRange(refDate) : "Agenda";

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPrev} className="h-8 w-8" aria-label="Período anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNext} className="h-8 w-8" aria-label="Próximo período">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h2 className="min-w-[140px] text-base font-semibold text-foreground">{periodTitle}</h2>
          <Button variant="outline" size="sm" onClick={onToday} className="h-8">
            <CalendarDays className="h-4 w-4" />
            Hoje
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onViewModeChange(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === opt.value
                    ? "bg-status-success-surface text-status-success-text shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportCalendar}>Exportar calendário (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={onExportAgenda}>Exportar agenda do mês (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint}>Imprimir calendário</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={onNewAction} className="h-8 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Nova Ação
          </Button>
        </div>
      </div>
    </section>
  );
}
