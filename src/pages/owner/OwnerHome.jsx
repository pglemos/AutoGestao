import { Component, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useOwner } from "@/components/owner/OwnerContext";
import HomeHeader from "@/components/owner/home/HomeHeader";
import MainIndicators from "@/components/owner/home/MainIndicators";
import PriorityIntervention from "@/components/owner/home/PriorityIntervention";
import SalesGoalBlock from "@/components/owner/home/SalesGoalBlock";
import SecondaryAlerts from "@/components/owner/home/SecondaryAlerts";
import OwnerActionsBlock from "@/components/owner/home/OwnerActionsBlock";
import DepartmentPerformance from "@/components/owner/home/DepartmentPerformance";
import DepartmentDrawer from "@/components/owner/home/DepartmentDrawer";
import ConsultantCard from "@/components/owner/home/ConsultantCard";
import MobileBottomNav from "@/components/owner/home/MobileBottomNav";

class OwnerHomeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div id="page-home" aria-label="Início — erro" className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-destructive/30 bg-card p-6 text-center" role="alert">
            <h1 className="text-lg font-semibold text-foreground">Algo deu errado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Não foi possível carregar a página inicial. Tente recarregar a página.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function OwnerHome() {
  const { openConsultantModal } = useOwner();
  const { setLastUpdated } = useOutletContext();
  const [drawerDept, setDrawerDept] = useState(null);

  useEffect(() => {
    setLastUpdated?.(new Date());
  }, [setLastUpdated]);

  return (
    <OwnerHomeErrorBoundary>
      <div id="page-home" aria-label="Início" className="flex min-h-0 flex-1 flex-col space-y-6 pb-20 lg:pb-0">
        <HomeHeader />

        <section aria-label="Indicadores principais">
          <MainIndicators />
        </section>

        <PriorityIntervention onTalkToConsultant={openConsultantModal} />

        <section aria-label="Metas e alertas" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SalesGoalBlock />
          <SecondaryAlerts />
          <OwnerActionsBlock />
        </section>

        <DepartmentPerformance onSelectDepartment={setDrawerDept} />

        <ConsultantCard onTalkToConsultant={openConsultantModal} />

        <MobileBottomNav />

        <DepartmentDrawer
          department={drawerDept}
          onClose={() => setDrawerDept(null)}
          onTalkToConsultant={openConsultantModal}
        />
      </div>
    </OwnerHomeErrorBoundary>
  );
}
