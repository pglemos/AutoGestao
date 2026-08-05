import type { AutosaveFailureKind, AutosaveSaveResult } from './checkin-autosave.types'

/**
 * Traduz o erro devolvido por `saveCheckin` na natureza da falha.
 *
 * A distinção existe para o coordenador saber o que repetir. Insistir numa
 * sessão expirada ou num payload recusado por regra de negócio só produz o
 * mesmo erro três vezes e esconde a causa do usuário.
 */
const AUTH_MARKERS = [
  'não autenticado',
  'nao autenticado',
  'inativo',
  'jwt',
  'sessão expirada',
  'sessao expirada',
]

const VALIDATION_MARKERS = [
  'escopo de check-in inválido',
  'payload de check-in incompleto',
  'data operacional ativa',
  'data futura',
  'vínculo ativo',
  'vinculo ativo',
  'não está ativo nesta loja',
  'nao esta ativo nesta loja',
  'permitido apenas para vendedor',
  'próprio vendedor',
  'proprio vendedor',
  'restrito a gestores',
  'já concluído',
  'ja concluido',
]

export function classifyAutosaveFailure(message: string | null | undefined): AutosaveFailureKind {
  const normalized = (message || '').toLowerCase()
  if (!normalized) return 'transient'
  if (AUTH_MARKERS.some(marker => normalized.includes(marker))) return 'auth'
  if (VALIDATION_MARKERS.some(marker => normalized.includes(marker))) return 'validation'
  // Falha de rede, timeout e 5xx caem aqui: são os casos em que repetir tem
  // chance real de resolver.
  return 'transient'
}

export function autosaveResultFromSave(args: {
  error: string | null
  code?: string | null
  revision?: number | null
  savedAt?: string | null
  serverRevision?: number | null
  expectedRevision: number
}): AutosaveSaveResult {
  const { error, code, revision, savedAt, serverRevision, expectedRevision } = args
  if (!error) {
    return {
      ok: true,
      // Servidor sem a migration ainda não devolve revisão: seguir contando
      // localmente mantém o autosave funcional durante o rollout.
      revision: revision ?? expectedRevision + 1,
      savedAt: savedAt ?? new Date().toISOString(),
    }
  }
  if (code === 'DRAFT_VERSION_CONFLICT') {
    return {
      ok: false,
      kind: 'conflict',
      message: error,
      serverRevision: serverRevision ?? undefined,
    }
  }
  return { ok: false, kind: classifyAutosaveFailure(error), message: error }
}

export type { AutosaveSaveResult }
