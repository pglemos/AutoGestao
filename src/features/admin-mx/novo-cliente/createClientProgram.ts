import { supabase } from '@/lib/supabase'
import { newClientSlug, onlyDigits, type NewClientDraft, type NewClientUnit } from './newClientDraft'

export type CreateClientProgramResult = { clientId: string | null; slug: string | null; error: string | null }

export type StoreHierarchyPlan = {
  primaryUnitName: string
  filialUnitNames: string[]
}

export type StoreHierarchyResult = {
  primaryStoreId: string | null
  createdStoreIds: string[]
  storeIdsByName: Record<string, string>
  error: string | null
}

function normalizeStoreName(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR')
}

/** Resolve a unidade do wizard para a loja operacional criada/reutilizada. */
export function resolveUnitStoreId(
  unit: Pick<NewClientUnit, 'name' | 'is_primary'>,
  hierarchy: Pick<StoreHierarchyResult, 'primaryStoreId' | 'storeIdsByName'>,
): string | null {
  if (unit.is_primary) return hierarchy.primaryStoreId
  return hierarchy.storeIdsByName[normalizeStoreName(unit.name)] ?? null
}

/** Mantém a regra de uma matriz e N filiais explícita e testável. */
export function buildStoreHierarchyPlan(draft: Pick<NewClientDraft, 'units'>): StoreHierarchyPlan {
  const units = draft.units.filter(unit => unit.name.trim())
  const primary = units.find(unit => unit.is_primary) ?? units[0]
  return {
    primaryUnitName: primary?.name.trim() ?? '',
    filialUnitNames: units
      .filter(unit => unit !== primary)
      .map(unit => unit.name.trim())
      .filter(Boolean),
  }
}

type StoreLookup = { id: string; parent_loja_id: string | null; name: string }

async function assertMatrixStore(storeId: string): Promise<{ store: StoreLookup | null; error: string | null }> {
  const { data, error } = await supabase
    .from('lojas')
    .select('id, parent_loja_id, name')
    .eq('id', storeId)
    .maybeSingle()
  if (error) return { store: null, error: error.message }
  if (!data) return { store: null, error: 'A loja principal selecionada não existe.' }
  if (data.parent_loja_id) return { store: null, error: 'Selecione uma matriz como loja principal. Filial não pode ser a raiz do cliente.' }
  return { store: data as StoreLookup, error: null }
}

async function ensureStoreHierarchy(
  clientId: string,
  draft: NewClientDraft,
  fallbackPrimaryStoreId: string | null = null,
): Promise<StoreHierarchyResult> {
  const plan = buildStoreHierarchyPlan(draft)
  const createdStoreIds: string[] = []
  const storeIdsByName: Record<string, string> = {}
  let primaryStoreId = draft.primary_store_id || fallbackPrimaryStoreId

  if (primaryStoreId) {
    const result = await assertMatrixStore(primaryStoreId)
    if (result.error) return { primaryStoreId: null, createdStoreIds, storeIdsByName, error: result.error }
    if (result.store) storeIdsByName[normalizeStoreName(result.store.name)] = result.store.id
  } else if (plan.primaryUnitName) {
    const { data: created, error } = await supabase
      .from('lojas')
      .insert({
        name: plan.primaryUnitName,
        legal_name: draft.legal_name.trim() || plan.primaryUnitName,
        cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : null,
        active: true,
        parent_loja_id: null,
        structure_type: 'matriz',
      })
      .select('id')
      .single()
    if (error || !created?.id) return { primaryStoreId: null, createdStoreIds, storeIdsByName, error: error?.message ?? 'Não foi possível criar a matriz operacional.' }
    primaryStoreId = created.id
    createdStoreIds.push(created.id)
    storeIdsByName[normalizeStoreName(plan.primaryUnitName)] = created.id
  }

  if (!primaryStoreId) return { primaryStoreId: null, createdStoreIds, storeIdsByName, error: 'Cadastre uma loja principal antes de continuar.' }
  if (plan.primaryUnitName && !storeIdsByName[normalizeStoreName(plan.primaryUnitName)]) {
    storeIdsByName[normalizeStoreName(plan.primaryUnitName)] = primaryStoreId
  }

  if (draft.structure_type === 'REDE') {
    for (const filialName of plan.filialUnitNames) {
      const { data: existing, error: existingError } = await supabase
        .from('lojas')
        .select('id')
        .eq('parent_loja_id', primaryStoreId)
        .eq('name', filialName)
        .maybeSingle()
      if (existingError) return { primaryStoreId: null, createdStoreIds, storeIdsByName, error: existingError.message }
      if (existing?.id) {
        storeIdsByName[normalizeStoreName(filialName)] = existing.id
        continue
      }

      const { data: filial, error } = await supabase
        .from('lojas')
        .insert({
          name: filialName,
          legal_name: filialName,
          active: true,
          parent_loja_id: primaryStoreId,
          structure_type: 'filial',
        })
        .select('id')
        .single()
      if (error || !filial?.id) {
        await supabase.from('lojas').update({ active: false }).in('id', createdStoreIds)
        return { primaryStoreId: null, createdStoreIds, storeIdsByName, error: error?.message ?? `Não foi possível criar a filial "${filialName}".` }
      }
      createdStoreIds.push(filial.id)
      storeIdsByName[normalizeStoreName(filialName)] = filial.id
    }
  }

  const { error: clientLinkError } = await supabase
    .from('clientes_consultoria')
    .update({ primary_store_id: primaryStoreId, status: 'ativo', updated_at: new Date().toISOString() })
    .eq('id', clientId)
  if (clientLinkError) {
    await supabase.from('lojas').update({ active: false }).in('id', createdStoreIds)
    return { primaryStoreId: null, createdStoreIds, storeIdsByName, error: clientLinkError.message }
  }

  return { primaryStoreId, createdStoreIds, storeIdsByName, error: null }
}

/**
 * Continua o onboarding de um cliente existente: atualiza os campos do draft e
 * aplica apenas o que falta nas coleções (lojas, contatos, módulos, consultores)
 * sem apagar nada que já exista — a gravação é aditiva para não destruir
 * vínculos já criados em sessões anteriores.
 */
export async function continueClientProgram(
  clientId: string,
  draft: NewClientDraft,
  step: number,
  updatedBy: string,
): Promise<CreateClientProgramResult> {
  const { data: currentClient, error: currentClientError } = await supabase
    .from('clientes_consultoria')
    .select('primary_store_id')
    .eq('id', clientId)
    .maybeSingle()
  if (currentClientError || !currentClient) {
    return { clientId: null, slug: null, error: currentClientError?.message ?? 'Cliente não encontrado.' }
  }

  const hierarchy = await ensureStoreHierarchy(clientId, draft, currentClient.primary_store_id)
  if (hierarchy.error) return { clientId: null, slug: null, error: hierarchy.error }

  const { error: clientError } = await supabase
    .from('clientes_consultoria')
    .update({
      name: draft.name.trim(),
      legal_name: draft.legal_name.trim() || null,
      cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : null,
      notes: draft.notes.trim() || null,
      product_name: draft.product_name.trim() || null,
      program_template_key: draft.program_template_key.trim() || null,
      modality: draft.modality.trim() || null,
      structure_type: draft.structure_type,
      business_phase: draft.business_phase.trim() || null,
      implementation_owner_id: draft.implementation_owner_id || null,
      contract_start_date: draft.contract_start_date || null,
      contract_end_date: draft.contract_end_date || null,
      primary_store_id: hierarchy.primaryStoreId,
      status: hierarchy.primaryStoreId ? 'ativo' : 'inativo',
      onboarding_step: Math.min(Math.max(step, 1), 7),
      onboarding_completed: step >= 7,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
  if (clientError) return { clientId: null, slug: null, error: clientError.message }

  const units = draft.units.filter(unit => unit.name.trim())
  if (units.length) {
    for (const unit of units) {
      const storeId = resolveUnitStoreId(unit, hierarchy)
      if (!storeId) {
        return { clientId: null, slug: null, error: `Loja "${unit.name}" não foi vinculada à hierarquia operacional.` }
      }
      const { data: existing } = await supabase
        .from('unidades_cliente_consultoria')
        .select('id, store_id')
        .eq('client_id', clientId)
        .eq('name', unit.name.trim())
        .maybeSingle()
      if (existing) {
        const { error } = await supabase
          .from('unidades_cliente_consultoria')
          .update({
            city: unit.city.trim() || null,
            state: unit.state.trim() || null,
            is_primary: unit.is_primary,
            store_type: unit.is_primary ? 'matriz' : 'filial',
            store_id: storeId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) return { clientId: null, slug: null, error: `Loja "${unit.name}" não atualizou: ${error.message}` }
      } else {
        const { error } = await supabase.from('unidades_cliente_consultoria').insert({
          client_id: clientId,
          name: unit.name.trim(),
          city: unit.city.trim() || null,
          state: unit.state.trim() || null,
          is_primary: unit.is_primary,
          store_type: unit.is_primary ? 'matriz' : 'filial',
          store_id: storeId,
        })
        if (error) return { clientId: null, slug: null, error: `Loja "${unit.name}" não criou: ${error.message}` }
      }
    }
  }

  const contacts = draft.contacts.filter(contact => contact.name.trim())
  if (contacts.length) {
    for (const contact of contacts) {
      const { data: existing } = await supabase
        .from('contatos_cliente_consultoria')
        .select('id')
        .eq('client_id', clientId)
        .eq('name', contact.name.trim())
        .maybeSingle()
      if (existing) {
        const { error } = await supabase
          .from('contatos_cliente_consultoria')
          .update({
            role: contact.role.trim() || null,
            email: contact.email.trim() || null,
            phone: contact.phone.trim() || null,
            is_primary: contact.is_primary,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) return { clientId: null, slug: null, error: error.message }
      } else {
        const { error } = await supabase.from('contatos_cliente_consultoria').insert({
          client_id: clientId,
          name: contact.name.trim(),
          role: contact.role.trim() || null,
          email: contact.email.trim() || null,
          phone: contact.phone.trim() || null,
          is_primary: contact.is_primary,
        })
        if (error) return { clientId: null, slug: null, error: error.message }
      }
    }
  }

  if (draft.enabled_modules.length) {
    const { data: existingModules } = await supabase
      .from('modulos_cliente_consultoria')
      .select('module_key')
      .eq('client_id', clientId)
    const present = new Set((existingModules ?? []).map(item => (item as { module_key: string }).module_key))
    const missing = draft.enabled_modules.filter(key => !present.has(key))
    if (missing.length) {
      const { error } = await supabase.from('modulos_cliente_consultoria').insert(
        missing.map(moduleKey => ({
          client_id: clientId,
          module_key: moduleKey,
          label: moduleKey,
          enabled: true,
          configured_by: updatedBy,
          configured_at: new Date().toISOString(),
        })),
      )
      if (error) return { clientId: null, slug: null, error: error.message }
    }
  }

  const consultantIdsToAssign = draft.consultant_ids.length > 0
    ? draft.consultant_ids
    : draft.implementation_owner_id ? [draft.implementation_owner_id] : []

  if (consultantIdsToAssign.length) {
    const { data: existingAssignments } = await supabase
      .from('atribuicoes_consultoria')
      .select('user_id')
      .eq('client_id', clientId)
    const present = new Set((existingAssignments ?? []).map(item => (item as { user_id: string }).user_id))
    const missing = consultantIdsToAssign.filter(userId => !present.has(userId))
    if (missing.length) {
      const { error } = await supabase.from('atribuicoes_consultoria').insert(
        missing.map((userId, index) => ({
          client_id: clientId,
          user_id: userId,
          assignment_role: index === 0 && !present.size ? 'responsavel' : 'auxiliar',
          active: true,
        })),
      )
      if (error) return { clientId: null, slug: null, error: error.message }
    }
  }

  return { clientId, slug: draft.name.trim() ? newClientSlug(draft.name) : null, error: null }
}

/**
 * Grava o cliente e todas as suas coleções (lojas, contatos, módulos,
 * consultores). Se qualquer coleção falhar, o cliente recém-criado é arquivado
 * para não deixar cadastro pela metade na carteira.
 */
export async function createClientProgram(draft: NewClientDraft, createdBy: string): Promise<CreateClientProgramResult> {
  if (draft.primary_store_id) {
    const primaryValidation = await assertMatrixStore(draft.primary_store_id)
    if (primaryValidation.error) return { clientId: null, slug: null, error: primaryValidation.error }
  }

  const slug = newClientSlug(draft.name)
  const { data: client, error: insertError } = await supabase
    .from('clientes_consultoria')
    .insert({
      name: draft.name.trim(),
      legal_name: draft.legal_name.trim() || null,
      cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : null,
      notes: draft.notes.trim() || null,
      product_name: draft.product_name.trim() || null,
      program_template_key: draft.program_template_key.trim() || null,
      modality: draft.modality.trim() || null,
      structure_type: draft.structure_type,
      business_phase: draft.business_phase.trim() || null,
      implementation_owner_id: draft.implementation_owner_id || null,
      contract_start_date: draft.contract_start_date || null,
      contract_end_date: draft.contract_end_date || null,
      slug: slug || null,
      // O banco só aceita status ativo com loja principal vinculada
      // (clientes_consultoria_active_requires_store_check); sem loja, o cliente
      // nasce inativo e é ativado quando a loja for vinculada.
      primary_store_id: draft.primary_store_id || null,
      status: draft.primary_store_id ? 'ativo' : 'inativo',
      current_visit_step: 0,
      created_by: createdBy,
    })
    .select('id, slug')
    .single()

  if (insertError || !client) {
    // 23505 no índice parcial = a loja já tem um cliente ativo.
    const duplicateStore = insertError?.code === '23505' && insertError.message.includes('one_active_per_store')
    return {
      clientId: null,
      slug: null,
      error: duplicateStore
        ? 'Esta loja já tem um cliente ativo na consultoria. Escolha outra loja ou deixe sem vínculo.'
        : insertError?.message ?? 'Falha ao criar o cliente.',
    }
  }

  const rollback = async (message: string): Promise<CreateClientProgramResult> => {
    await supabase.from('clientes_consultoria').update({ status: 'arquivado' }).eq('id', client.id)
    if (hierarchy.createdStoreIds.length) {
      await supabase.from('lojas').update({ active: false }).in('id', hierarchy.createdStoreIds)
    }
    return { clientId: null, slug: null, error: message }
  }

  const hierarchy = await ensureStoreHierarchy(client.id, draft)
  if (hierarchy.error) return rollback(`Cliente criado, mas a hierarquia de lojas falhou: ${hierarchy.error}`)

  const units = draft.units.filter(unit => unit.name.trim())
  if (units.length) {
    const linkedUnits = units.map(unit => ({
      ...unit,
      store_id: resolveUnitStoreId(unit, hierarchy),
    }))
    const unlinkedUnit = linkedUnits.find(unit => !unit.store_id)
    if (unlinkedUnit) return rollback(`Cliente criado, mas a loja "${unlinkedUnit.name}" não foi vinculada à hierarquia operacional.`)

    const { error } = await supabase.from('unidades_cliente_consultoria').insert(
      linkedUnits.map(unit => ({
        client_id: client.id,
        name: unit.name.trim(),
        city: unit.city.trim() || null,
        state: unit.state.trim() || null,
        is_primary: unit.is_primary,
        store_type: unit.is_primary ? 'matriz' : 'filial',
        store_id: unit.store_id,
      })),
    )
    if (error) return rollback(`Cliente criado, mas as lojas falharam: ${error.message}`)
  }

  const contacts = draft.contacts.filter(contact => contact.name.trim())
  if (contacts.length) {
    const { error } = await supabase.from('contatos_cliente_consultoria').insert(
      contacts.map(contact => ({
        client_id: client.id,
        name: contact.name.trim(),
        role: contact.role.trim() || null,
        email: contact.email.trim() || null,
        phone: contact.phone.trim() || null,
        is_primary: contact.is_primary,
      })),
    )
    if (error) return rollback(`Cliente criado, mas os contatos falharam: ${error.message}`)
  }

  if (draft.enabled_modules.length) {
    const { error } = await supabase.from('modulos_cliente_consultoria').insert(
      draft.enabled_modules.map(moduleKey => ({
        client_id: client.id,
        module_key: moduleKey,
        label: moduleKey,
        enabled: true,
        configured_by: createdBy,
        configured_at: new Date().toISOString(),
      })),
    )
    if (error) return rollback(`Cliente criado, mas os módulos falharam: ${error.message}`)
  }

  const consultantIdsToAssign = draft.consultant_ids.length > 0
    ? draft.consultant_ids
    : draft.implementation_owner_id ? [draft.implementation_owner_id] : []

  if (consultantIdsToAssign.length) {
    const { error } = await supabase.from('atribuicoes_consultoria').insert(
      consultantIdsToAssign.map((userId, index) => ({
        client_id: client.id,
        user_id: userId,
        assignment_role: index === 0 ? 'responsavel' : 'auxiliar',
        active: true,
      })),
    )
    if (error) return rollback(`Cliente criado, mas os consultores falharam: ${error.message}`)
  }

  return { clientId: client.id, slug: client.slug ?? slug, error: null }
}
