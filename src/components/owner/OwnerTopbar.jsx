import { useState } from "react";
import { useOwner } from "@/components/owner/OwnerContext";
import { useAuth } from "@/lib/owner-b44/AuthContext";
import { PERIOD_LABELS } from "@/lib/owner-b44/period";
import { formatDateTime } from "@/lib/owner-b44/format";
import { Button } from "@/components/ui/button";
import { Bell, Menu, RefreshCw, ChevronDown, Building2, MapPin, CalendarRange, ShieldCheck } from "lucide-react";

const PERIODS = [
  { value: "month", label: "Mês atual" },
  { value: "quarter", label: "Trimestre atual" },
  { value: "year", label: "Ano atual" },
  { value: "custom", label: "Período personalizado" },
];

function Select({ value, onChange, options, icon: Icon, label, disabled }) {
  return (
    <div className="relative flex items-center">
      <Icon className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/80" />
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
        className="h-9 w-full appearance-none rounded-lg border border-border bg-card pl-8 pr-8 text-sm font-medium text-foreground hover:border-primary/40 focus:border-primary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground/80" />
    </div>
  );
}

export default function OwnerTopbar({ lastUpdated, onOpenSidebar }) {
  const { companies, currentCompany, setCompanyId, currentUnits, unitId, setUnitId, period, setPeriod, reload } =
    useOwner();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
  const unitOptions = [
    { value: "all", label: "Todas as unidades" },
    ...currentUnits.map((u) => ({ value: u.id, label: u.name })),
  ];

  const firstName = (user?.full_name || user?.email || "Dono").split(" ")[0];

  return (
    <header className="owner-base44-exact__topbar sticky top-0 z-30 flex min-h-16 flex-col gap-2 border-b border-border bg-card/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 xl:h-16 xl:flex-row xl:items-center xl:py-0 2xl:px-6">
      <div className="flex items-center gap-2 xl:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSidebar}
          aria-label="Abrir menu principal"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {/* Identificação do contexto */}
      <div className="hidden shrink-0 items-center gap-2 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground 2xl:flex">
        <ShieldCheck className="h-3.5 w-3.5" />
        Visão do Dono
      </div>

      {/* Seletores */}
      <div className="grid w-full min-w-0 flex-1 grid-cols-2 gap-2 lg:grid-cols-3">
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <Select
            label="Empresa"
            icon={Building2}
            value={currentCompany?.id || ""}
            onChange={(e) => setCompanyId(e.target.value)}
            options={companyOptions}
          />
        </div>
        <div className="min-w-0">
          <Select
            label="Unidade"
            icon={MapPin}
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            options={unitOptions}
            disabled={currentUnits.length === 0}
          />
        </div>
        <div className="min-w-0">
          <Select
            label="Período"
            icon={CalendarRange}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={PERIODS}
          />
        </div>
      </div>

      {/* Lado direito */}
      <div className="hidden shrink-0 items-center gap-2 xl:flex">
        <div className="hidden text-right lg:block">
          <p className="text-[11px] text-muted-foreground/80">Última atualização</p>
          <p className="text-xs font-medium text-muted-foreground">{lastUpdated ? formatDateTime(lastUpdated) : "—"}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} aria-label="Atualizar dados">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações" title="As notificações persistidas aparecem na Central de Decisões.">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>

        {/* Perfil */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-foreground md:block">{firstName}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">{user?.full_name || "Dono"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
