import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Valores dos parâmetros estratégicos da MX, por código.
 *
 * O cockpit do Dono usava metas de negócio cravadas no código — margem-alvo de
 * 18%, estoque acima de 90 dias com alvo 0, custo fixo 25%. A metodologia tem
 * os próprios números em `parametros_estrategicos_mx` (`STOCK_MARGIN_RATE` vale
 * 0.20, `OVER_90_STOCK_RATE` vale 0.15), e eram duas verdades diferentes para a
 * mesma pergunta.
 *
 * Enquanto carrega — ou se a leitura falhar — devolve `null`: o motor trata a
 * ausência mostrando o indicador sem meta, que é melhor do que mostrar um alvo
 * que ninguém definiu.
 */
export function useStrategicParameterValues(): Record<string, number | null> | null {
  const [values, setValues] = useState<Record<string, number | null> | null>(null)

  useEffect(() => {
    let ativo = true
    supabase
      .from('parametros_estrategicos_mx')
      .select('code, default_value, status')
      .then(({ data, error }) => {
        if (!ativo || error || !data) return
        const mapa: Record<string, number | null> = {}
        for (const row of data) {
          if (row.status && row.status !== 'ativo') continue
          const numero = Number(row.default_value)
          mapa[row.code] = Number.isFinite(numero) ? numero : null
        }
        setValues(mapa)
      })
    return () => { ativo = false }
  }, [])

  return values
}
