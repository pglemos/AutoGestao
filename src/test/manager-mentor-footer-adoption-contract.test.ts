import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * FASE J — 10.016-10.018 adoção real do PageFooterActions.
 *
 * O `ManagerMentor` já reservava `bottomClearance="actions"` (80px) sem nenhuma
 * barra de ações persistente — a reserva era desperdiçada. Esta fatia adota o
 * `PageFooterActions` canônico com uma ação persistente ("Atualizar
 * recomendações") que chama a mesma `refresh` do painel de ações determinísticas.
 */
const root = resolve(import.meta.dir, '..', '..')

const source = readFileSync(resolve(root, 'src/pages/ManagerMentor.tsx'), 'utf8')
const component = readFileSync(
  resolve(root, 'src/components/molecules/PageFooterActions.tsx'),
  'utf8',
)

describe('FASE J 10.016-10.018 — adoção de PageFooterActions no ManagerMentor', () => {
  test('ManagerMentor usa o componente canônico PageFooterActions', () => {
    expect(source).toContain("import { PageFooterActions } from '@/components/molecules/PageFooterActions'")
    expect(source).toContain('<PageFooterActions>')
    expect(source).toContain('</PageFooterActions>')
  })

  test('a barra carrega uma ação persistente ligada à refresh das ações determinísticas', () => {
    expect(source).toContain('Atualizar recomendações')
    expect(source).toContain('deterministic.refresh')
    expect(source).toContain('RefreshCw')
  })

  test('a reserva bottomClearance="actions" está alinhada à barra (10.018 — não cobre o último campo)', () => {
    expect(source).toContain('bottomClearance="actions"')
    expect(component).toContain('sticky bottom-0')
    expect(component).not.toContain('fixed bottom-0')
  })
})
