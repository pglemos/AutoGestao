import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * A Rotina do Dia do Dono mostra, na mesma tela, dois números para
 * "agendamentos" com janelas de tempo diferentes:
 *
 *   card "Agenda comercial"  → filtra `reference_date === referenceDate` (hoje)
 *   coluna AGENDAMENTOS      → soma todos os check-ins do período carregado
 *
 * Em produção na MX CONSULTORIA o card mostrava 0 e a linha do JOSÉ mostrava
 * 20, sob uma tabela intitulada "Fechamento Diário da Equipe". Pior: o STATUS
 * da linha ("FECHAMENTO PENDENTE") é do dia, então a linha mistura as duas
 * janelas sem dizer.
 *
 * Não mudei os números — qual janela a tabela deve usar é decisão de produto.
 * O que a tela passa a fazer é declarar o recorte.
 */
const view = readFileSync(new URL('./sections/owner-cockpit/OwnerBase44Views.tsx', import.meta.url), 'utf8')

describe('Rotina do Dia declara o recorte de cada número', () => {
  test('o card de agenda continua filtrando pelo dia de referência', () => {
    expect(view).toContain('.filter(checkin => checkin.reference_date === data.referenceDate)')
  })

  test('a tabela avisa que status e números têm janelas diferentes', () => {
    expect(view).toContain('Status referente ao dia; vendas, leads e agendamentos somam o período selecionado.')
  })

  test('o motivo fica registrado junto do código', () => {
    expect(view).toContain('se lê como se os números fossem de hoje')
  })
})
