/**
 * Hook para a UI "Executar Próximo Passo" (TASK 25).
 *
 * Gerencia o estado e as ações da gaveta do vendedor:
 *  - renderização estrita de scripts via `renderScript`
 *  - controle do botão WhatsApp (desabilitado quando incompleto ou bloqueado por fonte)
 *  - separação entre abrir WhatsApp (sem mudança de estado) e registrar mensagem enviada
 *  - invocação do `applyMentorEvent` do Application Service
 */

import { useCallback, useMemo, useState } from 'react'
import {
  isInternalScript,
  renderScript,
  SOURCE_BLOCKED_STATUSES,
  type RenderedScript,
  type ScriptVariables,
} from '../engine/script'
import {
  applyMentorEvent,
  type ApplyMentorEventResult,
  type MentorRepository,
  type OpportunityRef,
} from '../application/mentorApplicationService'
import type { MentorDecision } from '../engine/engine'

export type OpportunityData = {
  opportunityId: string
  clientId: string
  clientName: string
  clientPhone?: string | null
  storeId: string
  sellerId: string
  channel: string
  detailedOrigin?: string | null
  statusCode: string
  statusLabel: string
  family: string
  responsible: string
  temperature?: string | null
  potential?: string | null
  objective: string
  nextStep: string
  cadenceCode?: string | null
  cadenceStep?: number | null
  totalCadenceAttempts?: number | null
  nextActionAt?: Date | string | null
  scriptRef?: string | null
  scriptTemplate?: string | null
  pendingFlags?: string[]
  mentorGuidance?: string | null
  centralRule?: string | null
  priorityIndex?: number | null
  priorityClass?: string | null
  decision?: MentorDecision | null
}

export type UseExecuteNextStepOptions = {
  opportunity: OpportunityData
  repository?: MentorRepository | null
  scriptVariables?: ScriptVariables
  now?: Date
  ruleVersion?: string
  onSuccess?: (result: ApplyMentorEventResult) => void
  onError?: (error: Error) => void
  onOpenWhatsApp?: (phone: string, text: string) => void
  onCopyScript?: (text: string) => void
  onReschedule?: (newDate: Date) => void
  onUpdateStatus?: () => void
  onOpenDetails?: () => void
}

export type UseExecuteNextStepReturn = {
  renderedScript: RenderedScript
  isSourceBlocker: boolean
  isInternal: boolean
  missingVariables: string[]
  isSubmitting: boolean
  copied: boolean
  error: Error | null
  formattedNextActionAt: string | null
  handleCopyScript: () => Promise<boolean>
  handleOpenWhatsApp: () => boolean
  handleMessageSent: (customResult?: string) => Promise<ApplyMentorEventResult | null>
  handleExecuteInternal: () => Promise<ApplyMentorEventResult | null>
  handleReschedule: (newDate: Date) => void
  handleUpdateStatus: () => void
  handleOpenDetails: () => void
}

export function useExecuteNextStep(
  options: UseExecuteNextStepOptions,
): UseExecuteNextStepReturn {
  const {
    opportunity,
    repository = null,
    scriptVariables = {},
    now = new Date(),
    ruleVersion = 'v1',
    onSuccess,
    onError,
    onOpenWhatsApp,
    onCopyScript,
    onReschedule,
    onUpdateStatus,
    onOpenDetails,
  } = options

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const scriptRef = opportunity.scriptRef ?? opportunity.decision?.scriptRef ?? null
  const statusCode = opportunity.statusCode ?? opportunity.decision?.statusCode ?? ''

  const isSourceBlocker = useMemo(() => {
    if (opportunity.decision?.script?.reason === 'SOURCE_BLOCKER') return true
    if (statusCode in SOURCE_BLOCKED_STATUSES) return true
    if (scriptRef != null && scriptRef in SOURCE_BLOCKED_STATUSES) return true
    return false
  }, [opportunity.decision, statusCode, scriptRef])

  const isInternal = useMemo(() => {
    if (isInternalScript(scriptRef)) return true
    if (opportunity.decision?.script?.scriptId === 'SCR-INTERNO') return true
    return false
  }, [scriptRef, opportunity.decision])

  const renderedScript: RenderedScript = useMemo(() => {
    if (isSourceBlocker) {
      return {
        text: null,
        scriptReady: false,
        missingVariables: [],
        unknownPlaceholders: [],
        isInternal: false,
        allowWhatsApp: false,
      }
    }

    if (!opportunity.scriptTemplate) {
      return {
        text: null,
        scriptReady: false,
        missingVariables: [],
        unknownPlaceholders: [],
        isInternal,
        allowWhatsApp: false,
      }
    }

    return renderScript(opportunity.scriptTemplate, scriptVariables, { scriptId: scriptRef })
  }, [isSourceBlocker, opportunity.scriptTemplate, scriptVariables, scriptRef, isInternal])

  const missingVariables = renderedScript.missingVariables

  const formattedNextActionAt = useMemo(() => {
    const rawDate = opportunity.nextActionAt ?? opportunity.decision?.nextActionAt
    if (!rawDate) return null
    const dateObj = rawDate instanceof Date ? rawDate : new Date(rawDate)
    if (Number.isNaN(dateObj.getTime())) return null
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  }, [opportunity.nextActionAt, opportunity.decision])

  const handleCopyScript = useCallback(async (): Promise<boolean> => {
    if (!renderedScript.text) return false
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(renderedScript.text)
      }
      setCopied(true)
      onCopyScript?.(renderedScript.text)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
      return true
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      onError?.(e)
      return false
    }
  }, [renderedScript.text, onCopyScript, onError])

  /**
   * REGRA CRÍTICA: `Abrir WhatsApp` NÃO é `Mensagem enviada`.
   * Apenas abre o link do WhatsApp. Não altera estado e não chama o motor/banco.
   */
  const handleOpenWhatsApp = useCallback((): boolean => {
    if (!renderedScript.allowWhatsApp) return false

    const phoneRaw = opportunity.clientPhone ?? ''
    const cleanPhone = phoneRaw.replace(/\D/g, '')

    onOpenWhatsApp?.(cleanPhone, renderedScript.text ?? '')

    if (
      !onOpenWhatsApp &&
      typeof window !== 'undefined' &&
      cleanPhone &&
      renderedScript.text
    ) {
      const encodedText = encodeURIComponent(renderedScript.text)
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      window.open(url, '_blank')
    }

    return true
  }, [renderedScript, opportunity.clientPhone, onOpenWhatsApp])

  const executeEvent = useCallback(
    async (resultName: string): Promise<ApplyMentorEventResult | null> => {
      if (!repository) {
        // Sem repositório NÃO se fabrica decisão. Um Mentor que devolve score e
        // prioridade inventados quando não consegue persistir é pior do que um
        // Mentor que falha: o vendedor age sobre um número que nunca existiu.
        const e = new Error(
          'Repositório do Mentor indisponível: a ação não foi registrada. Nenhuma decisão foi calculada.',
        )
        setError(e)
        onError?.(e)
        return null
      }

      setIsSubmitting(true)
      setError(null)

      try {
        const ref: OpportunityRef = {
          opportunityId: opportunity.opportunityId,
          clientId: opportunity.clientId,
          storeId: opportunity.storeId,
          sellerId: opportunity.sellerId,
        }

        const idempotencyKey = `ui_exec_${opportunity.opportunityId}_${now.getTime()}`

        const result = await applyMentorEvent(repository, {
          ref,
          event: {
            result: resultName,
            at: now,
          },
          now,
          ruleVersion,
          idempotencyKey,
        })

        onSuccess?.(result)
        return result
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        onError?.(e)
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [repository, opportunity, now, ruleVersion, scriptRef, onSuccess, onError],
  )

  const handleMessageSent = useCallback(
    async (customResult?: string) => {
      return executeEvent(customResult ?? 'Mensagem enviada')
    },
    [executeEvent],
  )

  const handleExecuteInternal = useCallback(async () => {
    return executeEvent('Mensagem enviada')
  }, [executeEvent])

  const handleReschedule = useCallback(
    (newDate: Date) => {
      onReschedule?.(newDate)
    },
    [onReschedule],
  )

  const handleUpdateStatus = useCallback(() => {
    onUpdateStatus?.()
  }, [onUpdateStatus])

  const handleOpenDetails = useCallback(() => {
    onOpenDetails?.()
  }, [onOpenDetails])

  return {
    renderedScript,
    isSourceBlocker,
    isInternal,
    missingVariables,
    isSubmitting,
    copied,
    error,
    formattedNextActionAt,
    handleCopyScript,
    handleOpenWhatsApp,
    handleMessageSent,
    handleExecuteInternal,
    handleReschedule,
    handleUpdateStatus,
    handleOpenDetails,
  }
}
