import { supabase } from '@/lib/supabase'

export type ProductStatus = 'rascunho' | 'publicado' | 'arquivado'

export type ConsultingProduct = {
  program_key: string
  name: string | null
  descricao: string | null
  modalidade: string | null
  status: ProductStatus
  versao: number
  total_visits: number | null
  min_presenciais: number | null
  max_presenciais: number | null
  usa_plano_estrategico: boolean
  indicator_package_version_id: string | null
  active: boolean | null
  published_at: string | null
  clients: number
}

export type ProductModule = {
  id?: string
  module_key: string
  label: string
  incluido: boolean
  obrigatorio: boolean
  etapa: string | null
  visibilidade: 'dono' | 'gerente' | 'interno'
}

export type EncounterTime = {
  visit_number: number
  horas_online: number | null
  horas_presencial: number | null
  origem: 'manual' | 'planilha' | 'padrao'
  observacao: string | null
}

export type ProductDraft = {
  program_key: string
  name: string
  descricao: string
  modalidade: string
  total_visits: number
  min_presenciais: number | null
  max_presenciais: number | null
  usa_plano_estrategico: boolean
}

export function emptyProductDraft(): ProductDraft {
  return { program_key: '', name: '', descricao: '', modalidade: '', total_visits: 7, min_presenciais: null, max_presenciais: null, usa_plano_estrategico: false }
}

/** Erro bloqueante do produto, ou null. */
export function validateProductDraft(draft: ProductDraft): string | null {
  if (!draft.program_key.trim()) return 'Informe a chave do programa.'
  if (!/^[a-z0-9_]+$/.test(draft.program_key.trim())) return 'A chave aceita apenas minúsculas, números e underline.'
  if (!draft.name.trim()) return 'Informe o nome do produto.'
  if (!Number.isFinite(draft.total_visits) || draft.total_visits < 1) return 'A jornada precisa de ao menos 1 encontro.'
  if (draft.min_presenciais !== null && draft.min_presenciais < 0) return 'Mínimo de presenciais não pode ser negativo.'
  if (draft.min_presenciais !== null && draft.min_presenciais > draft.total_visits) return 'Mínimo de presenciais maior que o total de encontros.'
  if (draft.max_presenciais !== null && draft.max_presenciais > draft.total_visits) return 'Máximo de presenciais maior que o total de encontros.'
  if (draft.min_presenciais !== null && draft.max_presenciais !== null && draft.max_presenciais < draft.min_presenciais) {
    return 'Máximo de presenciais menor que o mínimo.'
  }
  return null
}

/** Transições de ciclo de vida permitidas — espelha as ações da tela. */
export function allowedProductTransitions(status: ProductStatus): ProductStatus[] {
  if (status === 'rascunho') return ['publicado', 'arquivado']
  if (status === 'publicado') return ['arquivado']
  return ['rascunho']
}

export function canDeleteProduct(product: Pick<ConsultingProduct, 'status' | 'clients'>) {
  return product.status === 'rascunho' && product.clients === 0
}

/** Chave da próxima versão do produto: `pmr_7` → `pmr_7_v2`. */
export function nextVersionKey(programKey: string, versao: number) {
  const base = programKey.replace(/_v\d+$/, '')
  return `${base}_v${versao + 1}`
}

export async function fetchConsultingProducts(): Promise<{ rows: ConsultingProduct[]; error: string | null }> {
  const [{ data: products, error }, { data: clients }] = await Promise.all([
    supabase
      .from('programas_visita_consultoria')
      .select('program_key, name, descricao, modalidade, status, versao, total_visits, min_presenciais, max_presenciais, usa_plano_estrategico, indicator_package_version_id, active, published_at')
      .order('name', { ascending: true }),
    supabase.from('clientes_consultoria').select('program_template_key, status'),
  ])
  if (error) return { rows: [], error: error.message }

  const counters = new Map<string, number>()
  for (const client of clients ?? []) {
    const key = client.program_template_key
    if (!key || String(client.status ?? '').toLowerCase() === 'arquivado') continue
    counters.set(key, (counters.get(key) ?? 0) + 1)
  }
  return {
    rows: (products ?? []).map(product => ({ ...product, clients: counters.get(product.program_key) ?? 0 })) as ConsultingProduct[],
    error: null,
  }
}

export async function saveProduct(draft: ProductDraft, editing: boolean): Promise<{ error: string | null }> {
  const invalid = validateProductDraft(draft)
  if (invalid) return { error: invalid }
  const payload = {
    program_key: draft.program_key.trim(),
    name: draft.name.trim(),
    descricao: draft.descricao.trim() || null,
    modalidade: draft.modalidade.trim() || null,
    total_visits: draft.total_visits,
    min_presenciais: draft.min_presenciais,
    max_presenciais: draft.max_presenciais,
    usa_plano_estrategico: draft.usa_plano_estrategico,
    updated_at: new Date().toISOString(),
  }
  const { error } = editing
    ? await supabase.from('programas_visita_consultoria').update(payload).eq('program_key', payload.program_key)
    : await supabase.from('programas_visita_consultoria').insert({ ...payload, status: 'rascunho', versao: 1, active: true })
  if (error) {
    return { error: error.code === '23505' ? 'Já existe um produto com essa chave.' : error.message }
  }
  return { error: null }
}

export async function changeProductStatus(programKey: string, status: ProductStatus, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programas_visita_consultoria')
    .update({
      status,
      active: status !== 'arquivado',
      published_at: status === 'publicado' ? new Date().toISOString() : null,
      published_by: status === 'publicado' ? userId : null,
      updated_at: new Date().toISOString(),
    })
    .eq('program_key', programKey)
  return { error: error?.message ?? null }
}

/** Duplica produto, módulos e tempos numa chave nova, sempre como rascunho. */
export async function duplicateProduct(source: ConsultingProduct, targetKey: string, targetName: string, versao: number): Promise<{ error: string | null }> {
  if (!/^[a-z0-9_]+$/.test(targetKey)) return { error: 'A chave aceita apenas minúsculas, números e underline.' }
  const { error } = await supabase.from('programas_visita_consultoria').insert({
    program_key: targetKey,
    name: targetName,
    descricao: source.descricao,
    modalidade: source.modalidade,
    total_visits: source.total_visits,
    min_presenciais: source.min_presenciais,
    max_presenciais: source.max_presenciais,
    usa_plano_estrategico: source.usa_plano_estrategico,
    status: 'rascunho',
    versao,
    active: true,
  })
  if (error) return { error: error.code === '23505' ? 'Já existe um produto com essa chave.' : error.message }

  const [{ data: modules }, { data: times }] = await Promise.all([
    supabase.from('modulos_produto_consultoria').select('module_key, label, incluido, obrigatorio, etapa, visibilidade').eq('program_key', source.program_key),
    supabase.from('tempos_encontro_produto').select('visit_number, horas_online, horas_presencial, origem, observacao').eq('program_key', source.program_key),
  ])
  if (modules?.length) await supabase.from('modulos_produto_consultoria').insert(modules.map(m => ({ ...m, program_key: targetKey })))
  if (times?.length) await supabase.from('tempos_encontro_produto').insert(times.map(t => ({ ...t, program_key: targetKey })))
  return { error: null }
}

export async function deleteDraftProduct(product: ConsultingProduct): Promise<{ error: string | null }> {
  if (!canDeleteProduct(product)) return { error: 'Só é possível excluir rascunho sem cliente vinculado.' }
  const { error } = await supabase.from('programas_visita_consultoria').delete().eq('program_key', product.program_key)
  return { error: error?.message ?? null }
}

export async function fetchProductModules(programKey: string): Promise<ProductModule[]> {
  const [{ data: saved }, { data: catalog }] = await Promise.all([
    supabase.from('modulos_produto_consultoria').select('id, module_key, label, incluido, obrigatorio, etapa, visibilidade').eq('program_key', programKey),
    supabase.from('modulos_sistema').select('codigo, nome, interno_mx').order('nome', { ascending: true }),
  ])
  const byKey = new Map((saved ?? []).map(item => [item.module_key, item]))
  return (catalog ?? [])
    .filter(item => !item.interno_mx)
    .map(item => {
      const current = byKey.get(item.codigo)
      return {
        id: current?.id,
        module_key: item.codigo,
        label: current?.label ?? item.nome,
        incluido: current?.incluido ?? false,
        obrigatorio: current?.obrigatorio ?? false,
        etapa: current?.etapa ?? null,
        visibilidade: (current?.visibilidade ?? 'dono') as ProductModule['visibilidade'],
      }
    })
}

export async function saveProductModules(programKey: string, modules: ProductModule[]): Promise<{ error: string | null }> {
  if (!modules.some(item => item.incluido)) return { error: 'Pelo menos um módulo deve ser liberado.' }
  const { error } = await supabase.from('modulos_produto_consultoria').upsert(
    modules.map(item => ({
      program_key: programKey,
      module_key: item.module_key,
      label: item.label,
      incluido: item.incluido,
      obrigatorio: item.obrigatorio,
      etapa: item.etapa,
      visibilidade: item.visibilidade,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'program_key,module_key' },
  )
  return { error: error?.message ?? null }
}

export async function fetchEncounterTimes(programKey: string, totalVisits: number): Promise<EncounterTime[]> {
  const { data } = await supabase
    .from('tempos_encontro_produto')
    .select('visit_number, horas_online, horas_presencial, origem, observacao')
    .eq('program_key', programKey)
  const byVisit = new Map((data ?? []).map(item => [item.visit_number, item]))
  return Array.from({ length: Math.max(totalVisits, 0) }, (_, index) => {
    const visit = index + 1
    const current = byVisit.get(visit)
    return {
      visit_number: visit,
      horas_online: current?.horas_online ?? null,
      horas_presencial: current?.horas_presencial ?? null,
      origem: (current?.origem ?? 'manual') as EncounterTime['origem'],
      observacao: current?.observacao ?? null,
    }
  })
}

export async function saveEncounterTimes(programKey: string, times: EncounterTime[]): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tempos_encontro_produto').upsert(
    times.map(item => ({
      program_key: programKey,
      visit_number: item.visit_number,
      horas_online: item.horas_online,
      horas_presencial: item.horas_presencial,
      origem: item.origem,
      observacao: item.observacao,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'program_key,visit_number' },
  )
  return { error: error?.message ?? null }
}

/** Situação do tempo de um encontro, igual ao Base44 (Completo/Só Online/Só Presencial/Pendente). */
export function encounterTimeStatus(time: EncounterTime): 'Completo' | 'Só Online' | 'Só Presencial' | 'Pendente' {
  const online = (time.horas_online ?? 0) > 0
  const presencial = (time.horas_presencial ?? 0) > 0
  if (online && presencial) return 'Completo'
  if (online) return 'Só Online'
  if (presencial) return 'Só Presencial'
  return 'Pendente'
}

export function summarizeTimes(times: EncounterTime[]) {
  return {
    totalOnline: times.reduce((sum, item) => sum + (item.horas_online ?? 0), 0),
    totalPresencial: times.reduce((sum, item) => sum + (item.horas_presencial ?? 0), 0),
    encontros: times.length,
    pendencias: times.filter(item => encounterTimeStatus(item) === 'Pendente').length,
  }
}
