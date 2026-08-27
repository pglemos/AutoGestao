import { afterEach, describe, expect, test } from 'bun:test'
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
