import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { derivarNivelMaturidadeVendedor, type NivelMaturidadeVendedor, type VendedorExperienciaDeclarada } from '@/features/crm/lib/maturidade'

import { recomendarTreinamentos, type Recomendacao, type TreinamentoRecomendavel } from '../services/recomendacao'
import { carregarSinaisRecomendacao } from '../services/sinais-recomendacao'

/**
 * Recomendação de aulas a partir das lacunas do PDI, do gargalo do funil e das
 * devolutivas pendentes do próprio vendedor.
 *
 * Recebe a biblioteca já carregada pela tela em vez de buscá-la de novo: é a
 * mesma lista de `treinamentos` que a Universidade MX exibe.
 */
export function useRecomendacaoTreinamentos(
  userId: string | null,
  biblioteca: TreinamentoRecomendavel[],
) {
  const [recomendacoes, setRecomendacoes] = useState<Recomendacao[]>([])
  const [nivelMaturidade, setNivelMaturidade] = useState<NivelMaturidadeVendedor>('N1')

  useEffect(() => {
    let ativo = true
    if (!userId || biblioteca.length === 0) {
      setRecomendacoes([])
      return
    }

    void (async () => {
      try {
        const [perfilRes, sinais] = await Promise.all([
          supabase
            .from('vendedor_perfil')
            .select('tempo_mercado_anos, experiencia_declarada, cargo_atual')
            .eq('seller_user_id', userId)
            .maybeSingle(),
          carregarSinaisRecomendacao(supabase, userId),
        ])
        if (!ativo) return

        const perfil = perfilRes.data as {
          tempo_mercado_anos: number | null
          experiencia_declarada: VendedorExperienciaDeclarada | null
          cargo_atual: string | null
        } | null

        const nivel = derivarNivelMaturidadeVendedor({
          tempo_mercado_anos: perfil?.tempo_mercado_anos ?? null,
          experiencia_declarada: perfil?.experiencia_declarada ?? null,
          cargo_atual: perfil?.cargo_atual ?? null,
        })
        setNivelMaturidade(nivel)
        setRecomendacoes(recomendarTreinamentos(biblioteca, { ...sinais, nivelMaturidade: nivel }))
      } catch {
        // Recomendação é acessório da biblioteca: se falhar, a tela segue
        // mostrando o catálogo inteiro em vez de quebrar.
        if (ativo) setRecomendacoes([])
      }
    })()

    return () => { ativo = false }
  }, [userId, biblioteca])

  return { recomendacoes, nivelMaturidade }
}
