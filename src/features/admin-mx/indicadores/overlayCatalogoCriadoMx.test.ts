import { describe, expect, test } from 'bun:test'
import { overlayCanonicalCatalog } from './canonicalBase44Catalog'

/**
 * O catálogo da metodologia é exatamente os 45 indicadores do Base44
 * (migration 20260826180000 removeu tudo o que não pertencia a esse conjunto).
 *
 * A regra de exibição abaixo continua valendo para o que a MX vier a criar pela
 * própria tela ("Criar Indicador" grava `created_origin = 'criado_mx'`): sem
 * ela, o overlay canônico forçava `status: 'arquivado'` em tudo fora dos 45, e
 * um indicador recém-criado nascia aparecendo como fora de operação.
 */
const base = {
  label: 'X',
  area: 'Comercial',
  formula_expression: null,
  target_calculation_mode: 'MANUAL',
  sort_order: 9000,
}

describe('overlay canônico e indicadores criados pela MX', () => {
  test('indicador criado pela MX mantém o próprio status fora dos 45 canônicos', () => {
    const rows = overlayCanonicalCatalog([
      { ...base, metric_key: 'indicador_novo_mx', status: 'publicado', active: true, created_origin: 'criado_mx' },
    ])
    const criado = rows.find(row => row.metric_key === 'indicador_novo_mx')
    expect(criado?.status).toBe('publicado')
    expect(criado?.active).not.toBe(false)
  })

  test('legado fora do conjunto Base44 continua exibido como arquivado', () => {
    const rows = overlayCanonicalCatalog([
      { ...base, metric_key: 'gross_revenue', status: 'publicado', active: true, created_origin: 'mx_padrao' },
    ])
    const legado = rows.find(row => row.metric_key === 'gross_revenue')
    expect(legado?.status).toBe('arquivado')
    expect(legado?.active).toBe(false)
  })

  test('o overlay entrega os 46 canônicos quando o catálogo só tem eles', () => {
    const rows = overlayCanonicalCatalog([])
    expect(rows).toHaveLength(46)
  })
})
