/**
 * Componente MentorCarteiraSection — Mentor Comercial (TAREFA B01).
 *
 * Ponto de composição da rota /carteira-clientes:
 *  - Recebe a lista de oportunidades (`CarteiraOportunidade[]`)
 *  - Exibe a lista determinística em UMA COLUNA no desktop (cards horizontais amplos) via `CarteiraAtivaList`
 *  - Orquestra a abertura/fechamento das superfícies interativas:
 *      * Drawer "Executar Próximo Passo" (`ExecuteNextStepPanel`)
 *      * Modal "Atualização Guiada de Situação" (`GuidedStatusUpdate`)
 *      * Visão "Ficha da Oportunidade" (`FichaOportunidade`)
 *
 * Identidade visual: Cabeçalho/Sidebar azul-marinho, azul principal, cards brancos,
 * tipografia Inter e fundo claro.
 */

import React, { useCallback, useMemo, useState } from 'react'
import { CarteiraAtivaList } from './CarteiraAtivaList'
import { ExecuteNextStepPanel } from './ExecuteNextStepPanel'
import { GuidedStatusUpdate } from './GuidedStatusUpdate'
import { FichaOportunidade } from './FichaOportunidade'
import type { CarteiraOportunidade } from './OportunidadeCard'
import type { OpportunityData } from './useExecuteNextStep'
import type { MentorDecision, OpportunityFacts, StatusDefinition } from '../engine/engine'
import type { PotentialLevel } from '../engine/priority'
import type { ScoreClassification } from '../engine/score'
import type { PriorityClassification } from '../engine/priority'
import type { MentorRepository } from '../application/mentorApplicationService'

export type MentorCarteiraSectionProps = {
  oportunidades?: CarteiraOportunidade[]
  loading?: boolean
  repository?: MentorRepository | null
  onOpportunityUpdated?: () => void
}

function parseScoreClass(str?: string | null): ScoreClassification {
  if (str === 'Excelente' || str === 'Boa' || str === 'Atenção' || str === 'Crítica') {
    return str
  }
  return 'Boa'
}

function parsePriorityClass(str?: string | null): PriorityClassification {
  if (str === 'Máxima' || str === 'Alta' || str === 'Média' || str === 'Baixa') {
    return str
  }
  return 'Média'
}

function parsePotentialLevel(str?: string | null): PotentialLevel | null {
  if (str === 'Muito alto' || str === 'Alto' || str === 'Médio' || str === 'Baixo') {
    return str
  }
  return null
}

export function mapCarteiraOportunidadeToOpportunityData(op: CarteiraOportunidade): OpportunityData {
  return {
    opportunityId: op.id,
    clientId: op.cliente_id || op.id,
    clientName: op.cliente_nome || 'Cliente sem nome',
    clientPhone: op.cliente_whatsapp || op.cliente_telefone || null,
    storeId: '', // TODO: obter storeId do contexto da loja quando disponível
    sellerId: op.current_responsible || 'Vendedor',
    channel: op.channel_entry || op.canal || 'Carteira',
    detailedOrigin: op.detailed_origin || op.origem_modulo || null,
    statusCode: op.current_status_code || 'CAR-C01',
    statusLabel: op.status_label || op.current_status_code || 'Cadência Inicial',
    family: 'Sem Contato Comprador', // TODO: resolver família a partir da definição do catálogo
    responsible: op.current_responsible || 'Vendedor',
    temperature: op.temperature || null,
    potential: op.potential || null,
    objective: op.current_objective || 'Desenvolver oportunidade na carteira',
    nextStep: op.current_next_step || 'Executar próxima ação programada',
    cadenceCode: null, // TODO: vincular cadence_code do catálogo quando disponível
    cadenceStep: op.current_cadence_step ?? null,
    totalCadenceAttempts: null,
    nextActionAt: op.next_action_at ? new Date(op.next_action_at) : null,
    scriptRef: null,
    scriptTemplate: null,
    pendingFlags: [], // TODO: conectar flags pendentes a partir da tabela mentor_pending_flags
    mentorGuidance: op.mentor_guidance || null,
    centralRule: null,
    priorityIndex: op.priority_index ?? null,
    priorityClass: op.priority_class ?? null,
    decision: null,
  }
}

export function buildDecisionAndFactsFromCarteiraOportunidade(op: CarteiraOportunidade): {
  decision: MentorDecision
  facts: OpportunityFacts
} {
  const nextActionDate = op.next_action_at ? new Date(op.next_action_at) : null
  const appointmentDate = op.appointment_at ? new Date(op.appointment_at) : null

  const facts: OpportunityFacts = {
    statusCode: op.current_status_code || 'CAR-C01',
    nextActionAt: nextActionDate,
    clientRespondedAt: null, // TODO: obter histórico de resposta do cliente via eventos comerciais
    clientNeverResponded: false,
    appointmentAt: appointmentDate,
    cadenceAttempt: op.current_cadence_step ?? 1,
    cadenceState: null,
    quality: {
      status: 'complete',
      nextStep: 'complete',
      execution: 'onTime',
      cadence: 'respected',
      history: 'complete',
    },
    pendingFlags: [], // TODO: carregar mentor_pending_flags da oportunidade
    returnStatusCode: null,
  }

  const explanationsList: string[] = Array.isArray(op.explanation)
    ? op.explanation
    : op.explanation
      ? [op.explanation]
      : ['Oportunidade em acompanhamento ativo no Mentor Comercial.']

  const decision: MentorDecision = {
    statusCode: op.current_status_code || 'CAR-C01',
    previousStatusCode: null,
    returnStatusCode: null,
    statusLabel: op.status_label || op.current_status_code || 'Cadência Inicial',
    family: 'Sem Contato Comprador',
    channel: op.channel_entry || op.canal || 'Carteira',
    responsible: op.current_responsible || 'Vendedor',
    temperature: op.temperature || null,
    objective: op.current_objective || 'Desenvolver a oportunidade comercial',
    nextStep: op.current_next_step || 'Executar próximo passo da cadência',
    potential: parsePotentialLevel(op.potential),
    cadenceCode: null,
    cadenceMode: null,
    cadenceStep: op.current_cadence_step ?? null,
    cadenceState: null,
    script: {
      resolved: true,
      scriptId: 'script_padrao',
      reason: 'RESOLVED',
    },
    scriptRef: null,
    nextActionAt: nextActionDate,
    pendingFlags: [],
    score: {
      total: op.mentor_score ?? 100,
      classification: parseScoreClass(op.mentor_score_class),
      breakdown: {
        status: 15,
        nextStep: 20,
        execution: 30,
        cadence: 20,
        history: 15,
      },
      alerts: [],
      clientNeverResponded: false,
    },
    priority: {
      index: op.priority_index ?? 50,
      classification: parsePriorityClass(op.priority_class),
      urgencyPoints: 90,
      potentialPoints: 50,
      risk: 0,
      appliedOverrides: [],
      slaConfigured: false,
      baseClassification: parsePriorityClass(op.priority_class),
    },
    urgency: 'actionToday',
    centralAction: false,
    centralRule: null,
    attackEligible: false,
    transition: null,
    requiresManualUpdate: Boolean(op.needs_mentor_classification),
    explanations: explanationsList,
    ruleVersion: 'v1',
  }

  return { decision, facts }
}

const dummyOpportunityData: OpportunityData = {
  opportunityId: '',
  clientId: '',
  clientName: '',
  clientPhone: null,
  storeId: '',
  sellerId: '',
  channel: 'Carteira',
  detailedOrigin: null,
  statusCode: 'CAR-C01',
  statusLabel: '',
  family: '',
  responsible: '',
  temperature: null,
  potential: null,
  objective: '',
  nextStep: '',
  cadenceCode: null,
  cadenceStep: null,
  totalCadenceAttempts: null,
  nextActionAt: null,
  scriptRef: null,
  scriptTemplate: null,
  pendingFlags: [],
  mentorGuidance: null,
  centralRule: null,
  priorityIndex: null,
  priorityClass: null,
  decision: null,
}

export const MentorCarteiraSection: React.FC<MentorCarteiraSectionProps> = ({
  oportunidades = [],
  loading = false,
  repository,
  onOpportunityUpdated,
}) => {
  const [executeOp, setExecuteOp] = useState<CarteiraOportunidade | null>(null)
  const [statusUpdateOp, setStatusUpdateOp] = useState<CarteiraOportunidade | null>(null)
  const [fichaOp, setFichaOp] = useState<CarteiraOportunidade | null>(null)

  const executeOpportunityData: OpportunityData = useMemo(() => {
    if (!executeOp) return dummyOpportunityData
    return mapCarteiraOportunidadeToOpportunityData(executeOp)
  }, [executeOp])

  const fichaContext = useMemo(() => {
    if (!fichaOp) return null
    return buildDecisionAndFactsFromCarteiraOportunidade(fichaOp)
  }, [fichaOp])

  const handleConfirmStatusUpdate = useCallback(
    async (_selectedStatus: StatusDefinition, _extraData?: { notes?: string }) => {
      setStatusUpdateOp(null)
      onOpportunityUpdated?.()
    },
    [onOpportunityUpdated]
  )

  const handleExecuteSuccess = useCallback(() => {
    onOpportunityUpdated?.()
  }, [onOpportunityUpdated])

  return (
    <section className="w-full bg-slate-50 py-4">
      {/* Componente principal de listagem em UMA coluna */}
      <CarteiraAtivaList
        oportunidades={oportunidades}
        loading={loading}
        onExecutar={(op) => setExecuteOp(op)}
        onAtualizarSituacao={(op) => setStatusUpdateOp(op)}
        onAbrirFicha={(op) => setFichaOp(op)}
      />

      {/* Drawer: Executar Próximo Passo */}
      {executeOp && (
        <ExecuteNextStepPanel
          isOpen={Boolean(executeOp)}
          onClose={() => setExecuteOp(null)}
          opportunity={executeOpportunityData}
          repository={repository}
          onSuccess={handleExecuteSuccess}
          onUpdateStatus={() => {
            const op = executeOp
            setExecuteOp(null)
            setStatusUpdateOp(op)
          }}
          onOpenDetails={() => {
            const op = executeOp
            setExecuteOp(null)
            setFichaOp(op)
          }}
        />
      )}

      {/* Modal: Atualização Guiada de Situação */}
      {statusUpdateOp && (
        <GuidedStatusUpdate
          isOpen={Boolean(statusUpdateOp)}
          onClose={() => setStatusUpdateOp(null)}
          channel={statusUpdateOp.channel_entry || statusUpdateOp.canal || 'Carteira'}
          currentStatusCode={statusUpdateOp.current_status_code || null}
          pendingFlags={null} // TODO: repassar pendingFlags quando a fonte de dados disponibilizar
          opportunityId={statusUpdateOp.id}
          onConfirm={handleConfirmStatusUpdate}
        />
      )}

      {/* Visão de Consulta: Ficha da Oportunidade */}
      {fichaOp && fichaContext && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Ficha da Oportunidade"
        >
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <FichaOportunidade
              decision={fichaContext.decision}
              facts={fichaContext.facts}
              onClose={() => setFichaOp(null)}
              onExecuteNextStep={() => {
                const op = fichaOp
                setFichaOp(null)
                setExecuteOp(op)
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
