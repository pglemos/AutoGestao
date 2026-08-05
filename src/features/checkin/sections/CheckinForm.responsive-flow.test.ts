import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const formSource = readFileSync(new URL('./CheckinForm.tsx', import.meta.url), 'utf8')
const flowSource = readFileSync(new URL('./FluxoFechamento.tsx', import.meta.url), 'utf8')
const hookSource = readFileSync(new URL('../hooks/useCheckinPage.ts', import.meta.url), 'utf8')

describe('fluxo de fechamento unificado entre breakpoints', () => {
  test('não existe mais implementação exclusiva de mobile começando por Internet', () => {
    expect(formSource).not.toContain('mobileInternetRows')
    expect(formSource).not.toContain('setMobileCounter')
    expect(formSource).not.toContain('Confirmar Internet')
  })

  test('FluxoFechamento não é mais escondido em telas pequenas', () => {
    expect(formSource).not.toMatch(/className="hidden[^"]*md:block"\s*>\s*\n\s*<FluxoFechamento/)
    expect(formSource).toMatch(/<section className="w-full max-w-full min-w-0 scroll-mt-6">\s*\n\s*<FluxoFechamento/)
  })

  test('a ordem canônica das etapas vive numa lista só', () => {
    expect(flowSource).toMatch(/const STEPS[\s\S]*?'showroom'[\s\S]*?'carteira'[\s\S]*?'internet'[\s\S]*?'vendas'/)
    expect(flowSource).toContain("useState<StepId>('showroom')")
  })

  test('confirmar etapa comita inputs pendentes e persiste o rascunho', () => {
    expect(formSource).toContain('const handleStepConfirmed = ()')
    expect(formSource).toContain('commitNumberField(field as NumericCheckinField)')
    expect(formSource).toContain('void handleSaveDraft()')
    expect(formSource).toContain('onStepConfirmed={handleStepConfirmed}')
  })
})

describe('finalização segura', () => {
  test('finalizar aguarda o flush do autosave antes de gravar', () => {
    expect(hookSource).toContain('const flushed = await autosave.flush()')
    expect(hookSource).toMatch(/flushed\.status === 'conflict'/)
  })

  test('conflito de versão impede finalizar dado desatualizado', () => {
    expect(hookSource).toContain("code === 'DRAFT_VERSION_CONFLICT'")
    expect(hookSource).toContain('Este fechamento foi atualizado em outra sessão.')
  })

  test('finalizar continua sendo ação explícita, nunca automática', () => {
    expect(formSource).toContain('setConfirmFinalizeModalOpen(true)')
    expect(formSource).toContain('FINALIZAR FECHAMENTO DO DIA')
    expect(hookSource).not.toMatch(/setTimeout\([^)]*submitCheckin/)
  })

  test('duplo clique não dispara duas finalizações', () => {
    expect(hookSource).toContain('if (saving) return')
  })
})
