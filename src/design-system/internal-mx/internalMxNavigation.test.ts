import { describe, expect, test } from 'bun:test'
import { buildInternalMxNavigation } from './internalMxNavigation'

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const

describe('navegação interna MX', () => {
  for (const role of internalRoles) {
    test(`${role} recebe o mesmo mapa visual filtrado por autorização`, () => {
      const sections = buildInternalMxNavigation(role, { unreadNotifications: 7 })
      const items = sections.flatMap((section) => section.items)
      expect(sections.map((section) => section.label)).toEqual([
        'Rede e Gestão',
        'Simulação',
        'Rotina e Conteúdo',
        'Relatórios e Diagnóstico',
        'Configurações',
      ])
      expect(items.some((item) => item.path === '/painel')).toBe(true)
      expect(items.some((item) => item.path === '/plano-estrategico')).toBe(true)
      expect(items.some((item) => item.path === '/plano-acao')).toBe(true)
      expect(items.some((item) => item.path === '/consultoria/clientes')).toBe(true)
      expect(items.find((item) => item.path === '/notificacoes')?.badge).toBe('7')
    })
  }

  test('limita badges acima de 99', () => {
    const items = buildInternalMxNavigation('administrador_geral', { unreadNotifications: 145 })
      .flatMap((section) => section.items)
    expect(items.find((item) => item.path === '/notificacoes')?.badge).toBe('99+')
  })
})
