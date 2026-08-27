import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/supabasePagination'

/**
 * Quadro de colaboradores da unidade, para o indicador homônimo do catálogo.
 *
 * Conta os vínculos ativos em `vinculos_loja` cujo usuário também está ativo.
 * É o quadro **com acesso ao sistema** — quem trabalha na loja mas não tem
 * login não aparece aqui. Para a leitura do cockpit isso é o mais próximo do
 * real que a base oferece; se a MX passar a cadastrar o quadro completo em
 * outro lugar, a fonte deve mudar para lá.
 */
export function useStoreHeadcount(storeId: string | null): number | null {
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    if (!storeId) {
      setTotal(null)
      return
    }
    let ativo = true

    void (async () => {
      const vinculos = await fetchAllRows<{ user_id: string }>((from, to) =>
        supabase
          .from('vinculos_loja')
          .select('user_id')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .range(from, to),
      )
      if (!ativo || vinculos.error) return

      const ids = [...new Set(vinculos.rows.map(row => row.user_id))]
      if (ids.length === 0) {
        setTotal(0)
        return
      }

      const usuarios = await fetchAllRows<{ id: string; active: boolean | null }>((from, to) =>
        supabase.from('usuarios').select('id, active').in('id', ids).range(from, to),
      )
      if (!ativo || usuarios.error) return

      setTotal(usuarios.rows.filter(row => row.active !== false).length)
    })()

    return () => { ativo = false }
  }, [storeId])

  return total
}
