import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

describe('internal MX consulting scope contract', () => {
  test('detail and visit routes require the active assignment guard', () => {
    expect(source('pages/ConsultoriaClienteDetalhe.tsx')).toContain('ConsultingClientScopeGuard')
    expect(source('pages/ConsultoriaVisitaExecucao.tsx')).toContain('ConsultingClientScopeGuard')
  })

  test('client list uses the scoped controller', () => {
    const list = source('features/consulting-clients/ConsultingClientsPage.tsx')
    const scopedList = source('features/consulting-clients/ConsultantAssignedClientsPage.tsx')
    expect(list).toContain('role === \'consultor_mx\'')
    expect(list).toContain('ConsultantAssignedClientsPage')
    expect(scopedList).toContain(".from('atribuicoes_consultoria')")
    expect(scopedList).toContain(".eq('user_id', profile.id)")
    expect(scopedList).toContain(".eq('active', true)")
  })

  test('consultant scope queries active assignments by current user', () => {
    const guard = source('features/consulting-clients/ConsultingClientScopeGuard.tsx')
    expect(guard).toContain(".from('atribuicoes_consultoria')")
    expect(guard).toContain(".eq('user_id', profile.id)")
    expect(guard).toContain(".eq('active', true)")
  })
})
