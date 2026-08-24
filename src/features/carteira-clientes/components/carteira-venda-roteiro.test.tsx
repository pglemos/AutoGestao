import { describe, expect, mock, test } from 'bun:test'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WhatsAppRoteiro from '@/components/carteira/WhatsAppRoteiro'
import { base44 } from '@/api/base44Client'

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
})
