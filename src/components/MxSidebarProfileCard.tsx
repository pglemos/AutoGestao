import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './atoms/Avatar'

export type MxSidebarProfileCardProps = {
  displayName: string
  roleLabel: string
  avatarUrl?: string | null
  collapsed?: boolean
  onNavigate: (path: string) => void
  onSignOut: () => void
  profilePath?: string
  settingsPath?: string
  notificationsPath?: string
}

/**
 * Cartão de perfil da sidebar, compartilhado por todos os módulos.
 * Abre o menu de conta (perfil, preferências, notificações e sair) — nunca
 * navega direto ao clicar, para que o comportamento seja idêntico em
 * vendedor, gerente, dono, consultoria e Admin MX.
 */
export function MxSidebarProfileCard({
  displayName,
  roleLabel,
  avatarUrl,
  collapsed = false,
  onNavigate,
  onSignOut,
  profilePath = '/perfil',
  settingsPath = '/configuracoes',
  notificationsPath = '/notificacoes',
}: MxSidebarProfileCardProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'MX'

  const go = (path: string) => {
    setOpen(false)
    onNavigate(path)
  }

  const menuItems = [
    { label: 'Meu Perfil', icon: UserRound, action: () => go(profilePath) },
    { label: 'Preferências', icon: Settings, action: () => go(settingsPath) },
    { label: 'Notificações', icon: Bell, action: () => go(notificationsPath) },
    {
      label: 'Sair',
      icon: LogOut,
      action: () => {
        setOpen(false)
        onSignOut()
      },
      destructive: true,
    },
  ]

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <div
          role="menu"
          aria-label="Opções do perfil"
          className={cn(
            'absolute z-[160] rounded-[16px] border border-gray-100 bg-white p-2 shadow-xl',
            collapsed
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
                'flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30',
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
      ) : null}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Abrir menu de usuário de ${displayName}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'group flex min-h-14 w-full items-center gap-3 rounded-[16px] border border-gray-100 bg-gray-50/60 py-2 text-left outline-none transition-colors hover:border-emerald-100 hover:bg-emerald-50/60 focus-visible:ring-2 focus-visible:ring-emerald-500/30',
          collapsed ? 'justify-center px-0' : 'px-3.5',
        )}
      >
        <Avatar
          src={avatarUrl || undefined}
          alt={`Avatar de ${displayName}`}
          fallback={initials}
          size="md"
          className="shrink-0 border-emerald-100 bg-emerald-50 font-bold text-emerald-600"
        />
        {!collapsed ? (
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
                title={roleLabel}
              >
                {roleLabel}
              </span>
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={cn(
                'shrink-0 text-gray-400 transition-transform duration-200',
                open && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </>
        ) : null}
      </button>
    </div>
  )
}

export default MxSidebarProfileCard
