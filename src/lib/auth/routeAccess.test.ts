import { describe, expect, it } from 'bun:test'
import { canAccessPath, getRouteAccessRule } from './routeAccess'

describe('route access matrix', () => {
  it('mantém as telas executivas do Dono na raiz, fechadas para os demais perfis', () => {
    // O módulo deixou de ter prefixo /dono: cada URL é resolvida pelo perfil.
    for (const route of ['/decisoes', '/departamentos', '/departamentos/financeiro?period=month', '/mercado']) {
      expect(canAccessPath(route, 'dono')).toBe(true)
      expect(canAccessPath(route, 'gerente')).toBe(false)
      expect(canAccessPath(route, 'vendedor')).toBe(false)
      expect(canAccessPath(route, 'administrador_mx')).toBe(false)
      expect(canAccessPath(route, 'administrador_geral')).toBe(false)
      expect(canAccessPath(route, 'consultor_mx')).toBe(false)
    }
    // rotas compartilhadas continuam abertas ao Dono
    expect(canAccessPath('/plano-acao', 'dono')).toBe(true)
    expect(canAccessPath('/plano-estrategico', 'dono')).toBe(true)
    expect(canAccessPath('/consultoria', 'dono')).toBe(true)
  })

  it('autoriza somente o Dono a usar os atalhos que redirecionam para as rotas raiz', () => {
    for (const route of ['/dono', '/dono/rotina', '/dono/departamentos/financeiro']) {
      expect(canAccessPath(route, 'dono')).toBe(true)
      expect(canAccessPath(route, 'gerente')).toBe(false)
      expect(canAccessPath(route, 'vendedor')).toBe(false)
      expect(canAccessPath(route, 'administrador_mx')).toBe(false)
      expect(canAccessPath(route, 'administrador_geral')).toBe(false)
      expect(canAccessPath(route, 'consultor_mx')).toBe(false)
    }
  })

  it('keeps admin-only modules closed to store roles', () => {
    for (const route of ['/painel', '/agenda', '/consultoria/clientes', '/dados', '/auditoria', '/seguranca']) {
      expect(canAccessPath(route, 'administrador_geral')).toBe(true)
      expect(canAccessPath(route, 'vendedor')).toBe(false)
      expect(canAccessPath(route, 'gerente')).toBe(false)
      expect(canAccessPath(route, 'dono')).toBe(false)
    }
  })

  it('authorizes client-scoped planning aliases only for internal MX profiles', () => {
    for (const route of ['/clientes/acme/plano-estrategico?clientId=c1', '/clientes/acme/plano-acao?clientId=c1']) {
      for (const role of ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const) {
        expect(canAccessPath(route, role)).toBe(true)
      }
      for (const role of ['dono', 'gerente', 'vendedor'] as const) {
        expect(canAccessPath(route, role)).toBe(false)
      }
    }
  })

  it('keeps simulation routes restricted to internal MX profiles', () => {
    for (const role of ['administrador_mx', 'consultor_mx', 'administrador_geral'] as const) {
      expect(canAccessPath('/simulacao/vendedor', role)).toBe(true)
      expect(canAccessPath('/simulacao/gerente', role)).toBe(true)
      expect(canAccessPath('/simulacao/dono', role)).toBe(true)
    }
    for (const role of ['vendedor', 'gerente', 'dono'] as const) {
      expect(canAccessPath('/simulacao/vendedor', role)).toBe(false)
      expect(canAccessPath('/simulacao/gerente', role)).toBe(false)
      expect(canAccessPath('/simulacao/dono', role)).toBe(false)
    }
  })

  it('allows gerente to access a scoped store dashboard but not the store index', () => {
    expect(canAccessPath('/lojas/acertt', 'gerente')).toBe(true)
    expect(canAccessPath('/lojas/acertt?tab=equipe', 'gerente')).toBe(true)
    expect(canAccessPath('/lojas/acertt/consultor-ia', 'gerente')).toBe(true)
    expect(canAccessPath('/lojas', 'gerente')).toBe(false)
  })

  it('allows scoped store subroutes to managers, store owners and internal MX profiles', () => {
    for (const role of ['gerente', 'dono', 'administrador_geral', 'administrador_mx', 'consultor_mx'] as const) {
      expect(canAccessPath('/lojas/mx-consultoria/equipe', role)).toBe(true)
    }
    expect(canAccessPath('/lojas/mx-consultoria/equipe', 'vendedor')).toBe(false)
    expect(canAccessPath('/lojas/mx-consultoria/consultor-ia', 'vendedor')).toBe(true)
  })

  it('removes legacy owner workspace routes instead of redirecting them', () => {
    for (const route of [
      '/lojas/mx-consultoria/plano-acao',
      '/lojas/mx-consultoria/departamentos/comercial',
      '/lojas/mx-consultoria/mercado',
      '/lojas/mx-consultoria/universidade',
    ]) {
      expect(canAccessPath(route, 'dono')).toBe(false)
      expect(canAccessPath(route, 'gerente')).toBe(false)
      expect(canAccessPath(route, 'administrador_mx')).toBe(false)
    }
    expect(canAccessPath('/lojas/mx-consultoria/equipe', 'gerente')).toBe(true)
    expect(canAccessPath('/lojas/mx-consultoria/equipe', 'administrador_mx')).toBe(true)
  })

  it('protects every canonical manager route from sellers', () => {
    // Rotas exclusivas da gestão: o vendedor cai em ForbiddenRoute.
    const managerOnly = [
      '/rotina-equipe',
      '/minha-equipe',
      '/meta-loja',
      '/mentor',
      '/feedbacks-pdis',
    ]
    for (const route of managerOnly) {
      expect(canAccessPath(route, 'gerente')).toBe(true)
      // O dono acumula a gestão comercial (ou acompanha), então enxerga todas as
      // rotas gerenciais canônicas — inclusive a rotina da equipe.
      expect(canAccessPath(route, 'dono')).toBe(true)
      expect(canAccessPath(route, 'administrador_mx')).toBe(true)
      expect(canAccessPath(route, 'vendedor')).toBe(false)
    }

    // Ranking e Universidade MX são rotas compartilhadas: o gerente perdeu o
    // prefixo `/gerente/` e passou a dividi-las com o vendedor, que vê a
    // própria versão da tela pelo RoleSwitch.
    for (const route of ['/ranking', '/universidade-mx']) {
      for (const role of ['gerente', 'dono', 'administrador_mx', 'vendedor'] as const) {
        expect(canAccessPath(route, role)).toBe(true)
      }
    }
  })

  it('allows leaders to manage remuneration while keeping sellers out', () => {
    expect(canAccessPath('/configuracoes/remuneracao', 'administrador_mx')).toBe(true)
    expect(canAccessPath('/configuracoes/remuneracao', 'dono')).toBe(true)
    expect(canAccessPath('/configuracoes/remuneracao', 'gerente')).toBe(true)
    expect(canAccessPath('/configuracoes/remuneracao', 'vendedor')).toBe(false)
    expect(getRouteAccessRule('/remuneracao')).toBeNull()
  })

  it('keeps the personal remuneration detail exclusive to sellers', () => {
    expect(canAccessPath('/minha-remuneracao', 'vendedor')).toBe(true)
    expect(canAccessPath('/minha-remuneracao', 'gerente')).toBe(false)
    expect(canAccessPath('/minha-remuneracao', 'dono')).toBe(false)
    expect(canAccessPath('/minha-remuneracao', 'administrador_mx')).toBe(false)
    expect(canAccessPath('/configuracoes/remuneracao', 'vendedor')).toBe(false)
  })

  it('keeps daily launch restricted to the vendedor operating flow while allowing /home as role entrypoint', () => {
    expect(canAccessPath('/home', 'vendedor')).toBe(true)
    expect(canAccessPath('/home', 'administrador_geral')).toBe(false)
    expect(canAccessPath('/home', 'gerente')).toBe(true)
    expect(canAccessPath('/home', 'dono')).toBe(true)
    expect(canAccessPath('/lojas/acertt/consultor-ia', 'vendedor')).toBe(true)
    expect(canAccessPath('/lojas/acertt/consultor-ia', 'dono')).toBe(true)
    expect(canAccessPath('/lojas/acertt/consultor-ia', 'administrador_mx')).toBe(true)
    expect(canAccessPath('/lancamento-diario', 'vendedor')).toBe(true)
    expect(canAccessPath('/lancamento-diario', 'gerente')).toBe(false)
    expect(canAccessPath('/lancamento-diario', 'dono')).toBe(false)
    expect(canAccessPath('/lancamento-diario', 'administrador_mx')).toBe(false)
    for (const role of ['vendedor', 'gerente', 'dono', 'administrador_mx', 'consultor_mx', 'administrador_geral'] as const) {
      expect(canAccessPath('/fechamento-diario', role)).toBe(true)
    }
    expect(canAccessPath('/relatorio-matinal', 'vendedor')).toBe(false)
    expect(canAccessPath('/relatorios/performance-vendedor?id=abc', 'vendedor')).toBe(false)
  })

  it('denies unknown authenticated routes by default', () => {
    expect(getRouteAccessRule('/rota-inexistente')).toBeNull()
    expect(canAccessPath('/rota-inexistente', 'vendedor')).toBe(false)
  })

  it('gates privileged configurations and PDI print by capability-level role groups', () => {
    expect(canAccessPath('/configuracoes', 'administrador_mx')).toBe(true)
    expect(canAccessPath('/configuracoes', 'dono')).toBe(true)
    expect(canAccessPath('/configuracoes', 'gerente')).toBe(true)
    expect(canAccessPath('/configuracoes', 'vendedor')).toBe(true)
    expect(canAccessPath('/settings', 'dono')).toBe(true)
    expect(canAccessPath('/settings', 'vendedor')).toBe(false)
    expect(canAccessPath('/produtos', 'gerente')).toBe(true)
    // vendedor vê o catálogo de produtos digitais (read-only, RoleSwitch em
    // App.tsx já montava <ProdutosDigitais /> pro papel) — a allowlist é que
    // esquecia o papel; ver capabilities.ts PRODUCT_ROLES (2026-08-21).
    expect(canAccessPath('/produtos', 'vendedor')).toBe(true)
    expect(canAccessPath('/pdi/abc/print', 'gerente')).toBe(true)
    expect(canAccessPath('/pdi/abc/print', 'vendedor')).toBe(false)
  })

  it('keeps the legacy team alias governed by the team management capability', () => {
    expect(canAccessPath('/team', 'administrador_mx')).toBe(true)
    expect(canAccessPath('/team', 'dono')).toBe(true)
    expect(canAccessPath('/equipe', 'dono')).toBe(true)
    expect(canAccessPath('/team', 'vendedor')).toBe(false)
    expect(canAccessPath('/team', 'gerente')).toBe(true)
    expect(canAccessPath('/team', 'vendedor')).toBe(false)
  })

  it('stores capability metadata on sensitive route rules', () => {
    expect(getRouteAccessRule('/simulacao/vendedor')?.capability).toBe('simulate_role')
    expect(getRouteAccessRule('/produtos')?.capability).toBe('view_products')
    expect(getRouteAccessRule('/settings')?.capability).toBe('view_configurations')
    expect(getRouteAccessRule('/pdi/abc/print')?.capability).toBe('print_pdi')
  })

  it('allows vendedor route aliases without opening admin configurations', () => {
    for (const route of [
      '/feedback',
      '/funil',
      '/vendedor/funil',
      '/vendedor/meu-funil',
      '/vendedor/feedback',
      '/vendedor/devolutivas',
      '/pdi',
      '/devolutivas',
      '/vendedor/treinamentos',
      '/vendedor/terminal-mx',
      '/home',
      '/meu-dia',
      '/fechamento-diario',
      '/terminal-mx',
      '/carteira-clientes',
      '/carteira',
      '/vendedor/carteira',
      '/mentor-comercial',
      '/vendedor/mentor-comercial',
      '/meu-funil',
      '/minha-meta',
      '/vendedor/minha-meta',
      '/ranking',
      '/treinamentos',
      '/rotina-do-dia',
      '/vendedor/rotina-do-dia',
      '/central-execucao',
      '/central-de-execucao',
      '/funil-comercial',
      '/relatorios',
      '/feedbacks',
      '/consultor-ia',
      '/universidade-mx',
      '/vendedor/universidade-mx',
      '/desenvolvimento',
      '/vendedor/desenvolvimento',
      '/perfil',
      '/meu-perfil',
      '/meu-perfil-vendedor',
      '/vendedor/perfil',
    ]) {
      expect(canAccessPath(route, 'vendedor')).toBe(true)
      expect(getRouteAccessRule(route)).not.toBeNull()
    }

    expect(canAccessPath('/vendedor/terminal-mx', 'gerente')).toBe(false)
    expect(canAccessPath('/vendedor/configuracoes', 'vendedor')).toBe(true)
    expect(canAccessPath('/vendedor/configuracoes', 'gerente')).toBe(false)
    expect(canAccessPath('/vendedor/feedback', 'gerente')).toBe(false)
    expect(canAccessPath('/vendedor/devolutivas', 'gerente')).toBe(false)
    expect(canAccessPath('/devolutivas', 'gerente')).toBe(true)
    expect(canAccessPath('/pdi', 'gerente')).toBe(true)
    expect(canAccessPath('/desenvolvimento', 'gerente')).toBe(false)
    expect(canAccessPath('/vendedor/desenvolvimento', 'gerente')).toBe(false)
    expect(canAccessPath('/meu-perfil', 'gerente')).toBe(true)
    expect(canAccessPath('/meu-perfil-vendedor', 'gerente')).toBe(false)
    expect(canAccessPath('/vendedor/perfil', 'gerente')).toBe(false)
    expect(canAccessPath('/configuracoes', 'vendedor')).toBe(true)
  })

  it('keeps seller funnel aliases exclusive to the seller flow rendered by App', () => {
    for (const route of ['/funil', '/vendedor/funil', '/vendedor/meu-funil']) {
      expect(canAccessPath(route, 'vendedor')).toBe(true)
      for (const role of ['gerente', 'dono', 'administrador_geral', 'administrador_mx', 'consultor_mx'] as const) {
        expect(canAccessPath(route, role)).toBe(false)
      }
    }
  })
})
