import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useOwner } from "@/components/owner/OwnerContext";
import { Button } from "@/components/ui/button";
import {
  Home,
  CalendarDays,
  ClipboardCheck,
  Target,
  ListChecks,
  Users,
  LayoutGrid,
  TrendingUp,
  GraduationCap,
  MessageCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const NAV = [
  {
    section: "GESTÃO",
    items: [
      { label: "Início", to: "/dono", icon: Home, end: true },
      { label: "Rotina do Dia", to: "/dono/rotina", icon: CalendarDays, badge: "Em construção" },
      { label: "Central de Decisões", to: "/dono/decisoes", icon: ClipboardCheck, badge: "Em construção" },
    ],
  },
  {
    section: "ESTRATÉGIA",
    items: [
      { label: "Plano Estratégico", to: "/dono/plano-estrategico", icon: Target },
      { label: "Plano de Ação", to: "/dono/plano-acao", icon: ListChecks },
      { label: "Consultoria", to: "/dono/consultoria", icon: Users },
    ],
  },
  {
    section: "NEGÓCIO",
    items: [
      {
        label: "Departamentos",
        icon: LayoutGrid,
        group: "departments",
        children: [
          { label: "Visão Geral", to: "/dono/departamentos" },
          { label: "Comercial", to: "/dono/departamentos/comercial" },
          { label: "Marketing", to: "/dono/departamentos/marketing" },
          { label: "Produto e Estoque", to: "/dono/departamentos/produto-e-estoque" },
          { label: "Pessoas — RH", to: "/dono/departamentos/pessoas-rh" },
          { label: "Financeiro", to: "/dono/departamentos/financeiro" },
          { label: "Operações", to: "/dono/departamentos/operacoes" },
        ],
      },
      { label: "Mercado", to: "/dono/mercado", icon: TrendingUp, badge: "Em construção" },
    ],
  },
  {
    section: "DESENVOLVIMENTO",
    items: [{ label: "Universidade MX", to: "/dono/universidade", icon: GraduationCap, badge: "Em construção" }],
  },
];

export default function OwnerSidebar({ onNavigate }) {
  const [openGroups, setOpenGroups] = useState({ departments: true });
  const { openConsultantModal } = useOwner();

  const toggleGroup = (g) => setOpenGroups((s) => ({ ...s, [g]: !s[g] }));

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Marca */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="text-sm font-bold tracking-tight">MX</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-sidebar-foreground">MX Performance</p>
          <p className="text-[11px] text-muted-foreground">Visão do Dono</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (item.group) {
                  const isOpen = openGroups[item.group];
                  const Icon = item.icon;
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleGroup(item.group)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      {isOpen && (
                        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              end={child.to === "/dono/departamentos"}
                              onClick={onNavigate}
                              className={({ isActive }) =>
                                cn(
                                  "block rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  isActive && "bg-primary/10 font-medium text-primary"
                                )
                              }
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Falar com Consultor — fixo na base */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="default"
          className="w-full justify-start gap-2.5 bg-primary hover:bg-primary/90"
          onClick={() => {
            onNavigate?.();
            openConsultantModal(null);
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Falar com Consultor
        </Button>
      </div>
    </div>
  );
}
