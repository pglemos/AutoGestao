import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
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
import { PageViewport } from '@/design-system/page'
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
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[var(--mx-z-tooltip)] -translate-y-1/2 whitespace-nowrap rounded-[var(--mx-radius-lg)] border border-border-subtle bg-white px-3 py-2 text-xs font-semibold text-foreground opacity-0 shadow-[var(--mx-shadow-lg)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
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
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)
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
    if (!mobileOpen && !mobileProfileOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileOpen(false)
      setMobileProfileOpen(false)
    }

    // Capture, não bubble: com o drawer aberto o keydown de Escape chega ao
    // document na fase de captura mas nunca na de bolha — algum handler no
    // caminho interrompe a propagação, e o drawer ficava sem fechar por
    // teclado (medido com contador nas duas fases, FASE H 08.013).
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [mobileOpen, mobileProfileOpen])

  const goTo = (path: string) => {
    setMobileOpen(false)
    setMobileProfileOpen(false)
    navigate(path)
  }

  const signOut = () => {
    setMobileOpen(false)
    setMobileProfileOpen(false)
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
        title={item.label}
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
              <span className={SIDEBAR.itemLabel} title={item.label}>{item.label}</span>
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
              <p className={SIDEBAR.brandModule} title={moduleLabel}>
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
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
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
              <p className={SIDEBAR.sectionLabel} title={section.label}>
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
    <div className="h-[100dvh] min-w-0 overflow-hidden bg-surface-alt font-display text-foreground">
      <header
        data-mx-mobile-header=""
        className="fixed left-0 right-0 top-0 z-[var(--mx-z-popover)] grid h-[calc(var(--mx-mobile-header-height)+env(safe-area-inset-top,0px))] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[var(--mx-space-2)] border-b border-border-subtle bg-white px-[var(--mx-mobile-header-padding-inline)] pt-[env(safe-area-inset-top,0px)] shadow-[var(--mx-shadow-sm)] xl:hidden"
      >
        <button
          type="button"
          aria-label="Abrir menu principal"
          onClick={() => setMobileOpen(true)}
          className="flex min-h-[var(--mx-mobile-header-touch-target)] min-w-0 items-center gap-[var(--mx-space-2)] text-left text-foreground outline-none transition-opacity hover:opacity-80 active:opacity-60 focus-visible:ring-2 focus-visible:ring-status-success/30"
        >
          <Menu className="h-[var(--mx-icon-size-md)] w-[var(--mx-icon-size-md)] shrink-0 text-foreground" aria-hidden="true" />
          <img src={SIDEBAR_LOGO} alt="MX" className="h-[var(--mx-icon-size-lg)] w-[var(--mx-icon-size-lg)] shrink-0 object-contain" />
          <span className="text-body-sm font-semibold tracking-tight text-foreground">
            Menu
          </span>
          <span className="hidden min-w-0 leading-tight min-[500px]:block">
            <span title={moduleLabel} className="block max-w-[26vw] break-words text-caption font-bold leading-tight uppercase tracking-[0.12em] text-status-success-text">
              {moduleLabel}
            </span>
          </span>
        </button>
        <div className="pointer-events-none min-w-0 max-w-[42vw] truncate px-1 text-center text-sm font-bold text-foreground">
          {mobileTitle}
        </div>
        <div className="relative flex items-center justify-self-end gap-2">
          <NotificationBellButton variant="light" />
          <button
            type="button"
            aria-label={`Abrir perfil de ${displayName}`}
            aria-haspopup="menu"
            aria-expanded={mobileProfileOpen}
            onClick={() => setMobileProfileOpen((value) => !value)}
            className="grid h-[var(--mx-mobile-header-touch-target)] w-[var(--mx-mobile-header-touch-target)] place-items-center rounded-full bg-status-success-surface text-caption font-bold uppercase text-status-success-text ring-1 ring-status-success/20 outline-none focus-visible:ring-2 focus-visible:ring-status-success/30"
          >
            {initials}
          </button>
          {mobileProfileOpen ? (
            <div
              role="menu"
              aria-label="Opções do perfil"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-[var(--mx-z-popover)] w-56 rounded-[var(--mx-radius-2xl)] border border-border-subtle bg-white p-2 shadow-[var(--mx-shadow-xl)]"
            >
              <button type="button" role="menuitem" onClick={() => goTo(profilePath)} className="flex min-h-11 w-full items-center gap-3 rounded-[var(--mx-radius-xl)] px-3 text-left text-sm font-semibold text-foreground hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-status-success/30">
                <UserRound size={20} aria-hidden="true" /> Meu Perfil
              </button>
              <button type="button" role="menuitem" onClick={() => goTo(settingsPath)} className="flex min-h-11 w-full items-center gap-3 rounded-[var(--mx-radius-xl)] px-3 text-left text-sm font-semibold text-foreground hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-status-success/30">
                <Settings size={20} aria-hidden="true" /> Preferências
              </button>
              <button type="button" role="menuitem" onClick={() => goTo(notificationsPath)} className="flex min-h-11 w-full items-center gap-3 rounded-[var(--mx-radius-xl)] px-3 text-left text-sm font-semibold text-foreground hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-status-success/30">
                <Bell size={20} aria-hidden="true" /> Notificações
              </button>
              <button type="button" role="menuitem" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-[var(--mx-radius-xl)] px-3 text-left text-sm font-semibold text-status-error-text hover:bg-status-error-surface focus-visible:ring-2 focus-visible:ring-status-success/30">
                <LogOut size={20} aria-hidden="true" /> Sair
              </button>
            </div>
          ) : null}
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
          className={SIDEBAR.drawerOverlay}
          role="presentation"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMobileOpen(false)
          }}
        >
          <div className={SIDEBAR.drawerScrim} aria-hidden="true" />
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
        data-mx-shell-main=""
        role="main"
        tabIndex={-1}
        className={cn(
          'flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden bg-surface-alt outline-none xl:h-screen',
          'pt-[calc(var(--mx-mobile-header-height)+env(safe-area-inset-top,0px))] xl:pt-0',
          collapsed
            ? 'xl:pl-[var(--mx-sidebar-width-collapsed)]'
            : 'xl:pl-[var(--mx-sidebar-width-expanded)]',
        )}
      >
        {isSimulating ? (
          <section
            className="m-3 flex shrink-0 flex-col gap-3 rounded-[var(--mx-radius-2xl)] border border-status-success/20 bg-status-success-surface p-4 text-status-success-text md:flex-row md:items-center md:justify-between"
            aria-label="Simulação ativa"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold">Simulação {simulationLabel} ativa</p>
              <p className="mt-1 truncate text-xs font-semibold text-status-success-text">
                Base: {simulationBase} • Loja: {simulationStore}
              </p>
            </div>
            {onStopSimulation ? (
              <button
                type="button"
                onClick={onStopSimulation}
                className="h-10 rounded-[var(--mx-radius-xl)] bg-brand-primary px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-brand-primary-hover focus-visible:ring-2 focus-visible:ring-status-success/30"
              >
                Voltar Admin MX
              </button>
            ) : null}
          </section>
        ) : null}
        <PageViewport>
          {children}
        </PageViewport>
      </main>
    </div>
  )
}
