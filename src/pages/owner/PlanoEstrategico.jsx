import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useOwner } from "@/components/owner/OwnerContext";
import { Button } from "@/components/ui/button";
import { Edit3, PlusCircle, SlidersHorizontal } from "lucide-react";

import StrategicHeader from "@/components/owner/strategic/StrategicHeader";
import StrategicPlanTabs from "@/components/owner/strategic/StrategicPlanTabs";
import StrategicIndicatorSelector from "@/components/owner/strategic/StrategicIndicatorSelector";
import StrategicIndicatorSummaryCards from "@/components/owner/strategic/StrategicIndicatorSummaryCards";
import StrategicIndicatorReading from "@/components/owner/strategic/StrategicIndicatorReading";
import StrategicIndicatorGuidance from "@/components/owner/strategic/StrategicIndicatorGuidance";
import StrategicIndicatorComparisonTable from "@/components/owner/strategic/StrategicIndicatorComparisonTable";
import StrategicIndicatorChart from "@/components/owner/strategic/StrategicIndicatorChart";
import StrategicPlanOverview from "@/components/owner/strategic/StrategicPlanOverview";
import EditTargetsDrawer from "@/components/owner/strategic/EditTargetsDrawer";
import CreateActionModal from "@/components/owner/strategic/CreateActionModal";
import StrategicExportMenu from "@/components/owner/strategic/StrategicExportMenu";
import TargetHistoryPanel from "@/components/owner/strategic/TargetHistoryPanel";
import FiltersDrawer from "@/components/owner/strategic/FiltersDrawer";
import DisplayModeSelector from "@/components/owner/strategic/DisplayModeSelector";

import { strategicPlanRepository } from "@/components/owner/strategic/strategicPlanLiveRepository";
import { SELECTED_MONTH_INDEX, REFERENCE_YEAR, calculatePercentageOfTarget, getStatusFromPercentage } from "@/components/owner/strategic/strategicUtils";

export default function PlanoEstrategico() {
  const { setLastUpdated } = useOutletContext() || {};
  const { currentUnits, unitId } = useOwner();

  const [tab, setTab] = useState("resumo");
  const [selectedIndicatorId, setSelectedIndicatorId] = useState("SP-001");
  const [areaFilter, setAreaFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [displayMode, setDisplayMode] = useState("table");
  const [isMobile, setIsMobile] = useState(false);
  const [planningReloadKey, setPlanningReloadKey] = useState(0);

  // Detectar mobile e carregar preferências
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const prefs = strategicPlanRepository.getPreferences();
    const savedMode = prefs.displayMode;
    if (savedMode) {
      setDisplayMode(savedMode);
    } else if (window.innerWidth < 768) {
      setDisplayMode("table");
    }

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "visao-geral" || tabParam === "resumo") setTab(tabParam);
    const indParam = params.get("indicator");
    if (indParam) setSelectedIndicatorId(indParam);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Persistir modo de exibição
  useEffect(() => {
    strategicPlanRepository.setPreferences({ displayMode });
  }, [displayMode]);

  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url);
  }, [tab]);

  useEffect(() => {
    let mounted = true;
    const storeId = unitId || currentUnits?.[0]?.id || null;
    setLoading(true);
    setDataError(null);
    strategicPlanRepository.load({ storeId, year: REFERENCE_YEAR })
      .then(() => {
        if (!mounted) return;
        setLoading(false);
        setLastUpdated?.(new Date());
      })
      .catch((error) => {
        if (!mounted) return;
        setDataError(error instanceof Error ? error.message : "Não foi possível carregar o Plano Estratégico.");
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [currentUnits, setLastUpdated, unitId]);

  useEffect(() => {
    const handlePlanningReload = () => setPlanningReloadKey((key) => key + 1);
    window.addEventListener("mx:planning-reload", handlePlanningReload);
    return () => window.removeEventListener("mx:planning-reload", handlePlanningReload);
  }, []);

  useEffect(() => {
    if (!planningReloadKey) return;
    const storeId = unitId || currentUnits?.[0]?.id || null;
    let mounted = true;
    setLoading(true);
    strategicPlanRepository.load({ storeId, year: REFERENCE_YEAR })
      .then(() => { if (mounted) setLoading(false); })
      .catch((error) => { if (mounted) { setDataError(error instanceof Error ? error.message : "Não foi possível carregar o Plano Estratégico."); setLoading(false); } });
    return () => { mounted = false; };
  }, [currentUnits, planningReloadKey, unitId]);

  const indicator = strategicPlanRepository.getIndicatorById(selectedIndicatorId);
  const series = strategicPlanRepository.getIndicatorSeries(selectedIndicatorId, REFERENCE_YEAR);
  const existingAction = strategicPlanRepository.getActionItems(selectedIndicatorId).length > 0;

  // Status do indicador para hierarquia de botões
  const idx = SELECTED_MONTH_INDEX;
  const pct = series ? calculatePercentageOfTarget(series.currentValues[idx], series.targetValues[idx]) : null;
  const status = pct !== null ? getStatusFromPercentage(pct, series?.direction) : "neutral";
  const isActionPrimary = status === "attention" || status === "critical";

  const handleCardClick = (indId) => {
    setSelectedIndicatorId(indId);
    setTab("resumo");
  };

  const handleRowClick = (indId) => {
    setSelectedIndicatorId(indId);
    setTab("resumo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaved = () => setRefreshKey((k) => k + 1);

  // Ajustar modo "both" em mobile
  const effectiveMode = isMobile && displayMode === "both" ? "table" : displayMode;

  if (loading) {
    return (
      <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-[#F5F7FA] px-4 py-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8">
        <div className="space-y-4">
          <div className="h-16 rounded-lg bg-white/60 animate-pulse" />
          <div className="h-10 w-64 rounded-lg bg-white/60 animate-pulse" />
          <div className="h-16 rounded-xl bg-white/60 animate-pulse" />
          <div className="h-28 rounded-xl bg-white/60 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[58%_42%]">
            <div className="h-[360px] rounded-xl bg-white/60 animate-pulse" />
            <div className="h-[360px] rounded-xl bg-white/60 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-[#F5F7FA] px-4 py-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8">
        <div className="rounded-xl border border-destructive/30 bg-card p-6" role="alert">
          <h1 className="text-lg font-semibold text-foreground">Não foi possível carregar o Plano Estratégico</h1>
          <p className="mt-2 text-sm text-muted-foreground">{dataError}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-[#F5F7FA] px-4 py-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8">
      <div className="space-y-4">
        <StrategicHeader />
        <StrategicPlanTabs tab={tab} onTabChange={setTab} />

        {tab === "resumo" && indicator && series && (
          <div className="space-y-4">
            {/* Barra compacta de controle */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <StrategicIndicatorSelector
                  value={selectedIndicatorId}
                  onChange={setSelectedIndicatorId}
                  areaFilter={areaFilter}
                  onAreaFilterChange={setAreaFilter}
                  compact
                />
                <DisplayModeSelector value={displayMode} onChange={setDisplayMode} hideBoth={isMobile} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(true)} className="text-muted-foreground">
                  <SlidersHorizontal className="h-4 w-4" /> Filtros
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Edit3 className="h-4 w-4" /> Editar Metas
                </Button>
                <Button
                  variant={isActionPrimary ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActionOpen(true)}
                >
                  <PlusCircle className="h-4 w-4" /> {existingAction ? "Plano criado" : "Criar Plano de Ação"}
                </Button>
                <StrategicExportMenu indicatorId={selectedIndicatorId} year={REFERENCE_YEAR} />
              </div>
            </div>

            {/* Faixa de resumo do indicador */}
            <StrategicIndicatorSummaryCards series={series} />

            {/* Área principal: tabela + gráfico */}
            <div className={`grid grid-cols-1 gap-4 ${effectiveMode === "both" ? "xl:grid-cols-[58%_42%]" : ""}`}>
              {effectiveMode !== "chart" && (
                <StrategicIndicatorComparisonTable series={series} height={360} />
              )}
              {effectiveMode !== "table" && (
                <StrategicIndicatorChart series={series} height={360} />
              )}
            </div>

            {/* Leitura e direcionamento */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <StrategicIndicatorReading series={series} />
              <StrategicIndicatorGuidance series={series} onCreateAction={() => setActionOpen(true)} />
            </div>

            <TargetHistoryPanel indicatorId={selectedIndicatorId} year={REFERENCE_YEAR} onRestored={handleSaved} />
          </div>
        )}

        {tab === "visao-geral" && (
          <StrategicPlanOverview
            onCardClick={handleCardClick}
            onRowClick={handleRowClick}
            year={REFERENCE_YEAR}
            refreshKey={refreshKey}
          />
        )}

        <EditTargetsDrawer
          open={editOpen}
          onOpenChange={setEditOpen}
          indicator={indicator}
          year={REFERENCE_YEAR}
          onSaved={handleSaved}
        />
        <CreateActionModal
          open={actionOpen}
          onOpenChange={setActionOpen}
          indicator={indicator}
          year={REFERENCE_YEAR}
          onCreated={handleSaved}
        />
        <FiltersDrawer open={filtersOpen} onOpenChange={setFiltersOpen} />
      </div>
    </div>
  );
}
