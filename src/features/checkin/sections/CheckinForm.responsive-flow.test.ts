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

  // Confirmar passou a gravar; a gravação dispara refetch; o container troca o
  // formulário por skeleton enquanto carrega. Com a etapa em estado local do
  // FluxoFechamento, isso remontava o componente e devolvia o vendedor ao
  // Showroom — ele clicava em Confirmar e a tela não andava.
  test('a etapa atual vive fora do componente que remonta', () => {
    expect(hookSource).toContain("useState<ClosingStepId>('showroom')")
    expect(hookSource).toContain('closingStep,')
    expect(hookSource).toContain('setClosingStep,')
    expect(formSource).toContain('currentStep={closingStep}')
    expect(formSource).toContain('onStepChange={setClosingStep}')
  })

  test('FluxoFechamento aceita etapa controlada sem perder o modo autônomo', () => {
    expect(flowSource).toContain('currentStep: controlledStep')
    expect(flowSource).toContain('const currentStep = controlledStep ?? internalStep')
  })

  test('confirmar etapa comita inputs pendentes e persiste o rascunho', () => {
    expect(formSource).toContain('const handleStepConfirmed = ()')
    expect(formSource).toContain('commitNumberField(field as NumericCheckinField)')
    expect(formSource).toContain('void handleSaveDraft()')
    expect(formSource).toContain('onStepConfirmed={handleStepConfirmed}')
  })
})

// Regressão observada em produção (2026-08-06): o autosave não disparava ao
// digitar porque `autosaveEnabled` incluía flags de carregamento que ficam
// `true` em janelas normais de uso. O rascunho só ia ao servidor no clique
// manual — exatamente o defeito que esta entrega existe para corrigir.
describe('autosave não pode ser desligado por estado de carregamento', () => {
  test('autosaveEnabled não depende de loadingHistory nem de hookLoading', () => {
    const trecho = hookSource.slice(
      hookSource.indexOf('const autosaveEnabled'),
      hookSource.indexOf('const persistDraft'),
    )
    expect(trecho).toContain("metricScope === 'daily'")
    expect(trecho).toContain('!fechamentoConcluido')
    expect(trecho).toContain('selectedDate === activeClosingContext.mainDate')
    expect(trecho).not.toContain('loadingHistory')
    expect(trecho).not.toContain('hookLoading')
  })

  test('a proteção contra gravar durante a hidratação continua sendo changedFields', () => {
    expect(hookSource).toContain('if (!autosaveEnabled || changedFields.size === 0) return')
  })

  // O contador do fluxo guardava o valor digitado em estado local e só
  // propagava no blur. Quem digitava e fechava a aba perdia o número: não
  // havia alteração no formulário para o autosave enxergar.
  test('o contador propaga o valor durante a digitação, não só no blur', () => {
    const trecho = flowSource.slice(flowSource.indexOf('function StepperInput'), flowSource.indexOf('function BackButton'))
    expect(trecho).toMatch(/onChange=\{event => \{[\s\S]*?onSet\(/)
    expect(trecho).toContain('onBlur={commit}')
  })

  test('campo esvaziado continua local até o blur (backspace não vira 0)', () => {
    const trecho = flowSource.slice(flowSource.indexOf('function StepperInput'), flowSource.indexOf('function BackButton'))
    expect(trecho).toContain("if (digits !== '' && !disabled)")
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
