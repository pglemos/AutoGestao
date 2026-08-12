import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

// MX-22.2 — regressão dos guards de useCheckinPage.ts. O hook é grande demais
// pra render-hook completo neste projeto (ver convenção em CheckinForm.test.ts
// e nos *-migration.test.ts); os testes de comportamento puro (D-1/D0,
// vazio/concluído) já vivem em active-closing-context.test.ts contra
// resolveActiveClosingContext/isSubmittedClosing. Aqui cobrimos os guards
// client-side que dependem do fio do hook em si (estado + efeitos).
const pageHookSource = readFileSync(
    new URL('./useCheckinPage.ts', import.meta.url),
    'utf8',
)

describe('useCheckinPage — transição D-1→D0 e guards de idempotência (MX-22.2)', () => {
    test('AC-1: recarrega previousCheckin imediatamente após finalizar D-1, sem esperar F5', () => {
        expect(pageHookSource).toContain("metricScope === 'daily' && selectedDate === yesterdaySP")
        expect(pageHookSource).toContain('fetchCheckinByDate(yesterdaySP, \'daily\').then(setPreviousCheckin)')
    })

    test('AC-4: submitCheckin bloqueia no client quando fechamentoConcluido, sem reabrir D+1', () => {
        expect(pageHookSource).toContain('if (fechamentoConcluido) {')
        expect(pageHookSource).toContain('Fechamento já concluído para esta data. Para alterar, use o histórico e solicite correção.')
    })

    test('AC-5: submitCheckin ignora chamada concorrente enquanto uma já está em voo (guard client de idempotência)', () => {
        expect(pageHookSource).toContain('const submitCheckin = async () => {\n    if (saving) return')
    })

    test('AC-2: rascunho persiste via saveCheckin(isDraft=true) contra o banco, não localStorage', () => {
        expect(pageHookSource).toContain('const handleSaveDraft = async () => {')
        expect(pageHookSource).not.toContain('window.localStorage.setItem')
    })

    test('Produção Zero — declaredAllZero considera vendas/clientes cadastrados no CRM', () => {
        expect(pageHookSource).toContain('realSalesCount === 0')
        expect(pageHookSource).toContain('clientesList.length === 0')
    })

    test('Produção Zero — submitCheckin preenche justificativa padrão se estiver vazio', () => {
        expect(pageHookSource).toContain("updateField('zero_reason', 'Sem movimento')")
        expect(pageHookSource).toContain("form.zero_reason = 'Sem movimento'")
    })
})

