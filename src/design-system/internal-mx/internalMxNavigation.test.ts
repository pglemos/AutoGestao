import { describe, expect, test } from 'bun:test'
import { buildInternalMxNavigation } from './internalMxNavigation'

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const

describe('navegação interna MX', () => {
  for (const role of internalRoles) {
    test(`${role} recebe o mesmo mapa visual filtrado por autorização`, () => {
      const sections = buildInternalMxNavigation(role, { unreadNotifications: 7 })
      const items = sections.flatMap((section) => section.items)
      // Três grupos da especificação do módulo Administrador + Simulação.
      expect(sections.map((section) => section.label)).toEqual([
        'Operação MX',
        'Produto',
        'Plataforma',
        'Simulação',
      ])
      expect(items.some((item) => item.path === '/painel')).toBe(true)
      expect(items.some((item) => item.path === '/plano-estrategico')).toBe(true)
      expect(items.some((item) => item.path === '/plano-acao')).toBe(true)
      expect(items.some((item) => item.path === '/consultoria')).toBe(true)
      expect(items.some((item) => item.path === '/clientes')).toBe(true)
      expect(items.some((item) => item.path === '/universidade-mx')).toBe(true)
      expect(items.some((item) => item.path === '/vendas')).toBe(true)
      // Desenvolvimento (/treinamentos) foi removido: canônico é Universidade MX.
      expect(items.some((item) => item.path === '/treinamentos')).toBe(false)
      expect(items.some((item) => item.label === 'Desenvolvimento')).toBe(false)
      expect(items.some((item) => item.path === '/dados')).toBe(true)
      expect(items.some((item) => item.path === '/auditoria')).toBe(true)
      expect(items.find((item) => item.path === '/dados')?.label).toBe('Dados')
      expect(items.find((item) => item.path === '/auditoria')?.label).toBe('Auditoria')
      // Rotas legadas não possuem entrada própria: são aliases de compatibilidade
      // resolvidos no AppShell, nunca itens concorrentes na navegação canônica.
      expect(items.some((item) => item.path === '/indicadores')).toBe(false)
      expect(items.some((item) => item.path === '/planos-acao')).toBe(false)
      expect(items.some((item) => item.path === '/consultoria-mx')).toBe(false)
      expect(items.some((item) => item.path === '/consultoria/clientes')).toBe(false)
      expect(items.some((item) => item.path === '/dados-conciliacao')).toBe(false)
      expect(items.some((item) => item.path === '/seguranca')).toBe(false)
      // /produtos agora é o catálogo de consultoria para o interno MX.
      expect(items.filter((item) => item.path === '/produtos')).toHaveLength(1)
      expect(items.find((item) => item.path === '/produtos')?.label).toBe('Produtos')
      expect(items.find((item) => item.path === '/notificacoes')?.badge).toBe('7')
    })
  }

  test('limita badges acima de 99', () => {
    const items = buildInternalMxNavigation('administrador_geral', { unreadNotifications: 145 })
      .flatMap((section) => section.items)
    expect(items.find((item) => item.path === '/notificacoes')?.badge).toBe('99+')
  })
})
