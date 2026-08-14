import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * FASE J — 10.004/10.011/10.013 (grupo `/devolutivas` / gerente-feedback)
 *
 * As abas do cabeçalho de feedbacks (Individual/Relatórios) existem em duas
 * implementações: `AdminFeedbackHeader` usa a família canônica `TabNavPill`
 * (roving tabindex + navegação por setas), mas `StoreFeedbackHeader` (gerente/
 * dono) ainda desenha um `<nav role="tablist">` à mão — sem roving tabindex,
 * sem Home/End/setas, com todos os botões na ordem de tabulação.
 *
 * Este contrato trava a unificação: os dois cabeçalhos do mesmo grupo precisam
 * usar a MESMA família canônica de tabs (mesma geometria e mesmo comportamento
 * de teclado), e nenhum dos dois pode manter um tablist à mão sem roving.
 */
const root = resolve(import.meta.dir, '..', '..', '..', '..')

const storeHeader = readFileSync(
  resolve(root, 'src/features/gerente-feedback/sections/StoreFeedbackHeader.tsx'),
  'utf8',
)
const adminHeader = readFileSync(
  resolve(root, 'src/features/gerente-feedback/sections/AdminFeedbackHeader.tsx'),
  'utf8',
)

describe('FASE J — abas canônicas do grupo de feedback (/devolutivas)', () => {
  test('StoreFeedbackHeader usa a família canônica TabNavPill', () => {
    expect(storeHeader).toContain('TabNavPill')
  })

  test('StoreFeedbackHeader não desenha tablist à mão (roving/teclado do canônico)', () => {
    // O padrão não-canônico: `<nav ... role="tablist">` com `aria-selected`
    // construído manualmente por um map de Button, sem tabIndex roving.
    expect(storeHeader).not.toMatch(/<nav[^>]*role="tablist"/)
    expect(storeHeader).not.toContain("aria-selected={activeTab === 'individual'}")
  })

  test('os dois cabeçalhos do grupo compartilham o mesmo componente de tabs', () => {
    const storeUsesPill = storeHeader.includes('TabNavPill')
    const adminUsesPill = adminHeader.includes('TabNavPill')
    // Grupo unificado: se o admin já usa TabNavPill, o store também precisa —
    // a divergência é o ponto cego que a FASE J elimina.
    expect(storeUsesPill).toBe(adminUsesPill)
  })
})
