import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * FASE G — 07.012
 *
 * Valida o CONTRASTE COMPUTADO das combinações semânticas (texto sobre
 * superfície) contra o mínimo do WCAG 2.2 AA. Diferente do contrato de
 * strings em semantic-status-contrast-contract.test.ts, aqui os tokens são
 * resolvidos até o primitivo e o valor real é calculado — se alguém escurecer
 * uma superfície ou clarear um texto, este teste cai.
 *
 * Limites: 4.5:1 para texto normal, 3:1 para texto grande e para contorno de
 * componente (WCAG 2.2, 1.4.3 e 1.4.11).
 */
const root = resolve(import.meta.dir, '..', '..')
const css = [
  readFileSync(resolve(root, 'src/design-system/tokens/primitives.css'), 'utf8'),
  readFileSync(resolve(root, 'src/design-system/tokens/semantic.css'), 'utf8'),
].join('\n')

const DECLARATION = /(--mx-[a-z0-9-]+):\s*([^;]+);/g

function tokenTable(): Map<string, string> {
  const table = new Map<string, string>()
  for (const match of css.matchAll(DECLARATION)) {
    const [, name, rawValue] = match
    // Primeira declaração vence: primitives.css é lido antes e os overrides de
    // escopo (.owner-b44 etc.) não valem para o contrato global.
    if (!table.has(name)) table.set(name, rawValue.trim())
  }
  return table
}

const TOKENS = tokenTable()

function resolveToken(name: string, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`ciclo de token em ${name}`)
  seen.add(name)
  const value = TOKENS.get(name)
  if (!value) throw new Error(`token não declarado: ${name}`)
  const reference = value.match(/^var\((--mx-[a-z0-9-]+)\)$/)
  return reference ? resolveToken(reference[1], seen) : value
}

function hslChannelsToRgb(channels: string): [number, number, number] {
  const [hRaw, sRaw, lRaw] = channels.split(/\s+/)
  const h = Number.parseFloat(hRaw)
  const s = Number.parseFloat(sRaw) / 100
  const l = Number.parseFloat(lRaw) / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [channel(0), channel(8), channel(4)].map(value => value * 255) as [number, number, number]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map(value => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function contrast(foregroundToken: string, backgroundToken: string): number {
  const foreground = relativeLuminance(hslChannelsToRgb(resolveToken(foregroundToken)))
  const background = relativeLuminance(hslChannelsToRgb(resolveToken(backgroundToken)))
  const [lighter, darker] = foreground > background ? [foreground, background] : [background, foreground]
  return (lighter + 0.05) / (darker + 0.05)
}

type Pair = { label: string; fg: string; bg: string; min: number }

const TEXT_PAIRS: Pair[] = [
  // Texto sobre as superfícies de página.
  { label: 'text-primary / page', fg: '--mx-color-text-primary', bg: '--mx-color-background', min: 4.5 },
  { label: 'text-secondary / page', fg: '--mx-color-text-secondary', bg: '--mx-color-background', min: 4.5 },
  { label: 'text-primary / surface-muted', fg: '--mx-color-text-primary', bg: '--mx-color-surface-muted', min: 4.5 },
  { label: 'text-secondary / surface-muted', fg: '--mx-color-text-secondary', bg: '--mx-color-surface-muted', min: 4.5 },
  // Estados: o token `-text` é justamente o degrau escurecido para AA.
  { label: 'success-text / success-surface', fg: '--mx-color-success-text', bg: '--mx-color-success-surface', min: 4.5 },
  { label: 'warning-text / warning-surface', fg: '--mx-color-warning-text', bg: '--mx-color-warning-surface', min: 4.5 },
  { label: 'danger-text / danger-surface', fg: '--mx-color-danger-text', bg: '--mx-color-danger-surface', min: 4.5 },
  { label: 'info-text / info-surface', fg: '--mx-color-info-text', bg: '--mx-color-info-surface', min: 4.5 },
  { label: 'success-text / page', fg: '--mx-color-success-text', bg: '--mx-color-background', min: 4.5 },
  { label: 'warning-text / page', fg: '--mx-color-warning-text', bg: '--mx-color-background', min: 4.5 },
  { label: 'danger-text / page', fg: '--mx-color-danger-text', bg: '--mx-color-background', min: 4.5 },
  { label: 'info-text / page', fg: '--mx-color-info-text', bg: '--mx-color-background', min: 4.5 },
  // Preenchimentos sólidos e seu texto.
  { label: 'primary-foreground / primary', fg: '--mx-color-primary-foreground', bg: '--mx-color-primary', min: 4.5 },
  { label: 'sidebar-foreground / sidebar', fg: '--mx-color-sidebar-foreground', bg: '--mx-color-sidebar-background', min: 4.5 },
]

/** Componentes e contornos: mínimo 3:1 (WCAG 2.2 1.4.11). */
const NON_TEXT_PAIRS: Pair[] = [
  // `border-strong` é limite decorativo (divisores, cartões) e não identifica
  // controle — 1.4.11 não se aplica. O contorno que IDENTIFICA checkbox/radio
  // é `border-control`, e esse precisa dos 3:1.
  { label: 'border-control / page', fg: '--mx-color-border-control', bg: '--mx-color-background', min: 3 },
  { label: 'focus-ring / page', fg: '--mx-color-focus-ring', bg: '--mx-color-background', min: 3 },
  { label: 'focus-ring / surface-muted', fg: '--mx-color-focus-ring', bg: '--mx-color-surface-muted', min: 3 },
  { label: 'primary / page', fg: '--mx-color-primary', bg: '--mx-color-background', min: 3 },
]

describe('07.012 contraste computado das combinações semânticas', () => {
  test.each(TEXT_PAIRS)('$label >= $min:1', ({ fg, bg, min, label }) => {
    const ratio = contrast(fg, bg)
    expect(`${label}: ${ratio.toFixed(2)}:1`).toBe(
      ratio >= min ? `${label}: ${ratio.toFixed(2)}:1` : `${label}: >= ${min}:1`,
    )
  })

  test.each(NON_TEXT_PAIRS)('$label >= $min:1 (não textual)', ({ fg, bg, min, label }) => {
    const ratio = contrast(fg, bg)
    expect(`${label}: ${ratio.toFixed(2)}:1`).toBe(
      ratio >= min ? `${label}: ${ratio.toFixed(2)}:1` : `${label}: >= ${min}:1`,
    )
  })

  test('todo token semântico de cor resolve até um primitivo válido', () => {
    const semanticColorTokens = [...TOKENS.keys()].filter(name => name.startsWith('--mx-color-'))
    expect(semanticColorTokens.length).toBeGreaterThan(20)
    for (const token of semanticColorTokens) {
      const value = resolveToken(token)
      expect(value, token).toMatch(/^-?[\d.]+\s+[\d.]+%\s+[\d.]+%$/)
    }
  })
})
