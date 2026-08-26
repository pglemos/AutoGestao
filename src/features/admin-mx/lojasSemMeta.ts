import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/supabasePagination'

/**
 * Lojas em operação cuja meta mensal está zerada.
 *
 * A meta da loja vive em `regras_metas_loja.monthly_goal` — não em `metas`, que
 * guarda a meta individual de cada vendedor. Toda loja ativa já tem a linha de
 * regra; o que falta em algumas é o valor, que fica em `0.00`.
 *
 * Sem meta de loja, a projeção e o percentual de atingimento do time saem
 * zerados para todo mundo daquela unidade — o vendedor abre o painel e vê 0%
 * sem que nada esteja errado com o trabalho dele. Só a MX define esse número,
 * então a tela não inventa valor: apenas mostra onde ele está faltando.
 */
export interface LojaSemMeta {
  storeId: string
  loja: string
  vendedores: number
}

type RegraRow = { store_id: string; monthly_goal: number | null }
type VinculoRow = { store_id: string; user_id: string; role: string | null }
type LojaRow = { id: string; name: string | null; active: boolean | null }

export async function fetchLojasSemMeta(): Promise<{ lojas: LojaSemMeta[]; error: string | null }> {
  const [regrasRes, lojasRes, vinculosRes] = await Promise.all([
    fetchAllRows<RegraRow>((from, to) =>
      supabase.from('regras_metas_loja').select('store_id, monthly_goal').range(from, to)),
    fetchAllRows<LojaRow>((from, to) =>
      supabase.from('lojas').select('id, name, active').range(from, to)),
    fetchAllRows<VinculoRow>((from, to) =>
      supabase.from('vinculos_loja').select('store_id, user_id, role').range(from, to)),
  ])

  const erro = regrasRes.error || lojasRes.error || vinculosRes.error
  if (erro) return { lojas: [], error: erro }

  const lojaPorId = new Map(lojasRes.rows.filter(l => l.active !== false).map(l => [l.id, l.name || l.id]))

  const vendedoresPorLoja = new Map<string, Set<string>>()
  for (const vinculo of vinculosRes.rows) {
    if (vinculo.role !== 'vendedor') continue
    const atual = vendedoresPorLoja.get(vinculo.store_id) ?? new Set<string>()
    atual.add(vinculo.user_id)
    vendedoresPorLoja.set(vinculo.store_id, atual)
  }

  const lojas: LojaSemMeta[] = []
  for (const regra of regrasRes.rows) {
    if (Number(regra.monthly_goal ?? 0) > 0) continue
    const nome = lojaPorId.get(regra.store_id)
    // Loja inativa não está em operação: cobrar meta dela seria ruído.
    if (!nome) continue
    const vendedores = vendedoresPorLoja.get(regra.store_id)?.size ?? 0
    // Sem equipe, a meta zerada não prejudica ninguém hoje.
    if (vendedores === 0) continue
    lojas.push({ storeId: regra.store_id, loja: nome, vendedores })
  }

  lojas.sort((a, b) => b.vendedores - a.vendedores || a.loja.localeCompare(b.loja, 'pt-BR'))
  return { lojas, error: null }
}

/** Total de vendedores impactados — o número que dimensiona a urgência. */
export function vendedoresImpactados(lojas: LojaSemMeta[]): number {
  return lojas.reduce((soma, item) => soma + item.vendedores, 0)
}
