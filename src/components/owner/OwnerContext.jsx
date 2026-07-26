import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/owner-b44/AuthContext";
import { useStores } from "@/hooks/useStores";
import { resolveOwnerPeriodRange } from "@/lib/owner-period";

const OwnerContext = createContext(null);

export const useOwner = () => {
  const ctx = useContext(OwnerContext);
  if (!ctx) throw new Error("useOwner deve ser usado dentro de OwnerProvider");
  return ctx;
};

// No MX, a "empresa" do Base44 mapeia para o grupo do dono e as "unidades" para as lojas ativas.
export const OwnerProvider = ({ children }) => {
  const { user } = useAuth();
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
    setUnitId((current) => units.some((unit) => unit.id === current) ? current : units[0].id);
  }, [units]);

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
    setUnitId,
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
