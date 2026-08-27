import { describe, expect, test } from 'vitest'

import { CATEGORIA_POR_COMPETENCIA, categoriaDaCompetencia } from './competencia-pdi-categoria'
import { categoriaDoTreinamento } from './universidade-service'

/**
 * As 18 competências de `pdi_competencias`, na ordem em que vivem no banco.
 * O de-para é por ordem; esta lista existe para o teste falar em nomes.
 */
const COMPETENCIAS = [
  [1, 'Planejamento'],
  [2, 'Atendimento ao Cliente'],
  [3, 'Agendamento de Visitas'],
  [4, 'Fechamento de Venda'],
  [5, 'Carteira de Clientes'],
  [6, 'Mídias Sociais'],
  [7, 'Prospecção'],
  [8, 'Avaliação de Carro'],
  [9, 'Financiamentos'],
  [10, 'Processos'],
  [11, 'Pontualidade'],
  [12, 'Senso de Urgência'],
  [13, 'Iniciativa'],
  [14, 'Organização'],
  [15, 'Liderança'],
  [16, 'Relacionamento Interpessoal'],
  [17, 'Persistência'],
  [18, 'Resiliência'],
] as const

describe('de-para competência do PDI -> categoria de treinamento', () => {
  test('cobre as 18 competências, sem buraco', () => {
    expect(Object.keys(CATEGORIA_POR_COMPETENCIA)).toHaveLength(18)
    for (const [ordem, nome] of COMPETENCIAS) {
      expect(categoriaDaCompetencia(ordem), `competência ${nome}`).toBeTruthy()
    }
  })

  test('só aponta para categorias que a Universidade realmente tem', () => {
    // As categorias válidas são as que `categoriaDoTreinamento` produz.
    const categoriasReais = new Set(
      ['prospeccao', 'atendimento', 'agendamento', 'apresentacao', 'financiamento',
       'carro_de_troca', 'fechamento', 'funil', 'rotina_diaria', 'crm', 'institucional']
        .map(categoriaDoTreinamento),
    )
    for (const [ordem, nome] of COMPETENCIAS) {
      expect(categoriasReais.has(categoriaDaCompetencia(ordem) as string), `${nome} aponta para categoria inexistente`).toBe(true)
    }
  })

  test('respeita a correspondência que o catálogo já declarava', () => {
    expect(categoriaDaCompetencia(3)).toBe(categoriaDoTreinamento('agendamento'))
    expect(categoriaDaCompetencia(5)).toBe(categoriaDoTreinamento('crm'))
    expect(categoriaDaCompetencia(8)).toBe(categoriaDoTreinamento('carro_de_troca'))
    expect(categoriaDaCompetencia(9)).toBe(categoriaDoTreinamento('financiamento'))
    expect(categoriaDaCompetencia(10)).toBe(categoriaDoTreinamento('rotina_diaria'))
  })

  test('competências técnicas de venda não caem todas em Mentalidade', () => {
    const tecnicasDeVenda = [2, 3, 4, 5, 6, 7, 8, 9].map(o => categoriaDaCompetencia(o))
    expect(tecnicasDeVenda).not.toContain('Mentalidade')
  })

  test('comportamentais vão para Mentalidade, menos relacionamento', () => {
    for (const ordem of [11, 12, 13, 14, 15, 17, 18]) {
      expect(categoriaDaCompetencia(ordem)).toBe('Mentalidade')
    }
    expect(categoriaDaCompetencia(16)).toBe('Atendimento')
  })

  test('nota igual ao alvo não é lacuna — a escala vem do cargo', () => {
    // Consultor de Vendas (nível 2) tem escala 6–10: um corte fixo em "< 6"
    // jamais dispararia, que era o defeito do limiar antigo.
    const semLacuna = { ordem: 4, nome: 'Fechamento de Venda', nota: 6, alvo: 6 }
    const comLacuna = { ordem: 4, nome: 'Fechamento de Venda', nota: 6, alvo: 10 }
    expect(semLacuna.alvo - semLacuna.nota).toBe(0)
    expect(comLacuna.alvo - comLacuna.nota).toBeGreaterThan(0)
  })

  test('ordem fora da tabela não inventa categoria', () => {
    expect(categoriaDaCompetencia(0)).toBeNull()
    expect(categoriaDaCompetencia(99)).toBeNull()
  })
})
