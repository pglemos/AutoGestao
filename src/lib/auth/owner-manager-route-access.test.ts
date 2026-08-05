import { describe, expect, it } from 'bun:test'
import { canAccessPath } from './routeAccess'

describe('owner manager route access', () => {
  it('permite que o dono acompanhe e execute a rotina da equipe', () => {
    expect(canAccessPath('/gerente/rotina-equipe', 'dono')).toBe(true)
  })

  it('mantém o vendedor fora das rotas gerenciais', () => {
    expect(canAccessPath('/gerente/rotina-equipe', 'vendedor')).toBe(false)
    expect(canAccessPath('/gerente/minha-equipe', 'vendedor')).toBe(false)
  })
})
