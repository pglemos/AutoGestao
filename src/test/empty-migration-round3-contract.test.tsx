import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

/**
 * Contrato FASE R fatia 3 — migração dos sites inline restantes para o
 * EmptyState canônico (18.011/18.014).
 *
 * Os vazios de dados reais (não labels, não erros) usam o EmptyState canônico
 * com `variant` correto. Filtro sem resultado → `filter`; sem dados cadastrados
 * → `dataset`.
 */
describe('contrato FASE R fatia 3 — migração empty inline restante', () => {
  const FILTER_CASES: Array<[string, string]> = [
    ['src/features/manager/team/ManagerTeamPerformance.tsx', 'corresponde à busca'],
  ]
  const DATASET_CASES: Array<[string, string]> = [
    ['src/features/manager/team/ManagerTeamPerformance.tsx', 'Nenhum vendedor vinculado'],
    ['src/features/manager/team-routine/ManagerRoutineDetailModal.tsx', 'Nenhuma rotina registrada'],
    ['src/features/mentor-comercial/ui/FichaOportunidade.tsx', 'Nenhuma bandeira pendente'],
    ['src/features/dono/FalarConsultorDono.tsx', 'Nenhuma solicitação registrada'],
    ['src/features/vendedor-desenvolvimento/FeedbackTab.jsx', 'Nenhum feedback confirmado'],
    ['src/features/crm/funil-vendedor/FunilVendedorCards.tsx', 'Sem registros nos últimos 6 meses'],
  ]

  test('sites de empty usam o EmptyState canônico (dataset)', () => {
    for (const [rel, marker] of DATASET_CASES) {
      const src = read(rel)
      expect(src.includes('EmptyState'), `${rel} deve importar EmptyState`).toBe(true)
      expect(src.includes(marker.slice(0, 12)), `${rel} deve manter a mensagem`).toBe(true)
    }
  })

  test('empty de filtro usa variant="filter"', () => {
    for (const [rel, marker] of FILTER_CASES) {
      const src = read(rel)
      expect(src.includes(marker), `${rel} deve manter o texto de filtro`).toBe(true)
      expect(src.includes('variant="filter"'), `${rel} deve usar variant="filter"`).toBe(true)
    }
  })

  test('PlanoAtaqueTab migra os dois empties de clientes', () => {
    const src = read('src/features/crm/PlanoAtaqueTab.tsx')
    expect(src.includes('EmptyState')).toBe(true)
    expect(src.includes('Nenhum cliente')).toBe(true)
  })

  test('nenhum div/p vazio manual permanece nos alvos migrados', () => {
    const targets = [
      'src/features/manager/team-routine/ManagerRoutineDetailModal.tsx',
      'src/features/dono/FalarConsultorDono.tsx',
      'src/features/vendedor-desenvolvimento/FeedbackTab.jsx',
    ]
    for (const rel of targets) {
      const src = read(rel)
      // Depois da migração não deve restar o padrão `<div ...><p ...>Nenhum`
      expect(/<div[^>]*>\s*<p[^>]*>Nenhum/.test(src), `${rel} não deve ter div>p vazio`).toBe(false)
    }
  })
})
