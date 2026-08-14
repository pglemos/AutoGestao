import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * COORTE DE CONTRASTE C2 (toast/C1) — FASE G/V
 *
 * O toast ao vivo é o Sonner `<Toaster richColors .../>` montado em App.tsx.
 * `richColors` pinta o toast com a paleta própria do Sonner (variáveis
 * `--success-bg`/`--success-text`/etc. injetadas por ele), que NÃO são tokens
 * semânticos MX — e o toast de erro default do Sonner mede 4.35:1 sobre o
 * fundo dele, reprovando WCAG 2.2 AA para texto normal.
 *
 * Este contrato trava a migração:
 *   1. O Toaster precisa carregar uma classe (`mx-toaster`) que permite ao
 *      nosso CSS sobrescrever as variáveis do Sonner com especificidade.
 *   2. O CSS precisa remapear as 4 famílias de status do toast para tokens
 *      `--mx-status-*` (superfície tintada + `*-text`), nunca deixando cair
 *      na paleta crua do Sonner.
 *   3. O contraste computado dos pares toast (texto sobre a superfície
 *      tintada, composta sobre branco) precisa passar AA (>= 4.5:1).
 *   4. O componente legado `src/components/ui/toast.jsx` não pode manter
 *      classes cruas de vermelho (text-red-300/50, ring-red-400,
 *      ring-offset-red-600) nem `border-destructive`/`bg-destructive`/
 *      `text-destructive-foreground` fora dos tokens semânticos.
 *
 * A superfície do toast é SEMITRANSPARENTE (`hsl(var(--mx-status-*) / N)`),
 * diferente dos pares sólidos do contrato 07.012; por isso este contrato
 * compõe a cor sobre branco antes de medir.
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
  return [channel(0), channel(8), channel(4)].map((value) => value * 255) as [number, number, number]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function contrast(foreground: [number, number, number], background: [number, number, number]): number {
  const f = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const [lighter, darker] = f > b ? [f, b] : [b, f]
  return (lighter + 0.05) / (darker + 0.05)
}

/** Compõe uma cor semi-transparente sobre branco (fundo do viewport de toast). */
function compositeOverWhite(rgb: [number, number, number], alpha: number): [number, number, number] {
  return rgb.map((c) => Math.round(c * alpha + 255 * (1 - alpha))) as [number, number, number]
}

/** Extrai `hsl(var(--mx-x) / 0.08)` do bloco de override do CSS. */
function parseSurfaceHsl(value: string): { token: string; alpha: number } {
  const match = value.match(/^hsl\(var\((--mx-[a-z0-9-]+)\)\s*\/\s*([\d.]+)\)$/)
  if (!match) throw new Error(`superfície toast não tokenizada: ${value}`)
  return { token: match[1], alpha: Number.parseFloat(match[2]) }
}

function parseTextHsl(value: string): string {
  const match = value.match(/^hsl\(var\((--mx-[a-z0-9-]+)\)\)$/)
  if (!match) throw new Error(`texto toast não tokenizado: ${value}`)
  return match[1]
}

describe('C2 toast/C1 — contraste e tokens semânticos do toast', () => {
  test('Toaster em App.tsx carrega a classe mx-toaster para o override de tokens', () => {
    const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8')
    expect(app).toMatch(/<Toaster[^>]*\bmx-toaster\b/)
  })

  test('CSS remapeia as variáveis do Sonner para tokens --mx-status-*', () => {
    const componentsCss = readFileSync(
      resolve(root, 'src/design-system/tokens/components.css'),
      'utf8',
    )
    const block = componentsCss.match(
      /html\s+\[data-sonner-toaster\]\.mx-toaster\s*\{[^}]*--success-bg[^}]*--info-text[^}]*\}/s,
    )
    expect(block, 'bloco html [data-sonner-toaster].mx-toaster ausente').toBeTruthy()
    const body = block![0]
    for (const family of ['success', 'warning', 'error', 'info']) {
      expect(body, `--${family}-bg deve referenciar var(--mx-status-*)`).toMatch(
        new RegExp(`--${family}-bg:\\s*hsl\\(var\\(--mx-status-`),
      )
      expect(body, `--${family}-text deve referenciar var(--mx-status-*text)`).toMatch(
        new RegExp(`--${family}-text:\\s*hsl\\(var\\(--mx-status-[a-z-]+-text\\)`),
      )
    }
  })

  test('contraste computado dos pares de toast >= 4.5:1', () => {
    const componentsCss = readFileSync(
      resolve(root, 'src/design-system/tokens/components.css'),
      'utf8',
    )
    const block = componentsCss.match(
      /html\s+\[data-sonner-toaster\]\.mx-toaster\s*\{[^}]*--success-bg[^}]*--info-text[^}]*\}/s,
    )
    expect(block, 'bloco html [data-sonner-toaster].mx-toaster ausente').toBeTruthy()
    const body = block![0]

    const families = ['success', 'warning', 'error', 'info'] as const
    for (const family of families) {
      const bgMatch = body.match(new RegExp(`--${family}-bg:\\s*([^;]+);`))
      const textMatch = body.match(new RegExp(`--${family}-text:\\s*([^;]+);`))
      expect(bgMatch, `--${family}-bg ausente`).toBeTruthy()
      expect(textMatch, `--${family}-text ausente`).toBeTruthy()

      const { token: bgToken, alpha } = parseSurfaceHsl(bgMatch![1].trim())
      const textToken = parseTextHsl(textMatch![1].trim())

      const bg = compositeOverWhite(
        hslChannelsToRgb(resolveToken(bgToken)),
        alpha,
      )
      const fg = hslChannelsToRgb(resolveToken(textToken))
      const ratio = contrast(fg, bg)
      expect(`${family} toast: ${ratio.toFixed(2)}:1`).toBe(
        ratio >= 4.5 ? `${family} toast: ${ratio.toFixed(2)}:1` : `${family} toast: >= 4.5:1`,
      )
    }
  })

  test('componente legado toast.jsx sem classes cruas de vermelho', () => {
    const toast = readFileSync(resolve(root, 'src/components/ui/toast.jsx'), 'utf8')
    const rawReds = [
      'text-red-300',
      'text-red-50',
      'ring-red-400',
      'ring-offset-red-600',
      'border-destructive',
      'bg-destructive',
      'text-destructive-foreground',
      'hover:bg-destructive',
      'hover:border-destructive/30',
      'hover:text-destructive-foreground',
      'focus:ring-destructive',
    ]
    for (const raw of rawReds) {
      expect(toast, `toast.jsx não pode conter '${raw}'`).not.toContain(raw)
    }
  })
})
