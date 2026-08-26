import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { overlayCanonicalCatalog } from './canonicalBase44Catalog'

/**
 * Os 41 indicadores do cockpit executivo foram adotados no catálogo da
 * metodologia (migration 20260826160000). Sem esta regra, o overlay canônico
 * forçava `status: 'arquivado'` em tudo que não fosse um dos 45 códigos Base44
 * — um indicador publicado aparecia "fora de operação" na tela do Admin, sem
 * nada explicando por quê.
 */
const base = {
  label: 'X',
  area: 'Comercial',
  formula_expression: null,
  target_calculation_mode: 'MANUAL',
  sort_order: 9000,
}

describe('adoção dos indicadores do cockpit no catálogo', () => {
  test('indicador criado pela MX mantém o próprio status fora dos 45 canônicos', () => {
    const rows = overlayCanonicalCatalog([
      { ...base, metric_key: 'commercial_pipeline_health', status: 'publicado', active: true, created_origin: 'criado_mx' },
    ])
    const adotado = rows.find(row => row.metric_key === 'commercial_pipeline_health')
    expect(adotado?.status).toBe('publicado')
    expect(adotado?.active).not.toBe(false)
  })

  test('legado fora do catálogo continua exibido como arquivado', () => {
    const rows = overlayCanonicalCatalog([
      { ...base, metric_key: 'gross_revenue', status: 'publicado', active: true, created_origin: 'mx_padrao' },
    ])
    const legado = rows.find(row => row.metric_key === 'gross_revenue')
    expect(legado?.status).toBe('arquivado')
    expect(legado?.active).toBe(false)
  })

  test('a migration adota exatamente os 41 e não mexe em pacote de produto', () => {
    const sql = readFileSync('supabase/migrations/20260826160000_adota_indicadores_cockpit_no_catalogo.sql', 'utf8')
    expect((sql.match(/'criado_mx'/g) || []).length).toBe(41)
    expect(sql).toContain('ON CONFLICT (metric_key) DO NOTHING')
    // Planos já publicados não podem ganhar indicador retroativamente.
    expect(sql).not.toContain('pacotes_indicadores_itens')
    expect(sql).not.toContain('ciclos_plano_estrategico')
  })
})
