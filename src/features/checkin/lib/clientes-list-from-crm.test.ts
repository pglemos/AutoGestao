import { describe, expect, test } from 'bun:test'
import { deriveClientesListFromCrm, type OportunidadeForClienteRow, type AgendamentoForClienteRow } from './clientes-list-from-crm'

const baseOportunidade: OportunidadeForClienteRow = {
  id: 'op-1',
  cliente_id: 'cli-1',
  seller_user_id: 'vend-1',
  veiculo_interesse: 'HB20',
  valor_negociado: 0,
  etapa: 'prospeccao',
  canal: 'carteira',
  sinal: 0,
  financiamento: 'nao_aplica',
  carro_avaliado: false,
  motivo_perda: null,
  created_at: '2026-06-23T12:00:00-03:00',
  cliente: { nome: 'João', telefone: '11999998888' },
}

describe('deriveClientesListFromCrm', () => {
  test('usa data_competencia explícita sem adulterar created_at', () => {
    const result = deriveClientesListFromCrm(
      [{ ...baseOportunidade, created_at: '2026-07-10T15:00:00-03:00', data_competencia: '2026-06-23' }],
      [],
      '2026-06-23',
    )
    expect(result).toHaveLength(1)
  })

  test('venda (etapa ganho) classifica como Venda, sem agendamento vinculado', () => {
    const rows = deriveClientesListFromCrm(
      [{ ...baseOportunidade, etapa: 'ganho', valor_negociado: 100000 }],
      [],
      '2026-06-23',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].vendaRealizada).toBe('Sim')
    expect(rows[0].tipoRegistroCalculado).toBe('Venda')
    expect(rows[0].valorNegociado).toBe(100000)
  })

  test('venda convertida de oportunidade antiga usa closed_at como data do fechamento', () => {
    const rows = deriveClientesListFromCrm(
      [{
        ...baseOportunidade,
        etapa: 'ganho',
        created_at: '2026-06-20T12:00:00-03:00',
        data_competencia: '2026-06-20',
        closed_at: '2026-06-23T13:45:00-03:00',
        valor_negociado: 100000,
      }],
      [],
      '2026-06-23',
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].vendaRealizada).toBe('Sim')
    expect(rows[0].tipoRegistroCalculado).toBe('Venda')
  })

  test('perda (etapa perdido) carrega motivo_perda', () => {
    const rows = deriveClientesListFromCrm(
      [{ ...baseOportunidade, etapa: 'perdido', motivo_perda: 'Comprou em outra marca' }],
      [],
      '2026-06-23',
    )
    expect(rows[0].vendaRealizada).toBe('Não')
    expect(rows[0].tipoRegistroCalculado).toBe('Perda')
    expect(rows[0].motivoPerda).toBe('Comprou em outra marca')
  })

  test('em negociação com agendamento D+1 vinculado classifica como Agendamento D+1', () => {
    const agendamento: AgendamentoForClienteRow = {
      id: 'ag-1',
      oportunidade_id: 'op-1',
      data_hora: '2026-06-24T10:00:00-03:00',
      canal: 'carteira',
      status: 'aguardando',
      observacoes: 'Cliente vai trazer o usado para avaliação.',
    }
    const rows = deriveClientesListFromCrm(
      [{ ...baseOportunidade, etapa: 'negociacao' }],
      [agendamento],
      '2026-06-23',
    )
    expect(rows[0].vendaRealizada).toBe('Em Negociação')
    expect(rows[0].tipoRegistroCalculado).toBe('Agendamento D+1')
    expect(rows[0].dataAgendamento).toBe('2026-06-24T10:00:00-03:00')
    expect(rows[0].observacoes).toBe('Cliente vai trazer o usado para avaliação.')
  })

  test('agendamento com status compareceu mapeia compareceu=Sim', () => {
    const agendamento: AgendamentoForClienteRow = {
      id: 'ag-2',
      oportunidade_id: 'op-1',
      data_hora: '2026-06-23T15:00:00-03:00',
      canal: 'showroom',
      status: 'compareceu',
      observacoes: null,
    }
    const rows = deriveClientesListFromCrm(
      [{ ...baseOportunidade, etapa: 'negociacao', canal: 'showroom' }],
      [agendamento],
      '2026-06-23',
    )
    expect(rows[0].compareceu).toBe('Sim')
  })

  test('oportunidade criada em outro dia não aparece no fechamento selecionado', () => {
    const rows = deriveClientesListFromCrm(
      [{ ...baseOportunidade, created_at: '2026-06-20T12:00:00-03:00' }],
      [],
      '2026-06-23',
    )
    expect(rows).toHaveLength(0)
  })

  test('usa o agendamento mais recente quando há mais de um vinculado', () => {
    const antigo: AgendamentoForClienteRow = {
      id: 'ag-old', oportunidade_id: 'op-1', data_hora: '2026-06-24T09:00:00-03:00',
      canal: 'carteira', status: 'aguardando', observacoes: 'antigo',
    }
    const recente: AgendamentoForClienteRow = {
      id: 'ag-new', oportunidade_id: 'op-1', data_hora: '2026-06-25T09:00:00-03:00',
      canal: 'carteira', status: 'aguardando', observacoes: 'recente',
    }
    const rows = deriveClientesListFromCrm(
      [{ ...baseOportunidade, etapa: 'negociacao' }],
      [antigo, recente],
      '2026-06-23',
    )
    expect(rows[0].observacoes).toBe('recente')
  })
})
