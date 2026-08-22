import { useEffect, useRef, useState } from "react";
import { useOwnerOptional } from "@/components/owner/OwnerContext";
import { ALL_OWNER_UNITS } from "@/components/owner/ownerPlanningAdapter";
import { formatDateTime } from "@/features/owner/lib/ownerFormatters";
import { ownerClosedMonthLabel } from "@/lib/owner-period";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, RefreshCw, SlidersHorizontal } from "lucide-react";

function periodOptions() {
  return [
    { value: "month", label: ownerClosedMonthLabel() },
    { value: "quarter", label: "Trimestre atual" },
    { value: "year", label: "Ano atual" },
    { value: "custom", label: "Período personalizado" },
  ];
}

function Option({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-status-success/30",
        active ? "font-semibold text-status-success-text" : "text-foreground",
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      {active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}

// Filtro unico do modulo Dono (loja + periodo), aberto a partir de um botao no
// cabecalho da pagina — evita um card de filtros separado do cabecalho.
export default function OwnerFilterButton({ lastUpdated }) {
  // O cabeçalho é compartilhado com telas de gerente e Admin MX, que não têm
  // o contexto do Dono: nesses casos o filtro simplesmente não aparece.
  const owner = useOwnerOptional();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (containerRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!owner) return null;

  const {
    currentUnits,
    unitId,
    setUnitId,
    period,
    setPeriod,
    customStart,
    customEnd,
    setCustomStart,
    setCustomEnd,
    reload,
  } = owner;

  const periods = periodOptions();
  const unitLabel =
    unitId === ALL_OWNER_UNITS
      ? "Todas as lojas"
      : currentUnits.find((unit) => unit.id === unitId)?.name || "Selecionar loja";
  const periodLabel = periods.find((entry) => entry.value === period)?.label || ownerClosedMonthLabel();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 min-w-0 max-w-full items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-status-success/30"
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 truncate">
          {unitLabel} <span className="font-normal text-muted-foreground">·</span> {periodLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Filtros do módulo Dono"
          className="absolute left-0 top-12 z-[var(--mx-z-popover)] w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-border-subtle bg-white p-3 shadow-xl sm:left-auto sm:right-0"
        >
          <p className="px-2.5 pb-1 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Loja
          </p>
          <div className="max-h-52 overflow-y-auto">
            <Option
              active={unitId === ALL_OWNER_UNITS}
              onClick={() => {
                setUnitId(ALL_OWNER_UNITS);
                setOpen(false);
              }}
            >
              Todas as lojas
            </Option>
            {currentUnits.map((unit) => (
              <Option
                key={unit.id}
                active={unitId === unit.id}
                onClick={() => {
                  setUnitId(unit.id);
                  setOpen(false);
                }}
              >
                {unit.name}
              </Option>
            ))}
          </div>

          <div className="my-2 h-px bg-muted" />

          <p className="px-2.5 pb-1 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Período
          </p>
          {periods.map((entry) => (
            <Option
              key={entry.value}
              active={period === entry.value}
              onClick={() => {
                setPeriod(entry.value);
                if (entry.value !== "custom") setOpen(false);
              }}
            >
              {entry.label}
            </Option>
          ))}

          {period === "custom" ? (
            <div className="mt-2 grid grid-cols-2 gap-2 px-2.5">
              <label className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                De
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-border px-2 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-status-success/30"
                />
              </label>
              <label className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Até
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-border px-2 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-status-success/30"
                />
              </label>
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
            <p className="min-w-0 truncate text-caption text-muted-foreground">
              {lastUpdated ? `Atualizado em ${formatDateTime(lastUpdated)}` : "Sem atualização"}
            </p>
            <button
              type="button"
              onClick={() => {
                reload();
                setOpen(false);
              }}
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-status-success/30"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Atualizar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
