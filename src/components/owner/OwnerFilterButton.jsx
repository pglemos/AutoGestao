import { useEffect, useRef, useState } from "react";
import { useOwnerOptional } from "@/components/owner/OwnerContext";
import { formatDateTime } from "@/lib/owner-b44/format";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, RefreshCw, SlidersHorizontal } from "lucide-react";

const PERIODS = [
  { value: "month", label: "Mês atual" },
  { value: "quarter", label: "Trimestre atual" },
  { value: "year", label: "Ano atual" },
  { value: "custom", label: "Período personalizado" },
];

const ALL_UNITS = "all";

function Option({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        active ? "font-semibold text-emerald-700" : "text-gray-700",
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

  const unitLabel =
    unitId === ALL_UNITS
      ? "Todas as lojas"
      : currentUnits.find((unit) => unit.id === unitId)?.name || "Selecionar loja";
  const periodLabel = PERIODS.find((entry) => entry.value === period)?.label || "Mês atual";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 min-w-0 max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        <span className="min-w-0 truncate">
          {unitLabel} <span className="font-normal text-gray-400">·</span> {periodLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Filtros do módulo Dono"
          className="absolute left-0 top-12 z-40 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-gray-100 bg-white p-3 shadow-xl sm:left-auto sm:right-0"
        >
          <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Loja
          </p>
          <div className="max-h-52 overflow-y-auto">
            <Option active={unitId === ALL_UNITS} onClick={() => setUnitId(ALL_UNITS)}>
              Todas as lojas
            </Option>
            {currentUnits.map((unit) => (
              <Option key={unit.id} active={unitId === unit.id} onClick={() => setUnitId(unit.id)}>
                {unit.name}
              </Option>
            ))}
          </div>

          <div className="my-2 h-px bg-gray-100" />

          <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Período
          </p>
          {PERIODS.map((entry) => (
            <Option
              key={entry.value}
              active={period === entry.value}
              onClick={() => setPeriod(entry.value)}
            >
              {entry.label}
            </Option>
          ))}

          {period === "custom" ? (
            <div className="mt-2 grid grid-cols-2 gap-2 px-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                De
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm font-medium normal-case tracking-normal text-gray-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                Até
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm font-medium normal-case tracking-normal text-gray-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                />
              </label>
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <p className="min-w-0 truncate text-[11px] text-gray-500">
              {lastUpdated ? `Atualizado em ${formatDateTime(lastUpdated)}` : "Sem atualização"}
            </p>
            <button
              type="button"
              onClick={() => {
                reload();
                setOpen(false);
              }}
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-700 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
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
