import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { aplicarTransicao, detectarCodigo, getResultados } from './proximoPassoMx.js'
import { gerarScriptLocal } from '@/components/carteira/scriptTemplatesLocal.js'

describe('regressões observadas na reunião da Carteira', () => {
  test('normaliza aliases acentuados e não cai no resultado genérico', () => {
    expect(detectarCodigo('Confirmar visita amanhã')).toBe('PP08')
    expect(detectarCodigo('Converter financiamento aprovado')).toBe('PP18')
    expect(detectarCodigo('Conduzir para fechamento')).toBe('PP18')
    expect(detectarCodigo('Conduzir para o fechamento')).toBe('PP18')
    expect(detectarCodigo('Conduzir fechamento')).toBe('PP18')
  })

  test('venda realizada fecha a oportunidade e remove o próximo passo', () => {
    const result = aplicarTransicao('Converter financiamento aprovado', 'Venda realizada')
    expect(result.patch).toMatchObject({
      situacao_atual: 'Venda realizada',
      status_comercial: 'Vendido',
      ativo: false,
      proximo_passo: null,
      proxima_acao_data: null,
    })

    const resultMentor = aplicarTransicao('Conduzir para fechamento', 'Venda realizada')
    expect(resultMentor.patch).toMatchObject({
      situacao_atual: 'Venda realizada',
      status_comercial: 'Vendido',
      ativo: false,
      proximo_passo: null,
      proxima_acao_data: null,
    })

    const resultQualquer = aplicarTransicao('Passo não mapeado qualquer', 'Venda realizada')
    expect(resultQualquer.patch).toMatchObject({
      situacao_atual: 'Venda realizada',
      status_comercial: 'Vendido',
      ativo: false,
      proximo_passo: null,
      proxima_acao_data: null,
    })
  })

  test('oferece venda realizada como saída direta em qualquer etapa do contato', () => {
    const etapasComuns = [
      'Agendar visita ou videochamada',
      'Confirmar agendamento',
      'Realizar atendimento comercial',
      'Retomar contato',
      'Encerrar oportunidade',
    ]

    for (const etapa of etapasComuns) {
      const vendas = getResultados(etapa).filter(resultado => resultado.label === 'Venda realizada')
      expect(vendas).toHaveLength(1)
    }

    expect(getResultados('Confirmar venda').filter(resultado => resultado.label === 'Venda realizada')).toHaveLength(1)
    expect(getResultados('Etapa não mapeada').filter(resultado => resultado.label === 'Venda realizada')).toHaveLength(1)
  })

  test('a mensagem permanece coerente com confirmar visita e aprovação', () => {
    const visita = gerarScriptLocal({
      cliente: { nome: 'João Santos', veiculo_interesse: 'Virtus', visita_agendada_em: '2026-07-23T10:00:00' },
      proximoPasso: 'Confirmar visita amanhã',
      tom: 'consultivo',
    })
    const financiamento = gerarScriptLocal({
      cliente: { nome: 'João Santos', veiculo_interesse: 'Gol' },
      proximoPasso: 'Converter financiamento aprovado',
      tom: 'direto',
    })
    expect(visita).toContain('visita amanhã')
    expect(visita).not.toContain('o Virtus é a opção certa')
    expect(financiamento).toContain('financiamento')
    expect(financiamento).toContain('Gol')
  })

  test('migration versiona troca, campanhas, RPCs e rollback', () => {
    const migration = readFileSync('supabase/migrations/20260722180000_carteira_trade_details_and_campaigns.sql', 'utf8')
    const rollback = readFileSync('supabase/rollbacks/20260722180000_carteira_trade_details_and_campaigns.sql', 'utf8')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS veiculo_troca')
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.carteira_campanhas")
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.carteira_salvar_campanha')
    expect(migration).toContain("veiculo_troca = CASE WHEN p_payload ? 'veiculo_troca'")
    expect(migration).toContain('Somente perfis internos MX podem executar uma simulação.')
    expect(migration).not.toMatch(/^\+$/m)
    expect(rollback).toContain('DROP COLUMN IF EXISTS veiculo_troca')
    expect(rollback).toContain('DROP TABLE IF EXISTS public.carteira_campanhas')
  })
})
