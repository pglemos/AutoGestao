import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useOwner } from "@/components/owner/OwnerContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MxSidebarProfileCard } from "@/components/MxSidebarProfileCard";
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
  PanelLeftClose,
  PanelLeftOpen,
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
          { label: "Visão Geral", to: "/dono/departamentos", badge: "Em construção" },
          { label: "Comercial", to: "/dono/departamentos/comercial", badge: "Em construção" },
          { label: "Marketing", to: "/dono/departamentos/marketing", badge: "Em construção" },
          { label: "Produto e Estoque", to: "/dono/departamentos/produto-e-estoque", badge: "Em construção" },
          { label: "Pessoas — RH", to: "/dono/departamentos/pessoas-rh", badge: "Em construção" },
          { label: "Financeiro", to: "/dono/departamentos/financeiro", badge: "Em construção" },
          { label: "Operações", to: "/dono/departamentos/operacoes", badge: "Em construção" },
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

export default function OwnerSidebar({
  onNavigate,
  collapsed = false,
  onCollapsedChange,
}) {
  const [openGroups, setOpenGroups] = useState({ departments: true });
  const { openConsultantModal } = useOwner();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.name?.trim() || "Dono MX";

  const toggleGroup = (g) => setOpenGroups((s) => ({ ...s, [g]: !s[g] }));

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Marca */}
      <div
        className={cn(
          "flex h-[54px] shrink-0 items-center gap-2 border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "justify-between px-4",
          !collapsed && !onCollapsedChange && "pr-12"
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/landing/logo-mx.png"
              alt="MX"
              className="h-7 w-7 shrink-0 object-contain"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-black tracking-tight text-slate-900">
                MX PERFORMANCE
              </p>
              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                MÓDULO EXECUTIVO
              </p>
            </div>
          </div>
        )}
        {onCollapsedChange && (
          <button
            type="button"
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            onClick={() => onCollapsedChange(!collapsed)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            {collapsed
              ? <PanelLeftOpen className="h-[18px] w-[18px]" />
              : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className={cn("flex-1 min-h-0 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            {!collapsed && (
              <p className="truncate px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (item.group) {
                  const isOpen = openGroups[item.group];
                  const Icon = item.icon;
                  return (
                    <div key={item.label} data-sidebar-group="Departamentos">
                      <button
                        onClick={() => toggleGroup(item.group)}
                        aria-label={collapsed ? item.label : undefined}
                        aria-expanded={isOpen}
                        aria-controls={`sidebar-subnav-${item.group}`}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          collapsed ? "justify-center px-0" : "px-3"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate text-left">{item.label}</span>
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                          </>
                        )}
                      </button>
                      {isOpen && !collapsed && (
                        <div id={`sidebar-subnav-${item.group}`} data-sidebar-subnav="Departamentos" className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              end={child.to === "/dono/departamentos"}
                              onClick={onNavigate}
                              className={({ isActive }) =>
                                cn(
                                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  isActive && "bg-primary/10 font-medium text-primary"
                                )
                              }
                            >
                              <span className="min-w-0 flex-1 truncate">{child.label}</span>
                              {child.badge && (
                                <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                                  {child.badge}
                                </span>
                              )}
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
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors",
                        collapsed ? "justify-center px-0" : "px-3",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {item.badge && !collapsed && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
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
          aria-label={collapsed ? "Falar com Consultor" : undefined}
          className={cn(
            "w-full gap-2.5 bg-primary hover:bg-primary/90",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={() => {
            onNavigate?.();
            openConsultantModal(null);
          }}
        >
          <MessageCircle className="h-4 w-4" />
          {!collapsed && "Falar com Consultor"}
        </Button>
      </div>

      <div className={cn("border-t border-sidebar-border py-3", collapsed ? "px-2" : "px-3")}>
        <MxSidebarProfileCard
          displayName={displayName}
          roleLabel="Dono"
          avatarUrl={profile?.avatar_url}
          collapsed={collapsed}
          onNavigate={(path) => {
            onNavigate?.();
            navigate(path);
          }}
          onSignOut={() => {
            onNavigate?.();
            void signOut();
          }}
        />
      </div>
    </div>
  );
}
