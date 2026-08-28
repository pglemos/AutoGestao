import { useState } from 'react'
import { CheckCircle2, UserRound, X } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import type { StorePreRegistration } from '@/types/database'

type Props = {
  approval: StorePreRegistration
  notificationId: string
  reviewingPreRegistrationId: string | null
  onReview: (
    item: StorePreRegistration,
    action: 'approve' | 'reject',
    notificationId?: string,
  ) => void | Promise<void>
}

/**
 * Card de aprovação de pré-cadastro embutido na notificação.
 * Story 3.1 — extraído da Notificacoes original.
 */
function ApprovalAvatar({ url, name }: { url: string | null; name: string }) {
  const [erro, setErro] = useState(false)
  if (!url || erro) return <div className="h-full w-full flex items-center justify-center text-status-success-text"><UserRound size={20} /></div>
  return <img src={url} alt={name} className="h-full w-full object-cover" loading="lazy" decoding="async" onError={() => setErro(true)} />
}

export function NotificacaoApprovalCard({
  approval,
  notificationId,
  reviewingPreRegistrationId,
  onReview,
}: Props) {
  return (
    <div
      role="presentation"
      className="mt-mx-md rounded-2xl border border-brand-primary/15 bg-white p-mx-md shadow-sm"
      onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-mx-sm">
        <div className="flex items-start gap-mx-sm min-w-0">
          <div className="h-mx-14 w-mx-14 overflow-hidden rounded-2xl border border-border bg-surface-alt shrink-0">
            <ApprovalAvatar url={approval.avatar_url} name={approval.full_name} />
          </div>
          <div className="min-w-0">
            <Typography variant="caption" className="tracking-tight truncate">
              {approval.full_name}
            </Typography>
            <Typography variant="tiny" tone="muted" className="mt-1 block font-bold break-all">
              {approval.email} · {approval.phone}
            </Typography>
          </div>
        </div>
        <Badge variant="warning" className="shrink-0">
          Pendente
        </Badge>
      </div>
      <div className="mt-mx-md grid grid-cols-1 sm:grid-cols-4 gap-mx-sm text-mx-tiny font-bold uppercase">
        <div>
          <span className="block text-mx-tiny text-muted-foreground tracking-mx-widest">Loja</span>
          {approval.store_name_snapshot}
        </div>
        <div>
          <span className="block text-mx-tiny text-muted-foreground tracking-mx-widest">Função</span>
          {approval.role}
        </div>
        <div>
          <span className="block text-mx-tiny text-muted-foreground tracking-mx-widest">Na loja</span>
          {approval.store_tenure}
        </div>
        <div>
          <span className="block text-mx-tiny text-muted-foreground tracking-mx-widest">Mercado</span>
          {approval.market_experience}
        </div>
      </div>
      {approval.role === 'dono' && (
        <div className="mt-mx-sm rounded-2xl border border-brand-primary/15 bg-surface-alt p-mx-sm">
          <Typography variant="tiny" tone="brand" className="mb-mx-xs block">
            Dados administrativos
          </Typography>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-xs text-mx-micro font-bold text-muted-foreground">
            <span><b>Razão:</b> {approval.company_legal_name || 'não informado'}</span>
            <span><b>CNPJ:</b> {approval.company_cnpj || 'não informado'}</span>
            <span><b>Telefone:</b> {approval.company_administrative_phone || 'não informado'}</span>
            <span><b>Endereço:</b> {approval.company_address || 'não informado'}</span>
          </div>
        </div>
      )}
      <div className="mt-mx-md flex flex-col sm:flex-row gap-mx-xs">
        <Button
          type="button"
          onClick={() => void onReview(approval, 'approve', notificationId)}
          disabled={reviewingPreRegistrationId === approval.id}
          className="h-mx-11 rounded-2xl font-bold uppercase tracking-widest text-mx-tiny"
        >
          <CheckCircle2 size={15} className="mr-2" />
          Aprovar login
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onReview(approval, 'reject', notificationId)}
          disabled={reviewingPreRegistrationId === approval.id}
          className="h-mx-11 rounded-2xl font-bold uppercase tracking-widest text-mx-tiny text-status-error-text hover:bg-status-error-surface"
        >
          <X size={15} className="mr-2" />
          Rejeitar
        </Button>
      </div>
    </div>
  )
}

export default NotificacaoApprovalCard
