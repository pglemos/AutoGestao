import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.generated'

import type { CompetenciaAvaliada, EtapaFunilAberta, SinaisRecomendacao } from './recomendacao'

type AvaliacaoPdiRow = {
  nota_atribuida: number
  alvo: number
  sessao: { colaborador_id: string; created_at: string } | null
  competencia: { nome: string; ordem: number } | null
}

/**
 * Reduz as avaliações à sessão de PDI mais recente do vendedor: recomendar com
 * base num PDI antigo, já substituído, mandaria a pessoa para o treinamento
 * errado.
 */
export function competenciasDoPdiVigente(rows: unknown): CompetenciaAvaliada[] | null {
  const avaliacoes = (rows as AvaliacaoPdiRow[] | null) || []
  const validas = avaliacoes.filter((row) => row.sessao && row.competencia)
  if (!validas.length) return null

  const maisRecente = validas.reduce(
    (maior, row) => ((row.sessao as { created_at: string }).created_at > maior
      ? (row.sessao as { created_at: string }).created_at
      : maior),
    '',
  )

  return validas
    .filter((row) => (row.sessao as { created_at: string }).created_at === maisRecente)
    .map((row) => ({
      ordem: (row.competencia as { ordem: number }).ordem,
      nome: (row.competencia as { nome: string }).nome,
      nota: row.nota_atribuida,
      alvo: row.alvo,
    }))
}

/**
 * Sinais que explicam por que um treinamento é recomendado: lacunas do PDI
 * vigente, gargalo do funil e ações de devolutiva em aberto.
 *
 * Vive no serviço porque duas telas precisam do mesmo cálculo — a Universidade
 * MX do vendedor e a tela de treinamentos.
 */
export async function carregarSinaisRecomendacao(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<Omit<SinaisRecomendacao, 'nivelMaturidade'>> {
  const [oportunidadesRes, devolutivasRes, pdiRes] = await Promise.all([
    client
      .from('clientes_oportunidades')
      .select('etapa')
      .eq('seller_user_id', userId)
      .is('data_venda', null)
      // 'cancelada' é terminal como 'ganho'/'perdido' — sem ela, a venda
      // revertida voltava a contar como pipeline aberto.
      .not('etapa', 'in', '("ganho","perdido","cancelada")'),
    client
      .from('devolutiva_acoes')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'pendente'),
    client
      .from('pdi_avaliacoes_competencia')
      .select('nota_atribuida, alvo, sessao:pdi_sessoes!inner(colaborador_id, created_at), competencia:pdi_competencias!inner(nome, ordem)')
      .eq('sessao.colaborador_id', userId)
      .order('created_at', { referencedTable: 'pdi_sessoes', ascending: false }),
  ])

  const etapasAbertas: Partial<Record<EtapaFunilAberta, number>> = {}
  for (const row of oportunidadesRes.data ?? []) {
    const etapa = row.etapa as EtapaFunilAberta | null
    if (!etapa) continue
    etapasAbertas[etapa] = (etapasAbertas[etapa] ?? 0) + 1
  }

  return {
    etapasAbertas,
    devolutivaAcoesPendentes: devolutivasRes.count ?? 0,
    competenciasPdi: competenciasDoPdiVigente(pdiRes.data),
  }
}
