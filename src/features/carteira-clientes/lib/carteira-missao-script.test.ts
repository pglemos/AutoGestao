import { describe, expect, test } from 'bun:test'
import { getScriptParaMissao, getScriptOficial } from '@/components/carteira/carteiraUtils'

describe('Geração de Scripts de Missão e Bônus no Plano de Ataque', () => {
  const clienteFinanciamento = {
    id: 'cli-1',
    nome: 'JOANA SANTOS',
    whatsapp: '31981099500',
    veiculo_interesse: 'TRACKER',
    situacao_atual: 'Financiamento aprovado sem compra',
    interesse_financiamento: true,
  }

  const clienteTroca = {
    id: 'cli-2',
    nome: 'CARLOS SILVA',
    whatsapp: '11999998888',
    veiculo_interesse: 'COROLLA',
    situacao_atual: 'Em negociação ativa',
    interesse_troca: true,
  }

  const clienteCarteiraGeral = {
    id: 'cli-3',
    nome: 'MARIANA COSTA',
    whatsapp: '21988887777',
    veiculo_interesse: 'COMPASS',
    situacao_atual: 'Oportunidade futura',
  }

  test('1. Gera script focado em BÔNUS DE FECHAMENTO para cliente com financiamento aprovado', () => {
    const missaoBonusFechamento = {
      tipo_missao: 'BONUS FECHAMENTO',
      metadata: {
        campanha_tipo: 'bonus_fechamento',
        campanha_titulo: 'BONUS FECHAMENTO',
        campanha_descricao: 'Bônus especial de R$ 2.000 para fechamento de contrato esta semana',
        valor_desconto: 2000,
        fim_em: '2026-08-28',
        targeting_kind: 'financing',
      },
    }

    const script = getScriptParaMissao(missaoBonusFechamento, clienteFinanciamento)
    expect(script).toBeDefined()
    expect(script).toContain('JOANA SANTOS')
    expect(script).toContain('BONUS FECHAMENTO')
    expect(script).toContain('TRACKER')
    expect(script).toContain('Bônus especial de R$ 2.000 para fechamento de contrato esta semana')
    expect(script).toContain('28/08')
    expect(script).toContain('financiamento')
    expect(script).toContain('fechamento')
  })

  test('2. Gera script focado em BÔNUS NA TROCA com superavaliação do usado', () => {
    const missaoBonusTroca = {
      tipo_missao: 'SUPER BÔNUS DE TROCA',
      metadata: {
        campanha_tipo: 'bonus_troca',
        campanha_titulo: 'SUPER BÔNUS DE TROCA',
        bonus_troca: 3000,
        fim_em: '2026-08-31',
        targeting_kind: 'trade_interest',
      },
    }

    const script = getScriptParaMissao(missaoBonusTroca, clienteTroca)
    expect(script).toBeDefined()
    expect(script).toContain('CARLOS SILVA')
    expect(script).toContain('SUPER BÔNUS DE TROCA')
    expect(script).toContain('COROLLA')
    expect(script).toContain('R$ 3.000')
    expect(script).toContain('avaliação do seu carro usado')
    expect(script).toContain('31/08')
  })

  test('3. Gera script focado em DESCONTO e FEIRÃO com valores e prazos formatados', () => {
    const missaoFeirao = {
      tipo_missao: 'FEIRÃO DE FÁBRICA',
      metadata: {
        campanha_tipo: 'feirao',
        campanha_titulo: 'FEIRÃO DE FÁBRICA',
        valor_desconto: 5000,
        fim_em: '2026-08-30',
        targeting_kind: 'carteira',
      },
    }

    const script = getScriptParaMissao(missaoFeirao, clienteCarteiraGeral)
    expect(script).toBeDefined()
    expect(script).toContain('MARIANA COSTA')
    expect(script).toContain('FEIRÃO DE FÁBRICA')
    expect(script).toContain('COMPASS')
    expect(script).toContain('R$ 5.000')
    expect(script).toContain('30/08')
  })

  test('4. Gera script oficial correspondente para missões pré-definidas do catálogo', () => {
    const missaoAprovacoes = {
      tipo_missao: 'Converter aprovações',
    }

    const scriptAprovacoes = getScriptParaMissao(missaoAprovacoes, clienteFinanciamento)
    expect(scriptAprovacoes).toBeDefined()
    expect(scriptAprovacoes).toContain('JOANA SANTOS')
    expect(scriptAprovacoes).toContain('financiamento para o TRACKER foi aprovado')

    const missaoPropostas = {
      tipo_missao: 'Recuperar propostas',
    }

    const scriptPropostas = getScriptParaMissao(missaoPropostas, clienteTroca)
    expect(scriptPropostas).toBeDefined()
    expect(scriptPropostas).toContain('CARLOS SILVA')
    expect(scriptPropostas).toContain('proposta do COROLLA')
  })

  test('5. Retorna null se não houver cliente ou missão', () => {
    expect(getScriptParaMissao(null, null)).toBeNull()
  })

  test('6. Aceita string como nome de missão no primeiro parâmetro', () => {
    const script = getScriptParaMissao('Converter aprovações', clienteFinanciamento)
    expect(script).toContain('JOANA SANTOS')
    expect(script).toContain('financiamento para o TRACKER foi aprovado')
  })
})
