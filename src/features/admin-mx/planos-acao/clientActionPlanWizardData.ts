import { supabase } from '@/lib/supabase'
import { fetchClientProductPackage, fetchClientUnits } from '@/features/strategic-plan/clientPlanningRepository'

/**
 * Acesso a dados do wizard de plano por cliente. Os dados de apoio vêm das
 * tabelas MX existentes: clientes_consultoria, unidades_cliente_consultoria,
 * lojas, catalogo_metricas_consultoria e usuarios.
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
    rows: result.units.map(unit => ({
      id: unit.id,
      name: unit.name,
      source: unit.store_type === 'MATRIZ' ? 'loja' : 'unidade',
    })),
    error: null,
  }
}

/**
 * Indicadores ativos do catálogo, filtrados por área no componente. Quando o
 * wizard está dentro da ficha de um cliente, o roster do produto contratado é
 * a fonte de verdade; o catálogo geral fica reservado ao wizard global.
 */
export async function fetchWizardIndicators(clientId?: string): Promise<{ rows: WizardIndicator[]; error: string | null }> {
  const packageResult = clientId ? await fetchClientProductPackage(clientId) : null
  if (packageResult && !packageResult.ok) return { rows: [], error: packageResult.message }

  const rosterItems = packageResult?.ok ? packageResult.resolution.items : []
  const rosterCodes = rosterItems.map(item => item.metric_key)
  if (clientId && !rosterCodes.length) return { rows: [], error: null }

  let query = supabase
    .from('catalogo_metricas_consultoria')
    .select('metric_key, label, area, direction')
    .eq('active', true)
    .order('label', { ascending: true })
  if (rosterCodes.length) query = query.in('metric_key', rosterCodes)
  const { data, error } = await query
  if (error) return { rows: [], error: error.message }

  const catalogRows = (data ?? []).map(item => ({
    metric_key: item.metric_key,
    label: rosterItems.find(rosterItem => rosterItem.metric_key === item.metric_key)?.label_snapshot || item.label,
    area: rosterItems.find(rosterItem => rosterItem.metric_key === item.metric_key)?.area_snapshot || item.area,
    direction: item.direction,
  }))
  if (!rosterCodes.length) return { rows: catalogRows, error: null }
  const order = new Map(rosterCodes.map((code, index) => [code, index]))
  catalogRows.sort((a, b) => (order.get(a.metric_key) ?? 9999) - (order.get(b.metric_key) ?? 9999))
  return { rows: catalogRows, error: null }
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
