import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useOwner } from "@/components/owner/OwnerContext";
import { useAuth } from "@/hooks/useAuth";
import { MxSidebarProfileCard } from "@/components/MxSidebarProfileCard";
import { SIDEBAR, SIDEBAR_LOGO } from "@/design-system/sidebar/tokens";
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
      { label: "Início", to: "/home", icon: Home, end: true },
      { label: "Rotina do Dia", to: "/rotina", icon: CalendarDays, badge: "Em construção" },
      { label: "Central de Decisões", to: "/decisoes", icon: ClipboardCheck, badge: "Em construção" },
    ],
  },
  {
    section: "ESTRATÉGIA",
    items: [
      { label: "Plano Estratégico", to: "/plano-estrategico", icon: Target },
      { label: "Plano de Ação", to: "/plano-acao", icon: ListChecks },
      { label: "Consultoria", to: "/consultoria", icon: Users },
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
          { label: "Visão Geral", to: "/departamentos", badge: "Em construção" },
          { label: "Comercial", to: "/departamentos/comercial", badge: "Em construção" },
          { label: "Marketing", to: "/departamentos/marketing", badge: "Em construção" },
          { label: "Produto e Estoque", to: "/departamentos/produto-e-estoque", badge: "Em construção" },
          { label: "Pessoas — RH", to: "/departamentos/pessoas-rh", badge: "Em construção" },
          { label: "Financeiro", to: "/departamentos/financeiro", badge: "Em construção" },
          { label: "Operações", to: "/departamentos/operacoes", badge: "Em construção" },
        ],
      },
      { label: "Mercado", to: "/mercado", icon: TrendingUp, badge: "Em construção" },
    ],
  },
  {
    section: "DESENVOLVIMENTO",
    items: [{ label: "Universidade MX", to: "/universidade-mx", icon: GraduationCap, badge: "Em construção" }],
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
    <div className={SIDEBAR.root}>
      {/* Marca */}
      <div
        className={cn(
          SIDEBAR.header,
          collapsed ? SIDEBAR.headerCollapsed : SIDEBAR.headerExpanded,
          !collapsed && !onCollapsedChange && "pr-12"
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={SIDEBAR_LOGO}
              alt="MX"
              className={SIDEBAR.brandLogo}
            />
            <div className="min-w-0 leading-tight">
              <p className={SIDEBAR.brandTitle}>
                MX PERFORMANCE
              </p>
              <p className={SIDEBAR.brandModule}>
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
            className={SIDEBAR.toggle}
          >
            {collapsed
              ? <PanelLeftOpen className="h-[18px] w-[18px]" />
              : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className={cn(SIDEBAR.nav, collapsed ? SIDEBAR.navCollapsed : SIDEBAR.navExpanded)} aria-label="Menu principal do Dono">
        {NAV.map((group) => (
          <div key={group.section} className={SIDEBAR.section}>
            {!collapsed && (
              <p className={SIDEBAR.sectionLabel}>
                {group.section}
              </p>
            )}
            <div className={SIDEBAR.sectionItems}>
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
                          SIDEBAR.groupTrigger,
                          collapsed ? SIDEBAR.itemCollapsed : SIDEBAR.itemExpanded
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className={SIDEBAR.itemIcon} aria-hidden="true" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate text-left">{item.label}</span>
                            {isOpen ? <ChevronDown className={SIDEBAR.groupChevron} aria-hidden="true" /> : <ChevronRight className={SIDEBAR.groupChevron} aria-hidden="true" />}
                          </>
                        )}
                      </button>
                      {isOpen && !collapsed && (
                        <div id={`sidebar-subnav-${item.group}`} data-sidebar-subnav="Departamentos" className={SIDEBAR.subnav}>
                          {item.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              end={child.to === "/departamentos"}
                              onClick={onNavigate}
                              className={({ isActive }) =>
                                cn(
                                  SIDEBAR.nestedItem,
                                  isActive ? SIDEBAR.nestedItemActive : SIDEBAR.nestedItemIdle
                                )
                              }
                            >
                              <span className={SIDEBAR.itemLabel}>{child.label}</span>
                              {child.badge && (
                                <span className={cn(SIDEBAR.badge, SIDEBAR.badgeWarning)}>
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
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        SIDEBAR.item,
                        collapsed ? SIDEBAR.itemCollapsed : SIDEBAR.itemExpanded,
                        isActive ? SIDEBAR.itemActive : SIDEBAR.itemIdle
                      )
                    }
                  >
                    <Icon className={SIDEBAR.itemIcon} aria-hidden="true" />
                    {!collapsed && <span className={SIDEBAR.itemLabel}>{item.label}</span>}
                    {item.badge && !collapsed && (
                      <span className={cn(SIDEBAR.badge, SIDEBAR.badgeWarning)}>
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
      <div className={SIDEBAR.ctaSlot}>
        <button
          type="button"
          aria-label={collapsed ? "Falar com Consultor" : undefined}
          title={collapsed ? "Falar com Consultor" : undefined}
          className={cn(
            SIDEBAR.ctaButton,
            collapsed ? SIDEBAR.ctaButtonCollapsed : SIDEBAR.ctaButtonExpanded,
          )}
          onClick={() => {
            onNavigate?.();
            openConsultantModal(null);
          }}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {!collapsed && "Falar com Consultor"}
        </button>
      </div>

      <div className={cn(SIDEBAR.footer, collapsed ? SIDEBAR.footerCollapsed : SIDEBAR.footerExpanded)}>
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
