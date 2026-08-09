import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from '@/lib/toast'
import type { Store } from '@/types/database'
import { ManagerHomeReturnLink } from '@/features/manager/home/ManagerHomeReturnLink'
import { CancelarVendaModal } from '@/features/crm/components/CancelarVendaModal'
import { useVendasLoja, type VendaLoja } from './hooks/useVendasLoja'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format
const formatData = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'

function StatusBadge({ venda }: { venda: VendaLoja }) {
  if (venda.etapa === 'cancelada') {
    return (
      <span title={venda.motivo_cancelamento || undefined} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-caption font-semibold text-slate-500">
        Cancelada
      </span>
    )
  }
  return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-caption font-semibold text-green-700">Vendida</span>
}

export function VendasFechadasLoja({
  storeId,
  showManagerHeader = false,
  selectableStores = [],
  onStoreChange,
}: {
  storeId: string | null
  showManagerHeader?: boolean
  selectableStores?: Store[]
  onStoreChange?: (storeId: string) => void
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
    const { error: cancelError } = await cancelarVenda(cancelarVendaAlvo.id, motivo)
    setSaving(false)
    if (cancelError) {
      toast.error(cancelError)
      return
    }
    toast.success('Venda cancelada.')
    setCancelarVendaAlvo(null)
  }

  return (
    <div className="space-y-4">
      {showManagerHeader && (
        <>
          <ManagerHomeReturnLink />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Vendas da loja</h1>
              <p className="mt-0.5 text-sm text-gray-500">Vendas fechadas por toda a equipe, com opção de cancelamento.</p>
            </div>
            {selectableStores.length > 1 && onStoreChange && (
              <div>
                <label className="mb-1 block text-xs text-gray-500" htmlFor="vendas-loja-store">Unidade</label>
                <select
                  id="vendas-loja-store"
                  aria-label="Unidade das vendas"
                  value={storeId || ''}
                  onChange={event => onStoreChange(event.target.value)}
                  className="block min-w-[160px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  {selectableStores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </>
      )}

      <div className="relative w-full max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar por cliente, vendedor ou veículo..."
          aria-label="Buscar venda"
          className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-mx-action"
        />
      </div>

      {error && <p className="text-sm text-status-error">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Cliente', 'Vendedor', 'Veículo', 'Valor', 'Fechamento', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(venda => (
                <tr key={venda.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-body-sm font-semibold text-slate-800">{venda.cliente_nome}</td>
                  <td className="px-4 py-3 text-body-sm text-slate-600">{venda.seller_nome}</td>
                  <td className="px-4 py-3 text-body-sm text-slate-500">{venda.veiculo_interesse || '—'}</td>
                  <td className="px-4 py-3 text-body-sm font-bold text-slate-800">{BRL(venda.valor_negociado)}</td>
                  <td className="px-4 py-3 text-body-sm text-slate-500">{formatData(venda.closed_at)}</td>
                  <td className="px-4 py-3"><StatusBadge venda={venda} /></td>
                  <td className="px-4 py-3">
                    {venda.etapa === 'ganho' && (
                      <button
                        type="button"
                        onClick={() => setCancelarVendaAlvo(venda)}
                        className="text-[12px] font-semibold text-status-error hover:underline"
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
            <div className="py-12 text-center text-body-sm text-slate-400">
              {vendas.length === 0 ? 'Nenhuma venda fechada encontrada para esta unidade.' : 'Nenhuma venda encontrada para esta busca.'}
            </div>
          )}
          {loading && <div className="py-12 text-center text-body-sm text-slate-400">Carregando vendas...</div>}
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
