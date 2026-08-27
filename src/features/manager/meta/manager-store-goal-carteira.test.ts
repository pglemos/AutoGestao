import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * As duas telas em que o gerente vê a equipe — /minha-equipe e /meta-loja —
 * levam à carteira do vendedor pelo id, nunca pelo nome: o recorte no adapter
 * é por `seller_user_id`, e dois vendedores homônimos na mesma rede abririam a
 * carteira errada.
 */
describe('acao "Ver carteira" nas telas de equipe', () => {
  test('/meta-loja navega com o id do vendedor', () => {
    const src = readFileSync('src/features/manager/meta/ManagerStoreGoalReference.tsx', 'utf8')
    expect(src).toContain("action === 'carteira'")
    expect(src).toContain('/carteira-clientes?vendedor=${encodeURIComponent(sellerId)}')
    expect(src).toContain('Ver carteira')
  })

  test('/minha-equipe usa o mesmo destino, montado pelo mapa de acoes', () => {
    const nav = readFileSync('src/features/manager/team/manager-team-navigation.ts', 'utf8')
    expect(nav).toContain("wallet: { pathname: '/carteira-clientes', params: { vendedor: row.user_id } }")
    const kanban = readFileSync('src/features/manager/team/ManagerTeamKanban.tsx', 'utf8')
    expect(kanban).toContain('Ver carteira')
  })
})
