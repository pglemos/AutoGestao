import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

// A lista de clientes da consultoria (`ConsultingClientsPage` e
// `ConsultantAssignedClientsPage`) foi removida em 2026-08-27: nenhuma rota a
// montava. O que segue vivo é a guarda de escopo, usada pelo detalhe do cliente
// e pela execução de visita.
describe('internal MX consulting scope contract', () => {
  test('detail and visit routes require the active assignment guard', () => {
    expect(source('pages/ConsultoriaClienteDetalhe.tsx')).toContain('ConsultingClientScopeGuard')
    expect(source('pages/ConsultoriaVisitaExecucao.tsx')).toContain('ConsultingClientScopeGuard')
  })

  test('internal scope no longer gates detail by assignment', () => {
    const guard = source('features/consulting-clients/ConsultingClientScopeGuard.tsx')
    expect(guard).toContain('isPerfilInternoMx')
    expect(guard).not.toContain(".from('atribuicoes_consultoria')")
  })
})
