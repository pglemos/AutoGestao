import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/features/owner/lib/ownerAuth";
import { useStores } from "@/hooks/useStores";
import { resolveOwnerPeriodRange } from "@/lib/owner-period";

const OwnerContext = createContext(null);

/** Versão tolerante: retorna null fora do provider (telas compartilhadas). */
export const useOwnerOptional = () => useContext(OwnerContext);

export const useOwner = () => {
  const ctx = useContext(OwnerContext);
  if (!ctx) throw new Error("useOwner deve ser usado dentro de OwnerProvider");
  return ctx;
};

// No MX, a "empresa" do Base44 mapeia para o grupo do dono e as "unidades" para as lojas ativas.
export const OwnerProvider = ({ children }) => {
  const { user, activeStoreId, setActiveStoreId: setRootActiveStoreId } = useAuth();
  const { lojas, loading: storesLoading, error: storesError } = useStores();

  const [period, setPeriod] = useState("month"); // month | quarter | year | custom
  const [customStart, setCustomStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [unitId, setUnitId] = useState("");
  const [consultantModal, setConsultantModal] = useState({ open: false, context: null });

  const units = useMemo(
    () => (lojas || []).filter((store) => store.active !== false).map((store) => ({ id: store.id, name: store.name })),
    [lojas],
  );

  useEffect(() => {
    if (units.length === 0) {
      setUnitId("");
      return;
    }
    // "all" (todas as lojas) é uma seleção válida e deve ser preservada.
    setUnitId((current) => current === "all" || units.some((unit) => unit.id === current)
      ? current
      : (activeStoreId && units.some((unit) => unit.id === activeStoreId) ? activeStoreId : units[0].id));
  }, [activeStoreId, units]);

  const company = useMemo(
    () => ({ id: "mx", name: user?.full_name ? `${user.full_name.split(" ")[0]} • MX` : "MX Performance" }),
    [user],
  );

  const companies = useMemo(() => [company], [company]);
  const unitsByCompany = useMemo(() => ({ mx: units }), [units]);

  const openConsultantModal = useCallback((context = null) => {
    setConsultantModal({ open: true, context });
  }, []);

  const closeConsultantModal = useCallback(() => {
    setConsultantModal({ open: false, context: null });
  }, []);

  const reload = useCallback(() => {
    window.dispatchEvent(new CustomEvent("owner:reload"));
  }, []);

  const periodRange = useMemo(() => {
    return resolveOwnerPeriodRange(period, new Date(), customStart, customEnd);
  }, [customEnd, customStart, period]);

  const value = {
    user,
    companies,
    memberships: [],
    unitsByCompany,
    loading: storesLoading,
    error: storesError,
    companyId: "mx",
    setCompanyId: () => {},
    unitId,
    setUnitId: (nextUnitId) => {
      setUnitId(nextUnitId);
      // Em "todas as lojas" nao existe loja ativa unica no escopo raiz.
      setRootActiveStoreId?.(nextUnitId && nextUnitId !== "all" ? nextUnitId : null);
    },
    period,
    setPeriod,
    customStart,
    customEnd,
    setCustomStart,
    setCustomEnd,
    periodRange,
    currentCompany: company,
    currentUnits: units,
    currentMembership: null,
    reload,
    consultantModal,
    openConsultantModal,
    closeConsultantModal,
  };

  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>;
};
