import React from 'react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { ExecuteNextStepPanel } from './ExecuteNextStepPanel'
import type { OpportunityData } from './useExecuteNextStep'
import type { MentorRepository } from '../application/mentorApplicationService'
import type { OpportunityFacts, StoreSettings, RuleCatalog } from '../engine/engine'

const NOW = new Date('2026-08-10T10:00:00.000Z')

const defaultVariables = {
  nome: 'Carlos',
  vendedor: 'Bruno',
  loja: 'MX Centro',
}

const baseOpportunity: OpportunityData = {
  opportunityId: 'opp-test-1',
  clientId: 'cli-test-1',
  clientName: 'Maria Oliveira',
  clientPhone: '11999998888',
  storeId: 'loja-1',
  sellerId: 'vend-1',
  channel: 'WhatsApp',
  detailedOrigin: 'Site MX',
  statusCode: 'INT-C01',
  statusLabel: 'Primeiro contato pendente',
  family: 'Contatado',
  responsible: 'Vendedor Bruno',
  temperature: 'Quente',
  potential: 'Alto',
  objective: 'Reengajar cliente inativo',
  nextStep: 'Enviar mensagem de boas-vindas',
  cadenceCode: 'CAD-01',
  cadenceStep: 1,
  totalCadenceAttempts: 6,
  nextActionAt: NOW,
  scriptRef: 'SCR-INT-CAD01-T1',
  scriptTemplate: 'Olá {nome}, sou {vendedor} da loja {loja}.',
  priorityIndex: 85,
  priorityClass: 'Alta',
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
          label: 'Primeiro contato pendente',
          definition: null,
          origin: null,
          responsible: 'Vendedor Bruno',
          temperature: 'Quente',
          objective: 'Reengajar cliente inativo',
          nextStep: 'Enviar mensagem de boas-vindas',
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

describe('ExecuteNextStepPanel — Renderização e Interação', () => {
  afterEach(() => {
    cleanup()
  })

  it('1. Mostra cliente, status, responsável, objetivo, próximo passo e cadência', () => {
    render(
      <ExecuteNextStepPanel
        isOpen={true}
        onClose={() => {}}
        opportunity={baseOpportunity}
        scriptVariables={defaultVariables}
      />,
    )

    expect(screen.getByText('Maria Oliveira')).toBeTruthy()
    expect(screen.getByText('INT-C01')).toBeTruthy()
    expect(screen.getByText('Vendedor Bruno')).toBeTruthy()
    expect(screen.getByText('Reengajar cliente inativo')).toBeTruthy()
    expect(screen.getByText('Enviar mensagem de boas-vindas')).toBeTruthy()
    expect(screen.getByText('CAD-01')).toBeTruthy()
  })

  it('2. Abrir WhatsApp NÃO conclui nada: após clicar, nenhum evento é aplicado. Só Mensagem enviada aplica', async () => {
    const repo = new MockMentorRepository()
    const onOpenWhatsApp = mock(() => {})

    render(
      <ExecuteNextStepPanel
        isOpen={true}
        onClose={() => {}}
        opportunity={baseOpportunity}
        repository={repo}
        scriptVariables={defaultVariables}
        onOpenWhatsApp={onOpenWhatsApp}
      />,
    )

    const whatsappBtn = screen.getByRole('button', { name: /Abrir WhatsApp/i })
    await act(async () => {
      fireEvent.click(whatsappBtn)
    })

    expect(onOpenWhatsApp).toHaveBeenCalled()
    expect(repo.appliedEvents).toHaveLength(0)

    const sentBtn = screen.getByRole('button', { name: /Mensagem enviada/i })
    await act(async () => {
      fireEvent.click(sentBtn)
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(repo.appliedEvents).toHaveLength(1)
    expect(repo.appliedEvents[0].result).toBe('Mensagem enviada')
  })

  it('3. Script com variável faltando: botão WhatsApp DESABILITADO e a lista de variáveis ausentes é exibida', () => {
    const opportunityWithMissingVar: OpportunityData = {
      ...baseOpportunity,
      scriptTemplate: 'Olá {nome}, seu veículo {veiculo} está pronto.',
    }

    render(
      <ExecuteNextStepPanel
        isOpen={true}
        onClose={() => {}}
        opportunity={opportunityWithMissingVar}
        scriptVariables={{ nome: 'Carlos' }}
      />,
    )

    const whatsappBtn = screen.getByRole('button', { name: /Abrir WhatsApp/i }) as HTMLButtonElement
    expect(whatsappBtn.disabled).toBe(true)

    expect(screen.getByText('{veiculo}')).toBeTruthy()
  })

  it('4. SCR-INTERNO: sem botão WhatsApp, com ação interna', async () => {
    const repo = new MockMentorRepository()
    const internalOpportunity: OpportunityData = {
      ...baseOpportunity,
      scriptRef: 'SCR-INTERNO',
      scriptTemplate: null,
    }

    render(
      <ExecuteNextStepPanel
        isOpen={true}
        onClose={() => {}}
        opportunity={internalOpportunity}
        repository={repo}
      />,
    )

    expect(screen.queryByText('Abrir WhatsApp')).toBeNull()

    const internalBtn = screen.getByRole('button', { name: /Executar ação interna/i })
    expect(internalBtn).toBeTruthy()

    await act(async () => {
      fireEvent.click(internalBtn)
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(repo.appliedEvents).toHaveLength(1)
    expect(repo.appliedEvents[0].result).toBe('Mensagem enviada')
  })

  it('5. Sem prioridade calculada, aparece "Prioridade não calculada" — nunca uma classe inventada', () => {
    const uncalculatedOpportunity: OpportunityData = {
      ...baseOpportunity,
      priorityClass: null,
      decision: null,
    }

    render(
      <ExecuteNextStepPanel
        isOpen={true}
        onClose={() => {}}
        opportunity={uncalculatedOpportunity}
      />,
    )

    expect(screen.getByText('Prioridade não calculada')).toBeTruthy()
    expect(screen.queryByText(/Prioridade P[0-9]/i)).toBeNull()
  })

  it('6. Sem repositório, executar NÃO finge sucesso: reporta erro', async () => {
    const onSuccess = mock(() => {})
    const onError = mock((err: Error) => {
      expect(err.message).toContain('Repositório')
    })

    render(
      <ExecuteNextStepPanel
        isOpen={true}
        onClose={() => {}}
        opportunity={baseOpportunity}
        repository={null}
        scriptVariables={defaultVariables}
        onSuccess={onSuccess}
        onError={onError}
      />,
    )

    const sentBtn = screen.getByRole('button', { name: /Mensagem enviada/i })
    await act(async () => {
      fireEvent.click(sentBtn)
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })
})
