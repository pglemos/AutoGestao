import { describe, expect, it } from 'bun:test'
import {
  buildCentralDeepLink,
  CANONICAL_CARTEIRA_ROUTE,
  CARTEIRA_ROUTE_ALIASES,
  isSupportedCarteiraRoute,
  normalizeCentralDeepLink,
  parseCentralDeepLink,
} from './centralDeepLink'

describe('TASK 32 / C09 — Deep Link Central -> Carteira de Clientes', () => {
  describe('buildCentralDeepLink', () => {
    it('deve gerar o link canônico com clientId e opportunityId obrigatoriamente', () => {
      const link = buildCentralDeepLink({
        clientId: 'cli-123',
        opportunityId: 'opp-456',
      })

      expect(link).toBe('/carteira-clientes?clientId=cli-123&opportunityId=opp-456')
    })

    it('deve aceitar assinatura posicional (clientId, opportunityId)', () => {
      const link = buildCentralDeepLink('cli-789', 'opp-999')
      expect(link).toBe('/carteira-clientes?clientId=cli-789&opportunityId=opp-999')
    })

    it('deve incluir o parâmetro de aba (tab) quando especificado', () => {
      const link = buildCentralDeepLink({
        clientId: 'cli-100',
        opportunityId: 'opp-200',
        tab: 'historico',
      })

      expect(link).toBe('/carteira-clientes?clientId=cli-100&opportunityId=opp-200&tab=historico')
    })

    it('deve aceitar baseRoute informada preservando a rota desejada', () => {
      const link = buildCentralDeepLink({
        clientId: 'cli-100',
        opportunityId: 'opp-200',
        baseRoute: '/vendedor/carteira',
      })

      expect(link).toBe('/vendedor/carteira?clientId=cli-100&opportunityId=opp-200')
    })

    it('deve lançar erro se clientId for ausente ou vazio', () => {
      expect(() => buildCentralDeepLink('', 'opp-123')).toThrow(
        'buildCentralDeepLink exige clientId e opportunityId válidos.'
      )
      expect(() => buildCentralDeepLink('   ', 'opp-123')).toThrow(
        'buildCentralDeepLink exige clientId e opportunityId válidos.'
      )
    })

    it('deve lançar erro se opportunityId for ausente ou vazio', () => {
      expect(() => buildCentralDeepLink('cli-123', '')).toThrow(
        'buildCentralDeepLink exige clientId e opportunityId válidos.'
      )
      expect(() => buildCentralDeepLink('cli-123', '   ')).toThrow(
        'buildCentralDeepLink exige clientId e opportunityId válidos.'
      )
    })
  })

  describe('parseCentralDeepLink', () => {
    it('deve fazer o parse correto do link canônico (round-trip)', () => {
      const link = buildCentralDeepLink({
        clientId: 'cli-abc',
        opportunityId: 'opp-xyz',
        tab: 'resumo',
      })

      const result = parseCentralDeepLink(link)

      expect(result.success).toBe(true)
      expect(result.route).toBe(CANONICAL_CARTEIRA_ROUTE)
      expect(result.clientId).toBe('cli-abc')
      expect(result.opportunityId).toBe('opp-xyz')
      expect(result.tab).toBe('resumo')
      expect(result.isCanonical).toBe(true)
      expect(result.isValidRoute).toBe(true)
      expect(result.error).toBeNull()
    })

    it('deve reconhecer e preservar todos os aliases sem quebrar', () => {
      for (const alias of CARTEIRA_ROUTE_ALIASES) {
        const link = `${alias}?clientId=cli-alias&opportunityId=opp-alias`
        const result = parseCentralDeepLink(link)

        expect(result.success).toBe(true)
        expect(result.clientId).toBe('cli-alias')
        expect(result.opportunityId).toBe('opp-alias')
        expect(result.isValidRoute).toBe(true)
        if (alias === CANONICAL_CARTEIRA_ROUTE) {
          expect(result.isCanonical).toBe(true)
        } else {
          expect(result.isCanonical).toBe(false)
        }
      }
    })

    it('deve suportar URLs absolutas completas no parse', () => {
      const fullUrl = 'https://app.mxgestao.com.br/vendedor/mentor-comercial?clientId=cli-full&opportunityId=opp-full'
      const result = parseCentralDeepLink(fullUrl)

      expect(result.success).toBe(true)
      expect(result.route).toBe('/vendedor/mentor-comercial')
      expect(result.clientId).toBe('cli-full')
      expect(result.opportunityId).toBe('opp-full')
      expect(result.isValidRoute).toBe(true)
    })

    it('deve dar suporte a chaves alternativas de query params (ex: cliente_id, oportunidade_id)', () => {
      const altLink = '/carteira-clientes?cliente_id=cli-snake&oportunidade_id=opp-snake'
      const result = parseCentralDeepLink(altLink)

      expect(result.success).toBe(true)
      expect(result.clientId).toBe('cli-snake')
      expect(result.opportunityId).toBe('opp-snake')
    })

    it('deve tratar explicitamente quando clientId está ausente', () => {
      const link = '/carteira-clientes?opportunityId=opp-only'
      const result = parseCentralDeepLink(link)

      expect(result.success).toBe(false)
      expect(result.clientId).toBeNull()
      expect(result.opportunityId).toBe('opp-only')
      expect(result.error).toContain('clientId não foi informado')
    })

    it('deve tratar explicitamente quando opportunityId está ausente', () => {
      const link = '/carteira-clientes?clientId=cli-only'
      const result = parseCentralDeepLink(link)

      expect(result.success).toBe(false)
      expect(result.clientId).toBe('cli-only')
      expect(result.opportunityId).toBeNull()
      expect(result.error).toContain('opportunityId não foi informado')
    })

    it('deve tratar explicitamente quando ambos os IDs estão ausentes', () => {
      const link = '/carteira-clientes'
      const result = parseCentralDeepLink(link)

      expect(result.success).toBe(false)
      expect(result.clientId).toBeNull()
      expect(result.opportunityId).toBeNull()
      expect(result.error).toContain('clientId e opportunityId não foram informados')
    })

    it('deve rejeitar rotas não suportadas', () => {
      const link = '/rota-desconhecida?clientId=cli-1&opportunityId=opp-1'
      const result = parseCentralDeepLink(link)

      expect(result.success).toBe(false)
      expect(result.isValidRoute).toBe(false)
      expect(result.error).toContain('não é uma rota válida')
    })
  })

  describe('normalizeCentralDeepLink e isSupportedCarteiraRoute', () => {
    it('isSupportedCarteiraRoute deve retornar true para rotas válidas', () => {
      expect(isSupportedCarteiraRoute('/carteira-clientes')).toBe(true)
      expect(isSupportedCarteiraRoute('/carteira')).toBe(true)
      expect(isSupportedCarteiraRoute('/vendedor/carteira')).toBe(true)
      expect(isSupportedCarteiraRoute('/mentor-comercial')).toBe(true)
      expect(isSupportedCarteiraRoute('/vendedor/mentor-comercial')).toBe(true)
      expect(isSupportedCarteiraRoute('/outra-rota')).toBe(false)
    })

    it('normalizeCentralDeepLink deve converter link de alias para rota canônica', () => {
      const aliasLink = '/vendedor/carteira?clientId=cli-norm&opportunityId=opp-norm&source=central'
      const normalized = normalizeCentralDeepLink(aliasLink)

      expect(normalized).toBe('/carteira-clientes?clientId=cli-norm&opportunityId=opp-norm&source=central')
    })
  })
})
