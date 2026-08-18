import { describe, expect, test } from 'bun:test'
import moment from 'moment'
import {
  isPosVenda30Dias,
  isRecompra1Ano,
  isAgendamentoHoje,
  isPrioridadeSistema,
  calcularObjetivoEProximoPasso,
  calcularPrioridade,
  explicacaoCliente,
} from '../../../components/carteira/carteiraUtils'
import { scriptOficialParaCliente } from '../../mentor-comercial/bridge/carteiraMentorBridge'

describe('Mentor Comercial — Regras de Prioridade e Scripts dos Áudios', () => {
  const refHoje = new Date('2026-08-17T12:00:00Z')

  describe('Regra 1 & 2: Limpeza da Agenda Hoje e Agendamento Hoje', () => {
    test('não polui a agenda Hoje com clientes sem data agendada nem prioridade do sistema', () => {
      const clienteFrioSemData = {
        id: 'c-frio',
        nome: 'João Frio',
        situacao_atual: 'Necessidade em qualificação',
        proxima_acao_data: null,
        visita_agendada_em: null,
      }
      expect(isAgendamentoHoje(clienteFrioSemData, refHoje)).toBe(false)
      expect(isPrioridadeSistema(clienteFrioSemData, refHoje)).toBe(false)
    })

    test('inclui cliente com visita agendada para hoje com prioridade Máxima', () => {
      const clienteVisitaHoje = {
        id: 'c-visita',
        nome: 'Carlos Visita',
        situacao_atual: 'Visita agendada',
        visita_agendada_em: '2026-08-17T14:30:00',
        proxima_acao_data: '2026-08-17T14:30:00',
      }
      expect(isAgendamentoHoje(clienteVisitaHoje, refHoje)).toBe(true)
      expect(calcularPrioridade(clienteVisitaHoje, refHoje)).toBe('Máxima')
    })
  })

  describe('Regra 3: Pós-venda 30 Dias (Pedido de Indicação - Áudio 2)', () => {
    test('identifica cliente 30 dias após data_venda (não data de cadastro)', () => {
      const dataVenda30d = moment(refHoje).subtract(30, 'days').format('YYYY-MM-DD')
      const clienteComprador30d = {
        id: 'c-posvenda-30d',
        nome: 'Marcos Silva',
        veiculo_comprado: 'Corolla XEi 2024',
        data_venda: dataVenda30d,
        created_date: '2025-01-01T00:00:00Z', // Data de cadastro muito antiga
        vendido: true,
        status_comercial: 'Vendido',
      }

      expect(isPosVenda30Dias(clienteComprador30d, refHoje)).toBe(true)
      expect(isRecompra1Ano(clienteComprador30d, refHoje)).toBe(false)

      const { objetivo, proximoPasso } = calcularObjetivoEProximoPasso(clienteComprador30d)
      expect(objetivo).toBe('Pedir indicação')
      expect(proximoPasso).toBe('Pedir indicação')

      const prioridade = calcularPrioridade(clienteComprador30d)
      expect(prioridade).toBe('Alta')

      const explicacao = explicacaoCliente(clienteComprador30d)
      expect(explicacao).toContain('30 dias')
      expect(explicacao).toContain('indicação')
    })

    test('gera exatamente o script de indicação pedido no Áudio 2', () => {
      const dataVenda30d = moment(refHoje).subtract(30, 'days').format('YYYY-MM-DD')
      const cliente = {
        id: 'c-1',
        nome: 'Marcos',
        veiculo_comprado: 'Corolla XEi',
        data_venda: dataVenda30d,
        status_comercial: 'Vendido',
      }

      const oficial = scriptOficialParaCliente(cliente)
      expect(oficial?.scriptReady).toBe(true)
      expect(oficial?.texto).toContain('Olá Marcos! Tudo bem?')
      expect(oficial?.texto).toContain('Corolla XEi')
      expect(oficial?.texto).toContain('Posso te pedir um favor?')
      expect(oficial?.texto).toContain('indicar 2 contatos')
      expect(oficial?.texto).toContain('desembolo aqui')
    })
  })

  describe('Regra 4: Recompra / Troca 1 Ano (365 Dias - Áudio 3)', () => {
    test('identifica cliente 365 dias (1 ano) após data_venda com bônus de recompra', () => {
      const dataVenda1Ano = moment(refHoje).subtract(365, 'days').format('YYYY-MM-DD')
      const clienteComprador1Ano = {
        id: 'c-recompra-1ano',
        nome: 'Fernanda Lima',
        veiculo_comprado: 'Compass Longitude',
        data_venda: dataVenda1Ano,
        vendido: true,
        status_comercial: 'Vendido',
      }

      expect(isRecompra1Ano(clienteComprador1Ano, refHoje)).toBe(true)
      expect(isPosVenda30Dias(clienteComprador1Ano, refHoje)).toBe(false)

      const { objetivo, proximoPasso } = calcularObjetivoEProximoPasso(clienteComprador1Ano)
      expect(objetivo).toBe('Criar recompra/troca futura')
      expect(proximoPasso).toBe('Campanha de recompra (1 ano da compra)')

      const prioridade = calcularPrioridade(clienteComprador1Ano)
      expect(prioridade).toBe('Alta')

      const explicacao = explicacaoCliente(clienteComprador1Ano)
      expect(explicacao).toContain('1 ano')
      expect(explicacao).toContain('bônus de recompra/troca')
    })

    test('gera exatamente o script de campanha de recompra pedido no Áudio 3', () => {
      const dataVenda1Ano = moment(refHoje).subtract(365, 'days').format('YYYY-MM-DD')
      const cliente = {
        id: 'c-2',
        nome: 'Fernanda',
        veiculo_comprado: 'Compass Longitude',
        data_venda: dataVenda1Ano,
        status_comercial: 'Vendido',
      }

      const oficial = scriptOficialParaCliente(cliente)
      expect(oficial?.scriptReady).toBe(true)
      expect(oficial?.texto).toContain('Olá Fernanda! Tudo bem?')
      expect(oficial?.texto).toContain('Faz 1 ano que você comprou seu Compass Longitude conosco')
      expect(oficial?.texto).toContain('campanha especial com bônus de recompra')
      expect(oficial?.texto).toContain('Como está sua disponibilidade para batermos um papo hoje?')
    })
  })
})
