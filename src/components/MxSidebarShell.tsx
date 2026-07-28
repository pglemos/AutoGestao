import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
import { Avatar } from './atoms/Avatar'
import { NotificationBellButton } from './NotificationBellButton'
import MxLogo from '@/assets/mx-logo.png'

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
}

function isNavItemActive(
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
  size,
  className,
}: {
  icon: MxSidebarNavItem['icon']
  size: number
  className?: string
}) {
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && 'render' in icon)
  ) {
    const Icon = icon as LucideIcon
    return (
      <Icon
        size={size}
        strokeWidth={1.8}
        className={className}
        aria-hidden="true"
      />
    )
  }

  if (React.isValidElement(icon)) {
    return React.cloneElement(
      icon as React.ReactElement<Record<string, unknown>>,
      {
        size,
        strokeWidth: 1.8,
        className: cn(
          (icon.props as { className?: string }).className,
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
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[150] -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs font-semibold text-gray-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
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
}: MxSidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const navigate = useNavigate()
  const drawerRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

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
    if (!mobileOpen && !userMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileOpen(false)
      setUserMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen, userMenuOpen])

  useEffect(() => {
    if (!userMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (userMenuRef.current?.contains(event.target as Node)) return
      setUserMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [userMenuOpen])

  const goTo = (path: string) => {
    setUserMenuOpen(false)
    setMobileOpen(false)
    navigate(path)
  }

  const signOut = () => {
    setUserMenuOpen(false)
    setMobileOpen(false)
    void onSignOut()
  }

  const renderNavItem = (item: MxSidebarNavItem, isCollapsed: boolean) => {
    const active = item === activeNavItem

    return (
      <NavLink
        key={item.key ?? item.path}
        to={item.path}
        aria-label={item.label}
        aria-current={active ? 'page' : false}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30',
          active
            ? 'bg-emerald-50 font-semibold text-emerald-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          isCollapsed && 'justify-center px-0',
        )}
      >
        <NavItemIcon
          icon={item.icon}
          size={16}
          className={cn(
            'shrink-0 transition-colors',
            active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-700',
          )}
        />
        {!isCollapsed ? (
          <>
            <span className={cn(
              'min-w-0 flex-1',
              item.badgeTone === 'warning' ? 'whitespace-normal leading-tight' : 'truncate',
            )}>
              {item.label}
            </span>
            {item.badge ? (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                  item.badgeTone === 'warning'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700',
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </>
        ) : null}
        {isCollapsed ? <CollapsedTooltip label={item.label} /> : null}
      </NavLink>
    )
  }

  const renderNestedNavItem = (item: MxSidebarNavItem) => {
    const active = item === activeNavItem

    return (
      <NavLink
        key={item.key ?? item.path}
        to={item.path}
        aria-label={item.label}
        aria-current={active ? 'page' : false}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30',
          active
            ? 'bg-emerald-50 font-medium text-emerald-700'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
              item.badgeTone === 'warning'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700',
            )}
          >
            {item.badge}
          </span>
        ) : null}
      </NavLink>
    )
  }

  const renderNavGroup = (item: MxSidebarNavItem, isCollapsed: boolean) => {
    const key = item.key ?? item.path
    const containsActiveItem = containsNavItem(item, activeNavItem)
    const expanded = expandedGroups[key] ?? item.defaultExpanded ?? containsActiveItem

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
          onClick={toggleGroup}
          className={cn(
            'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-emerald-500/30',
            isCollapsed && 'justify-center px-0',
          )}
        >
          <NavItemIcon
            icon={item.icon}
            size={16}
            className="shrink-0 text-gray-400 transition-colors group-hover:text-gray-700"
          />
          {!isCollapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <ChevronDown
                size={14}
                className={cn(
                  'shrink-0 text-gray-400 transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </>
          ) : null}
          {isCollapsed ? <CollapsedTooltip label={item.label} /> : null}
        </button>

        {!isCollapsed && expanded ? (
          <div
            data-sidebar-subnav={item.label}
            className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3"
          >
            {item.children?.map(renderNestedNavItem)}
          </div>
        ) : null}
      </div>
    )
  }

  const renderUserMenu = (isCollapsed: boolean) => {
    const menuItems = [
      { label: 'Meu Perfil', icon: UserRound, action: () => goTo(profilePath) },
      { label: 'Preferências', icon: Settings, action: () => goTo(settingsPath) },
      { label: 'Notificações', icon: Bell, action: () => goTo(notificationsPath) },
      { label: 'Sair', icon: LogOut, action: signOut, destructive: true },
    ]

    return (
      <div
        role="menu"
        aria-label="Opções do perfil"
        className={cn(
          'absolute z-[160] rounded-2xl border border-gray-100 bg-white p-2 shadow-xl',
          isCollapsed
            ? 'bottom-0 left-[calc(100%+10px)] w-64'
            : 'bottom-[calc(100%+10px)] left-0 right-0',
        )}
      >
        {menuItems.map(({ label, icon: Icon, action, destructive }) => (
          <button
            key={label}
            type="button"
            role="menuitem"
            onClick={action}
            className={cn(
              'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30',
              destructive
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    )
  }

  const renderProfileCard = (isCollapsed: boolean) => (
    <div ref={userMenuRef} className="relative">
      {userMenuOpen ? renderUserMenu(isCollapsed) : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={userMenuOpen}
        aria-label={`Abrir menu de usuário de ${displayName}`}
        onClick={() => setUserMenuOpen((open) => !open)}
        className={cn(
          'group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 py-2 text-left outline-none transition-colors hover:border-emerald-100 hover:bg-emerald-50/60 focus-visible:ring-2 focus-visible:ring-emerald-500/30',
          isCollapsed ? 'justify-center px-0' : 'px-3.5',
        )}
      >
        <Avatar
          src={avatarUrl || undefined}
          alt={`Avatar de ${displayName}`}
          fallback={initials}
          size="md"
          className="shrink-0 border-emerald-100 bg-emerald-50 font-bold text-emerald-600"
        />
        {!isCollapsed ? (
          <>
            <span className="min-w-0 flex-1 overflow-hidden">
              <span
                className="block truncate text-[13px] font-bold leading-tight text-gray-800"
                title={displayName}
              >
                {displayName}
              </span>
              <span
                className="mt-1 block truncate text-[11px] font-medium leading-tight text-gray-500"
                title={displayRole}
              >
                {displayRole}
              </span>
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={cn(
                'shrink-0 text-gray-400 transition-transform duration-200',
                userMenuOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </>
        ) : null}
        {isCollapsed ? <CollapsedTooltip label={displayName} /> : null}
      </button>
    </div>
  )

  const renderSidebarContent = (
    isCollapsed: boolean,
    canCollapse = false,
  ) => (
    <>
      <div
        className={cn(
          'flex h-[54px] shrink-0 items-center border-b border-gray-100',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center gap-2.5',
            isCollapsed && 'justify-center',
          )}
        >
          <img
            src={MxLogo}
            alt="MX"
            className="h-7 w-7 shrink-0 object-contain"
          />
          {!isCollapsed ? (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-black tracking-tight text-gray-900">
                MX PERFORMANCE
              </p>
              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-500 outline-none transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            {isCollapsed ? (
              <PanelLeftOpen size={17} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={17} aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      <nav
        className={cn(
          'no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto py-4',
          isCollapsed ? 'px-2' : 'px-3',
        )}
        aria-label={sidebarLabel}
      >
        {navSections.map((section) => (
          <section key={section.key ?? section.label}>
            {!isCollapsed && section.label !== 'MENU' ? (
              <p className="truncate px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map(item => item.children?.length
                ? renderNavGroup(item, isCollapsed)
                : renderNavItem(item, isCollapsed))}
            </div>
          </section>
        ))}
      </nav>

      <div className={cn('border-t border-gray-100 py-3', isCollapsed ? 'px-2' : 'px-3')}>
        {renderProfileCard(isCollapsed)}
      </div>
    </>
  )

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 font-display text-gray-800">
      <header className="fixed left-0 right-0 top-0 z-[90] flex h-[calc(72px+env(safe-area-inset-top))] items-center justify-between border-b border-gray-100 bg-white px-4 pt-[env(safe-area-inset-top)] shadow-sm md:hidden">
        <button
          type="button"
          aria-label="Abrir menu principal"
          onClick={() => setMobileOpen(true)}
          className="flex min-w-0 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          <img src={MxLogo} alt="MX" className="h-9 w-9 shrink-0 object-contain" />
          <span className="hidden min-w-0 leading-tight min-[430px]:block">
            <span className="block text-[15px] font-black tracking-tight text-gray-900">
              MX PERFORMANCE
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              {moduleLabel}
            </span>
          </span>
        </button>
        <div className="pointer-events-none absolute left-1/2 top-[calc(50%+env(safe-area-inset-top)/2)] max-w-[42vw] -translate-x-1/2 -translate-y-1/2 truncate text-center text-sm font-bold text-gray-800">
          {mobileTitle}
        </div>
        <div className="flex items-center gap-2">
          <NotificationBellButton variant="light" />
          <button
            type="button"
            aria-label={`Abrir perfil de ${displayName}`}
            onClick={() => goTo(profilePath)}
            className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-[11px] font-black uppercase text-emerald-700 ring-1 ring-emerald-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            {initials}
          </button>
        </div>
      </header>

      <aside
        className={cn(
          'fixed left-0 top-0 z-[80] hidden h-screen flex-col border-r border-gray-100 bg-white shadow-sm transition-[width] duration-300 ease-in-out md:flex',
          collapsed ? 'w-16' : 'w-64',
        )}
        aria-label={sidebarLabel}
      >
        {renderSidebarContent(collapsed, true)}
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-[100] bg-gray-950/30 backdrop-blur-sm md:hidden"
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
            className="flex h-full w-[min(304px,calc(100vw-1rem))] flex-col border-r border-gray-100 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-14 items-center justify-end border-b border-gray-100 px-3">
              <button
                type="button"
                aria-label="Fechar menu principal"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 outline-none transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              >
                <X size={21} aria-hidden="true" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
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
          'h-[100dvh] overflow-hidden bg-gray-50 outline-none transition-[padding] duration-300 md:h-screen',
          'pt-[calc(72px+env(safe-area-inset-top))] md:pt-0',
          collapsed ? 'md:pl-16' : 'md:pl-64',
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
