import React from 'react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const toastSuccess = mock(() => undefined)

mock.module('@/lib/toast', () => ({
    toast: {
        success: (message: string) => toastSuccess(message, { duration: 3000 }),
    },
}))

const { NotificacoesHeader } = await import('./NotificacoesHeader')

afterEach(() => {
    cleanup()
    toastSuccess.mockClear()
})

describe('NotificacoesHeader', () => {
    it('executa refresh ao clicar em Atualizar', () => {
        const handleRefresh = mock(() => undefined)

        render(<NotificacoesHeader isRefetching={false} handleRefresh={handleRefresh} markAllAsRead={mock()} />)

        fireEvent.click(screen.getByRole('button', { name: /atualizar/i }))

        expect(handleRefresh).toHaveBeenCalled()
    })

    it('marca todas como lidas ao clicar em MARCAR TUDO', () => {
        const markAllAsRead = mock(() => undefined)

        render(<NotificacoesHeader isRefetching={false} handleRefresh={mock()} markAllAsRead={markAllAsRead} />)

        fireEvent.click(screen.getByRole('button', { name: /marcar tudo/i }))

        expect(markAllAsRead).toHaveBeenCalled()
        expect(toastSuccess).toHaveBeenCalledWith('Tudo lido!', { duration: 3000 })
    })
})
