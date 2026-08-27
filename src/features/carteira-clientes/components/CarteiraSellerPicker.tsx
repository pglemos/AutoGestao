import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/supabasePagination'
import {
  readCarteiraSellerFilter,
  writeCarteiraSellerFilter,
} from '../lib/carteiraSellerFilter'

type Vendedor = { id: string; nome: string }

/**
 * Seletor de vendedor da carteira, para quem enxerga a loja inteira.
 *
 * Fica no wrapper MX, fora da referência Base44 — a tela importada continua
 * intocada e o recorte chega ao adapter pelo `sessionStorage`.
 */
export function CarteiraSellerPicker({ storeId }: { storeId: string | null }) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [selecionado, setSelecionado] = useState<string>(() => readCarteiraSellerFilter() ?? '')

  useEffect(() => {
    if (!storeId) {
      setVendedores([])
      return
    }
    let ativo = true

    void (async () => {
      const vinculos = await fetchAllRows<{ user_id: string }>((from, to) =>
        supabase
          .from('vinculos_loja')
          .select('user_id')
          .eq('store_id', storeId)
          .eq('role', 'vendedor')
          .eq('is_active', true)
          .range(from, to),
      )
      if (!ativo || vinculos.error) return

      const ids = [...new Set(vinculos.rows.map(row => row.user_id))]
      if (ids.length === 0) {
        setVendedores([])
        return
      }

      const usuarios = await fetchAllRows<{ id: string; name: string | null; active: boolean | null }>(
        (from, to) => supabase.from('usuarios').select('id, name, active').in('id', ids).range(from, to),
      )
      if (!ativo || usuarios.error) return

      setVendedores(
        usuarios.rows
          .filter(row => row.active !== false)
          .map(row => ({ id: row.id, nome: row.name || 'Sem nome' }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      )
    })()

    return () => { ativo = false }
  }, [storeId])

  // Sai da tela sem deixar o recorte preso: quem volta à carteira depois
  // encontra a loja inteira, não o último vendedor que olhou.
  useEffect(() => () => writeCarteiraSellerFilter(null), [])

  if (vendedores.length === 0) return null

  const aplicar = (valor: string) => {
    setSelecionado(valor)
    writeCarteiraSellerFilter(valor || null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--mx-card-radius)] border border-border-subtle bg-surface-default px-4 py-3">
      <Users size={16} className="text-muted-foreground" aria-hidden="true" />
      <label htmlFor="carteira-vendedor" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Carteira de
      </label>
      <select
        id="carteira-vendedor"
        value={selecionado}
        onChange={event => aplicar(event.target.value)}
        className="min-w-[200px] rounded-lg border border-border-subtle bg-transparent px-3 py-1.5 text-sm text-foreground outline-none focus-visible:border-primary"
      >
        <option value="">Toda a loja</option>
        {vendedores.map(vendedor => (
          <option key={vendedor.id} value={vendedor.id}>{vendedor.nome}</option>
        ))}
      </select>
      {selecionado ? (
        <span className="text-xs text-muted-foreground">
          Mostrando apenas os clientes deste vendedor.
        </span>
      ) : null}
    </div>
  )
}
