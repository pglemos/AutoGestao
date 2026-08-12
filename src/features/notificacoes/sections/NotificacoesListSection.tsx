import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Clock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card, CardContent, CardHeader } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import type { StorePreRegistration } from '@/types/database'
import { NotificacaoApprovalCard } from '../components/NotificacaoApprovalCard'

type NotificationLike = {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  read: boolean
  priority?: string | null
  link?: string | null
  store_id?: string | null
}

type Props = {
  unreadCount: number
  grouped: Record<string, NotificationLike[]>
  isOwner: boolean
  markRead: (id: string) => void | Promise<void>
  markUnread: (id: string) => void | Promise<void>
  deleteNotification: (id: string) => void | Promise<void>
  isApprovalNotification: (n: { type: string; title: string }) => boolean
  getApprovalForNotification: (n: {
    link?: string | null
    store_id?: string | null
    message: string
    type: string
    title: string
  }) => StorePreRegistration | null
  reviewingPreRegistrationId: string | null
  handleReviewPreRegistration: (
    item: StorePreRegistration,
    action: 'approve' | 'reject',
    notificationId?: string,
  ) => void | Promise<void>
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'approval':
      return <ShieldCheck size={20} className="text-status-success-text" />
    case 'discipline':
      return <AlertTriangle size={20} className="text-status-error" />
    case 'performance':
      return <TrendingUp size={20} className="text-status-success" />
    case 'alert':
      return <Clock size={20} className="text-status-warning" />
    default:
      return <Bell size={20} className="text-status-success-text" />
  }
}

export function NotificacoesListSection({
  unreadCount,
  grouped,
  isOwner,
  markRead,
  markUnread,
  deleteNotification,
  isApprovalNotification,
  getApprovalForNotification,
  reviewingPreRegistrationId,
  handleReviewPreRegistration,
}: Props) {
  const navigate = useNavigate()

  return (
    <Card className="flex min-h-[420px] flex-col overflow-hidden bg-white">
      <CardHeader className="relative z-10 flex flex-col items-start justify-between gap-mx-md border-b border-border bg-gray-50/30 p-mx-md sm:flex-row sm:items-center sm:p-mx-lg">
        <div className="flex items-center gap-mx-md">
          <div className={cn(
            'flex h-mx-11 w-mx-11 shrink-0 items-center justify-center rounded-2xl',
            'bg-status-success-surface text-status-success-text shadow-none',
          )}>
            <Bell size={22} strokeWidth={2} />
          </div>
          <div>
            <Typography variant="h2" className="text-lg sm:text-xl">
              Minha caixa de entrada
            </Typography>
            <Typography variant="caption" tone="muted" className="mt-1 block">
              Alertas e pendências da rotina
            </Typography>
          </div>
        </div>
        <Badge variant="brand" className="w-full rounded-mx-full px-4 py-1 text-center sm:w-auto">
          {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
        </Badge>
      </CardHeader>

      <CardContent className="relative z-10 flex-1 p-mx-md sm:p-mx-lg">
        <AnimatePresence mode="popLayout">
          {Object.entries(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <ShieldCheck size={48} className="mb-mx-md text-muted-foreground" />
              <Typography variant="h2">
                Inbox Limpo
              </Typography>
              <Typography variant="caption" tone="muted" className="mt-mx-xs max-w-xs">
                Nenhuma notificação pendente.
              </Typography>
            </div>
          ) : (
            (Object.entries(grouped) as Array<[string, NotificationLike[]]>).map(([group, list]) => (
              <div key={group} className="mb-mx-lg space-y-mx-sm last:mb-0">
                <div className="flex items-center gap-mx-sm px-mx-xs">
                  <Typography variant="caption" tone="muted" className="whitespace-nowrap tracking-wider">
                    {group}
                  </Typography>
                  <div className="h-px flex-1 bg-border-default opacity-50" />
                </div>
                {list.map(n => {
                  const approval = getApprovalForNotification(n)
                  const approvalNotification = isApprovalNotification(n)

                  return (
                    <motion.article
                      key={n.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => {
                        void markRead(n.id)
                        if (n.link && !approvalNotification) navigate(n.link)
                      }}
                      className={cn(
                        'relative flex cursor-pointer flex-col gap-mx-md rounded-2xl border p-mx-md transition-all group/item sm:flex-row',
                        n.read ? 'border-border bg-gray-50/30 opacity-80' : 'border-brand-primary/20 bg-white shadow-sm',
                        !n.read && n.priority === 'high' && 'border-status-error/20 bg-status-error-surface/30',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-mx-11 w-mx-11 shrink-0 items-center justify-center rounded-2xl shadow-none transition-transform group-hover/item:scale-105',
                          n.read ? 'bg-gray-50 text-muted-foreground' : 'bg-white border border-border',
                        )}
                      >
                        {getTypeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <header className="flex justify-between items-start mb-2 gap-mx-sm">
                          <div className="flex items-center gap-mx-sm min-w-0">
                            <Typography variant="h3" className="truncate text-base font-bold transition-colors group-hover/item:text-status-success-text">
                              {n.title}
                            </Typography>
                            {!n.read && n.priority === 'high' && (
                              <Badge variant="danger" className="text-mx-nano sm:text-xs h-mx-5 px-3 rounded-mx-full animate-pulse shadow-sm shrink-0">
                                CRÍTICO
                              </Badge>
                            )}
                          </div>
                          <Typography variant="mono" tone="muted" className="shrink-0 text-mx-tiny sm:text-xs">
                            {format(new Date(n.created_at), 'HH:mm')}
                          </Typography>
                        </header>
                        <Typography variant="p" tone="muted" className="line-clamp-2 text-sm leading-relaxed">
                          {n.message}
                        </Typography>
                        {approval && (
                          <NotificacaoApprovalCard
                            approval={approval}
                            notificationId={n.id}
                            reviewingPreRegistrationId={reviewingPreRegistrationId}
                            onReview={handleReviewPreRegistration}
                          />
                        )}
                        <footer className="mt-mx-md flex flex-wrap items-center gap-mx-md">
                          {n.link && !approvalNotification && (
                            <Typography
                              variant="caption"
                              tone="brand"
                              className="flex items-center gap-mx-xs text-xs tracking-wider transition-transform group-hover/item:translate-x-1"
                            >
                              Ação Imediata <ChevronRight size={12} strokeWidth={3} />
                            </Typography>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation()
                              if (n.read) {
                                void markUnread(n.id)
                                toast.success('Alerta marcado como não lido.')
                              } else {
                                void markRead(n.id)
                                toast.success('Alerta marcado como lido.')
                              }
                            }}
                            className="h-auto p-mx-0 text-xs font-semibold text-muted-foreground hover:bg-transparent hover:text-status-success-text"
                          >
                            {n.read ? 'Marcar não lida' : 'Marcar lida'}
                          </Button>
                          {!isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                void deleteNotification(n.id)
                                toast.success('Alerta removido!')
                              }}
                              className="h-auto p-mx-0 text-xs font-semibold text-muted-foreground hover:bg-transparent hover:text-status-error"
                            >
                              Remover
                            </Button>
                          )}
                        </footer>
                      </div>
                      {!n.read && (
                        <div className="absolute right-mx-lg top-mx-sm sm:top-1/2 sm:-translate-y-1/2 w-2.5 h-2.5 rounded-mx-full bg-brand-primary shadow-sm animate-pulse" />
                      )}
                    </motion.article>
                  )
                })}
              </div>
            ))
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default NotificacoesListSection
