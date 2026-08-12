import { describe, expect, test } from 'bun:test'
import { cn } from '@/lib/utils'

/**
 * FASE V — o `cn()` não pode comer a cor.
 *
 * As utilities tipográficas do MX começam com `text-`. Sem ensinar o
 * tailwind-merge que elas são font-size, ele as trata como COR e descarta a
 * cor declarada antes — silenciosamente, e só no runtime.
 *
 * Foi a causa real de 21 nós de color-contrast em /relatorios/performance-vendas:
 * o Badge `brand` declarava `text-white` sobre o verde da marca e renderizava
 * quase preto (3.19:1). Nenhuma tela estava errada; o utilitário estava.
 */
describe('cn() preserva a cor ao mesclar utilities tipográficas do MX', () => {
  const FONT_SIZE_UTILITIES = [
    'text-display',
    'text-h1',
    'text-h2',
    'text-h3',
    'text-h4',
    'text-h5',
    'text-h6',
    'text-body',
    'text-body-sm',
    'text-caption',
    'text-label',
    'text-data',
    'text-mx-micro',
    'text-mx-tiny',
    'text-mx-nano',
    'text-mx-xs',
  ]

  test.each(FONT_SIZE_UTILITIES)('%s não descarta a cor declarada', utility => {
    expect(cn('text-white', utility)).toContain('text-white')
    expect(cn('text-status-success-text', utility)).toContain('text-status-success-text')
  })

  test('o caso exato do Badge brand sobrevive', () => {
    const merged = cn(
      'inline-flex items-center rounded-full bg-brand-primary text-white shadow-sm',
      'text-mx-micro px-3 py-1 mt-3 shadow-sm',
    )
    expect(merged).toContain('text-white')
    expect(merged).toContain('text-mx-micro')
  })

  test('continua resolvendo conflito de verdade', () => {
    // Duas cores: a última vence.
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    // Dois tamanhos: a última vence.
    expect(cn('text-mx-micro', 'text-mx-tiny')).toBe('text-mx-tiny')
  })
})
