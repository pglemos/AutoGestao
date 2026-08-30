import { supabase } from '@/lib/supabase'
import { describeAdminRpcError } from '../equipe/adminRpcErrors'
import { uniqueMasterChangeGuard, validatePersonAccessDraft, type PersonAccessDraft, type PersonStatus } from './personAccess'
import {
  collectClientStoreIds,
  isVinculoPersonId,
  mergeAccessAndVinculos,
  type UsuarioRow,
  type VinculoLojaRow,
} from './mergeClientPeople'

export type PersonAccessRow = {
  id: string
  client_id: string
  nome: string
  email: string
  telefone: string | null
  funcao_declarada: string | null
  papeis: string[]
  lojas_autorizadas: string[]
  is_dono_master: boolean
  visao_padrao: string | null
  status: string
  created_at: string
  /** De onde a pessoa veio: cadastro da consultoria, vínculo de loja ou os dois. */
  source?: 'acesso' | 'vinculo' | 'ambos'
}

/**
 * Pessoas do cliente = cadastro da consultoria + equipe operacional das lojas.
 *
 * Ler só `acessos_cliente_consultoria` mostrava zero pessoas em clientes que
 * já operam no app (a equipe vive em `vinculos_loja`). O merge é feito no
 * cliente porque as duas metades moram em domínios diferentes e só se
 * encontram pelas lojas do cliente.
 */
function tableError(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
): string | null {
  if (!error) return null
  return describeAdminRpcError(error, fallback)
}

export type ClientPersonsResult = {
  rows: PersonAccessRow[]
  /** Lojas do cliente, para rotular em qual unidade cada pessoa está autorizada. */
  stores: Array<{ id: string; name: string; parent_loja_id?: string | null }>
  error: string | null
}

export async function fetchClientPersons(clientId: string): Promise<ClientPersonsResult> {
  const [accessResult, clientResult, unitsResult, lojasResult] = await Promise.all([
    supabase.from('acessos_cliente_consultoria').select('*').eq('client_id', clientId),
    supabase.from('clientes_consultoria').select('primary_store_id').eq('id', clientId).maybeSingle(),
    supabase.from('unidades_cliente_consultoria').select('store_id').eq('client_id', clientId),
    supabase.from('lojas').select('id, name, parent_loja_id'),
  ])

  const failure = accessResult.error ?? clientResult.error ?? unitsResult.error ?? lojasResult.error
  if (failure) return { rows: [], stores: [], error: tableError(failure, 'Não foi possível carregar as pessoas do cliente.') }

  const acessos = (accessResult.data ?? []).map(row => ({
    ...row,
    papeis: Array.isArray(row.papeis) ? row.papeis : [],
    lojas_autorizadas: Array.isArray(row.lojas_autorizadas) ? row.lojas_autorizadas : [],
  })) as PersonAccessRow[]

  const storeIds = collectClientStoreIds({
    primaryStoreId: clientResult.data?.primary_store_id ?? null,
    unidades: unitsResult.data ?? [],
    lojas: lojasResult.data ?? [],
  })

  const storeIdSet = new Set(storeIds)
  const stores = (lojasResult.data ?? [])
    .filter(loja => storeIdSet.has(loja.id))
    .map(loja => ({ id: loja.id, name: loja.name ?? '', parent_loja_id: loja.parent_loja_id ?? null }))

  if (!storeIds.length) {
    return { rows: mergeAccessAndVinculos({ clientId, acessos }), stores, error: null }
  }

  const { data: vinculosData, error: vinculosError } = await supabase
    .from('vinculos_loja')
    .select('id, user_id, store_id, role, is_active, ended_at')
    .in('store_id', storeIds)
  if (vinculosError) return { rows: [], stores, error: tableError(vinculosError, 'Não foi possível carregar os vínculos das lojas.') }

  const vinculos = (vinculosData ?? []) as VinculoLojaRow[]
  const userIds = [...new Set(vinculos.map(vinculo => vinculo.user_id).filter(Boolean))]

  let usuarios: UsuarioRow[] = []
  if (userIds.length) {
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, name, email, active, phone, declared_function, default_view')
      .in('id', userIds)
    if (usuariosError) return { rows: [], stores, error: tableError(usuariosError, 'Não foi possível carregar os usuários vinculados.') }
    usuarios = (usuariosData ?? []) as UsuarioRow[]
  }

  return { rows: mergeAccessAndVinculos({ clientId, acessos, vinculos, usuarios }), stores, error: null }
}

/**
 * Garante uma linha em `acessos_cliente_consultoria` para a pessoa.
 *
 * Quem só tem vínculo de loja não tem id de acesso: qualquer update por id
 * sintético não atingiria linha nenhuma e falharia em silêncio. Aqui o
 * cadastro da consultoria é criado a partir do que a operação já sabe.
 */
async function ensureAccessRow(
  clientId: string,
  person: Pick<PersonAccessRow, 'id' | 'nome' | 'email' | 'telefone' | 'funcao_declarada' | 'papeis' | 'lojas_autorizadas' | 'visao_padrao'>,
): Promise<{ id: string | null; error: string | null }> {
  if (!isVinculoPersonId(person.id)) return { id: person.id, error: null }

  const email = person.email.trim().toLowerCase()
  if (!email) return { id: null, error: 'Pessoa sem e-mail não pode receber acesso da consultoria.' }

  const { data: existing, error: findError } = await supabase
    .from('acessos_cliente_consultoria')
    .select('id')
    .eq('client_id', clientId)
    .eq('email', email)
    .maybeSingle()
  if (findError) return { id: null, error: tableError(findError, 'Não foi possível localizar o acesso desta pessoa.') }
  if (existing?.id) return { id: existing.id, error: null }

  const { data: inserted, error: insertError } = await supabase
    .from('acessos_cliente_consultoria')
    .insert({
      client_id: clientId,
      nome: person.nome.trim(),
      email,
      telefone: person.telefone,
      funcao_declarada: person.funcao_declarada,
      papeis: person.papeis,
      lojas_autorizadas: person.lojas_autorizadas,
      is_dono_master: false,
      visao_padrao: person.visao_padrao,
      status: 'ativo' as PersonStatus,
    })
    .select('id')
    .single()
  if (insertError) return { id: null, error: tableError(insertError, 'Não foi possível criar o acesso desta pessoa.') }
  return { id: inserted?.id ?? null, error: null }
}

async function loadAccessMasterRows(clientId: string): Promise<{
  rows: Array<{ id: string; is_dono_master: boolean; status: string }>
  error: string | null
}> {
  const { data, error } = await supabase
    .from('acessos_cliente_consultoria')
    .select('id, is_dono_master, status')
    .eq('client_id', clientId)
  if (error) return { rows: [], error: tableError(error, 'Não foi possível conferir o Dono Master.') }
  return {
    rows: (data ?? []).map(row => ({
      id: row.id,
      is_dono_master: Boolean(row.is_dono_master),
      status: row.status ?? 'ativo',
    })),
    error: null,
  }
}

export async function grantStoreToClientDonoMasters(
  clientId: string,
  storeId: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('acessos_cliente_consultoria')
    .select('id, lojas_autorizadas')
    .eq('client_id', clientId)
    .eq('is_dono_master', true)
  if (error) return { error: tableError(error, 'Não foi possível atualizar o escopo do Dono Master.') }
  for (const row of data ?? []) {
    const current = Array.isArray(row.lojas_autorizadas) ? row.lojas_autorizadas as string[] : []
    if (current.includes(storeId)) continue
    const { error: updateError } = await supabase
      .from('acessos_cliente_consultoria')
      .update({
        lojas_autorizadas: [...current, storeId],
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('client_id', clientId)
    if (updateError) return { error: tableError(updateError, 'Não foi possível incluir a nova loja no Dono Master.') }
  }
  return { error: null }
}

export async function createClientPerson(
  clientId: string,
  draft: PersonAccessDraft,
  createdBy: string,
): Promise<{ error: string | null; reused?: boolean }> {
  const errors = validatePersonAccessDraft(draft)
  if (errors.length) return { error: errors[0] }

  const email = draft.email.trim().toLowerCase()
  const { data: existing, error: findError } = await supabase
    .from('acessos_cliente_consultoria')
    .select('id, status')
    .eq('client_id', clientId)
    .eq('email', email)
    .maybeSingle()
  if (findError) return { error: tableError(findError, 'Não foi possível localizar o acesso desta pessoa.') }
  if (existing?.id) {
    const nextStatus: PersonStatus = existing.status === 'inativo' ? 'em_preparacao' : (existing.status as PersonStatus)
    const updated = await updateClientPerson(clientId, existing.id, { ...draft, status: nextStatus })
    return { error: updated.error, reused: true }
  }

  // Um cliente só pode ter um Dono Master vigente (regra central do doc de
  // correção, item 10/17 de Pessoas e Acessos). Sem isso, marcar "Dono Master"
  // num segundo cadastro cria dois is_dono_master=true — mesma classe de bug
  // encontrada em unidades_cliente_consultoria (duas lojas "Principal").
  // Demover é a transferência implícita que o doc pede ao marcar outro usuário.
  if (draft.is_dono_master) {
    const { error: demoteError } = await supabase
      .from('acessos_cliente_consultoria')
      .update({ is_dono_master: false, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('is_dono_master', true)
    if (demoteError) return { error: tableError(demoteError, 'Não foi possível atualizar o Dono Master.') }
  }

  const { error } = await supabase.from('acessos_cliente_consultoria').insert({
    client_id: clientId,
    nome: draft.nome.trim(),
    email: draft.email.trim().toLowerCase(),
    telefone: draft.telefone.trim() || null,
    funcao_declarada: draft.funcao_declarada.trim() || null,
    papeis: draft.papeis,
    lojas_autorizadas: draft.lojas_autorizadas,
    is_dono_master: draft.is_dono_master,
    visao_padrao: draft.visao_padrao || null,
    status: 'em_preparacao' as PersonStatus,
    created_by: createdBy,
  })
  if (!error) {
    await supabase.from('logs_auditoria').insert({
      action: 'criar_pessoa_cliente',
      entity: 'acessos_cliente_consultoria',
      entity_id: clientId,
      user_id: createdBy,
      details_json: { email, is_dono_master: draft.is_dono_master, papeis: draft.papeis },
    })
  }
  return { error: tableError(error, 'Não foi possível criar a pessoa.') }
}

export async function updateClientPerson(
  clientId: string,
  personId: string,
  draft: PersonAccessDraft,
): Promise<{ error: string | null }> {
  const errors = validatePersonAccessDraft(draft)
  if (errors.length) return { error: errors[0] }

  const resolved = await ensureAccessRow(clientId, {
    id: personId,
    nome: draft.nome,
    email: draft.email,
    telefone: draft.telefone.trim() || null,
    funcao_declarada: draft.funcao_declarada.trim() || null,
    papeis: draft.papeis,
    lojas_autorizadas: draft.lojas_autorizadas,
    visao_padrao: draft.visao_padrao || null,
  })
  if (resolved.error) return { error: resolved.error }
  if (!resolved.id) return { error: 'Não foi possível localizar o acesso desta pessoa.' }

  const current = await loadAccessMasterRows(clientId)
  if (current.error) return { error: current.error }
  const blocked = uniqueMasterChangeGuard({
    persons: current.rows,
    targetId: resolved.id,
    nextMaster: draft.is_dono_master,
    nextStatus: draft.status,
  })
  if (blocked) return { error: blocked }

  if (draft.is_dono_master) {
    const { error: demoteError } = await supabase
      .from('acessos_cliente_consultoria')
      .update({ is_dono_master: false, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('is_dono_master', true)
      .neq('id', resolved.id)
    if (demoteError) return { error: tableError(demoteError, 'Não foi possível atualizar o Dono Master.') }
  }

  const { error } = await supabase
    .from('acessos_cliente_consultoria')
    .update({
      nome: draft.nome.trim(),
      email: draft.email.trim().toLowerCase(),
      telefone: draft.telefone.trim() || null,
      funcao_declarada: draft.funcao_declarada.trim() || null,
      papeis: draft.papeis,
      lojas_autorizadas: draft.lojas_autorizadas,
      is_dono_master: draft.is_dono_master,
      visao_padrao: draft.visao_padrao || null,
      status: draft.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resolved.id)
    .eq('client_id', clientId)
  if (!error) {
    const { data: session } = await supabase.auth.getUser()
    await supabase.from('logs_auditoria').insert({
      action: 'atualizar_pessoa_cliente',
      entity: 'acessos_cliente_consultoria',
      entity_id: resolved.id,
      user_id: session.user?.id ?? null,
      details_json: {
        client_id: clientId,
        email: draft.email.trim().toLowerCase(),
        is_dono_master: draft.is_dono_master,
        status: draft.status,
      },
    })
  }
  return { error: tableError(error, 'Não foi possível atualizar a pessoa.') }
}

/**
 * Promove um Dono existente a Master. Não escolhe sozinho — o caller passa a
 * pessoa. Se ela só existe como vínculo de loja, o acesso é criado antes:
 * ser dono da loja não é ser Dono Master da conta, então a designação precisa
 * de uma linha própria em acessos.
 */
export async function setClientDonoMaster(
  clientId: string,
  person: Pick<PersonAccessRow, 'id' | 'nome' | 'email' | 'telefone' | 'funcao_declarada' | 'papeis' | 'lojas_autorizadas' | 'visao_padrao'>,
): Promise<{ error: string | null }> {
  const papeis = person.papeis.includes('DONO') ? person.papeis : [...person.papeis, 'DONO']
  const resolved = await ensureAccessRow(clientId, { ...person, papeis })
  if (resolved.error) return { error: resolved.error }
  if (!resolved.id) return { error: 'Não foi possível localizar o acesso desta pessoa.' }

  const { error: demoteError } = await supabase
    .from('acessos_cliente_consultoria')
    .update({ is_dono_master: false, updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('is_dono_master', true)
  if (demoteError) return { error: tableError(demoteError, 'Não foi possível atualizar o Dono Master.') }

  const { error } = await supabase
    .from('acessos_cliente_consultoria')
    .update({ is_dono_master: true, papeis, updated_at: new Date().toISOString() })
    .eq('id', resolved.id)
    .eq('client_id', clientId)
  if (!error) {
    const { data: session } = await supabase.auth.getUser()
    await supabase.from('logs_auditoria').insert({
      action: 'transferir_dono_master',
      entity: 'acessos_cliente_consultoria',
      entity_id: resolved.id,
      user_id: session.user?.id ?? null,
      details_json: { client_id: clientId, email: person.email },
    })
  }
  if (!error) {
    await ensurePrimaryContactFromDonoMaster(clientId, person)
  }
  return { error: tableError(error, 'Não foi possível promover o Dono Master.') }
}

/**
 * Base44 trata o Dono Master como contato principal. Fichas legadas
 * (ex.: ACERTT) têm o Master em `acessos` e zero linhas em `contatos`.
 */
export async function ensurePrimaryContactFromDonoMaster(
  clientId: string,
  person: { nome: string; email: string; telefone?: string | null },
): Promise<{ created: boolean; error: string | null }> {
  const { data: existing, error: readError } = await supabase
    .from('contatos_cliente_consultoria')
    .select('id, name, email, is_primary')
    .eq('client_id', clientId)
  if (readError) return { created: false, error: tableError(readError, 'Não foi possível ler os contatos do cliente.') }

  const rows = existing ?? []
  if (rows.some(row => row.is_primary && (row.name ?? '').trim())) {
    return { created: false, error: null }
  }

  const email = person.email.trim().toLowerCase()
  const match = rows.find(row => (row.email ?? '').trim().toLowerCase() === email)
    ?? rows.find(row => (row.name ?? '').trim().toLowerCase() === person.nome.trim().toLowerCase())

  if (match) {
    const { error } = await supabase
      .from('contatos_cliente_consultoria')
      .update({
        is_primary: true,
        name: person.nome.trim(),
        email: person.email.trim() || null,
        phone: person.telefone ?? null,
        role: 'DONO',
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id)
    return { created: !error, error: tableError(error, 'Não foi possível marcar o contato principal.') }
  }

  const { error } = await supabase.from('contatos_cliente_consultoria').insert({
    client_id: clientId,
    name: person.nome.trim(),
    email: person.email.trim() || null,
    phone: person.telefone ?? null,
    role: 'DONO',
    is_primary: true,
  })
  return { created: !error, error: tableError(error, 'Não foi possível criar o contato principal.') }
}

export async function updatePersonStatus(
  clientId: string,
  person: Pick<PersonAccessRow, 'id' | 'nome' | 'email' | 'telefone' | 'funcao_declarada' | 'papeis' | 'lojas_autorizadas' | 'visao_padrao'>,
  status: PersonStatus,
): Promise<{ error: string | null }> {
  const resolved = await ensureAccessRow(clientId, person)
  if (resolved.error) return { error: resolved.error }
  if (!resolved.id) return { error: 'Não foi possível localizar o acesso desta pessoa.' }

  const current = await loadAccessMasterRows(clientId)
  if (current.error) return { error: current.error }
  const blocked = uniqueMasterChangeGuard({
    persons: current.rows,
    targetId: resolved.id,
    nextStatus: status,
  })
  if (blocked) return { error: blocked }

  const { error } = await supabase
    .from('acessos_cliente_consultoria')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', resolved.id)
    .eq('client_id', clientId)
  return { error: tableError(error, 'Não foi possível atualizar o status da pessoa.') }
}
