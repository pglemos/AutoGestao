import { describe, expect, test } from 'vitest'
import { recomendarTreinamentos, type SinaisRecomendacao, type TreinamentoRecomendavel } from './recomendacao'

const treino = (partial: Partial<TreinamentoRecomendavel> & { id: string }): TreinamentoRecomendavel => ({
    title: `Aula ${partial.id}`,
    category: 'Atendimento',
    level: 'N1 Iniciante',
    completed: false,
    ...partial,
})

const semSinais: SinaisRecomendacao = {
    etapasAbertas: {},
    devolutivaAcoesPendentes: 0,
    competenciasPdi: null,
    nivelMaturidade: 'N1',
}

describe('recomendarTreinamentos', () => {
    test('sem sinal nenhum, não recomenda — nada de "primeiros 4" fabricado', () => {
        const trainings = [treino({ id: 'a', level: 'N3 Performance' }), treino({ id: 'b', level: 'N4 Alta Performance' })]
        expect(recomendarTreinamentos(trainings, semSinais)).toEqual([])
    })

    test('competência fraca do PDI puxa a categoria correspondente com motivo explicável', () => {
        const trainings = [
            treino({ id: 'fech', category: 'Fechamento' }),
            treino({ id: 'atend', category: 'Atendimento' }),
        ]
        const [primeira] = recomendarTreinamentos(trainings, {
            ...semSinais,
            competenciasPdi: [
                { ordem: 4, nome: 'Fechamento de Venda', nota: 3, alvo: 10 },
                { ordem: 2, nome: 'Atendimento ao Cliente', nota: 10, alvo: 10 },
            ],
        })
        expect(primeira.id).toBe('fech')
        expect(primeira.motivos.join(' ')).toContain('Fechamento de Venda')
        expect(primeira.motivos.join(' ')).toContain('3')
    })

    test('gargalo do funil recomenda a categoria da etapa com mais oportunidades paradas', () => {
        const trainings = [treino({ id: 'neg', category: 'Negociação' })]
        const [rec] = recomendarTreinamentos(trainings, {
            ...semSinais,
            etapasAbertas: { negociacao: 5, prospeccao: 1 },
        })
        expect(rec.id).toBe('neg')
        expect(rec.motivos.join(' ')).toContain('5')
    })

    test('ações de devolutiva pendentes recomendam Mentalidade', () => {
        const trainings = [treino({ id: 'ment', category: 'Mentalidade' })]
        const [rec] = recomendarTreinamentos(trainings, { ...semSinais, devolutivaAcoesPendentes: 2 })
        expect(rec.id).toBe('ment')
        expect(rec.motivos.join(' ')).toContain('devolutiva')
    })

    test('nível de maturidade só desempata — não recomenda sozinho', () => {
        const trainings = [
            treino({ id: 'n2-neg', category: 'Negociação', level: 'N2 Intermediário' }),
            treino({ id: 'n4-neg', category: 'Negociação', level: 'N4 Alta Performance' }),
        ]
        const sinais: SinaisRecomendacao = { ...semSinais, nivelMaturidade: 'N2', etapasAbertas: { negociacao: 4 } }
        const recs = recomendarTreinamentos(trainings, sinais)
        expect(recs[0].id).toBe('n2-neg')
        expect(recs[0].motivos.join(' ')).toContain('N2')

        const soMaturidade = recomendarTreinamentos([treino({ id: 'x', level: 'N2 Intermediário' })], { ...semSinais, nivelMaturidade: 'N2' })
        expect(soMaturidade).toEqual([])
    })

    test('exclui treinamentos concluídos e respeita o limite', () => {
        const trainings = [
            treino({ id: 'feito', category: 'Fechamento', completed: true }),
            treino({ id: 'a', category: 'Fechamento' }),
            treino({ id: 'b', category: 'Fechamento' }),
            treino({ id: 'c', category: 'Fechamento' }),
            treino({ id: 'd', category: 'Fechamento' }),
            treino({ id: 'e', category: 'Fechamento' }),
        ]
        const recs = recomendarTreinamentos(trainings, { ...semSinais, competenciasPdi: [{ ordem: 4, nome: 'Fechamento de Venda', nota: 2, alvo: 10 }] })
        expect(recs).toHaveLength(4)
        expect(recs.map(r => r.id)).not.toContain('feito')
    })
})
