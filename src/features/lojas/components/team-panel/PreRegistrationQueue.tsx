import { useState } from 'react'
import { Ban, BriefcaseBusiness, Check, ClipboardList, Copy, Link2, Mail, Phone, ShieldCheck, User } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/molecules/Card'
import type { StorePreRegistration } from '@/types/database'

function PreRegistrationAvatar({ url, name }: { url: string | null; name: string }) {
  const [erro, setErro] = useState(false)
  if (!url || erro) return <div className="h-full w-full flex items-center justify-center text-status-success-text"><User size={20} /></div>
  return <img src={url} alt={name} className="h-full w-full object-cover" onError={() => setErro(true)} />
}

const getPreRegistrationConfirmationKey = (item: StorePreRegistration) => `pre-registration:${item.id}`

export function PreRegistrationQueue({
  canSharePreRegistrationLink,
  registrationLink,
  onCopyLink,
  canApprovePreRegistrations,
  loadingPreRegistrations,
  preRegistrations,
  expandedPreRegistrations,
  onToggleDetails,
  redactEmail,
  redactPhone,
  onReview,
  reviewingPreRegistrationId,
  pendingConfirmations,
}: {
  canSharePreRegistrationLink: boolean
  registrationLink: string
  onCopyLink: () => void
  canApprovePreRegistrations: boolean
  loadingPreRegistrations: boolean
  preRegistrations: StorePreRegistration[]
  expandedPreRegistrations: Set<string>
  onToggleDetails: (id: string) => void
  redactEmail: (email: string) => string
  redactPhone: (phone?: string | null) => string
  onReview: (item: StorePreRegistration, action: 'approve' | 'reject') => void
  reviewingPreRegistrationId: string | null
  pendingConfirmations: Set<string>
}) {
  if (!canSharePreRegistrationLink) return null

  return (
    <aside className="order-2 min-w-0 xl:sticky xl:top-[var(--spacing-mx-layout-offset-top)]">
      <Card className="border bg-white overflow-hidden">
        <CardHeader className="border-b border-border bg-surface-alt/60 p-mx-md">
          <div className="flex flex-col gap-mx-md">
            <div className="flex items-start gap-mx-sm min-w-0">
              <div className="w-mx-12 h-mx-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/10 text-status-success-text flex items-center justify-center shrink-0">
                <ClipboardList size={22} />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Pré-cadastros</CardTitle>
                <CardDescription>Fila de entrada e histórico de solicitações da loja.</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onCopyLink()}
              className="h-mx-12 rounded-2xl bg-white w-full"
              disabled={!registrationLink}
            >
              <Copy size={16} className="mr-2" />
              COPIAR LINK
            </Button>
          </div>
          <div className="mt-mx-md flex items-center gap-mx-xs rounded-2xl border border-border bg-white px-mx-md py-mx-sm text-mx-tiny font-bold text-muted-foreground min-w-0">
            <Link2 size={14} className="text-status-success-text shrink-0" />
            <span className="truncate">{registrationLink || 'Link indisponível até a loja ser identificada'}</span>
          </div>
        </CardHeader>

        <CardContent className="p-mx-md mx-pre-registration-scroll">
          {!canApprovePreRegistrations ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-alt p-mx-lg text-center">
              <ShieldCheck size={24} className="mx-auto text-status-success-text" />
              <Typography variant="caption" className="mt-mx-sm block">Aprovação restrita ao Admin MX</Typography>
              <Typography variant="tiny" tone="muted" className="mt-2 block font-bold">A loja pode compartilhar o link; a fila de validação fica visível apenas para Admin MX e MX Master.</Typography>
            </div>
          ) : loadingPreRegistrations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-md">
              <Skeleton className="h-mx-32 rounded-2xl" />
              <Skeleton className="h-mx-32 rounded-2xl" />
            </div>
          ) : preRegistrations.length > 0 ? (
            <div className="grid grid-cols-1 gap-mx-sm">
              {preRegistrations.map(item => {
                const detailsExpanded = expandedPreRegistrations.has(item.id)
                return (
                <div key={item.id} className="rounded-2xl border border-border bg-surface-alt p-mx-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-mx-sm">
                    <div className="flex items-start gap-mx-sm min-w-0">
                      <div className="h-mx-14 w-mx-14 overflow-hidden rounded-2xl border border-border bg-white shrink-0">
                        <PreRegistrationAvatar url={item.avatar_url} name={item.full_name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Typography variant="caption" className="block max-w-full tracking-tight truncate">{item.full_name}</Typography>
                        <div className="mt-1 flex flex-wrap gap-x-mx-md gap-y-mx-tiny text-mx-micro font-bold text-muted-foreground">
                          <span className="inline-flex items-center gap-mx-tiny"><Mail size={11} aria-hidden="true" />{detailsExpanded ? item.email : redactEmail(item.email)}</span>
                          <span className="inline-flex items-center gap-mx-tiny"><Phone size={11} aria-hidden="true" />{detailsExpanded ? item.phone : redactPhone(item.phone)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={item.status === 'pending' ? 'warning' : item.status === 'synced' ? 'success' : 'outline'} className="shrink-0">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-mx-md grid grid-cols-1 sm:grid-cols-3 gap-mx-sm text-mx-tiny font-bold uppercase">
                    <div>
                      <span className="block text-mx-nano text-muted-foreground tracking-mx-widest">Papel</span>
                      {item.role}
                    </div>
                    <div>
                      <span className="block text-mx-nano text-muted-foreground tracking-mx-widest">Na loja</span>
                      {item.store_tenure}
                    </div>
                    <div>
                      <span className="block text-mx-nano text-muted-foreground tracking-mx-widest">Mercado</span>
                      {item.market_experience}
                    </div>
                  </div>
                  <div className="mt-mx-sm flex items-center gap-mx-xs text-mx-tiny font-bold text-muted-foreground">
                    <BriefcaseBusiness size={13} className="text-status-success-text" />
                    <span>{item.segment}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onToggleDetails(item.id)}
                    className="mt-mx-sm h-mx-9 rounded-xl px-mx-sm text-mx-nano font-bold uppercase tracking-widest text-status-success-text"
                    aria-expanded={detailsExpanded}
                  >
                    {detailsExpanded ? 'Ocultar dados sensíveis' : 'Ver dados sensíveis'}
                  </Button>
                  {item.role === 'dono' && detailsExpanded && (
                    <div className="mt-mx-sm rounded-2xl border border-brand-primary/15 bg-white p-mx-sm">
                      <Typography variant="tiny" tone="brand" className="mb-mx-xs block">
                        Dados administrativos
                      </Typography>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-xs text-mx-micro font-bold text-muted-foreground">
                        <span><b>Razão:</b> {item.company_legal_name || 'não informado'}</span>
                        <span><b>CNPJ:</b> {item.company_cnpj || 'não informado'}</span>
                        <span><b>Telefone:</b> {item.company_administrative_phone || 'não informado'}</span>
                        <span><b>Endereço:</b> {item.company_address || 'não informado'}</span>
                      </div>
                    </div>
                  )}
                  {item.notes && detailsExpanded && (
                    <Typography variant="tiny" tone="muted" className="mt-mx-sm block font-bold leading-relaxed">
                      {item.notes}
                    </Typography>
                  )}
                  {item.status === 'pending' && (
                    <div className="mt-mx-md flex flex-col sm:flex-row gap-mx-xs">
                      <Button
                        type="button"
                        onClick={() => onReview(item, 'approve')}
                        disabled={reviewingPreRegistrationId === item.id || pendingConfirmations.has(getPreRegistrationConfirmationKey(item))}
                        className="h-mx-11 rounded-2xl font-bold uppercase tracking-widest text-mx-nano"
                      >
                        <Check size={15} className="mr-2" />
                        Aprovar login
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onReview(item, 'reject')}
                        disabled={reviewingPreRegistrationId === item.id || pendingConfirmations.has(getPreRegistrationConfirmationKey(item))}
                        className="h-mx-11 rounded-2xl font-bold uppercase tracking-widest text-mx-nano text-status-error-text hover:bg-status-error-surface"
                      >
                        <Ban size={15} className="mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-alt p-mx-md text-center">
              <Typography variant="h4" className="tracking-tight">Nenhum pré-cadastro recebido</Typography>
              <Typography variant="p" tone="muted" className="mt-2 block text-sm font-bold">Assim que alguém preencher o link da loja, os dados aparecem aqui.</Typography>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}
