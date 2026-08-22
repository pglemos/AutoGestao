import { supabase } from '@/lib/supabase'
import { fetchClientProductPackage, fetchClientUnits } from '@/features/strategic-plan/clientPlanningRepository'
import { BASE44_STANDARD_INDICATORS, matchCanonicalIndicator, officialDefinitionDirection, officialDefinitionUnit } from '../indicadores/canonicalBase44Catalog'

/**
 * Acesso a dados do wizard de plano por cliente. Os dados de apoio vêm das
 * tabelas MX existentes: clientes_consultoria, unidades_cliente_consultoria,
 * lojas, catálogo oficial Base44 e usuarios.
 */

export type WizardClient = {
  id: string
  name: string
  status: string
}

export type WizardStore = {
  id: string
  name: string
  source: 'loja' | 'unidade'
}

export type WizardIndicator = {
  metric_key: string
  label: string
  area: string
  direction: string
  unit: string
}

export type WizardResponsible = {
  id: string
  name: string
  role: string
}

export async function fetchWizardClients(): Promise<{ rows: WizardClient[]; error: string | null }> {
  const { data, error } = await supabase
    .from('clientes_consultoria')
    .select('id, name, status')
    .order('name', { ascending: true })
    .limit(200)
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []).map(client => ({ id: client.id, name: client.name, status: client.status })), error: null }
}

/**
 * Unidades operacionais de um cliente: a matriz e suas filiais reais em
 * `lojas.parent_loja_id`. O wizard grava planos no mesmo escopo `store` usado
 * pelo board global, então não pode misturar IDs de uma tabela de cadastro
 * auxiliar com IDs das lojas operacionais.
 */
export async function fetchWizardStores(clientId: string): Promise<{ rows: WizardStore[]; error: string | null }> {
  const result = await fetchClientUnits(clientId)
  if (result.error) return { rows: [], error: result.error }
  return {
    rows: result.units.filter(unit => unit.active).map(unit => ({
      id: unit.id,
      name: unit.name,
      source: unit.store_type === 'MATRIZ' ? 'loja' : 'unidade',
    })),
    error: null,
  }
}

export function officialWizardIndicators(): WizardIndicator[] {
  return BASE44_STANDARD_INDICATORS.map(item => ({
    metric_key: item.code,
    label: item.name,
    area: item.area,
    direction: officialDefinitionDirection(item.code),
    unit: officialDefinitionUnit(item.code),
  }))
}

/**
 * Indicadores oficiais Base44 do plano de ação. No wizard de um cliente,
 * o roster só escolhe quais oficiais aparecem — nomes e áreas vêm do catálogo canônico.
 */
export async function fetchWizardIndicators(clientId?: string): Promise<{ rows: WizardIndicator[]; error: string | null }> {
  const official = officialWizardIndicators()
  if (!clientId) return { rows: official, error: null }

  const packageResult = await fetchClientProductPackage(clientId)
  if (!packageResult.ok) return { rows: [], error: packageResult.message }

  const rosterItems = packageResult.resolution.items
  if (!rosterItems.length) return { rows: [], error: null }

  const seen = new Set<string>()
  const rows: WizardIndicator[] = []
  for (const item of rosterItems) {
    const canon = matchCanonicalIndicator(item.metric_key)
    if (!canon || seen.has(canon.code)) continue
    seen.add(canon.code)
    rows.push({
      metric_key: canon.code,
      label: canon.name,
      area: canon.area,
      direction: officialDefinitionDirection(canon.code),
      unit: officialDefinitionUnit(canon.code),
    })
  }
  return { rows, error: null }
}

/** Responsáveis: usuários internos MX ativos. */
export async function fetchWizardResponsibles(): Promise<{ rows: WizardResponsible[]; error: string | null }> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, name, role')
    .in('role', ['administrador_geral', 'administrador_mx', 'consultor_mx'])
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []).map(user => ({ id: user.id, name: user.name ?? '—', role: user.role })), error: null }
}
