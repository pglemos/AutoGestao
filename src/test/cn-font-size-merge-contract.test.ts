import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cn, MX_FONT_SIZE_UTILITIES } from '@/lib/utils'

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

/**
 * O contrato acima protege a COR. Este protege o TAMANHO.
 *
 * Um degrau registrado no tailwind-merge sem definição em CSS não é inofensivo:
 * ele ganha o merge, remove o `text-*` que o componente declarou e não coloca
 * nada no lugar — o elemento passa a herdar o tamanho do pai, que varia por
 * contexto. `text-mx-nano` fez exatamente isso em 75 pontos do app: todo
 * `<Badge className="text-mx-nano">` perdia o `text-xs` do próprio Badge.
 */
describe('todo degrau registrado como font-size existe em CSS', () => {
  const raiz = resolve(import.meta.dir, '..', '..')
  const css = [
    'src/index.css',
    'src/design-system/tokens/semantic.css',
    'src/design-system/tokens/components.css',
  ].map(caminho => readFileSync(resolve(raiz, caminho), 'utf8')).join('\n')

  // Degraus nativos do Tailwind não precisam de declaração no projeto.
  const NATIVOS = new Set(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'])

  test.each(MX_FONT_SIZE_UTILITIES.filter(nome => !NATIVOS.has(nome)))('text-%s tem definição', nome => {
    const definido = css.includes(`@utility text-${nome} `)
      || css.includes(`@utility text-${nome}{`)
      || css.includes(`.text-${nome} `)
      || css.includes(`.text-${nome}{`)
    expect(definido, `text-${nome} está registrado no twMerge mas não é definido em nenhum CSS: ele vai apagar o tamanho do componente e deixar o elemento herdando do pai`).toBe(true)
  })
})
