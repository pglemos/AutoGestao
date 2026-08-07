import React from 'react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { renderScript, SOURCE_BLOCKED_STATUSES } from '../engine/script'
import { useExecuteNextStep, type OpportunityData, type UseExecuteNextStepReturn } from './useExecuteNextStep'
import { ExecuteNextStepPanel } from './ExecuteNextStepPanel'
import type { MentorRepository } from '../application/mentorApplicationService'
import type { OpportunityFacts, StoreSettings, RuleCatalog } from '../engine/engine'

const NOW = new Date('2026-08-10T10:00:00.000Z')

const defaultVariables = { nome: 'Carlos', vendedor: 'Bruno', loja: 'MX Centro' }

const baseOpportunity: OpportunityData = {
  opportunityId: 'opp-test-1',
  clientId: 'cli-test-1',
  clientName: 'Carlos Silva',
  clientPhone: '11999998888',
  storeId: 'loja-1',
  sellerId: 'vend-1',
  channel: 'WhatsApp',
  detailedOrigin: 'Site MX',
  statusCode: 'INT-C01',
  statusLabel: 'Cadência 01 - Tentativa 1',
  family: 'Contatado',
  responsible: 'Vendedor',
  temperature: 'Quente',
  potential: 'Alto',
  objective: 'Iniciar conversa comercial',
  nextStep: 'Enviar mensagem de introdução',
  cadenceCode: 'CAD-01',
  cadenceStep: 1,
  totalCadenceAttempts: 6,
  nextActionAt: NOW,
  scriptRef: 'SCR-INT-CAD01-T1',
  scriptTemplate: 'Olá {nome}, sou {vendedor} da loja {loja}.',
}

class MockMentorRepository implements MentorRepository {
  appliedEvents: Array<{ result: string; at: Date }> = []

  async loadFacts(): Promise<OpportunityFacts> {
    return {
      statusCode: 'INT-C01',
      nextActionAt: NOW,
      clientRespondedAt: null,
      clientNeverResponded: false,
      appointmentAt: null,
      cadenceAttempt: 1,
      cadenceState: null,
      quality: {
        status: 'complete',
        nextStep: 'complete',
        execution: 'onTime',
        cadence: 'respected',
        history: 'complete',
      },
      pendingFlags: [],
      returnStatusCode: null,
    }
  }

  async loadStoreSettings(): Promise<StoreSettings> {
    return { sellerResponseSlaMinutes: null, postSaleEnabled: false, warrantyFollowupEnabled: false }
  }

  async loadCatalog(): Promise<RuleCatalog> {
    return {
      version: 'v1',
      statuses: [
        {
          statusId: 'INT-C01',
          channel: 'WhatsApp',
          family: 'Contatado',
          label: 'Cadência 01 - Tentativa 1',
          definition: null,
          origin: null,
          responsible: 'Vendedor',
          temperature: 'Quente',
          objective: 'Iniciar contato',
          nextStep: 'Enviar mensagem',
          cadenceId: 'CAD-01',
          scriptId: 'SCR-INT-CAD01-T1',
          potential: 'Alto',
          centralRule: 'Sim',
          activeInPortfolio: 'Sim',
          mentorGuidance: 'Enviar script',
          mainResults: null,
          notes: null,
        },
      ],
      cadences: [{ cadenceId: 'CAD-01', attempts: '6', dayPattern: 'D0, D1, D3' }],
      cadenceSteps: [{ cadenceId: 'CAD-01', attempt: '1', offset: 'D0' }],
      scriptIds: new Set(['SCR-INT-CAD01-T1']),
      transitions: [],
    }
  }

  async saveOpportunityState(): Promise<void> {}
  async savePendingFlags(): Promise<void> {}
  async saveCadenceState(): Promise<void> {}
  async upsertCentralAction(): Promise<void> {}
  async removeCentralAction(): Promise<void> {}
  async appendHistory(entry: { result: string | null; occurredAt: Date }): Promise<void> {
    if (entry.result) {
      this.appliedEvents.push({ result: entry.result, at: entry.occurredAt })
    }
  }
  async appendScoreSnapshot(): Promise<void> {}
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return work()
  }
}

function HookTester(props: {
  opportunity?: OpportunityData
  repository?: MentorRepository | null
  scriptVariables?: Record<string, string>
  onHookResult?: (res: UseExecuteNextStepReturn) => void
  onOpenWhatsApp?: (phone: string, text: string) => void
  onSuccess?: () => void
}) {
  const result = useExecuteNextStep({
    opportunity: props.opportunity ?? baseOpportunity,
    repository: props.repository ?? null,
    scriptVariables: props.scriptVariables ?? defaultVariables,
    now: NOW,
    onOpenWhatsApp: props.onOpenWhatsApp,
    onSuccess: props.onSuccess,
  })

  React.useEffect(() => {
    props.onHookResult?.(result)
  }, [result, props])

  return React.createElement(
    'div',
    null,
    React.createElement(
      'button',
      { type: 'button', onClick: () => result.handleOpenWhatsApp() },
      'Test WhatsApp',
    ),
    React.createElement(
      'button',
      { type: 'button', onClick: () => result.handleMessageSent() },
      'Test Sent',
    ),
  )
}

describe('useExecuteNextStep — Renderização de Scripts', () => {
  afterEach(() => {
    cleanup()
  })

  it('renderiza o script com sucesso quando todas as variáveis estão presentes', () => {
    const result = renderScript('Olá {nome}, sou {vendedor} da loja {loja}.', defaultVariables)

    expect(result.scriptReady).toBe(true)
    expect(result.allowWhatsApp).toBe(true)
    expect(result.text).toBe('Olá Carlos, sou Bruno da loja MX Centro.')
    expect(result.missingVariables).toEqual([])
  })

  it('desabilita WhatsApp e lista variáveis ausentes quando falta informação', () => {
    const result = renderScript('Olá {nome}, seu veículo {veiculo} está pronto.', {
      nome: 'Carlos',
    })

    expect(result.scriptReady).toBe(false)
    expect(result.allowWhatsApp).toBe(false)
    expect(result.text).toBeNull()
    expect(result.missingVariables).toEqual(['veiculo'])
  })

  it('bloqueia envio e marca source blocker para status em SOURCE_BLOCKED_STATUSES', () => {
    const blockedStatus = 'POR-A04'
    expect(blockedStatus in SOURCE_BLOCKED_STATUSES).toBe(true)

    let captured: UseExecuteNextStepReturn | undefined
    render(
      React.createElement(HookTester, {
        opportunity: {
          ...baseOpportunity,
          statusCode: blockedStatus,
          scriptRef: SOURCE_BLOCKED_STATUSES[blockedStatus],
        },
        onHookResult: (res) => {
          captured = res
        },
      }),
    )

    expect(captured?.isSourceBlocker).toBe(true)
    expect(captured?.renderedScript.scriptReady).toBe(false)
    expect(captured?.renderedScript.allowWhatsApp).toBe(false)
    expect(captured?.renderedScript.text).toBeNull()
  })

  it('identifica script interno SCR-INTERNO e proíbe envio WhatsApp', () => {
    let captured: UseExecuteNextStepReturn | undefined
    render(
      React.createElement(HookTester, {
        opportunity: {
          ...baseOpportunity,
          scriptRef: 'SCR-INTERNO',
        },
        onHookResult: (res) => {
          captured = res
        },
      }),
    )

    expect(captured?.isInternal).toBe(true)
    expect(captured?.renderedScript.allowWhatsApp).toBe(false)
  })
})

describe('useExecuteNextStep — Ações e Regras de Negócio', () => {
  afterEach(() => {
    cleanup()
  })

  it('REGRA CRÍTICA: handleOpenWhatsApp NÃO chama o motor nem altera o estado', () => {
    const repo = new MockMentorRepository()
    const onOpenWhatsApp = mock(() => {})

    const { getByText } = render(
      React.createElement(HookTester, {
        opportunity: baseOpportunity,
        repository: repo,
        scriptVariables: defaultVariables,
        onOpenWhatsApp: onOpenWhatsApp,
      }),
    )

    fireEvent.click(getByText('Test WhatsApp'))

    expect(onOpenWhatsApp).toHaveBeenCalled()
    // O motor/histórico NUNCA pode ter sido chamado ao apenas abrir o WhatsApp
    expect(repo.appliedEvents).toHaveLength(0)
  })

  it('handleMessageSent chama applyMentorEvent com resultado "Mensagem enviada"', async () => {
    const repo = new MockMentorRepository()

    const { getByText } = render(
      React.createElement(HookTester, {
        opportunity: baseOpportunity,
        repository: repo,
        scriptVariables: defaultVariables,
      }),
    )

    fireEvent.click(getByText('Test Sent'))

    // Aguarda microtasks
    await new Promise((r) => setTimeout(r, 50))

    expect(repo.appliedEvents).toHaveLength(1)
    expect(repo.appliedEvents[0].result).toBe('Mensagem enviada')
  })
})

describe('ExecuteNextStepPanel — Componente Visual', () => {
  afterEach(() => {
    cleanup()
  })

  it('renderiza o painel com as informações do cliente e mentor', () => {
    render(
      React.createElement(ExecuteNextStepPanel, {
        isOpen: true,
        onClose: () => {},
        opportunity: baseOpportunity,
        scriptVariables: defaultVariables,
      }),
    )

    expect(screen.getByText('Carlos Silva')).toBeTruthy()
    expect(screen.getByText('INT-C01')).toBeTruthy()
    expect(screen.getByText('Iniciar conversa comercial')).toBeTruthy()
    expect(screen.getByText('Enviar mensagem de introdução')).toBeTruthy()
    expect(screen.getByText('Olá Carlos, sou Bruno da loja MX Centro.')).toBeTruthy()
  })

  it('mostra mensagem de script não cadastrado quando o status é SOURCE_BLOCKER', () => {
    render(
      React.createElement(ExecuteNextStepPanel, {
        isOpen: true,
        onClose: () => {},
        opportunity: {
          ...baseOpportunity,
          statusCode: 'POR-A04',
          scriptRef: SOURCE_BLOCKED_STATUSES['POR-A04'],
        },
      }),
    )

    expect(screen.getByText('Script ainda não cadastrado na matriz')).toBeTruthy()
  })
})
