// UNIV-4 (auditoria 2026-07-10): motor de recomendação explicável da Universidade MX.
// Substitui o "Recomendado para Você" fabricado do protótipo Base44 (primeiros 4 da
// lista). Cada recomendação carrega motivos legíveis; sem sinal real, não recomenda.

export type NivelMaturidade = 'N1' | 'N2' | 'N3' | 'N4'

export type EtapaFunilAberta = 'prospeccao' | 'qualificacao' | 'apresentacao' | 'negociacao' | 'fechamento'

import { categoriaDaCompetencia, type CompetenciaAvaliada } from './competencia-pdi-categoria'

export type { CompetenciaAvaliada }

export type SinaisRecomendacao = {
    /** Oportunidades abertas do vendedor por etapa do funil. */
    etapasAbertas: Partial<Record<EtapaFunilAberta, number>>
    /** Ações de devolutiva com status pendente. */
    devolutivaAcoesPendentes: number
    /** Notas do PDI mais recente (0–10); null quando o vendedor não tem PDI. */
    /** Competências avaliadas no PDI vigente do vendedor (0–10). */
    competenciasPdi: CompetenciaAvaliada[] | null
    nivelMaturidade: NivelMaturidade
}

export type TreinamentoRecomendavel = {
    id: string
    title: string
    category: string
    level: string
    completed: boolean
}

export type Recomendacao = {
    id: string
    motivos: string[]
    score: number
}

const ETAPA_LABEL: Record<EtapaFunilAberta, string> = {
    prospeccao: 'Prospecção',
    qualificacao: 'Qualificação',
    apresentacao: 'Apresentação',
    negociacao: 'Negociação',
    fechamento: 'Fechamento',
}

const ETAPA_CATEGORIA: Record<EtapaFunilAberta, string> = {
    prospeccao: 'Prospecção',
    qualificacao: 'Atendimento',
    apresentacao: 'Atendimento',
    negociacao: 'Negociação',
    fechamento: 'Fechamento',
}

/**
 * Lacuna é nota abaixo do alvo do cargo — a mesma definição do "Top 5 maiores
 * lacunas" do documento de PDI.
 *
 * Um corte fixo não serve: a escala vem do cargo (nível 2 vai de 6 a 10), então
 * o antigo `nota < 6` nunca disparava para um consultor de vendas. Nota igual
 * ao alvo é competência atingida, não lacuna.
 */
/** Oportunidades paradas numa etapa a partir das quais ela vira gargalo. */
const MIN_OPORTUNIDADES_GARGALO = 3

type MotivoPorCategoria = { categoria: string; peso: number; motivo: string }

function motivosDosSinais(sinais: SinaisRecomendacao): MotivoPorCategoria[] {
    const motivos: MotivoPorCategoria[] = []

    for (const competencia of sinais.competenciasPdi || []) {
        if (typeof competencia.nota !== 'number' || typeof competencia.alvo !== 'number') continue
        const lacuna = competencia.alvo - competencia.nota
        if (lacuna <= 0) continue
        const categoria = categoriaDaCompetencia(competencia.ordem)
        if (!categoria) continue
        motivos.push({
            categoria,
            // Lacuna maior pesa mais: quem está 4 pontos abaixo do alvo precisa
            // mais daquele treinamento do que quem está 1 ponto.
            peso: 2 + lacuna,
            motivo: `${competencia.nome} está em ${competencia.nota}/${competencia.alvo} no seu PDI`,
        })
    }

    const gargalo = (Object.entries(sinais.etapasAbertas) as [EtapaFunilAberta, number][])
        .filter(([, quantidade]) => quantidade >= MIN_OPORTUNIDADES_GARGALO)
        .sort((a, b) => b[1] - a[1])[0]
    if (gargalo) {
        motivos.push({
            categoria: ETAPA_CATEGORIA[gargalo[0]],
            peso: 2,
            motivo: `${gargalo[1]} oportunidades paradas em ${ETAPA_LABEL[gargalo[0]]}`,
        })
    }

    if (sinais.devolutivaAcoesPendentes > 0) {
        motivos.push({
            categoria: 'Mentalidade',
            peso: 2,
            motivo: `${sinais.devolutivaAcoesPendentes} ação(ões) de devolutiva pendente(s)`,
        })
    }

    return motivos
}

export function recomendarTreinamentos(
    trainings: TreinamentoRecomendavel[],
    sinais: SinaisRecomendacao,
    limite = 4,
): Recomendacao[] {
    const sinaisPorCategoria = motivosDosSinais(sinais)
    if (sinaisPorCategoria.length === 0) return []

    const recomendacoes: Recomendacao[] = []
    for (const training of trainings) {
        if (training.completed) continue
        const aplicaveis = sinaisPorCategoria.filter(s => s.categoria === training.category)
        if (aplicaveis.length === 0) continue

        let score = aplicaveis.reduce((total, s) => total + s.peso, 0)
        const motivos = aplicaveis.map(s => s.motivo)
        // Maturidade só desempata entre treinamentos já recomendados por sinal real.
        if (training.level.startsWith(sinais.nivelMaturidade)) {
            score += 1
            motivos.push(`Alinhado à sua trilha ${sinais.nivelMaturidade}`)
        }
        recomendacoes.push({ id: training.id, motivos, score })
    }

    return recomendacoes
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
        .slice(0, limite)
}
