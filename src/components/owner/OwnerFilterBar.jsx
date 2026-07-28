import { useOwner } from "@/components/owner/OwnerContext";
import { formatDateTime } from "@/lib/owner-b44/format";
import { Building2, CalendarRange, ChevronDown, MapPin, RefreshCw } from "lucide-react";

const PERIODS = [
  { value: "month", label: "Mês atual" },
  { value: "quarter", label: "Trimestre atual" },
  { value: "year", label: "Ano atual" },
  { value: "custom", label: "Período personalizado" },
];

function Field({ value, onChange, options, icon: Icon, label, disabled }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </span>
      <span className="relative flex items-center">
        <Icon className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" aria-hidden="true" />
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-label={label}
          className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-8 text-sm font-medium text-gray-800 outline-none transition-colors hover:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400" aria-hidden="true" />
      </span>
    </label>
  );
}

// Filtros de contexto do modulo Dono. Ficam no conteudo da pagina (e nao numa
// topbar propria) para seguir o mesmo padrao dos demais modulos, onde o header
// fixo existe apenas no mobile e os filtros vivem dentro da tela.
export default function OwnerFilterBar({ lastUpdated }) {
  const {
    companies,
    currentCompany,
    setCompanyId,
    currentUnits,
    unitId,
    setUnitId,
    period,
    setPeriod,
    reload,
  } = useOwner();

  const unitOptions = [
    { value: "all", label: "Todas as unidades" },
    ...currentUnits.map((unit) => ({ value: unit.id, label: unit.name })),
  ];

  return (
    <section
      aria-label="Filtros do módulo Dono"
      className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
        {companies.length > 1 ? (
          <Field
            label="Empresa"
            icon={Building2}
            value={currentCompany?.id || ""}
            onChange={(event) => setCompanyId(event.target.value)}
            options={companies.map((company) => ({ value: company.id, label: company.name }))}
          />
        ) : null}
        <Field
          label="Unidade"
          icon={MapPin}
          value={unitId}
          onChange={(event) => setUnitId(event.target.value)}
          options={unitOptions}
          disabled={currentUnits.length === 0}
        />
        <Field
          label="Período"
          icon={CalendarRange}
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          options={PERIODS}
        />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
        <p className="text-xs text-gray-500">
          Atualizado em{" "}
          <span className="font-semibold text-gray-700">
            {lastUpdated ? formatDateTime(lastUpdated) : "—"}
          </span>
        </p>
        <button
          type="button"
          onClick={reload}
          aria-label="Atualizar dados"
          className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Atualizar
        </button>
      </div>
    </section>
  );
}
