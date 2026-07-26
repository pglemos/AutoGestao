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

  test('client list uses the global controller', () => {
    const list = source('features/consulting-clients/ConsultingClientsPage.tsx')
    expect(list).toContain('AdministrativeConsultingClientsPage')
    expect(list).not.toContain('ConsultantAssignedClientsPage')
  })

  test('internal scope no longer gates detail by assignment', () => {
    const guard = source('features/consulting-clients/ConsultingClientScopeGuard.tsx')
    expect(guard).toContain('isPerfilInternoMx')
    expect(guard).not.toContain(".from('atribuicoes_consultoria')")
  })
})
