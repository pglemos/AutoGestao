import { useCallback, useMemo, useState } from 'react'

import { resolveMentorDecision, type MentorDecision, type OpportunityFacts } from '../engine/engine'
import type { MentorRepository, OpportunityRef } from '../application/mentorApplicationService'
import { CarteiraAtivaList } from './CarteiraAtivaList'
import { ExecuteNextStepPanel } from './ExecuteNextStepPanel'
import { FichaOportunidade } from './FichaOportunidade'
import { GuidedStatusUpdate } from './GuidedStatusUpdate'
import type { CarteiraOportunidade } from './OportunidadeCard'
import type { OpportunityData } from './useExecuteNextStep'

/**
 * Ponto de composição do Mentor Comercial dentro da Carteira existente.
 *
 * REGRA CENTRAL: esta camada NÃO decide nada. Ela exibe o que o motor já decidiu e
 * persistiu nas colunas `mentor_*` da oportunidade, e delega qualquer nova decisão
 * ao motor através do repositório.
 *
 * Em particular, esta camada nunca:
 * - calcula score, prioridade, cadência ou próximo passo;
 * - inventa texto de script, código de status ou família;
 * - preenche valor ausente com um padrão "otimista".
 *
 * Um Mentor que mostra score 100 porque o dado não veio é pior do que um Mentor que
 * diz que não sabe: o vendedor age sobre um número que nunca existiu.
 */

export type MentorCarteiraSectionProps = {
  oportunidades?: CarteiraOportunidade[]
  loading?: boolean
  /**
   * Repositório do Mentor. Sem ele a seção continua LISTANDO o que está persistido,
   * mas execução e ficha ficam indisponíveis — não são simuladas.
   */
  repository?: MentorRepository | null
  storeId?: string | null
  sellerId?: string | null
  ruleVersion?: string
  now?: Date
  onOpportunityUpdated?: () => void
}

type FichaState =
  | { phase: 'idle' }
  | { phase: 'loading'; opportunityId: string }
  | { phase: 'ready'; opportunityId: string; decision: MentorDecision; facts: OpportunityFacts }
  | { phase: 'unavailable'; opportunityId: string; reason: string }

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Converte a linha persistida em `OpportunityData`.
 *
 * Só campos obrigatórios do painel recebem fallback, e o fallback é textual e
 * honesto ("Não informado"), nunca um valor de domínio inventado. Campos de
 * decisão (score, prioridade, script) são repassados como estão: ausente é ausente.
 */
export function mapCarteiraOportunidadeToOpportunityData(
  op: CarteiraOportunidade,
  storeId: string,
  sellerId: string,
): OpportunityData | null {
  // Sem status persistido não há decisão do Mentor para executar. A oportunidade
  // aparece na lista com "Definir situação atual", que é o caminho correto.
  if (!op.current_status_code) return null

  return {
    opportunityId: op.id,
    clientId: op.cliente_id,
    clientName: op.cliente_nome,
    clientPhone: op.cliente_whatsapp ?? op.cliente_telefone ?? null,
    storeId,
    sellerId,
    channel: op.channel_entry ?? op.canal ?? 'Não informado',
    detailedOrigin: op.detailed_origin ?? op.origem_modulo ?? null,
    statusCode: op.current_status_code,
    statusLabel: op.status_label ?? op.current_status_code,
    family: op.etapa ?? 'Não informado',
    responsible: op.current_responsible ?? 'Não informado',
    temperature: op.temperature ?? null,
    potential: op.potential ?? null,
    objective: op.current_objective ?? 'Não informado',
    nextStep: op.current_next_step ?? 'Não informado',
    cadenceStep: op.current_cadence_step ?? null,
    nextActionAt: toDate(op.next_action_at),
    mentorGuidance: op.mentor_guidance ?? null,
    priorityIndex: op.priority_index ?? null,
    priorityClass: op.priority_class ?? null,
    pendingFlags: [],
  }
}

export function MentorCarteiraSection({
  oportunidades = [],
  loading = false,
  repository = null,
  storeId = null,
  sellerId = null,
  ruleVersion = 'v1',
  now,
  onOpportunityUpdated,
}: MentorCarteiraSectionProps) {
  const [executing, setExecuting] = useState<CarteiraOportunidade | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<CarteiraOportunidade | null>(null)
  const [ficha, setFicha] = useState<FichaState>({ phase: 'idle' })

  const resolvedNow = useMemo(() => now ?? new Date(), [now])

  const executingData = useMemo(() => {
    if (!executing || !storeId || !sellerId) return null
    return mapCarteiraOportunidadeToOpportunityData(executing, storeId, sellerId)
  }, [executing, storeId, sellerId])

  const handleExecutar = useCallback((op: CarteiraOportunidade) => {
    setExecuting(op)
  }, [])

  const handleAtualizarSituacao = useCallback((op: CarteiraOportunidade) => {
    setUpdatingStatus(op)
  }, [])

  /**
   * A ficha exige uma decisão REAL. Ela é resolvida pelo motor a partir dos fatos
   * carregados do repositório — nunca montada aqui.
   */
  const handleAbrirFicha = useCallback(
    async (op: CarteiraOportunidade) => {
      if (!repository || !storeId || !sellerId) {
        setFicha({
          phase: 'unavailable',
          opportunityId: op.id,
          reason:
            'A ficha depende do motor do Mentor, que não está disponível nesta tela. Nenhum dado foi estimado.',
        })
        return
      }

      setFicha({ phase: 'loading', opportunityId: op.id })
      const ref: OpportunityRef = {
        opportunityId: op.id,
        clientId: op.cliente_id,
        storeId,
        sellerId,
      }

      try {
        const [facts, storeSettings, catalog] = await Promise.all([
          repository.loadFacts(ref),
          repository.loadStoreSettings(storeId),
          repository.loadCatalog(ruleVersion),
        ])
        const decision = resolveMentorDecision({
          facts,
          storeSettings,
          catalog,
          now: resolvedNow,
        })
        setFicha({ phase: 'ready', opportunityId: op.id, decision, facts })
      } catch (error) {
        setFicha({
          phase: 'unavailable',
          opportunityId: op.id,
          reason:
            error instanceof Error
              ? `Não foi possível carregar a ficha: ${error.message}`
              : 'Não foi possível carregar a ficha.',
        })
      }
    },
    [repository, storeId, sellerId, ruleVersion, resolvedNow],
  )

  const closeFicha = useCallback(() => setFicha({ phase: 'idle' }), [])

  return (
    <section aria-label="Mentor Comercial — Carteira Ativa">
      <CarteiraAtivaList
        oportunidades={oportunidades}
        loading={loading}
        onExecutar={handleExecutar}
        onAtualizarSituacao={handleAtualizarSituacao}
        onAbrirFicha={(op) => {
          void handleAbrirFicha(op)
        }}
      />

      {executingData ? (
        <ExecuteNextStepPanel
          isOpen
          onClose={() => setExecuting(null)}
          opportunity={executingData}
          repository={repository}
          now={resolvedNow}
          ruleVersion={ruleVersion}
          onSuccess={() => {
            setExecuting(null)
            onOpportunityUpdated?.()
          }}
          onUpdateStatus={() => {
            if (executing) setUpdatingStatus(executing)
            setExecuting(null)
          }}
          onOpenDetails={() => {
            if (executing) void handleAbrirFicha(executing)
          }}
        />
      ) : null}

      {updatingStatus ? (
        <GuidedStatusUpdate
          isOpen
          onClose={() => setUpdatingStatus(null)}
          channel={updatingStatus.channel_entry ?? updatingStatus.canal ?? null}
          currentStatusCode={updatingStatus.current_status_code ?? null}
          opportunityId={updatingStatus.id}
          onConfirm={() => {
            setUpdatingStatus(null)
            onOpportunityUpdated?.()
          }}
        />
      ) : null}

      {ficha.phase === 'loading' ? (
        <p role="status" className="p-4 text-sm text-slate-600">
          Carregando ficha da oportunidade…
        </p>
      ) : null}

      {ficha.phase === 'unavailable' ? (
        <p role="alert" className="p-4 text-sm text-slate-700">
          {ficha.reason}
        </p>
      ) : null}

      {ficha.phase === 'ready' ? (
        <FichaOportunidade
          decision={ficha.decision}
          facts={ficha.facts}
          onClose={closeFicha}
          onExecuteNextStep={() => {
            const op = oportunidades.find((o) => o.id === ficha.opportunityId)
            if (op) {
              closeFicha()
              setExecuting(op)
            }
          }}
        />
      ) : null}
    </section>
  )
}

export default MentorCarteiraSection
