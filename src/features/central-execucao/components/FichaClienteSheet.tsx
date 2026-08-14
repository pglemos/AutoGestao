import * as Dialog from '@radix-ui/react-dialog'
import { CalendarClock, Car, CircleDollarSign, History, Phone, X } from 'lucide-react'
import { useClientSheetData } from '@/features/central-execucao/hooks/useClientSheetData'

function formatCurrency(value: number | null | undefined) {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

function humanize(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ') : '—'
}

export function FichaClienteSheet({
  clientId,
  open,
  onClose,
}: {
  clientId: string | null
  open: boolean
  onClose: () => void
}) {
  const { client, opportunity, timeline, loading, error } = useClientSheetData(clientId, open)

  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--mx-z-overlay)] bg-surface-overlay/30" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[var(--mx-z-drawer)] flex w-full max-w-[560px] flex-col bg-surface-alt shadow-2xl focus:outline-none">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-h5 font-bold text-foreground">Ficha do cliente</Dialog.Title>
              <Dialog.Description className="truncate text-[12px] text-muted-foreground">Histórico comercial sem sair da Central</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Fechar ficha" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map(item => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : error ? (
              <p role="alert" className="rounded-2xl border border-status-error/30 bg-status-error-surface p-4 text-body-sm font-semibold text-status-error-text">{error}</p>
            ) : !client ? (
              <p className="rounded-2xl border border-border bg-white p-6 text-center text-body-sm text-muted-foreground">Cliente não encontrado.</p>
            ) : (
              <div className="space-y-4">
                <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-[18px] font-bold text-foreground">{client.nome}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-body-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{client.telefone || 'Sem telefone'}</p>
                    </div>
                    <span className="rounded-full bg-status-info-surface px-3 py-1 text-caption font-bold capitalize text-status-info-text">{humanize(client.status)}</span>
                  </div>
                  {client.observacoes && <p className="mt-4 rounded-xl bg-surface-alt p-3 text-[12px] leading-5 text-muted-foreground">{client.observacoes}</p>}
                </section>

                <section className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <Car className="mb-2 h-4 w-4 text-status-info-text" aria-hidden="true" />
                    <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Veículo</p>
                    <p className="mt-1 text-body-sm font-bold text-foreground">{opportunity?.veiculo_interesse || '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <CircleDollarSign className="mb-2 h-4 w-4 text-status-info-text" aria-hidden="true" />
                    <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Valor</p>
                    <p className="mt-1 text-body-sm font-bold text-foreground">{formatCurrency(opportunity?.valor_negociado)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Etapa</p>
                    <p className="mt-1 text-body-sm font-bold capitalize text-foreground">{humanize(opportunity?.etapa)}</p>
                    <p className="mt-1 text-caption text-muted-foreground">Financiamento: {humanize(opportunity?.financiamento)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <CalendarClock className="mb-2 h-4 w-4 text-status-info-text" aria-hidden="true" />
                    <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Próxima ação</p>
                    <p className="mt-1 text-body-sm font-bold text-foreground">{client.proxima_acao || '—'}</p>
                    <p className="mt-1 text-caption text-muted-foreground">{formatDate(client.proxima_acao_em)}</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <History className="h-4 w-4 text-status-info-text" aria-hidden="true" />
                    <h3 className="text-[14px] font-bold text-foreground">Histórico</h3>
                  </div>

                  {timeline.length === 0 ? (
                    <p className="py-5 text-center text-[12px] text-muted-foreground">Nenhum histórico registrado.</p>
                  ) : (
                    <ol className="space-y-0">
                      {timeline.map((item, index) => (
                        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                          {index < timeline.length - 1 && <span className="absolute left-[4px] top-3 h-full w-px bg-muted" />}
                          <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-status-info ring-1 ring-blue-200" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[12px] font-bold capitalize text-foreground">{humanize(item.title)}</p>
                              <time className="text-caption text-muted-foreground">{formatDate(item.date)}</time>
                            </div>
                            {item.status && <p className="mt-0.5 text-caption font-bold uppercase tracking-wider text-status-info-text">{humanize(item.status)}</p>}
                            {item.description && <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
