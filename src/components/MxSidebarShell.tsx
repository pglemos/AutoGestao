import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { MxSidebarProfileCard } from './MxSidebarProfileCard'
import { SIDEBAR, SIDEBAR_LOGO } from '@/design-system/sidebar/tokens'
import { NotificationBellButton } from './NotificationBellButton'

export type MxSidebarNavItem = {
  key?: string
  label: string
  path: string
  icon?: React.ElementType | React.ReactElement | React.ReactNode
  badge?: string
  badgeTone?: 'default' | 'warning'
  activePaths?: string[]
  special?: boolean
  children?: MxSidebarNavItem[]
  defaultExpanded?: boolean
}

export type MxSidebarNavSection = {
  key?: string
  label: string
  items: MxSidebarNavItem[]
}

export type MxSidebarShellProps = {
  children: React.ReactNode
  profileName?: string | null
  profileRoleLabel?: string | null
  moduleLabel: string
  avatarUrl?: string | null
  navSections: MxSidebarNavSection[]
  onSignOut: () => Promise<void> | void
  profilePath?: string
  settingsPath?: string
  notificationsPath?: string
  sidebarLabel?: string
  isSimulating?: boolean
  simulationLabel?: string
  simulationBase?: string
  simulationStore?: string
  onStopSimulation?: () => void
  /** Ação fixa acima do cartão de perfil (ex.: "Falar com Consultor"). */
  cta?: {
    label: string
    icon: LucideIcon
    onClick?: () => void
    path?: string
  }
}

export function isNavItemActive(
  item: MxSidebarNavItem,
  location: { pathname: string; search: string },
) {
  const paths = item.activePaths ?? [item.path]
  return paths.some((rawPath) => {
    const [path, query = ''] = rawPath.split('?')
    const pathMatches =
      location.pathname === path ||
      (!query && location.pathname.startsWith(`${path}/`))

    if (!pathMatches) return false
    return query ? location.search === `?${query}` : true
  })
}

function flattenLeafItems(items: MxSidebarNavItem[]): MxSidebarNavItem[] {
  return items.flatMap(item => item.children?.length
    ? flattenLeafItems(item.children)
    : [item])
}

function containsNavItem(
  parent: MxSidebarNavItem,
  target: MxSidebarNavItem | undefined,
): boolean {
  if (!target || !parent.children?.length) return false
  return parent.children.some(child => child === target || containsNavItem(child, target))
}

function NavItemIcon({
  icon,
  className,
}: {
  icon: MxSidebarNavItem['icon']
  className?: string
}) {
  // Mesma renderização da sidebar do Dono: tamanho pela classe (h-4 w-4) e
  // traço padrão do lucide (2), para o peso do ícone ser idêntico.
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && 'render' in icon)
  ) {
    const Icon = icon as LucideIcon
    return <Icon className={className} aria-hidden="true" />
  }

  if (React.isValidElement(icon)) {
    return React.cloneElement(
      icon as React.ReactElement<Record<string, unknown>>,
      {
        size: undefined,
        strokeWidth: undefined,
        className: cn(
          String((icon.props as { className?: string }).className ?? '')
            .replace(/\b(h|w)-\d+(\.\d+)?\b/g, '')
            .trim(),
          className,
        ),
        'aria-hidden': true,
      },
    )
  }

  return (
    <span className={className} aria-hidden="true">
      {icon}
    </span>
  )
}

function CollapsedTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[var(--mx-z-tooltip)] -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs font-semibold text-gray-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  )
}

export default function MxSidebarShell({
  children,
  profileName,
  profileRoleLabel = 'Perfil MX',
  moduleLabel,
  avatarUrl,
  navSections,
  onSignOut,
  profilePath = '/perfil',
  settingsPath = '/configuracoes',
  notificationsPath = '/notificacoes',
  sidebarLabel = 'Menu principal MX',
  isSimulating = false,
  simulationLabel = 'Perfil',
  simulationBase = 'Admin MX',
  simulationStore = 'Sandbox MX',
  onStopSimulation,
  cta,
}: MxSidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const navigate = useNavigate()
  const drawerRef = useRef<HTMLDivElement>(null)

  useFocusTrap(drawerRef, mobileOpen)

  const displayName = profileName?.trim() || 'Usuário MX'
  const displayRole = profileRoleLabel?.trim() || 'Perfil MX'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'MX'

  const activeNavItem = useMemo(() => {
    const candidates = navSections.flatMap((section) => flattenLeafItems(section.items))
    let selected: MxSidebarNavItem | undefined
    let selectedScore = -1

    for (const item of candidates) {
      if (!isNavItemActive(item, location)) continue
      const paths = item.activePaths ?? [item.path]
      for (const rawPath of paths) {
        const [path, query = ''] = rawPath.split('?')
        const exactPath = location.pathname === path
        const descendantPath = !query && location.pathname.startsWith(`${path}/`)
        const queryMatches = !query || location.search === `?${query}`
        if ((!exactPath && !descendantPath) || !queryMatches) continue

        const score = path.length + (exactPath ? 10_000 : 0) + (query ? 1_000 : 0)
        if (score > selectedScore) {
          selected = item
          selectedScore = score
        }
      }
    }

    return selected
  }, [location.pathname, location.search, navSections])

  const mobileTitle = activeNavItem?.label || 'MX Performance'

  useEffect(() => {
    if (!activeNavItem) return
    const activeGroups = navSections
      .flatMap(section => section.items)
      .filter(item => containsNavItem(item, activeNavItem))
    if (activeGroups.length === 0) return

    setExpandedGroups(current => {
      const next = { ...current }
      let changed = false
      for (const group of activeGroups) {
        const key = group.key ?? group.path
        if (next[key] === true) continue
        next[key] = true
        changed = true
      }
      return changed ? next : current
    })
  }, [activeNavItem, navSections])

  useEffect(() => {
    if (!mobileOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  const goTo = (path: string) => {
    setMobileOpen(false)
    navigate(path)
  }

  const signOut = () => {
    setMobileOpen(false)
    void onSignOut()
  }

  const renderNavItem = (item: MxSidebarNavItem, isCollapsed: boolean) => {
    const active = item === activeNavItem

    return (
      <Link
        key={item.key ?? item.path}
        to={item.path}
        aria-label={item.label}
        aria-current={active ? 'page' : false}
        onClick={() => setMobileOpen(false)}
        title={isCollapsed ? item.label : undefined}
        className={cn(
          SIDEBAR.item,
          active ? SIDEBAR.itemActive : SIDEBAR.itemIdle,
          isCollapsed ? SIDEBAR.itemCollapsed : SIDEBAR.itemExpanded,
        )}
      >
        <NavItemIcon icon={item.icon} className={SIDEBAR.itemIcon} />
        {!isCollapsed ? (
          <>
            <span className={SIDEBAR.itemLabel}>
              {item.label}
            </span>
            {item.badge ? (
              <span
                className={cn(
                  SIDEBAR.badge,
                  item.badgeTone === 'warning' ? SIDEBAR.badgeWarning : SIDEBAR.badgeDefault,
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </>
        ) : null}
        {isCollapsed ? <CollapsedTooltip label={item.label} /> : null}
      </Link>
    )
  }

  const renderNestedNavItem = (item: MxSidebarNavItem) => {
    const active = item === activeNavItem

    return (
      <Link
        key={item.key ?? item.path}
        to={item.path}
        aria-label={item.label}
        aria-current={active ? 'page' : false}
        onClick={() => setMobileOpen(false)}
        className={cn(
          SIDEBAR.nestedItem,
          active ? SIDEBAR.nestedItemActive : SIDEBAR.nestedItemIdle,
        )}
      >
        <span className={SIDEBAR.itemLabel}>{item.label}</span>
        {item.badge ? (
          <span
            className={cn(
              SIDEBAR.badge,
              item.badgeTone === 'warning' ? SIDEBAR.badgeWarning : SIDEBAR.badgeDefault,
            )}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
    )
  }

  const renderNavGroup = (item: MxSidebarNavItem, isCollapsed: boolean) => {
    const key = item.key ?? item.path
    const containsActiveItem = containsNavItem(item, activeNavItem)
    const expanded = expandedGroups[key] ?? item.defaultExpanded ?? containsActiveItem
    const subnavId = `sidebar-subnav-${key.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase()}`

    const toggleGroup = () => {
      if (isCollapsed) {
        setCollapsed(false)
        setExpandedGroups(current => ({ ...current, [key]: true }))
        return
      }
      setExpandedGroups(current => ({ ...current, [key]: !expanded }))
    }

    return (
      <div key={key} data-sidebar-group={item.label} className="space-y-1">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={subnavId}
          aria-label={isCollapsed ? item.label : undefined}
          title={isCollapsed ? item.label : undefined}
          onClick={toggleGroup}
          className={cn(
            SIDEBAR.groupTrigger,
            isCollapsed ? SIDEBAR.itemCollapsed : SIDEBAR.itemExpanded,
          )}
        >
          <NavItemIcon icon={item.icon} className={SIDEBAR.itemIcon} />
          {!isCollapsed ? (
            <>
              <span className={SIDEBAR.itemLabel}>{item.label}</span>
              <ChevronDown
                className={cn(
                  SIDEBAR.groupChevron,
                  'transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </>
          ) : null}
        </button>

        {!isCollapsed && expanded ? (
          <div
            id={subnavId}
            data-sidebar-subnav={item.label}
            className={SIDEBAR.subnav}
          >
            {item.children?.map(renderNestedNavItem)}
          </div>
        ) : null}
      </div>
    )
  }

  const renderProfileCard = (isCollapsed: boolean) => (
    <MxSidebarProfileCard
      displayName={displayName}
      roleLabel={displayRole}
      avatarUrl={avatarUrl}
      collapsed={isCollapsed}
      onNavigate={goTo}
      onSignOut={signOut}
      profilePath={profilePath}
      settingsPath={settingsPath}
      notificationsPath={notificationsPath}
    />
  )

  const renderSidebarContent = (
    isCollapsed: boolean,
    canCollapse = false,
  ) => (
    <>
      <div
        className={cn(
          SIDEBAR.header,
          isCollapsed ? SIDEBAR.headerCollapsed : SIDEBAR.headerExpanded,
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center gap-2.5',
            isCollapsed && 'justify-center',
          )}
        >
          <img
            src={SIDEBAR_LOGO}
            alt="MX"
            className={SIDEBAR.brandLogo}
          />
          {!isCollapsed ? (
            <div className="min-w-0 leading-tight">
              <p className={SIDEBAR.brandTitle}>
                MX PERFORMANCE
              </p>
              <p className={SIDEBAR.brandModule}>
                {moduleLabel}
              </p>
            </div>
          ) : null}
        </div>
        {canCollapse ? (
          <button
            type="button"
            aria-label={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            onClick={() => setCollapsed((value) => !value)}
            className={SIDEBAR.toggle}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      <nav
        className={cn(
          'no-scrollbar',
          SIDEBAR.nav,
          isCollapsed ? SIDEBAR.navCollapsed : SIDEBAR.navExpanded,
        )}
        aria-label={sidebarLabel}
      >
        {navSections.map((section) => (
          <section key={section.key ?? section.label} className={SIDEBAR.section}>
            {!isCollapsed && section.label !== 'MENU' ? (
              <p className={SIDEBAR.sectionLabel}>
                {section.label}
              </p>
            ) : null}
            <div className={SIDEBAR.sectionItems}>
              {section.items.map(item => item.children?.length
                ? renderNavGroup(item, isCollapsed)
                : renderNavItem(item, isCollapsed))}
            </div>
          </section>
        ))}
      </nav>

      {cta ? (
        <div className={SIDEBAR.ctaSlot}>
          <button
            type="button"
            aria-label={isCollapsed ? cta.label : undefined}
            title={isCollapsed ? cta.label : undefined}
            onClick={() => {
              setMobileOpen(false)
              if (cta.onClick) cta.onClick()
              else if (cta.path) navigate(cta.path)
            }}
            className={cn(
              SIDEBAR.ctaButton,
              isCollapsed ? SIDEBAR.ctaButtonCollapsed : SIDEBAR.ctaButtonExpanded,
            )}
          >
            <cta.icon className="h-4 w-4" aria-hidden="true" />
            {!isCollapsed ? cta.label : null}
          </button>
        </div>
      ) : null}

      <div className={cn(SIDEBAR.footer, isCollapsed ? SIDEBAR.footerCollapsed : SIDEBAR.footerExpanded)}>
        {renderProfileCard(isCollapsed)}
      </div>
    </>
  )

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 font-display text-gray-800">
      <header className="fixed left-0 right-0 top-0 z-[90] grid h-[calc(72px+env(safe-area-inset-top))] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-gray-100 bg-white px-4 pt-[env(safe-area-inset-top)] shadow-sm xl:hidden">
        <button
          type="button"
          aria-label="Abrir menu principal"
          onClick={() => setMobileOpen(true)}
          className="flex min-w-0 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          <img src={SIDEBAR_LOGO} alt="MX" className="h-9 w-9 shrink-0 object-contain" />
          <span className="hidden min-w-0 leading-tight min-[500px]:block">
            <span className="block truncate text-[13px] font-bold tracking-tight text-gray-900">
              MX PERFORMANCE
            </span>
            <span className="block truncate text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              {moduleLabel}
            </span>
          </span>
        </button>
        <div className="pointer-events-none min-w-0 max-w-[42vw] truncate px-1 text-center text-sm font-bold text-gray-800">
          {mobileTitle}
        </div>
        <div className="flex items-center justify-self-end gap-2">
          <NotificationBellButton variant="light" />
          <button
            type="button"
            aria-label={`Abrir perfil de ${displayName}`}
            onClick={() => goTo(profilePath)}
            className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-[11px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            {initials}
          </button>
        </div>
      </header>

      <aside
        className={cn(
          SIDEBAR.aside,
          SIDEBAR.asideFixed,
          collapsed ? SIDEBAR.asideWidthCollapsed : SIDEBAR.asideWidth,
        )}
        aria-label={sidebarLabel}
      >
        <div data-sidebar-surface="true" className={SIDEBAR.root}>
          {renderSidebarContent(collapsed, true)}
        </div>
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-[100] bg-black/40 xl:hidden"
          role="presentation"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMobileOpen(false)
          }}
        >
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={sidebarLabel}
            className={SIDEBAR.drawerPanel}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar menu principal"
              onClick={() => setMobileOpen(false)}
              className={SIDEBAR.drawerClose}
            >
              <X size={16} aria-hidden="true" />
            </button>
            <div data-sidebar-surface="true" className={cn(SIDEBAR.root, 'min-h-0 flex-1')}>
              {renderSidebarContent(false)}
            </div>
          </div>
        </div>
      ) : null}

      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className={cn(
          'h-[100dvh] overflow-hidden bg-gray-50 outline-none transition-[padding] duration-300 xl:h-screen',
          'pt-[calc(72px+env(safe-area-inset-top))] xl:pt-0',
          collapsed ? 'xl:pl-16' : 'xl:pl-64',
        )}
      >
        {isSimulating ? (
          <section
            className="m-3 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950 md:flex-row md:items-center md:justify-between"
            aria-label="Simulação ativa"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold">Simulação {simulationLabel} ativa</p>
              <p className="mt-1 truncate text-xs font-semibold text-emerald-800">
                Base: {simulationBase} • Loja: {simulationStore}
              </p>
            </div>
            {onStopSimulation ? (
              <button
                type="button"
                onClick={onStopSimulation}
                className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              >
                Voltar Admin MX
              </button>
            ) : null}
          </section>
        ) : null}
        <section className="h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden bg-gray-50 text-gray-800">
          {children}
        </section>
      </main>
    </div>
  )
}
