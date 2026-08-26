import { afterEach, describe, expect, mock, test } from 'bun:test'
import React from 'react'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExecucaoMissao from '@/components/carteira/ExecucaoMissao'
import { base44 } from '@/api/base44Client'

afterEach(() => {
  cleanup()
})

describe('ExecucaoMissao - Scripts de Bônus e Campanhas', () => {
  const clientesMock = [
    {
      id: 'cli-joana-1',
      nome: 'JOANA SANTOS',
      whatsapp: '31981099500',
      veiculo_interesse: 'TRACKER',
      situacao_atual: 'Financiamento aprovado sem compra',
      interesse_financiamento: true,
    },
    {
      id: 'cli-carlos-2',
      nome: 'CARLOS SILVA',
      whatsapp: '11999998888',
      veiculo_interesse: 'COROLLA',
      situacao_atual: 'Em negociação ativa',
      interesse_troca: true,
    },
  ]

  const missaoBonusFechamento = {
    id: 'missao-bonus-1',
    tipo_missao: 'BONUS FECHAMENTO',
    status: 'Preparando',
    total_clientes: 2,
    mensagens_enviadas: 0,
    pulados: 0,
    concluidos: 0,
    metadata: {
      campanha_tipo: 'bonus_fechamento',
      campanha_titulo: 'BONUS FECHAMENTO',
      campanha_descricao: 'Bônus especial de R$ 2.000 para fechamento de contrato esta semana',
      valor_desconto: 2000,
      fim_em: '2026-08-28',
      targeting_kind: 'financing',
    },
  }

  test('renderiza script focado no BONUS FECHAMENTO e exibe badge de condição', () => {
    const handleVoltar = mock(() => {})
    const handleConcluida = mock(() => {})

    render(
      <ExecucaoMissao
        missao={missaoBonusFechamento}
        clientes={clientesMock}
        onVoltar={handleVoltar}
        onConcluida={handleConcluida}
      />
    )

    // Verifica badge da condição
    expect(screen.getByText('Bônus de Fechamento')).toBeDefined()

    // Verifica dados do cliente atual
    expect(screen.getByText('JOANA SANTOS')).toBeDefined()
    expect(screen.getByText(/31981099500/)).toBeDefined()

    // Verifica se a textarea contém o script voltado para o bônus de fechamento
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toContain('JOANA SANTOS')
    expect(textarea.value).toContain('BONUS FECHAMENTO')
    expect(textarea.value).toContain('TRACKER')
    expect(textarea.value).toContain('Bônus especial de R$ 2.000 para fechamento de contrato esta semana')
    expect(textarea.value).toContain('financiamento')
    expect(textarea.value).toContain('fechamento')
  })

  test('permite editar o script e avançar para o próximo cliente com seu próprio script contextualizado', async () => {
    base44.entities = base44.entities || {}
    base44.entities.CarteiraMissao = {
      update: mock(async () => ({})),
    }

    const handleVoltar = mock(() => {})
    const handleConcluida = mock(() => {})

    render(
      <ExecucaoMissao
        missao={missaoBonusFechamento}
        clientes={clientesMock}
        onVoltar={handleVoltar}
        onConcluida={handleConcluida}
      />
    )

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Texto customizado pelo vendedor para Joana' } })
    expect(textarea.value).toBe('Texto customizado pelo vendedor para Joana')

    // Clica em "Mensagem enviada" para ir para a etapa de resultado
    const botaoEnviada = screen.getByText('Mensagem enviada →')
    fireEvent.click(botaoEnviada)

    // Verifica etapa de resultado após resolução assíncrona
    await waitFor(() => {
      expect(screen.getByText('Registrar resultado')).toBeDefined()
    })
  })
})
