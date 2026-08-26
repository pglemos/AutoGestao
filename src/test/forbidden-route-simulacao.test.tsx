import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * O Admin MX pode simular Vendedor, Gerente e Dono. A tela de acesso negado não
 * renderiza a barra lateral — que é onde mora o botão "Voltar Admin MX" —, então
 * simular um papel e navegar para uma rota proibida para ele deixava o Admin
 * preso: a única ação oferecida era "Voltar para minha área", que leva para a
 * área do papel simulado, igualmente sem acesso ao módulo interno.
 *
 * Verificado em produção: simulando Dono, `/painel` e `/agenda` respondiam
 * "O perfil dono não tem permissão" sem nenhuma saída da simulação.
 */
describe('ForbiddenRoute oferece saída da simulação', () => {
  const app = readFileSync('src/App.tsx', 'utf8')
  const forbidden = app.slice(app.indexOf('function ForbiddenRoute()'), app.indexOf('function RoleRedirect()'))

  test('a tela lê o estado de simulação em vez de só o papel', () => {
    expect(forbidden).toContain('isSimulating')
    expect(forbidden).toContain('stopSimulation')
  })

  test('encerrar a simulação devolve o Admin ao painel interno', () => {
    expect(forbidden).toContain("stopSimulation()")
    expect(forbidden).toContain("navigate('/painel', { replace: true })")
  })

  test('o botão de encerrar só aparece durante uma simulação', () => {
    expect(forbidden).toContain('{isSimulating ? (')
    expect(forbidden).toContain('Voltar Admin MX')
    // Fora da simulação, a saída continua sendo a de antes.
    expect(forbidden).toContain('Voltar para minha área')
  })
})
