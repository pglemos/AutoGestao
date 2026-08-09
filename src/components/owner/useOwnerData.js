import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/features/owner/ownerRepository";
import { useOwner } from "@/components/owner/OwnerContext";
import { computePeriodRange } from "@/lib/owner-period";

// Carrega todos os dados da tela Início do Dono para empresa/unidade/período selecionados.
// Escopo "all": usa registros em nível de empresa (unit_id vazio/null).
// Escopo específico: usa registros da unidade.
const scopeFilter = (companyId, unitId) => {
  if (unitId === "all") return { company_id: companyId, unit_id: "" };
  return { company_id: companyId, unit_id: unitId };
};

export const useOwnerData = () => {
  const { companyId, unitId, period } = useOwner();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const range = computePeriodRange(period);
      const baseFilter = scopeFilter(companyId, unitId);

      const [cycles, kpis, snapshots, objectives, actions, decisions, meetings] = await Promise.all([
        base44.entities.ConsultingCycle.filter({ company_id: companyId }),
        base44.entities.KPI.filter(baseFilter),
        base44.entities.DepartmentSnapshot.filter(baseFilter),
        base44.entities.StrategicObjective.filter({ company_id: companyId }),
        base44.entities.ActionItem.filter(baseFilter),
        base44.entities.Decision.filter(baseFilter),
        base44.entities.ConsultingMeeting.filter({ company_id: companyId }),
      ]);

      // ciclo ativo
      const cycle = cycles.find((c) => c.status === "active") || cycles[0] || null;

      // seleciona KPI/snapshot do período pelo campo category (month | quarter | year).
      // Evita colisão de datas entre mês e trimestre que começam no mesmo dia.
      const matchPeriod = (rec) => rec.category === period;

      const periodKpis = kpis.filter(matchPeriod);
      const periodSnapshots = snapshots.filter(matchPeriod);

      const periodDecisions = decisions.filter((d) => d.status === "pending");
      const nextMeeting =
        meetings
          .filter((m) => new Date(m.start_at) >= new Date())
          .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0] || null;

      setData({
        cycle,
        kpis: periodKpis,
        snapshots: periodSnapshots,
        objectives,
        actions,
        decisions: periodDecisions,
        meeting: nextMeeting,
        range,
      });
    } catch (e) {
      setError(e.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [companyId, unitId, period]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};
