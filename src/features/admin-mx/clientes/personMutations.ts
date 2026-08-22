import { supabase } from '@/lib/supabase'
import { validatePersonAccessDraft, type PersonAccessDraft, type PersonStatus } from './personAccess'
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
  if (failure) return { rows: [], stores: [], error: failure.message }

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
  if (vinculosError) return { rows: [], stores, error: vinculosError.message }

  const vinculos = (vinculosData ?? []) as VinculoLojaRow[]
  const userIds = [...new Set(vinculos.map(vinculo => vinculo.user_id).filter(Boolean))]

  let usuarios: UsuarioRow[] = []
  if (userIds.length) {
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, name, email, active, phone, declared_function, default_view')
      .in('id', userIds)
    if (usuariosError) return { rows: [], stores, error: usuariosError.message }
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
  if (findError) return { id: null, error: findError.message }
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
  if (insertError) return { id: null, error: insertError.message }
  return { id: inserted?.id ?? null, error: null }
}

export async function createClientPerson(
  clientId: string,
  draft: PersonAccessDraft,
  createdBy: string,
): Promise<{ error: string | null }> {
  const errors = validatePersonAccessDraft(draft)
  if (errors.length) return { error: errors[0] }

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
    if (demoteError) return { error: demoteError.message }
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
  return { error: error?.message ?? null }
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

  if (draft.is_dono_master) {
    const { error: demoteError } = await supabase
      .from('acessos_cliente_consultoria')
      .update({ is_dono_master: false, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('is_dono_master', true)
      .neq('id', resolved.id)
    if (demoteError) return { error: demoteError.message }
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', resolved.id)
    .eq('client_id', clientId)
  return { error: error?.message ?? null }
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
  if (demoteError) return { error: demoteError.message }

  const { error } = await supabase
    .from('acessos_cliente_consultoria')
    .update({ is_dono_master: true, papeis, updated_at: new Date().toISOString() })
    .eq('id', resolved.id)
    .eq('client_id', clientId)
  return { error: error?.message ?? null }
}

export async function updatePersonStatus(
  clientId: string,
  person: Pick<PersonAccessRow, 'id' | 'nome' | 'email' | 'telefone' | 'funcao_declarada' | 'papeis' | 'lojas_autorizadas' | 'visao_padrao'>,
  status: PersonStatus,
): Promise<{ error: string | null }> {
  const resolved = await ensureAccessRow(clientId, person)
  if (resolved.error) return { error: resolved.error }
  if (!resolved.id) return { error: 'Não foi possível localizar o acesso desta pessoa.' }

  const { error } = await supabase
    .from('acessos_cliente_consultoria')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', resolved.id)
    .eq('client_id', clientId)
  return { error: error?.message ?? null }
}
