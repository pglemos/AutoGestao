import React from 'react'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'

import CarteiraAtivaTab from '@/components/carteira/CarteiraAtivaTab.jsx'

afterEach(() => cleanup())

// Decisão de produto: cliente novo entra apenas pelo fechamento diário. A
// carteira passa a ser superfície de execução, não de cadastro — sem isso o
// vendedor cria cliente em dois lugares e o fechamento deixa de ser a fonte
// única do que entrou no dia.
describe('entrada de cliente novo', () => {
  test('a carteira não oferece mais o atalho de cadastro', () => {
    render(<CarteiraAtivaTab clientes={[]} onNovoCliente={() => {}} onWhatsApp={() => {}} onFicha={() => {}} />)

    expect(screen.queryByRole('button', { name: /novo cliente/i })).toBeNull()
    // A barra de ações continua existindo: só o cadastro saiu.
    expect(screen.getByRole('button', { name: /filtros/i })).toBeTruthy()
  })

  test('o fechamento diário mantém o cadastro de cliente novo', () => {
    const checkinCrm = readFileSync('src/features/checkin/sections/CheckinCrmSection.tsx', 'utf8')
    expect(checkinCrm).toContain('+ Novo Registro')
    expect(checkinCrm).toContain('Cadastrar Novo Cliente')
  })
})
