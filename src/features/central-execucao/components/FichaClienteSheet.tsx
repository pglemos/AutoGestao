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
        <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/30" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[111] flex w-full max-w-[560px] flex-col bg-gray-50 shadow-2xl focus:outline-none">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-[17px] font-bold text-gray-800">Ficha do cliente</Dialog.Title>
              <Dialog.Description className="truncate text-[12px] text-slate-400">Histórico comercial sem sair da Central</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Fechar ficha" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map(item => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-200" />)}
              </div>
            ) : error ? (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">{error}</p>
            ) : !client ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-[13px] text-slate-400">Cliente não encontrado.</p>
            ) : (
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-[18px] font-bold text-gray-800">{client.nome}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{client.telefone || 'Sem telefone'}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold capitalize text-status-info">{humanize(client.status)}</span>
                  </div>
                  {client.observacoes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] leading-5 text-slate-600">{client.observacoes}</p>}
                </section>

                <section className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Car className="mb-2 h-4 w-4 text-status-info" aria-hidden="true" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Veículo</p>
                    <p className="mt-1 text-[13px] font-bold text-gray-800">{opportunity?.veiculo_interesse || '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <CircleDollarSign className="mb-2 h-4 w-4 text-status-info" aria-hidden="true" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor</p>
                    <p className="mt-1 text-[13px] font-bold text-gray-800">{formatCurrency(opportunity?.valor_negociado)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Etapa</p>
                    <p className="mt-1 text-[13px] font-bold capitalize text-gray-800">{humanize(opportunity?.etapa)}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Financiamento: {humanize(opportunity?.financiamento)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <CalendarClock className="mb-2 h-4 w-4 text-status-info" aria-hidden="true" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Próxima ação</p>
                    <p className="mt-1 text-[13px] font-bold text-gray-800">{client.proxima_acao || '—'}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDate(client.proxima_acao_em)}</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <History className="h-4 w-4 text-status-info" aria-hidden="true" />
                    <h3 className="text-[14px] font-bold text-gray-800">Histórico</h3>
                  </div>

                  {timeline.length === 0 ? (
                    <p className="py-5 text-center text-[12px] text-slate-400">Nenhum histórico registrado.</p>
                  ) : (
                    <ol className="space-y-0">
                      {timeline.map((item, index) => (
                        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                          {index < timeline.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-slate-200" />}
                          <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-status-info ring-1 ring-blue-200" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[12px] font-bold capitalize text-gray-800">{humanize(item.title)}</p>
                              <time className="text-[10px] text-slate-400">{formatDate(item.date)}</time>
                            </div>
                            {item.status && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-status-info">{humanize(item.status)}</p>}
                            {item.description && <p className="mt-1 text-[12px] leading-5 text-slate-500">{item.description}</p>}
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
