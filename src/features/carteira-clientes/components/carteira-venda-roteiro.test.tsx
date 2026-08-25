import { afterEach, describe, expect, mock, test } from 'bun:test'
import React from 'react'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import WhatsAppRoteiro from '@/components/carteira/WhatsAppRoteiro'
import { base44 } from '@/api/base44Client'

afterEach(() => {
  cleanup()
})

describe('WhatsAppRoteiro - Fluxo de Registro de Venda', () => {
  test('exibe campos de venda ao selecionar "Venda realizada" e salva os dados preenchidos', async () => {
    const clienteMock = {
      id: 'cli-jose-123',
      nome: 'José',
      veiculo_interesse: 'T-CROSS HIGHLINE 2024',
      valor_negociado: 135000,
      situacao_atual: 'Visita agendada',
      proximo_passo: 'Confirmar agendamento',
      whatsapp: '11999999999',
    }

    const updateMock = mock(async (id, patch) => {
      return {
        ...clienteMock,
        ...patch,
        situacao_atual: 'Venda realizada',
        status_comercial: 'Vendido',
      }
    })

    base44.entities.CarteiraCliente.update = updateMock
    base44.entities.CarteiraHistorico.filter = mock(async () => [])

    const handleResultadoRegistrado = mock(() => {})
    const handleClose = mock(() => {})

    render(
      <WhatsAppRoteiro
        open={true}
        onClose={handleClose}
        cliente={clienteMock}
        onResultadoRegistrado={handleResultadoRegistrado}
        autoExpandirRegistro={true}
      />
    )

    // Clica no botão de resultado "Venda realizada"
    const botaoVenda = screen.getByText('Venda realizada')
    fireEvent.click(botaoVenda)

    // Verifica se os campos de venda foram abertos
    expect(screen.getByText('Dados da Venda Concluída')).toBeDefined()
    expect(screen.getByPlaceholderText('Ex: T-CROSS HIGHLINE 2024')).toBeDefined()
    expect(screen.getByPlaceholderText('R$ 68.900,00')).toBeDefined()

    // O botão de confirmar venda deve estar visível
    const botaoConfirmar = screen.getByText('Confirmar venda')
    expect(botaoConfirmar).toBeDefined()

    fireEvent.click(botaoConfirmar)

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled()
    })

    const patchEnviado = updateMock.mock.calls[0][1]
    expect(patchEnviado.situacao_atual).toBe('Venda realizada')
    expect(patchEnviado.status_comercial).toBe('Vendido')
    expect(patchEnviado.vendido).toBe(true)
    expect(patchEnviado.ativo).toBe(false)
    expect(patchEnviado.valor_venda).toBe(135000)
    expect(patchEnviado.veiculo_comprado).toBe('T-CROSS HIGHLINE 2024')
    expect(handleResultadoRegistrado).toHaveBeenCalled()
    expect(handleClose).toHaveBeenCalled()
  })

  test('exibe dados do agendamento e avança um próximo passo legado não mapeado', async () => {
    const clienteMock = {
      id: 'cli-agendamento-legado',
      nome: 'Joana Santos',
      veiculo_interesse: 'TRACKER',
      situacao_atual: 'Financiamento aprovado sem compra',
      objetivo_atual: 'Converter aprovação',
      proximo_passo: 'Enviar mensagem de pós-atendimento e salvar interesse do cliente',
      whatsapp: '11988887777',
    }

    const updateMock = mock(async (_id, patch) => ({ ...clienteMock, ...patch }))
    base44.entities.CarteiraCliente.update = updateMock
    base44.entities.CarteiraHistorico.filter = mock(async () => [])

    render(
      <WhatsAppRoteiro
        open={true}
        onClose={() => {}}
        cliente={clienteMock}
        onResultadoRegistrado={() => {}}
        autoExpandirRegistro={true}
      />,
    )

    fireEvent.click(screen.getByText('Visita agendada').closest('button') as HTMLButtonElement)

    expect(screen.getByText('Data e hora da visita / videochamada')).toBeDefined()
    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: '2026-08-26T14:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))

    const [, patch] = updateMock.mock.calls[0]
    expect(patch).toMatchObject({
      visita_agendada_em: '2026-08-26T14:30',
      situacao_atual: 'Visita agendada',
      proximo_passo: 'Confirmar agendamento',
      status_oportunidade: 'Ativa',
    })
  })
})
