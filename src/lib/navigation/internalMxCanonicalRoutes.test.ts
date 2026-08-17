import { describe, expect, test } from 'bun:test'
import { resolveInternalMxCanonicalRoute } from './internalMxCanonicalRoutes'

describe('resolveInternalMxCanonicalRoute', () => {
  test('unifies duplicated Admin/Consultor MX entry routes', () => {
    expect(resolveInternalMxCanonicalRoute('/team')).toBe('/equipe')
    expect(resolveInternalMxCanonicalRoute('/lojas')).toBe('/clientes?mode=lojas')
    expect(resolveInternalMxCanonicalRoute('/consultoria-mx')).toBe('/consultoria?mode=metodologia')
    expect(resolveInternalMxCanonicalRoute('/consultoria/clientes')).toBe('/consultoria?mode=clientes')
    expect(resolveInternalMxCanonicalRoute('/indicadores')).toBe('/plano-estrategico?mode=catalogo')
    expect(resolveInternalMxCanonicalRoute('/planos-acao')).toBe('/plano-acao?mode=biblioteca')
  })

  test('preserves useful query context while canonical mode wins', () => {
    expect(resolveInternalMxCanonicalRoute('/indicadores', '?storeId=abc&mode=legacy'))
      .toBe('/plano-estrategico?storeId=abc&mode=catalogo')
  })

  test('does not collapse legitimate deep routes', () => {
    expect(resolveInternalMxCanonicalRoute('/lojas/minha-loja')).toBeNull()
    expect(resolveInternalMxCanonicalRoute('/lojas/minha-loja/equipe')).toBeNull()
    expect(resolveInternalMxCanonicalRoute('/consultoria/clientes/acme')).toBeNull()
    expect(resolveInternalMxCanonicalRoute('/consultoria/clientes/acme/visitas/2')).toBeNull()
  })
})
