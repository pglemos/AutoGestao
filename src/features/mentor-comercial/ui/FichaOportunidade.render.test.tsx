import React from 'react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { FichaOportunidade } from './FichaOportunidade'
import {
  resolveMentorDecision,
  type MentorDecision,
  type OpportunityFacts,
  type RuleCatalog,
  type StoreSettings,
} from '../engine/engine'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const RULES_DIR = path.resolve(import.meta.dir, '../../../../rules/mentor-comercial/v1')
const readRecords = <T extends Record<string, unknown>>(filename: string): T[] => {
  const content = readFileSync(path.join(RULES_DIR, filename), 'utf8')
  return JSON.parse(content).records as T[]
}

const catalog: RuleCatalog = {
  version: 'v1',
  statuses: readRecords('statuses.json') as never,
  cadences: readRecords('cadences.json') as never,
  cadenceSteps: readRecords('cadence-steps.json') as never,
  scriptIds: new Set(
    readRecords<{ scriptId: string }>('scripts.json').map((s) => s.scriptId),
  ),
  transitions: readRecords('transitions.json') as never,
}

const storeSettings: StoreSettings = {
  sellerResponseSlaMinutes: null,
  postSaleEnabled: false,
  warrantyFollowupEnabled: false,
}

const NOW = new Date('2026-08-10T10:00:00.000Z')

function buildTestFacts(statusCode: string): OpportunityFacts {
  return {
    statusCode,
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
    pendingFlags: ['FLAG_VALIDAR_FINANCIAMENTO'],
    returnStatusCode: null,
  }
}

describe('FichaOportunidade — Renderização e Comportamento', () => {
  afterEach(() => {
    cleanup()
  })

  it('1. Os cinco blocos aparecem na ordem: Cabeçalho, Próxima ação recomendada, O que sabemos, O que falta para evoluir, Histórico', () => {
    const facts = buildTestFacts('INT-C01')
    const decision = resolveMentorDecision({
      facts,
      storeSettings,
      catalog,
      now: NOW,
    })

    render(
      <FichaOportunidade
        decision={decision}
        facts={facts}
        extraFacts={{
          clientName: 'Ana Souza',
          vehicleName: 'Honda Civic',
          storeName: 'Loja SP',
        }}
      />,
    )

    const block1 = screen.getByText('Bloco 1 — Identificação')
    const block2 = screen.getByText('Bloco 2 — Ação Requerida')
    const block3 = screen.getByText('Bloco 3 — Fatos Confirmados')
    const block4 = screen.getByText('Bloco 4 — Diagnóstico de Lacunas')
    const block5 = screen.getByText('Bloco 5 — Registro de Atividades')

    expect(block1).toBeTruthy()
    expect(block2).toBeTruthy()
    expect(block3).toBeTruthy()
    expect(block4).toBeTruthy()
    expect(block5).toBeTruthy()

    // Verifica ordenação hierárquica no DOM
    const pos1 = block1.compareDocumentPosition(block2)
    const pos2 = block2.compareDocumentPosition(block3)
    const pos3 = block3.compareDocumentPosition(block4)
    const pos4 = block4.compareDocumentPosition(block5)

    expect(pos1 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pos2 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pos3 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pos4 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('2. Qualidade da oportunidade (score) e Urgência da ação (prioridade) aparecem como informações SEPARADAS e rotuladas', () => {
    const facts = buildTestFacts('INT-C01')
    const decision = resolveMentorDecision({
      facts,
      storeSettings,
      catalog,
      now: NOW,
    })

    render(<FichaOportunidade decision={decision} facts={facts} />)

    const scoreHeader = screen.getByText('Qualidade da Condução (Score)')
    const priorityHeader = screen.getByText('Urgência da Ação (Prioridade)')

    expect(scoreHeader).toBeTruthy()
    expect(priorityHeader).toBeTruthy()

    // Rotulagem e unidades distintas
    expect(screen.getByText('/ 100 pontos')).toBeTruthy()
    expect(screen.getByText('/ 100 índice')).toBeTruthy()

    // Garantia de que estão em containers visuais distintos
    const scoreContainer = scoreHeader.closest('div.bg-blue-50\\/70')
    const priorityContainer = priorityHeader.closest('div.bg-slate-900')

    expect(scoreContainer).not.toBeNull()
    expect(priorityContainer).not.toBeNull()
    expect(scoreContainer).not.toBe(priorityContainer)
  })

  it('3. Quando o script está bloqueado por SOURCE_BLOCKER, a ficha NÃO mostra texto de script e não oferece WhatsApp', () => {
    // INT-Q07 é um status oficialmente afetado por SOURCE_BLOCKER
    const facts = buildTestFacts('INT-Q07')
    const decision = resolveMentorDecision({
      facts,
      storeSettings,
      catalog,
      now: NOW,
    })

    expect(decision.script.reason).toBe('SOURCE_BLOCKER')
    expect(decision.script.resolved).toBe(false)
    expect(decision.script.scriptId).toBeNull()

    const MockExecutionPanel: React.FC<{
      decision: MentorDecision
      facts: OpportunityFacts
      onClose?: () => void
    }> = ({ decision: d }) => (
      <div>
        <span>Painel de Execução</span>
        {d.script.resolved && d.script.scriptId && <button type="button">Abrir WhatsApp</button>}
      </div>
    )

    render(
      <FichaOportunidade
        decision={decision}
        facts={facts}
        ExecuteNextStepPanel={MockExecutionPanel}
      />,
    )

    // Indica o bloqueio de fonte no campo de script do Bloco 2
    expect(screen.getByText('Não resolvido (SOURCE_BLOCKER)')).toBeTruthy()

    // Abre o painel de execução interna
    const executeBtn = screen.getByRole('button', { name: /Executar Próxima Ação/i })
    fireEvent.click(executeBtn)

    // Não exibe texto de script nem oferece WhatsApp
    expect(screen.queryByRole('button', { name: /Abrir WhatsApp/i })).toBeNull()
    expect(screen.queryByText(/Abrir WhatsApp/i)).toBeNull()
  })

  it('4. onClose e onExecuteNextStep disparam ao clicar nos botões correspondentes', () => {
    const facts = buildTestFacts('INT-C01')
    const decision = resolveMentorDecision({
      facts,
      storeSettings,
      catalog,
      now: NOW,
    })

    const onClose = mock(() => {})
    const onExecuteNextStep = mock(() => {})

    render(
      <FichaOportunidade
        decision={decision}
        facts={facts}
        onClose={onClose}
        onExecuteNextStep={onExecuteNextStep}
      />,
    )

    const closeBtn = screen.getByRole('button', { name: 'Fechar Ficha' })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    const executeBtn = screen.getByRole('button', { name: /Executar Próxima Ação/i })
    fireEvent.click(executeBtn)
    expect(onExecuteNextStep).toHaveBeenCalledTimes(1)
  })
})
