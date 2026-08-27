import { describe, expect, it } from 'vitest'
import { buildManagerTeamActionTarget } from './manager-team-navigation'

const row = { user_id: 'seller-1', user_name: 'Álvaro Souza', reference_date: '2026-07-13' } as never

describe('manager team contextual navigation', () => {
  it('preserves seller and date when opening the routine', () => {
    expect(buildManagerTeamActionTarget('routine', row, '2026-07-13')).toBe('/rotina-equipe?data=2026-07-13&busca=%C3%81lvaro%20Souza')
  })

  it('preserves seller context for each gerencial destination', () => {
    expect(buildManagerTeamActionTarget('feedback', row)).toBe('/feedbacks-pdis?tab=feedbacks&novoFeedback=%C3%81lvaro%20Souza')
    expect(buildManagerTeamActionTarget('closing', row)).toBe('/fechamento-diario?busca=%C3%81lvaro%20Souza')
    expect(buildManagerTeamActionTarget('training', row)).toBe('/universidade-mx?recomendar=%C3%81lvaro%20Souza')
  })
})

describe('acao "Ver carteira"', () => {
  const row = { user_id: 'seller-uuid-1', user_name: 'ROGER LUIS' } as never

  it('abre a carteira recortada pelo id do vendedor, nao pelo nome', () => {
    const alvo = buildManagerTeamActionTarget('wallet', row)
    expect(alvo).toBe('/carteira-clientes?vendedor=seller-uuid-1')
  })
})
