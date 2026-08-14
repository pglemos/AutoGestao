import { expect, test, describe } from 'bun:test'
import { buttonVariants } from '@/components/atoms/Button'

/**
 * Contrato FASE K (11.002/11.005): a família Button do produto tem uma lista
 * canônica de variantes e nenhuma variante pode ser uma duplicata visual de
 * outra (mesma classe visual com nome diferente).
 *
 * Variantes canônicas aprovadas (Base44/Dono):
 *   primary | outline | ghost | success | warning | info | danger | whatsapp
 *
 * Variantes eliminadas nesta fatia (duplicatas ou mortas):
 *   brand  -> duplicata visual de `primary` (1 consumidor migrado)
 *   secondary -> duplicata visual de `outline` (51 consumidores migrados)
 *   mx-elite -> 0 consumidores (morto, apenas story)
 */
const CANONICAL_VARIANTS = ['primary', 'outline', 'ghost', 'success', 'warning', 'info', 'danger', 'whatsapp'] as const
const REMOVED_VARIANTS = ['brand', 'secondary', 'mx-elite'] as const

describe('Button variants contract (FASE K)', () => {
  test('variantes canônicas produzem classes visuais distintas', () => {
    const classes = CANONICAL_VARIANTS.map((v) => buttonVariants({ variant: v }))
    const unique = new Set(classes)
    expect(unique.size).toBe(CANONICAL_VARIANTS.length)
  })

  test('variantes canônicas carregam o token semântico esperado', () => {
    expect(buttonVariants({ variant: 'primary' })).toContain('bg-brand-primary')
    expect(buttonVariants({ variant: 'outline' })).toContain('border-border')
    expect(buttonVariants({ variant: 'ghost' })).toContain('bg-transparent')
    expect(buttonVariants({ variant: 'danger' })).toContain('bg-status-error')
    expect(buttonVariants({ variant: 'whatsapp' })).toContain('bg-whatsapp')
  })

  test('variantes eliminadas não são mais resolvidas', () => {
    for (const v of REMOVED_VARIANTS) {
      const cls = buttonVariants({ variant: v } as never)
      expect(cls, `variant=${v} não deveria mais existir`).not.toMatch(/bg-brand-primary|border-border/)
      expect(cls, `variant=${v} não deveria mais existir`).not.toMatch(/bg-status-error/)
    }
  })

  test('não há duplicata visual entre variante canônica e eliminada', () => {
    // brand não pode colidir com primary; secondary não pode colidir com outline
    expect(buttonVariants({ variant: 'primary' } as never)).not.toBe(buttonVariants({ variant: 'brand' } as never))
    expect(buttonVariants({ variant: 'outline' } as never)).not.toBe(buttonVariants({ variant: 'secondary' } as never))
  })
})
