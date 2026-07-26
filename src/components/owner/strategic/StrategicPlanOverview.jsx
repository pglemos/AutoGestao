// Visão Geral: 5 cards executivos + tabela completa de 45 indicadores agrupados por área.
import { useState, useMemo, Fragment } from "react";
import { ShoppingCart, Megaphone, Package, Wallet, Settings, ChevronDown, ChevronRight, DollarSign, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AREA_LIST } from "./strategicIndicatorCatalog";
import { MONTHS, SELECTED_MONTH_INDEX, VIEW_OPTIONS, AREA_STYLES, CARD_ICON_STYLES, SPARK_COLORS, formatCellValue, consolidateValues, getConsolidatedLabel, normalizeText, calculatePercentageOfTarget } from "./strategicUtils";
import { strategicPlanRepository } from "./strategicPlanLiveRepository";
import MiniChart from "./MiniChart";
import StrategicPlanOverviewFilters from "./StrategicPlanOverviewFilters";
import ViewSelector from "./ViewSelector";
import CellWithTooltip from "./CellWithTooltip";
import { TooltipProvider } from "@/components/ui/tooltip";

const CARD_ICONS = { dollar: DollarSign, barChart: BarChart3, shoppingCart: ShoppingCart, package: Package, users: Users };

const AREA_ICONS = {
  Vendas: ShoppingCart,
  Marketing: Megaphone,
  Estoque: Package,
  Financeiro: Wallet,
  Operacional: Settings,
};

const executiveCardConfigs = [
  { id: "sales", indicatorId: "SP-001", title: "Vendas Total", icon: "barChart", iconColor: "purple", sparkType: "bar", sparkColor: "purple" },
  { id: "leads", indicatorId: "SP-023", title: "Leads Recebidos", icon: "shoppingCart", iconColor: "orange", sparkType: "line", sparkColor: "orange" },
  { id: "inventory", indicatorId: "SP-031", title: "Estoque Total", icon: "package", iconColor: "blue", sparkType: "line", sparkColor: "blue" },
  { id: "appointments", indicatorId: "SP-017", title: "Agendamentos", icon: "users", iconColor: "teal", sparkType: "line", sparkColor: "teal" },
  { id: "visits", indicatorId: "SP-018", title: "Visitas", icon: "dollar", iconColor: "green", sparkType: "line", sparkColor: "green" },
];

function ExecutiveCard({ card, series, onClick }) {
  const Icon = CARD_ICONS[card.icon] || DollarSign;
  const iconStyle = CARD_ICON_STYLES[card.iconColor];
  const sparkColor = SPARK_COLORS[card.sparkColor];
  const idx = SELECTED_MONTH_INDEX;
  const value = series.currentValues[idx];
  const displayValue = formatCellValue(value, series.displayFormat, series.decimalPlaces);
  const areaStyle = AREA_STYLES[series.area] || {};

  return (
    <button onClick={onClick} className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all hover:shadow-md ${areaStyle.border || ""}`}>
      <div className={`h-1 ${areaStyle.dot || "bg-muted"}`} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconStyle}`}>
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-foreground">{card.title}</p>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <p className="text-2xl font-bold tracking-tight text-foreground">{displayValue}</p>
        </div>
        <div className="mt-auto h-8 pt-2">
          <MiniChart data={series.currentValues.filter((v) => v !== null)} colorClass={sparkColor} type={card.sparkType} />
        </div>
      </div>
    </button>
  );
}

export default function StrategicPlanOverview({ onCardClick, onRowClick, year, refreshKey = 0 }) {
  const [view, setView] = useState("meta");
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [expanded, setExpanded] = useState({});

  const allSeries = useMemo(() => strategicPlanRepository.getOverviewData(year), [year, refreshKey]);

  const filtered = useMemo(() => {
    const norm = normalizeText(search);
    return allSeries.filter((s) => {
      if (areaFilter !== "all" && s.area !== areaFilter) return false;
      if (resultFilter !== "all") {
        const consCurrent = consolidateValues(s.currentValues, s.aggregationMode, SELECTED_MONTH_INDEX);
        const consTarget = consolidateValues(s.targetValues, s.aggregationMode, SELECTED_MONTH_INDEX);
        const pct = calculatePercentageOfTarget(consCurrent, consTarget);
        if (pct === null) return false;
        if (resultFilter === "above" && pct < 100) return false;
        if (resultFilter === "below" && (pct >= 100 || pct <= 80)) return false;
        if (resultFilter === "critical" && pct > 80) return false;
      }
      if (norm && !normalizeText(`${s.name} ${s.code} ${s.area}`).includes(norm)) return false;
      return true;
    });
  }, [allSeries, search, areaFilter, resultFilter]);

  const toggleArea = (area) => setExpanded((p) => ({ ...p, [area]: !p[area] }));
  const expandAll = () => setExpanded(Object.fromEntries(AREA_LIST.map((a) => [a, true])));
  const collapseAll = () => setExpanded({});

  const clearFilters = () => {
    setSearch("");
    setAreaFilter("all");
    setResultFilter("all");
  };

  const execCards = executiveCardConfigs.map((cfg) => ({
    cfg,
    series: allSeries.find((s) => s.id === cfg.indicatorId),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {execCards.map(({ cfg, series }) => series && (
          <ExecutiveCard key={cfg.id} card={cfg} series={series} onClick={() => onCardClick(cfg.indicatorId)} />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Indicadores Estratégicos</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">Expandir todas</Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">Recolher todas</Button>
            <ViewSelector value={view} onChange={setView} />
          </div>
        </div>
        <StrategicPlanOverviewFilters
          search={search}
          onSearchChange={setSearch}
          area={areaFilter}
          onAreaChange={setAreaFilter}
          result={resultFilter}
          onResultChange={setResultFilter}
          onClear={clearFilters}
          total={allSeries.length}
          filtered={filtered.length}
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <TooltipProvider>
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="sticky left-0 z-20 min-w-[220px] bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700">Indicador</th>
                  {MONTHS.map((m, i) => (
                    <th key={m} className={`px-2 py-2 text-center text-xs font-semibold ${i === SELECTED_MONTH_INDEX ? "border-b-2 border-blue-400 bg-blue-50 text-blue-700" : "text-slate-600"}`}>{m}</th>
                  ))}
                  <th className="bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700">{getConsolidatedLabel("sum", SELECTED_MONTH_INDEX)}</th>
                </tr>
              </thead>
              <tbody>
                {AREA_LIST.map((area) => {
                  const areaIndicators = filtered.filter((s) => s.area === area);
                  if (areaIndicators.length === 0) return null;
                  const style = AREA_STYLES[area];
                  const AreaIcon = AREA_ICONS[area];
                  const isExpanded = !!expanded[area];
                  return (
                    <Fragment key={area}>
                      <tr className={`border-b border-border ${style.lightBg}`}>
                        <td colSpan={14} className="px-3 py-2">
                          <button onClick={() => toggleArea(area)} className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {AreaIcon && (
                              <div className={`flex h-6 w-6 items-center justify-center rounded ${style.iconBg}`}>
                                <AreaIcon className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <span className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>{area}</span>
                            <span className="inline-flex items-center rounded-full bg-card px-1.5 py-0.5 text-xs text-muted-foreground">{areaIndicators.length}</span>
                          </button>
                        </td>
                      </tr>
                      {isExpanded && areaIndicators.map((s) => {
                        const values = view === "meta" ? s.targetValues : view === "realizado" ? s.currentValues : s.previousYearValues;
                        const cons = consolidateValues(values, s.aggregationMode, SELECTED_MONTH_INDEX);
                        return (
                          <tr key={s.id} className="cursor-pointer border-b border-border/40 bg-card hover:bg-slate-50/50" onClick={() => onRowClick(s.id)}>
                            <td className="sticky left-0 z-10 min-w-[220px] bg-card px-3 py-1.5 text-left text-xs font-medium text-foreground">
                              <div className="flex flex-col">
                                <span>{s.name}</span>
                                <span className="text-xs text-muted-foreground">{s.code}</span>
                              </div>
                            </td>
                            {values.map((v, i) => (
                              <CellWithTooltip
                                key={i}
                                value={v}
                                series={s}
                                monthIndex={i}
                                currentView={view}
                                className={`px-2 py-1.5 text-center text-xs ${i === SELECTED_MONTH_INDEX ? "bg-blue-50/60 font-medium text-blue-700" : "text-slate-600"}`}
                              />
                            ))}
                            <CellWithTooltip
                              value={cons}
                              series={s}
                              monthIndex={SELECTED_MONTH_INDEX}
                              currentView={view}
                              isConsolidated
                              className="bg-slate-50/80 px-3 py-1.5 text-center text-xs font-semibold text-slate-700"
                            />
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
