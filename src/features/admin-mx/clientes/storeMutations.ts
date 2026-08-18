import { supabase } from '@/lib/supabase'
import { onlyDigits } from '../novo-cliente/newClientDraft'
import { validateStoreDraft, type StoreDraft } from './storeForm'
import type { OperatingHoursMap, StoredOperatingHourRow } from './storeOperatingHours'

export type UnitRow = {
  id: string
  client_id: string
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

  if (draft.id) {
    const { error } = await supabase
      .from('unidades_cliente_consultoria')
      .update({ ...base, name: draft.name.trim() })
      .eq('id', draft.id)
    return { error: error?.message ?? null }
  }

  const { data: created, error } = await supabase
    .from('unidades_cliente_consultoria')
    .insert({
      client_id: clientId,
      name: draft.name.trim(),
      is_primary: draft.store_type === 'matriz',
      created_by: createdBy,
      ...base,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  // Garante vínculo com a tabela lojas se o cliente não tiver loja principal
  const { data: client } = await supabase
    .from('clientes_consultoria')
    .select('id, primary_store_id, legal_name, cnpj')
    .eq('id', clientId)
    .single()

  if (client && (!client.primary_store_id || draft.store_type === 'matriz')) {
    const { data: storeRow } = await supabase
      .from('lojas')
      .insert({
        name: draft.name.trim(),
        legal_name: client.legal_name || draft.name.trim(),
        cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : client.cnpj || null,
        active: true,
      })
      .select('id')
      .single()

    if (storeRow?.id && !client.primary_store_id) {
      await supabase
        .from('clientes_consultoria')
        .update({ primary_store_id: storeRow.id, status: 'ativo' })
        .eq('id', clientId)
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
  return { error: hoursError?.message ?? null }
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
