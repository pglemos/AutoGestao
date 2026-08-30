import { supabase } from '@/lib/supabase'
import { isOrphanTestUnit } from './mergeClientPeople'
import { grantStoreToClientDonoMasters } from './personMutations'
import { describeAdminRpcError } from '../equipe/adminRpcErrors'
import { onlyDigits } from '../novo-cliente/newClientDraft'
import { validateStoreDraft, type StoreDraft } from './storeForm'
import { DEFAULT_MX_HOURS, type OperatingHoursMap, type StoredOperatingHourRow } from './storeOperatingHours'
import type { DisplayClientUnit } from './mergeClientPeople'

export type UnitRow = {
  id: string
  client_id: string
  store_id: string | null
  name: string
  city: string | null
  state: string | null
  is_primary: boolean
  store_type: string | null
  cnpj: string | null
  internal_code: string | null
  address_street: string | null
  address_zip: string | null
  timezone: string | null
  working_days: string | null
  opening_time: string | null
  closing_time: string | null
  status: string | null
  opening_date: string | null
  notes: string | null
  /** True quando a loja existe na operação e ainda não tem linha em unidades. */
  synthetic?: boolean
}

/**
 * Apaga unidades de teste sem loja (ex.: "TESTE QA REMOVER"). Horários da
 * unidade saem primeiro para não deixar órfão em `horarios_funcionamento_unidade`.
 */
export async function deleteOrphanTestUnits(unitIds: readonly string[]): Promise<{ deleted: number; error: string | null }> {
  const ids = [...new Set(unitIds.filter(Boolean))]
  if (!ids.length) return { deleted: 0, error: null }
  const { data: rows, error: loadError } = await supabase
    .from('unidades_cliente_consultoria')
    .select('id, name, store_id')
    .in('id', ids)
  if (loadError) return { deleted: 0, error: loadError.message }
  const junk = (rows ?? []).filter(isOrphanTestUnit).map(row => row.id)
  if (!junk.length) return { deleted: 0, error: null }
  const { error: hoursError } = await supabase
    .from('horarios_funcionamento_unidade')
    .delete()
    .in('unidade_id', junk)
  if (hoursError) return { deleted: 0, error: hoursError.message }
  const { data, error } = await supabase
    .from('unidades_cliente_consultoria')
    .delete()
    .in('id', junk)
    .select('id')
  if (error) return { deleted: 0, error: error.message }
  return { deleted: data?.length ?? 0, error: null }
}

/**
 * Grava no cadastro as filiais que já existem em `lojas` e ainda não têm
 * linha em `unidades_cliente_consultoria`. Sem isso, 3 Piso e Tito da AG
 * apareciam só como "Filial operacional", sem editar nem horário.
 */
export async function ensureOperationalUnitRows(input: {
  clientId: string
  createdBy?: string | null
  units: ReadonlyArray<DisplayClientUnit>
}): Promise<{ created: number; error: string | null }> {
  const missing = input.units.filter(unit => unit.synthetic && unit.store_id)
  if (!missing.length) return { created: 0, error: null }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('unidades_cliente_consultoria')
    .insert(missing.map(unit => ({
      client_id: input.clientId,
      store_id: unit.store_id,
      name: unit.name,
      city: unit.city,
      state: unit.state,
      is_primary: unit.is_primary,
      store_type: unit.store_type,
      cnpj: unit.cnpj,
      status: unit.status === 'inativa' ? 'inativa' : 'ativa',
      timezone: 'America/Sao_Paulo',
      created_by: input.createdBy ?? null,
      updated_at: now,
    })))
    .select('id')
  if (error) return { created: 0, error: error.message }

  const createdIds = (data ?? []).map(row => row.id)
  if (createdIds.length) {
    const hours = createdIds.flatMap(unitId => DEFAULT_MX_HOURS.map(entry => ({
      unidade_id: unitId,
      day_of_week: entry.day_of_week,
      is_open: entry.is_open,
      opening_time: entry.is_open ? entry.opening_time : null,
      closing_time: entry.is_open ? entry.closing_time : null,
      status: 'ativo',
      origin: 'Visão 360 — filial operacional',
    })))
    const { error: hoursError } = await supabase.from('horarios_funcionamento_unidade').insert(hours)
    if (hoursError) return { created: createdIds.length, error: hoursError.message }
  }
  return { created: createdIds.length, error: null }
}

/** Carrega as unidades do cliente com os campos novos. */
export async function fetchClientUnits(clientId: string): Promise<{ rows: UnitRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('unidades_cliente_consultoria')
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true })
  return { rows: (data ?? []) as UnitRow[], error: error?.message ?? null }
}

export type SaveStoreResult = { error: string | null }

export function parseAdminJsonRpc(
  data: unknown,
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
): { id: string | null; error: string | null } {
  if (error) return { id: null, error: describeAdminRpcError(error, fallback) }
  const payload = data as { ok?: boolean; error?: string; data?: { id?: string } } | null
  if (!payload?.ok) return { id: null, error: payload?.error || fallback }
  return { id: payload.data?.id ?? null, error: null }
}

export async function createOperationalStore(payload: Record<string, unknown>): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_create_store', { p_payload: payload })
  const parsed = parseAdminJsonRpc(data, error, 'Não foi possível criar a loja operacional.')
  if (parsed.error || !parsed.id) return { id: null, error: parsed.error ?? 'A criação da loja não devolveu um identificador.' }
  return parsed
}

export async function updateOperationalStore(storeId: string, payload: Record<string, unknown>): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('admin_update_store', { p_store_id: storeId, p_payload: payload })
  return { error: parseAdminJsonRpc(data, error, 'Não foi possível atualizar a loja operacional.').error }
}

export async function reclaimStoreForClient(clientId: string, storeId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('clientes_consultoria')
    .update({ primary_store_id: null, merged_into_id: clientId })
    .eq('primary_store_id', storeId)
    .neq('id', clientId)
  return { error: error?.message ?? null }
}

/** Desativa lojas criadas a meio do onboarding — o INSERT direto em `lojas` toma 403 fora de `eh_administrador_mx()`. */
export async function deactivateOperationalStores(storeIds: readonly string[]): Promise<void> {
  for (const storeId of storeIds) {
    if (!storeId) continue
    await updateOperationalStore(storeId, { active: false })
  }
}

/**
 * Cria ou atualiza uma loja do cliente. Ao criar, insere o horário padrão MX
 * para a semana inteira; ao editar, apenas os campos do cadastro mudam.
 */
export async function saveClientStore(
  clientId: string,
  draft: StoreDraft,
  hours: OperatingHoursMap,
  createdBy: string,
): Promise<SaveStoreResult> {
  const errors = validateStoreDraft(draft)
  if (errors.length) return { error: errors[0] }

  const base = {
    store_type: draft.store_type,
    cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : null,
    internal_code: draft.internal_code.trim() || null,
    address_street: draft.address_street.trim() || null,
    address_zip: draft.address_zip.trim() || null,
    timezone: draft.timezone || 'America/Sao_Paulo',
    status: draft.status,
    opening_date: draft.opening_date || null,
    notes: draft.notes.trim() || null,
    working_days: workingDaysLabel(hours),
    opening_time: firstOpeningTime(hours),
    closing_time: firstClosingTime(hours),
    updated_at: new Date().toISOString(),
  }

  const { data: client, error: clientError } = await supabase
    .from('clientes_consultoria')
    .select('id, primary_store_id, legal_name, cnpj')
    .eq('id', clientId)
    .single()
  if (clientError || !client) return { error: clientError?.message ?? 'Cliente não encontrado.' }

  if (draft.id) {
    const { data: currentUnit, error: currentUnitError } = await supabase
      .from('unidades_cliente_consultoria')
      .select('store_id, name')
      .eq('id', draft.id)
      .maybeSingle()
    if (currentUnitError) return { error: currentUnitError.message }

    let realStoreId = draft.store_id ?? currentUnit?.store_id ?? null
    if (!realStoreId && draft.store_type === 'matriz') {
      realStoreId = client.primary_store_id
    }
    if (!realStoreId && draft.store_type === 'filial' && client.primary_store_id) {
      const { data: existingFilial, error: filialLookupError } = await supabase
        .from('lojas')
        .select('id')
        .eq('parent_loja_id', client.primary_store_id)
        .eq('name', currentUnit?.name ?? draft.name.trim())
        .maybeSingle()
      if (filialLookupError) return { error: filialLookupError.message }
      realStoreId = existingFilial?.id ?? null
    }
    if (!realStoreId) return { error: 'A unidade não está vinculada a uma loja operacional. Cadastre a filial na hierarquia antes de editar.' }

    const operational = await updateOperationalStore(realStoreId, {
      name: draft.name.trim(),
      legal_name: draft.name.trim(),
      cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : '',
      address: draft.address_street.trim(),
      active: draft.status === 'ativa',
    })
    if (operational.error) return operational

    const { error } = await supabase
      .from('unidades_cliente_consultoria')
      .update({
        ...base,
        name: draft.name.trim(),
        store_type: draft.store_type,
        is_primary: draft.store_type === 'matriz',
        store_id: realStoreId,
      })
      .eq('id', draft.id)
    return { error: error?.message ?? null }
  }

  let realStoreId = client.primary_store_id
  let createdRealStoreId: string | null = null

  if (draft.store_type === 'matriz') {
    if (client.primary_store_id) return { error: 'Este cliente já possui uma matriz vinculada.' }
    const createdStore = await createOperationalStore({
      name: draft.name.trim(),
      legal_name: client.legal_name || draft.name.trim(),
      cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : client.cnpj || '',
      address: draft.address_street.trim(),
      parent_loja_id: null,
    })
    if (createdStore.error || !createdStore.id) return { error: createdStore.error ?? 'Não foi possível criar a matriz operacional.' }
    realStoreId = createdStore.id
    createdRealStoreId = createdStore.id
    const reclaimed = await reclaimStoreForClient(clientId, createdStore.id)
    if (reclaimed.error) return reclaimed
  } else {
    if (!client.primary_store_id) return { error: 'Cadastre a matriz antes de adicionar uma filial.' }
    const { data: matrix, error: matrixError } = await supabase
      .from('lojas')
      .select('id, parent_loja_id')
      .eq('id', client.primary_store_id)
      .maybeSingle()
    if (matrixError) return { error: matrixError.message }
    if (!matrix) return { error: 'A matriz operacional do cliente não foi encontrada.' }
    if (matrix.parent_loja_id) return { error: 'A raiz do cliente precisa ser uma matriz, não uma filial.' }

    const { data: existingFilial, error: filialLookupError } = await supabase
      .from('lojas')
      .select('id')
      .eq('parent_loja_id', client.primary_store_id)
      .ilike('name', draft.name.trim())
      .maybeSingle()
    if (filialLookupError) return { error: filialLookupError.message }
    if (existingFilial?.id) {
      realStoreId = existingFilial.id
    } else {
      const createdStore = await createOperationalStore({
        name: draft.name.trim(),
        legal_name: draft.name.trim(),
        cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : '',
        address: draft.address_street.trim(),
        parent_loja_id: client.primary_store_id,
      })
      if (createdStore.error || !createdStore.id) return { error: createdStore.error ?? 'Não foi possível criar a filial operacional.' }
      realStoreId = createdStore.id
      createdRealStoreId = createdStore.id
      const reclaimed = await reclaimStoreForClient(clientId, createdStore.id)
      if (reclaimed.error) return reclaimed
    }
  }

  const { data: created, error } = await supabase
    .from('unidades_cliente_consultoria')
    .insert({
      client_id: clientId,
      name: draft.name.trim(),
      is_primary: draft.store_type === 'matriz',
      store_id: realStoreId,
      created_by: createdBy,
      ...base,
    })
    .select('id')
    .single()
  if (error) {
    if (createdRealStoreId) await updateOperationalStore(createdRealStoreId, { active: false })
    return { error: error.message }
  }

  if (draft.store_type === 'matriz' && realStoreId) {
    const { error: linkError } = await supabase
      .from('clientes_consultoria')
      .update({ primary_store_id: realStoreId, status: 'ativo', updated_at: new Date().toISOString() })
      .eq('id', clientId)
    if (linkError) {
      if (createdRealStoreId) await updateOperationalStore(createdRealStoreId, { active: false })
      return { error: linkError.message }
    }
  }

  const { error: hoursError } = await supabase.from('horarios_funcionamento_unidade').insert(
    Object.entries(hours).map(([day, entry]) => ({
      unidade_id: created.id,
      day_of_week: day,
      is_open: entry.is_open,
      opening_time: entry.is_open ? entry.opening_time : null,
      closing_time: entry.is_open ? entry.closing_time : null,
      status: 'ativo',
      origin: 'Cadastro de Loja',
    })),
  )
  if (hoursError) return { error: hoursError.message }
  if (realStoreId) {
    const grant = await grantStoreToClientDonoMasters(clientId, realStoreId)
    if (grant.error) return grant
  }
  return { error: null }
}

export type SaveHoursResult = { error: string | null }

/** Grava a semana inteira de horários de uma loja (arquivando o ativo atual). */
export async function saveStoreOperatingHours(
  unitId: string,
  hours: OperatingHoursMap,
  origin: string,
): Promise<SaveHoursResult> {
  const { error: archiveError } = await supabase
    .from('horarios_funcionamento_unidade')
    .update({ status: 'inativo', updated_at: new Date().toISOString() })
    .eq('unidade_id', unitId)
    .eq('status', 'ativo')
  if (archiveError) return { error: archiveError.message }

  const { error } = await supabase.from('horarios_funcionamento_unidade').insert(
    Object.entries(hours).map(([day, entry]) => ({
      unidade_id: unitId,
      day_of_week: day,
      is_open: entry.is_open,
      opening_time: entry.is_open ? entry.opening_time : null,
      closing_time: entry.is_open ? entry.closing_time : null,
      status: 'ativo',
      origin,
    })),
  )
  return { error: error?.message ?? null }
}

/** Lê os horários ativos de uma loja para o editor. */
export async function fetchUnitOperatingHours(unitId: string): Promise<{ rows: StoredOperatingHourRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('horarios_funcionamento_unidade')
    .select('day_of_week, is_open, opening_time, closing_time')
    .eq('unidade_id', unitId)
    .eq('status', 'ativo')
    .order('day_of_week', { ascending: true })
  return { rows: (data ?? []) as StoredOperatingHourRow[], error: error?.message ?? null }
}

function workingDaysLabel(hours: OperatingHoursMap): string {
  const labels: Record<string, string> = { monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom' }
  const open = Object.entries(hours).filter(([, entry]) => entry.is_open).map(([day]) => labels[day] ?? day)
  return open.length ? `Seg a ${open[open.length - 1]}` : ''
}

function firstOpeningTime(hours: OperatingHoursMap): string | null {
  const entry = Object.entries(hours).find(([, item]) => item.is_open && item.opening_time)
  return entry?.[1].opening_time ?? null
}

function firstClosingTime(hours: OperatingHoursMap): string | null {
  const entry = Object.entries(hours).find(([, item]) => item.is_open && item.closing_time)
  return entry?.[1].closing_time ?? null
}
