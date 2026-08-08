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
          'relative grid h-10 w-10 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A896]/45',
          variant === 'dark'
            ? 'text-white/70 hover:bg-white/10 hover:text-white'
            : 'text-[#64748B] hover:bg-slate-100 hover:text-[#005BFF]'
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#EF4444] px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-[var(--mx-z-popover)] w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-[#DFE0E1] bg-white text-left shadow-mx-xl"
        >
          <div className="flex items-center justify-between border-b border-[#DFE0E1] px-4 py-3">
            <p className="text-[13px] font-extrabold text-[#071822]">Notificações</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-[11px] font-bold text-[#005BFF] transition-colors hover:underline"
              >
                Marcar tudo como lida
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] font-semibold text-[#526B7A]">
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
                    'flex w-full flex-col items-start gap-0.5 border-b border-[#F2F4F6] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#F7F8F8]',
                    !notification.read && 'bg-[#EFF9F8]'
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00A89D]" aria-hidden="true" />}
                    <span className="truncate text-[12.5px] font-extrabold text-[#071822]">{notification.title}</span>
                  </div>
                  <span className="line-clamp-2 text-[12px] font-medium text-[#526B7A]">{notification.message}</span>
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
            className="block w-full border-t border-[#DFE0E1] px-4 py-3 text-center text-[12px] font-extrabold text-[#00A89D] transition-colors hover:bg-[#F7F8F8]"
          >
            Ver todas
          </button>
        </div>
      )}
    </div>
  )
}
