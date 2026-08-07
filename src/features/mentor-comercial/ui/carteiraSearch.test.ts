import { describe, expect, it } from 'bun:test'
import type { CarteiraOportunidade } from './OportunidadeCard'
import {
  filterCarteiraOportunidades,
  getCarteiraAtivaOportunidades,
  getMatchedFields,
  isOportunidadeEncerrada,
  matchName,
  matchPhone,
  matchPlaca,
  matchVehicle,
  normalizeDigits,
  normalizePlate,
  normalizeText,
  searchCarteira,
} from './carteiraSearch'

const mockAtiva: CarteiraOportunidade = {
  id: 'op-ativa-1',
  cliente_id: 'cli-1',
  cliente_nome: 'José da Silva',
  cliente_telefone: '(11) 98765-4321',
  cliente_whatsapp: '11987654321',
  veiculo_interesse: 'Toyota Corolla Cross',
  placa_veiculo: 'ABC-1D23',
  closed_at: null,
  etapa: 'prospeccao',
}

const mockEncerradaClosedAt: CarteiraOportunidade = {
  id: 'op-closed-1',
  cliente_id: 'cli-2',
  cliente_nome: 'José Carlos Oliveira',
  cliente_telefone: '+55 11 91234-5678',
  cliente_whatsapp: '+5511912345678',
  veiculo_interesse: 'Honda Civic',
  placa_veiculo: 'XYZ9876',
  closed_at: '2026-08-01T12:00:00Z',
  etapa: 'ganho',
}

const mockEncerradaTerminalEtapa: CarteiraOportunidade = {
  id: 'op-closed-2',
  cliente_id: 'cli-3',
  cliente_nome: 'Maria Conceição',
  cliente_telefone: '(21) 99888-7766',
  cliente_whatsapp: '(21) 99888-7766',
  veiculo_interesse: 'Volkswagen Nivus',
  placa_veiculo: 'DEF-5678',
  closed_at: null,
  etapa: 'perdido',
}

describe('carteiraSearch — normalização e identificação de encerradas', () => {
  it('identifica corretamente oportunidades encerradas e ativas', () => {
    expect(isOportunidadeEncerrada(mockAtiva)).toBe(false)
    expect(isOportunidadeEncerrada(mockEncerradaClosedAt)).toBe(true)
    expect(isOportunidadeEncerrada(mockEncerradaTerminalEtapa)).toBe(true)
    expect(
      isOportunidadeEncerrada({ ...mockAtiva, closed_at: new Date('2026-08-02') })
    ).toBe(true)
  })

  it('normaliza textos removendo acentos e caixa alta', () => {
    expect(normalizeText('José')).toBe('jose')
    expect(normalizeText('SÃO PAULO')).toBe('sao paulo')
    expect(normalizeText('Conceição')).toBe('conceicao')
    expect(normalizeText(null)).toBe('')
  })

  it('normaliza apenas dígitos em telefones', () => {
    expect(normalizeDigits('(11) 98765-4321')).toBe('11987654321')
    expect(normalizeDigits('+55 11 91234-5678')).toBe('5511912345678')
    expect(normalizeDigits(null)).toBe('')
  })

  it('normaliza placas removendo hífens e espaços', () => {
    expect(normalizePlate('ABC-1D23')).toBe('abc1d23')
    expect(normalizePlate('abc 1d23')).toBe('abc1d23')
    expect(normalizePlate('XYZ9876')).toBe('xyz9876')
  })
})

describe('carteiraSearch — casamento de campos individuais', () => {
  it('Nome: insensível a caixa e a acento (buscar "jose" acha "José")', () => {
    expect(matchName('José da Silva', 'jose')).toBe(true)
    expect(matchName('José da Silva', 'JOSE')).toBe(true)
    expect(matchName('José da Silva', 'silva')).toBe(true)
    expect(matchName('Maria Conceição', 'conceicao')).toBe(true)
    expect(matchName('Maria Conceição', 'Carlos')).toBe(false)
  })

  it('Telefone: casa com formatações diferentes (parênteses, traço, espaço, +55)', () => {
    // Telefone gravado: (11) 98765-4321
    expect(matchPhone('(11) 98765-4321', '987654321')).toBe(true)
    expect(matchPhone('(11) 98765-4321', '11987654321')).toBe(true)
    expect(matchPhone('(11) 98765-4321', '+55 11 98765-4321')).toBe(true)
    expect(matchPhone('(11) 98765-4321', '98765-4321')).toBe(true)

    // Telefone gravado com +55: +55 11 91234-5678
    expect(matchPhone('+55 11 91234-5678', '11912345678')).toBe(true)
    expect(matchPhone('+55 11 91234-5678', '91234-5678')).toBe(true)
    expect(matchPhone('+55 11 91234-5678', '999999999')).toBe(false)
  })

  it('Veículo: insensível a caixa e acento', () => {
    expect(matchVehicle('Toyota Corolla Cross', 'corolla')).toBe(true)
    expect(matchVehicle('Toyota Corolla Cross', 'TOYOTA')).toBe(true)
    expect(matchVehicle('Toyota Corolla Cross', 'Civic')).toBe(false)
  })

  it('Placa: insensível a caixa e a hífen (ABC1D23 acha ABC-1D23)', () => {
    expect(matchPlaca('ABC-1D23', 'ABC1D23')).toBe(true)
    expect(matchPlaca('ABC-1D23', 'abc-1d23')).toBe(true)
    expect(matchPlaca('XYZ9876', 'xyz-9876')).toBe(true)
    expect(matchPlaca('ABC-1D23', 'XYZ9876')).toBe(false)
  })
})

describe('carteiraSearch — busca sobre coleção de oportunidades', () => {
  const dataset: CarteiraOportunidade[] = [
    mockAtiva,
    mockEncerradaClosedAt,
    mockEncerradaTerminalEtapa,
  ]

  it('sem termo de busca: retorna apenas ativas', () => {
    const ativas = getCarteiraAtivaOportunidades(dataset)
    expect(ativas).toHaveLength(1)
    expect(ativas[0].id).toBe('op-ativa-1')

    const searchVazia = searchCarteira(dataset, '  ')
    expect(searchVazia).toHaveLength(1)
    expect(searchVazia[0].oportunidade.id).toBe('op-ativa-1')
    expect(searchVazia[0].is_encerrada).toBe(false)
  })

  it('com termo de busca: encontra ativa e encerrada e marca is_encerrada no resultado', () => {
    // Buscar "jose" encontra mockAtiva (ativa) e mockEncerradaClosedAt (encerrada)
    const res = searchCarteira(dataset, 'jose')
    expect(res).toHaveLength(2)

    const itemAtivo = res.find((r) => r.oportunidade.id === 'op-ativa-1')
    const itemEncerrado = res.find((r) => r.oportunidade.id === 'op-closed-1')

    expect(itemAtivo).toBeDefined()
    expect(itemAtivo?.is_encerrada).toBe(false)
    expect(itemAtivo?.matched_fields).toContain('nome')

    expect(itemEncerrado).toBeDefined()
    expect(itemEncerrado?.is_encerrada).toBe(true)
    expect(itemEncerrado?.matched_fields).toContain('nome')
  })

  it('oportunidade encerrada aparece na busca mas NÃO na lista ativa sem busca', () => {
    // Lista ativa sem busca
    const listaAtivaSemBusca = filterCarteiraOportunidades(dataset, '')
    expect(listaAtivaSemBusca.map((o) => o.id)).not.toContain('op-closed-1')

    // Busca específica por elemento de op-closed-1 ("Civic")
    const resultadoBusca = searchCarteira(dataset, 'Civic')
    expect(resultadoBusca).toHaveLength(1)
    expect(resultadoBusca[0].oportunidade.id).toBe('op-closed-1')
    expect(resultadoBusca[0].is_encerrada).toBe(true)
  })

  it('identifica matched_fields corretamente para múltiplos campos', () => {
    const opMultiMatch: CarteiraOportunidade = {
      id: 'op-multi',
      cliente_id: 'cli-multi',
      cliente_nome: 'Corolla Teste',
      veiculo_interesse: 'Toyota Corolla',
      placa_veiculo: 'COR-0000',
      closed_at: null,
    }

    const fields = getMatchedFields(opMultiMatch, 'corolla')
    expect(fields).toContain('nome')
    expect(fields).toContain('veiculo')
  })
})
