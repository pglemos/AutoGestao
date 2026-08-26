import { supabase } from '@/lib/supabase'

/**
 * Trilhas de auditoria do sistema.
 *
 * O banco tem cinco trilhas reais, cada uma escrita por um caminho diferente e
 * com colunas próprias. A tela /auditoria as expõe lado a lado, normalizando
 * todas para a mesma linha: quando aconteceu, quem fez, o que fez, sobre o quê
 * e em qual contexto.
 *
 * Nenhuma linha é sintetizada: o que não existe no registro fica vazio (`—`),
 * nunca preenchido com outro campo ou com o relógio da requisição.
 */
export type AuditTrailKey =
  | 'admin_mx'
  | 'loja'
  | 'checkin'
  | 'fechamento_d1'
  | 'correcao_dados'

export interface AuditTrailEntry {
  id: string
  /** ISO do momento do registro; vazio quando a trilha não gravou data. */
  timestamp: string
  actor: string
  action: string
  resource: string
  context: string
}

export interface AuditTrailDefinition {
  key: AuditTrailKey
  label: string
  /** Explica de onde a trilha vem, para a tela não parecer genérica. */
  description: string
  table: string
}

export const AUDIT_TRAILS: AuditTrailDefinition[] = [
  {
    key: 'admin_mx',
    label: 'Administração MX',
    description: 'Ações da área interna MX sobre usuários e vínculos de loja.',
    table: 'internal_mx_admin_audit',
  },
  {
    key: 'loja',
    label: 'Cadastro de loja',
    description: 'Alterações no cadastro das lojas, campo a campo.',
    table: 'logs_auditoria_loja',
  },
  {
    key: 'checkin',
    label: 'Check-in',
    description: 'Correções e regularizações de fechamento diário do vendedor.',
    table: 'checkin_audit_logs',
  },
  {
    key: 'fechamento_d1',
    label: 'Fechamento D1',
    description: 'Cancelamentos e ajustes de venda no fechamento do dia seguinte.',
    table: 'd1_audit_log',
  },
  {
    key: 'correcao_dados',
    label: 'Correção de dados',
    description: 'Correções aplicadas por migração ou rotina de manutenção.',
    table: 'data_correction_audit',
  },
]

const EMPTY = '—'

/** Limite por trilha: o suficiente para investigar sem paginar a tela. */
const PAGE = 200

type NameMap = Map<string, string>

function toNameMap(rows: Array<{ id: string; name?: string | null; email?: string | null }>): NameMap {
  return new Map(rows.map(row => [row.id, row.name || row.email || row.id]))
}

async function namesById(table: 'usuarios' | 'lojas', ids: string[]): Promise<NameMap> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map()
  // O select literal é exigido pelo parser de tipos do supabase-js: uma string
  // montada em runtime vira `ParserError` na inferência.
  if (table === 'usuarios') {
    const { data } = await supabase.from('usuarios').select('id, name, email').in('id', unique)
    return toNameMap(data ?? [])
  }
  const { data } = await supabase.from('lojas').select('id, name').in('id', unique)
  return toNameMap(data ?? [])
}

/** `{ campo: { old, new } }` → `campo, campo`. Usado no cadastro de loja. */
export function changedFieldList(changes: unknown): string {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return EMPTY
  const keys = Object.keys(changes as Record<string, unknown>)
  return keys.length > 0 ? keys.join(', ') : EMPTY
}

/** `ganho → cancelada`, para trilhas que guardam valor anterior e novo. */
export function valueTransition(before: unknown, after: unknown): string {
  const from = before == null || before === '' ? EMPTY : String(before)
  const to = after == null || after === '' ? EMPTY : String(after)
  if (from === EMPTY && to === EMPTY) return EMPTY
  return `${from} → ${to}`
}

/** `{ id: 'uuid' }` → `id: uuid`. Identidade da linha corrigida. */
export function rowIdentityLabel(identity: unknown): string {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) return EMPTY
  const entries = Object.entries(identity as Record<string, unknown>)
  if (entries.length === 0) return EMPTY
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ')
}

async function fetchAdminMx(): Promise<AuditTrailEntry[]> {
  const { data } = await supabase
    .from('internal_mx_admin_audit')
    .select('id, actor_id, action, entity_type, store_id, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE)

  const rows = data ?? []
  const [actors, stores] = await Promise.all([
    namesById('usuarios', rows.map(r => r.actor_id as string)),
    namesById('lojas', rows.map(r => r.store_id as string)),
  ])

  return rows.map(row => ({
    id: row.id as string,
    timestamp: (row.created_at as string) ?? '',
    actor: (row.actor_id && actors.get(row.actor_id as string)) || EMPTY,
    action: (row.action as string) ?? EMPTY,
    resource: (row.entity_type as string) ?? EMPTY,
    context: (row.store_id && stores.get(row.store_id as string)) || EMPTY,
  }))
}

async function fetchLoja(): Promise<AuditTrailEntry[]> {
  const { data } = await supabase
    .from('logs_auditoria_loja')
    .select('id, store_id, changed_by, changes, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE)

  const rows = data ?? []
  const [actors, stores] = await Promise.all([
    namesById('usuarios', rows.map(r => r.changed_by as string)),
    namesById('lojas', rows.map(r => r.store_id as string)),
  ])

  return rows.map(row => ({
    id: row.id as string,
    timestamp: (row.created_at as string) ?? '',
    actor: (row.changed_by && actors.get(row.changed_by as string)) || EMPTY,
    action: 'update',
    resource: changedFieldList(row.changes),
    context: (row.store_id && stores.get(row.store_id as string)) || EMPTY,
  }))
}

async function fetchCheckin(): Promise<AuditTrailEntry[]> {
  const { data } = await supabase
    .from('checkin_audit_logs')
    .select('id, changed_by, change_type, seller_id, store_id, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE)

  const rows = data ?? []
  const [people, stores] = await Promise.all([
    namesById('usuarios', [
      ...rows.map(r => r.changed_by as string),
      ...rows.map(r => r.seller_id as string),
    ]),
    namesById('lojas', rows.map(r => r.store_id as string)),
  ])

  return rows.map(row => {
    const seller = (row.seller_id && people.get(row.seller_id as string)) || EMPTY
    const store = (row.store_id && stores.get(row.store_id as string)) || EMPTY
    return {
      id: row.id as string,
      timestamp: (row.created_at as string) ?? '',
      actor: (row.changed_by && people.get(row.changed_by as string)) || EMPTY,
      action: (row.change_type as string) ?? EMPTY,
      resource: seller === EMPTY ? 'Check-in' : `Check-in de ${seller}`,
      context: (row.reason as string) || store,
    }
  })
}

async function fetchFechamentoD1(): Promise<AuditTrailEntry[]> {
  const { data } = await supabase
    .from('d1_audit_log')
    .select('id, usuario_id, usuario_nome, tipo_alteracao, valor_anterior, valor_novo, data_hora_alteracao, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE)

  const rows = data ?? []
  const actors = await namesById('usuarios', rows.map(r => r.usuario_id as string))

  return rows.map(row => ({
    id: row.id as string,
    // `data_hora_alteracao` é o momento do fato; `created_at`, o do registro.
    timestamp: (row.data_hora_alteracao as string) || (row.created_at as string) || '',
    actor:
      (row.usuario_nome as string) ||
      (row.usuario_id && actors.get(row.usuario_id as string)) ||
      EMPTY,
    action: (row.tipo_alteracao as string) ?? EMPTY,
    resource: 'Fechamento D1',
    context: valueTransition(row.valor_anterior, row.valor_novo),
  }))
}

async function fetchCorrecaoDados(): Promise<AuditTrailEntry[]> {
  const { data } = await supabase
    .from('data_correction_audit')
    .select('id, correction_key, table_name, row_identity, action, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE)

  return (data ?? []).map(row => ({
    id: row.id as string,
    timestamp: (row.created_at as string) ?? '',
    // Correções são aplicadas por migração/rotina, não por uma pessoa.
    actor: (row.correction_key as string) || 'Rotina de manutenção',
    action: (row.action as string) ?? EMPTY,
    resource: (row.table_name as string) ?? EMPTY,
    context: rowIdentityLabel(row.row_identity),
  }))
}

const FETCHERS: Record<AuditTrailKey, () => Promise<AuditTrailEntry[]>> = {
  admin_mx: fetchAdminMx,
  loja: fetchLoja,
  checkin: fetchCheckin,
  fechamento_d1: fetchFechamentoD1,
  correcao_dados: fetchCorrecaoDados,
}

export function fetchAuditTrail(key: AuditTrailKey): Promise<AuditTrailEntry[]> {
  return FETCHERS[key]()
}

export function matchesAuditSearch(entry: AuditTrailEntry, term: string): boolean {
  if (!term) return true
  const needle = term.toLowerCase()
  return [entry.actor, entry.action, entry.resource, entry.context].some(value =>
    value.toLowerCase().includes(needle),
  )
}

export function formatAuditTimestamp(timestamp: string): string {
  if (!timestamp) return 'Data não registrada'
  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? 'Data não registrada' : parsed.toLocaleString('pt-BR')
}
