import { describe, expect, it } from 'bun:test'
import { resolveManagerLegacyPath } from './managerLegacyPaths'

describe('resolveManagerLegacyPath', () => {
  it('mantém vivos os links antigos /gerente/* apontando para a rota canônica', () => {
    expect(resolveManagerLegacyPath('/gerente/minha-equipe')).toBe('/minha-equipe')
    expect(resolveManagerLegacyPath('/gerente/rotina-equipe')).toBe('/rotina-equipe')
    expect(resolveManagerLegacyPath('/gerente/meta-loja')).toBe('/meta-loja')
    expect(resolveManagerLegacyPath('/gerente/mentor')).toBe('/mentor')
    expect(resolveManagerLegacyPath('/gerente/feedbacks-pdis')).toBe('/feedbacks-pdis')
    expect(resolveManagerLegacyPath('/gerente/ranking')).toBe('/ranking')
    expect(resolveManagerLegacyPath('/gerente/universidade-mx')).toBe('/universidade-mx')
    expect(resolveManagerLegacyPath('/gerente/fechamento-diario')).toBe('/fechamento-diario')
  })

  it('trata o prefixo nu como a área do gerente', () => {
    expect(resolveManagerLegacyPath('/gerente')).toBe('/home')
    expect(resolveManagerLegacyPath('/gerente/')).toBe('/home')
  })

  it('cai para /home quando o destino legado não tem rota canônica', () => {
    expect(resolveManagerLegacyPath('/gerente/vendas')).toBe('/home')
    expect(resolveManagerLegacyPath('/gerente/rota-que-nunca-existiu')).toBe('/home')
  })
})
