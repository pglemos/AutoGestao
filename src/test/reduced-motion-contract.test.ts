import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

/**
 * FASE S 19.010 — prefers-reduced-motion (teste de contrato estático).
 *
 * Complementa o teste Playwright (`shell-contract.playwright.ts` usa
 * `page.emulateMedia({ reducedMotion: 'reduce' })`): aqui validamos o contrato
 * CSS + MotionConfig que garantem que reduzir movimento não quebra navegação
 * nem anima.
 */
describe('FASE S 19.010 — prefers-reduced-motion', () => {
  test('CSS global desativa animação e transição com reduce', () => {
    const css = read('src/index.css')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: 0.01ms !important')
    expect(css).toContain('animation-iteration-count: 1 !important')
    expect(css).toContain('transition-duration: 0.01ms !important')
  })

  test('MotionConfig reducedMotion="user" respeita preferência do SO', () => {
    const app = read('src/App.tsx')
    expect(app).toContain('reducedMotion="user"')
  })

  test('animate-float é desativado com reduce (animação ambiental)', () => {
    const css = read('src/index.css')
    expect(css).toContain('.animate-float')
    expect(css).toContain('animation: none !important')
  })

  test('componentes canônicos não usam duração arbitrária que ignore reduce', () => {
    const button = read('src/components/atoms/Button.tsx')
    expect(button).not.toMatch(/duration-\[[0-9]+\]/)
    const tabNav = read('src/components/molecules/TabNav.tsx')
    expect(tabNav).not.toMatch(/duration-\[[0-9]+\]/)
  })
})
