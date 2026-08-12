import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'

interface NotificationBellButtonProps {
  /** 'dark' para header escuro (sidebar), 'light' para header claro (telas do vendedor). */
  variant?: 'dark' | 'light'
  className?: string
}

/**
 * Sino global de notificações. Reunião 09/07/2026: clicar no sino abre um
 * painel na própria tela (sem navegar para /notificacoes) — "Ver todas"
 * é a única ação que sai da tela atual. Usado em todos os headers do
 * módulo vendedor.
 */
export function NotificationBellButton({ variant = 'light', className }: NotificationBellButtonProps) {
  let navigate: any
  try {
    navigate = useNavigate()
  } catch {
    navigate = () => {}
  }
  const { notificacoes, unreadCount, markRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const items = notificacoes.slice(0, 8)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir notificações"
        className={cn(
          'relative grid h-10 w-10 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-success/45',
          variant === 'dark'
            ? 'text-white/70 hover:bg-white/10 hover:text-white'
            : 'text-muted-foreground hover:bg-muted hover:text-status-info-text'
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-status-error px-1 text-caption font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-[var(--mx-z-popover)] w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-white text-left shadow-mx-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-body-sm font-extrabold text-mx-navy">Notificações</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-caption font-bold text-status-info-text transition-colors hover:underline"
              >
                Marcar tudo como lida
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] font-semibold text-muted-foreground">
                Nenhuma notificação por aqui.
              </div>
            ) : (
              items.map(notification => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    if (!notification.read) markRead(notification.id)
                    setOpen(false)
                    if (notification.link) navigate(notification.link)
                  }}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 border-b border-border-subtle px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-alt',
                    !notification.read && 'bg-status-success-surface'
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-success" aria-hidden="true" />}
                    <span className="truncate text-[12.5px] font-extrabold text-mx-navy">{notification.title}</span>
                  </div>
                  <span className="line-clamp-2 text-[12px] font-medium text-muted-foreground">{notification.message}</span>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/notificacoes')
            }}
            className="block w-full border-t border-border px-4 py-3 text-center text-[12px] font-extrabold text-status-success transition-colors hover:bg-surface-alt"
          >
            Ver todas
          </button>
        </div>
      )}
    </div>
  )
}
