/** Estados visíveis do autosave do fechamento. */
export type AutosaveStatus =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'conflict'
  | 'error'

/**
 * Classificação do erro devolvido pela gravação. Só `transient` é elegível a
 * retry automático: repetir uma falha de autenticação, de validação ou um
 * conflito de versão apenas repete o mesmo erro e esconde o problema real.
 */
export type AutosaveFailureKind = 'transient' | 'conflict' | 'auth' | 'validation' | 'fatal'

export interface AutosaveSaveSuccess {
  ok: true
  /** Revisão devolvida pelo servidor após a gravação. */
  revision: number
  savedAt: string
}

export interface AutosaveSaveFailure {
  ok: false
  kind: AutosaveFailureKind
  message: string
  /** Revisão corrente no servidor, quando o erro é de conflito. */
  serverRevision?: number
}

export type AutosaveSaveResult = AutosaveSaveSuccess | AutosaveSaveFailure

export interface AutosaveState {
  status: AutosaveStatus
  /** ISO do último rascunho confirmado pelo servidor. */
  lastSavedAt: string | null
  /** Revisão conhecida do rascunho; base do controle otimista. */
  revision: number
  error: string | null
  /** Revisão do servidor quando houve conflito, para a UI orientar o usuário. */
  serverRevision: number | null
  /** Há alteração ainda não confirmada pelo servidor. */
  pending: boolean
}

export interface AutosaveTimers {
  setTimeout: (handler: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
}
