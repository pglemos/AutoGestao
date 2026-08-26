import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from '@/lib/toast'
import type { Store } from '@/types/database'
import { ManagerHomeReturnLink } from '@/features/manager/home/ManagerHomeReturnLink'
import { CancelarVendaModal } from '@/features/crm/components/CancelarVendaModal'
import { useVendasLoja, type VendaLoja } from './hooks/useVendasLoja'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format
const formatData = (iso: string | null) => iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'

function StatusBadge({ venda }: { venda: VendaLoja }) {
  if (venda.etapa === 'cancelada') {
    return (
      <span title={venda.motivo_cancelamento || undefined} className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-caption font-semibold text-muted-foreground">
        Cancelada
      </span>
    )
  }
  return <span className="inline-flex items-center rounded-full bg-brand-primary-subtle px-2.5 py-1 text-caption font-semibold text-brand-primary-hover">Vendida</span>
}

export function VendasFechadasLoja({
  storeId,
  showManagerHeader = false,
  selectableStores = [],
  onStoreChange,
  onVendaCancelada,
}: {
  storeId: string | null
  showManagerHeader?: boolean
  selectableStores?: Store[]
  onStoreChange?: (storeId: string) => void
  onVendaCancelada?: () => void
}) {
  const { vendas, loading, error, cancelarVenda } = useVendasLoja(storeId)
  const [search, setSearch] = useState('')
  const [cancelarVendaAlvo, setCancelarVendaAlvo] = useState<VendaLoja | null>(null)
  const [saving, setSaving] = useState(false)

  const filtradas = useMemo(() => {
    const termo = search.trim().toLocaleLowerCase('pt-BR')
    if (!termo) return vendas
    return vendas.filter(venda =>
      venda.cliente_nome.toLocaleLowerCase('pt-BR').includes(termo)
      || venda.seller_nome.toLocaleLowerCase('pt-BR').includes(termo)
      || (venda.veiculo_interesse || '').toLocaleLowerCase('pt-BR').includes(termo),
    )
  }, [search, vendas])

  async function handleConfirmarCancelamento(motivo: string) {
    if (!cancelarVendaAlvo) return
    setSaving(true)
    const { error: cancelError } = await cancelarVenda({
      oportunidadeId: cancelarVendaAlvo.oportunidade_id,
      eventoId: cancelarVendaAlvo.oportunidade_id ? null : cancelarVendaAlvo.event_id,
    }, motivo)
    setSaving(false)
    if (cancelError) {
      toast.error(cancelError)
      return
    }
    toast.success('Venda cancelada.')
    setCancelarVendaAlvo(null)
    if (onVendaCancelada) onVendaCancelada()
  }

  return (
    <div className="space-y-4">
      {showManagerHeader && (
        <>
          <ManagerHomeReturnLink />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Vendas da loja</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Todas as vendas oficiais da unidade, com opção de cancelamento.</p>
            </div>
            {selectableStores.length > 1 && onStoreChange && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="vendas-loja-store">Unidade</label>
                <select
                  id="vendas-loja-store"
                  aria-label="Unidade das vendas"
                  value={storeId || ''}
                  onChange={event => onStoreChange(event.target.value)}
                  className="block min-w-[160px] rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground"
                >
                  {selectableStores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </>
      )}

      <div className="relative w-full max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar por cliente, vendedor ou veículo..."
          aria-label="Buscar venda"
          className="h-9 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-mx-action"
        />
      </div>

      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        {loading
          ? 'Consultando vendas oficiais...'
          : `${vendas.length} venda${vendas.length === 1 ? '' : 's'} encontrada${vendas.length === 1 ? '' : 's'} em todas as datas.`}
      </p>

      {error && <p className="text-sm text-status-error-text">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-alt">
                {['Cliente', 'Vendedor', 'Veículo', 'Valor', 'Competência', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(venda => (
                <tr key={venda.id} className="border-b border-border-subtle hover:bg-surface-alt/50">
                  <td className="px-4 py-3 text-body-sm font-semibold text-foreground">{venda.cliente_nome}</td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{venda.seller_nome}</td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{venda.veiculo_interesse || '—'}</td>
                  <td className="px-4 py-3 text-body-sm font-bold text-foreground">{BRL(venda.valor_negociado)}</td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{formatData(venda.competencia)}</td>
                  <td className="px-4 py-3"><StatusBadge venda={venda} /></td>
                  <td className="px-4 py-3">
                    {venda.etapa === 'ganho' && (
                      <button
                        type="button"
                        onClick={() => setCancelarVendaAlvo(venda)}
                        aria-label={`Cancelar venda de ${venda.cliente_nome}`}
                        className="text-[12px] font-semibold text-status-error-text hover:underline"
                      >
                        Cancelar venda
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtradas.length === 0 && (
            <div className="py-12 text-center text-body-sm text-muted-foreground">
              {vendas.length === 0 ? 'Nenhuma venda fechada encontrada para esta unidade.' : 'Nenhuma venda encontrada para esta busca.'}
            </div>
          )}
          {loading && <div className="py-12 text-center text-body-sm text-muted-foreground">Carregando vendas...</div>}
        </div>
      </div>

      <CancelarVendaModal
        open={!!cancelarVendaAlvo}
        saving={saving}
        resumo={cancelarVendaAlvo ? {
          cliente: cancelarVendaAlvo.cliente_nome,
          veiculo: cancelarVendaAlvo.veiculo_interesse,
          valor: cancelarVendaAlvo.valor_negociado,
        } : null}
        onConfirm={handleConfirmarCancelamento}
        onClose={() => setCancelarVendaAlvo(null)}
      />
    </div>
  )
}

export default VendasFechadasLoja
