// Container principal da aba Calendário — orquestra visualizações, sidebar e modais.
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter as FilterIcon } from "lucide-react";
import ExecutiveFilters from "../ExecutiveFilters";
import CalendarHeader from "./CalendarHeader";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import AgendaView from "./AgendaView";
import CalendarSidebar from "./CalendarSidebar";
import CalendarLegend from "./CalendarLegend";
import RescheduleModal from "./RescheduleModal";
import { exportCalendarCSV, exportMonthAgendaCSV, printCalendar } from "./CalendarExport";
import { getRefDate } from "../actionPlanUtils";
import {
  loadCalendarPrefs,
  saveCalendarPrefs,
  getActionsByDate,
  canReschedule,
  formatDateBR,
  formatDateISO,
  parseISOToDate,
  addDays,
  addMonths,
} from "./calendarUtils";

export default function CalendarView({
  actions,
  loading,
  filters,
  onClearFilters,
  onFilterChange,
  onOpenAction,
  onNewAction,
  onTalkToConsultant,
  onTalkToConsultantDay,
  onUpdateDeadline,
  user,
  companyName,
  unitName,
  responsiblePeople = [],
}) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const prefs = useMemo(() => loadCalendarPrefs(), []);
  const refToday = useMemo(() => getRefDate(), []);

  const [viewMode, setViewMode] = useState(isMobile ? "agenda" : prefs.viewMode || "month");
  const [refDate, setRefDate] = useState(() => {
    const parsed = parseISOToDate(prefs.refDate);
    return parsed && !isNaN(parsed.getTime()) ? parsed : refToday;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const parsed = parseISOToDate(prefs.selectedDate);
    return parsed && !isNaN(parsed.getTime()) ? parsed : refToday;
  });
  const [selectedAction, setSelectedAction] = useState(null);
  const [rescheduleAction, setRescheduleAction] = useState(null);
  const [rescheduleNewDate, setRescheduleNewDate] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  useEffect(() => {
    saveCalendarPrefs({
      viewMode,
      refDate: formatDateISO(refDate),
      selectedDate: formatDateISO(selectedDate),
    });
  }, [viewMode, refDate, selectedDate]);

  useEffect(() => {
    if (isMobile && !prefs.viewMode) {
      setViewMode("agenda");
    }
  }, [isMobile, prefs.viewMode]);

  const actionsByDate = useMemo(() => getActionsByDate(actions), [actions]);

  const handlePrev = () => {
    if (viewMode === "month") setRefDate(addMonths(refDate, -1));
    else if (viewMode === "week") setRefDate(addDays(refDate, -7));
  };
  const handleNext = () => {
    if (viewMode === "month") setRefDate(addMonths(refDate, 1));
    else if (viewMode === "week") setRefDate(addDays(refDate, 7));
  };
  const handleToday = () => {
    setRefDate(refToday);
    setSelectedDate(refToday);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedAction(null);
    if (isMobile) setMobileDetailsOpen(true);
  };

  const handleRescheduleDrag = (action, newDate) => {
    const check = canReschedule(action);
    if (!check.allowed) {
      toast({ title: check.message, variant: "destructive" });
      return;
    }
    if (check.requireFuture && newDate.getTime() < refToday.getTime()) {
      toast({ title: "Ação aguardando decisão só pode ser reagendada para data futura.", variant: "destructive" });
      return;
    }
    setRescheduleAction(action);
    setRescheduleNewDate(formatDateBR(newDate));
  };

  const handleUpdateDeadlineClick = (action) => {
    setRescheduleAction(action);
    setRescheduleNewDate("");
  };

  const handleRescheduleConfirm = (id, payload) => {
    onUpdateDeadline(id, { ...payload, rescheduledBy: user?.full_name || "Nome não informado" });
    setRescheduleAction(null);
    setRescheduleNewDate("");
  };

  const handleExportCalendar = () => {
    exportCalendarCSV(actions, refDate);
    toast({ title: "Calendário exportado." });
  };
  const handleExportAgenda = () => {
    exportMonthAgendaCSV(actions, refDate);
    toast({ title: "Agenda do mês exportada." });
  };
  const handlePrint = () => {
    printCalendar(actions, refDate, companyName, unitName);
  };

  const sidebarProps = {
    actions,
    selectedDate,
    selectedAction,
    onSelectAction: setSelectedAction,
    onSelectDate: (date) => {
      setSelectedDate(date);
      setSelectedAction(null);
    },
    onOpenAction,
    onUpdateDeadline: handleUpdateDeadlineClick,
    onTalkToConsultant,
    onTalkToConsultantDay,
    onNewAction,
    onViewAllDeadlines: () => setViewMode("agenda"),
  };

  return (
    <div className="space-y-3">
      <CalendarHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        refDate={refDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onNewAction={() => onNewAction(formatDateBR(selectedDate))}
        onExportCalendar={handleExportCalendar}
        onExportAgenda={handleExportAgenda}
        onPrint={handlePrint}
      />

      {isMobile ? (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setMobileFiltersOpen(true)}>
          <FilterIcon className="h-4 w-4" />
          Filtros
        </Button>
      ) : (
        <ExecutiveFilters
          filters={filters}
          onChange={onFilterChange}
          onClear={onClearFilters}
          collapsed={false}
          onToggleCollapse={() => {}}
          responsiblePeople={responsiblePeople}
        />
      )}

      <CalendarLegend />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação com prazo neste período.</p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => onNewAction(formatDateBR(selectedDate))}>Criar nova ação</Button>
            <Button size="sm" variant="outline" onClick={onClearFilters}>Limpar filtros</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="lg:w-[74%]">
            {viewMode === "month" && (
              <MonthView
                refDate={refDate}
                selectedDate={selectedDate}
                actionsByDate={actionsByDate}
                onSelectDate={handleSelectDate}
                onOpenAction={onOpenAction}
                onReschedule={handleRescheduleDrag}
                isMobile={isMobile}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                refDate={refDate}
                selectedDate={selectedDate}
                actionsByDate={actionsByDate}
                onSelectDate={handleSelectDate}
                onOpenAction={onOpenAction}
                onReschedule={handleRescheduleDrag}
                isMobile={isMobile}
              />
            )}
            {viewMode === "agenda" && (
              <AgendaView
                actions={actions}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onOpenAction={onOpenAction}
                onUpdateDeadline={handleUpdateDeadlineClick}
                onTalkToConsultant={onTalkToConsultant}
              />
            )}
          </div>

          {!isMobile && (
            <div className="lg:w-[26%]">
              <CalendarSidebar {...sidebarProps} />
            </div>
          )}
        </div>
      )}

      {/* Mobile filters drawer */}
      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="left" className="w-[85vw] sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ExecutiveFilters
              filters={filters}
              onChange={onFilterChange}
              onClear={onClearFilters}
              collapsed={false}
              onToggleCollapse={() => {}}
              responsiblePeople={responsiblePeople}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile day details drawer */}
      <Sheet open={isMobile && mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do dia</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CalendarSidebar {...sidebarProps} />
          </div>
        </SheetContent>
      </Sheet>

      <RescheduleModal
        action={rescheduleAction}
        newDate={rescheduleNewDate}
        open={!!rescheduleAction}
        onOpenChange={(o) => !o && setRescheduleAction(null)}
        onConfirm={handleRescheduleConfirm}
      />
    </div>
  );
}
