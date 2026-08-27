import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  onCarteiraSellerFilterChange,
  readCarteiraSellerFilter,
  writeCarteiraSellerFilter,
} from './carteiraSellerFilter'

afterEach(() => writeCarteiraSellerFilter(null))

describe('recorte por vendedor na carteira', () => {
  test('sem escolha, a carteira segue mostrando a loja inteira', () => {
    expect(readCarteiraSellerFilter()).toBeNull()
  })

  test('guarda e limpa o vendedor escolhido', () => {
    writeCarteiraSellerFilter('vendedor-1')
    expect(readCarteiraSellerFilter()).toBe('vendedor-1')
    writeCarteiraSellerFilter(null)
    expect(readCarteiraSellerFilter()).toBeNull()
  })

  test('avisa quem escuta para a lista recarregar', () => {
    let avisos = 0
    const parar = onCarteiraSellerFilterChange(() => { avisos += 1 })
    writeCarteiraSellerFilter('vendedor-2')
    writeCarteiraSellerFilter(null)
    parar()
    writeCarteiraSellerFilter('vendedor-3')
    expect(avisos).toBe(2)
  })
})

describe('a troca de recorte precisa chegar na tela', () => {
  test('o wrapper escuta a mudanca e remonta a carteira', () => {
    const src = readFileSync('src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx', 'utf8')
    // Sem escutar, trocar de vendedor mudava o sessionStorage e a lista
    // continuava igual: a referencia Base44 so busca ao montar.
    expect(src).toContain('onCarteiraSellerFilterChange')
    expect(src).toContain('key={recorte')
  })
})
