import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..', '..')

/**
 * Contrato FASE T 20.006 — selected state distinto de focus.
 *
 * Controles selecionáveis devem comunicar o estado de seleção por
 * `aria-pressed`/`aria-selected` + classe visual (background/text) QUE NÃO
 * dependa apenas do `focus-visible` ring. O focus usa `focus-visible:ring-*`;
 * a seleção usa bg/text token. Assim o usuário distingue "estou focado" de
 * "isto está selecionado".
 */
describe('FASE T 20.006 — selected distinto de focus', () => {
  test('FilterChip (padrão canônico) tem aria-pressed + visual + focus-visible', () => {
    const chip = readFileSync(resolve(root, 'src/components/molecules/FilterChip.tsx'), 'utf8')
    expect(chip).toContain('aria-pressed')
    expect(chip).toContain('focus-visible:ring-2')
    // visual de seleção com token, não só ring
    expect(chip).toContain('bg-brand-primary-subtle')
    expect(chip).toContain('text-brand-primary-active')
    // o estado focado é separado do selecionado
    expect(chip).toContain('focus-visible:ring-focus-ring')
  })

  test('FunilVendedor (toggle de período) distingue seleção de focus', () => {
    const src = readFileSync(resolve(root, 'src/pages/FunilVendedor.tsx'), 'utf8')
    expect(src).toContain('aria-pressed')
    expect(src).toContain('focus-visible')
  })

  test('Botão canônico tem focus-visible distinto (ring) independente de variant', () => {
    const btn = readFileSync(resolve(root, 'src/components/atoms/Button.tsx'), 'utf8')
    expect(btn).toContain('focus-visible:ring-4')
    expect(btn).toContain('focus-visible:ring-mx-action/20')
  })
})
