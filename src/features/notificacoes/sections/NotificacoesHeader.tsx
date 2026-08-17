import { RefreshCw, CheckCheck, Bell } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { PageHeading } from '@/components/molecules/PageHeading'
import { cn } from '@/lib/utils'

type Props = {
  isRefetching: boolean
  handleRefresh: () => void | Promise<void>
  markAllAsRead: () => void | Promise<void>
}

export function NotificacoesHeader({ isRefetching, handleRefresh, markAllAsRead }: Props) {
  return (
    <PageHeading
      icon={Bell}
      title="Notificações"
      subtitle="Acompanhe alertas, pendências e comunicados da sua rotina"
      actions={
        <div className="flex w-full items-center justify-center gap-mx-sm sm:w-auto sm:justify-end">
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          aria-label="Atualizar"
          className="bg-white"
        >
          <RefreshCw size={20} className={cn(isRefetching && 'animate-spin')} />
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void markAllAsRead()
            toast.success('Tudo lido!')
          }}
          className="flex-1 rounded-2xl bg-white px-4 text-xs font-bold uppercase tracking-wider shadow-sm sm:flex-none"
        >
          <CheckCheck size={18} className="mr-2" /> MARCAR TUDO
        </Button>
        </div>
      }
    />
  )
}

export default NotificacoesHeader
