import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { afterEach, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const root = resolve(import.meta.dir, '../../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

/**
 * Contrato FASE P — Drawer/Sheet family canônica (16.001-16.009).
 *
 * 1. Geometria única: sheet consome tokens `--mx-overlay-*` (gutter/gap/padding),
 *    não `gap-4/p-6/bg-background` crus — a superfície vem de `mx-overlay-surface`.
 * 2. Close button canônico: `mx-overlay-close`, aria-label pt-BR único, SEM
 *    `sr-only "Close"` em inglês.
 * 3. SheetBody é o único scroll owner interno (`mx-overlay-body`).
 * 4. Header/Footer/Focus: family Radix com focus trap/restore nativo.
 */
describe('contrato FASE P — drawer/sheet family canônica', () => {
  test('SheetContent consome tokens de overlay, sem geometria crua', () => {
    const src = read('src/components/ui/sheet.jsx')
    expect(src).toContain('mx-overlay-surface')
    expect(src).toContain('var(--mx-overlay-gap)')
    expect(src).toContain('var(--mx-overlay-padding)')
    expect(src).toContain('var(--mx-overlay-compact-gutter)')
    expect(src).toContain('mx-overlay-backdrop')
    expect(src).toContain('mx-overlay-close')
    expect(src).toContain('mx-overlay-body')
    expect(src.includes('gap-4')).toBe(false)
    expect(src.includes('p-6')).toBe(false)
    expect(src.includes('bg-background')).toBe(false)
    expect(src.includes('left-4')).toBe(false)
    expect(src.includes('right-4')).toBe(false)
    // rótulo acessível pt-BR único, sem duplicata em inglês
    expect(src).toContain('aria-label="Fechar painel"')
    expect(src.includes('sr-only')).toBe(false)
    expect(src.includes('>Close<')).toBe(false)
  })

  test('edges canônicos left/right definidos; top/bottom não são default', () => {
    const src = read('src/components/ui/sheet.jsx')
    expect(src).toContain('left:')
    expect(src).toContain('right:')
    expect(src).toContain('defaultVariants')
    expect(src).toContain('side: "right"')
  })

  test('SheetBody é o único scroll owner interno', () => {
    const src = read('src/components/ui/sheet.jsx')
    expect(src).toContain('data-mx-overlay-body="true"')
    expect(src).toContain('mx-overlay-body')
  })

  test('renderiza Sheet com um único close acessível em pt-BR e body scroll', () => {
    render(
      <Sheet open onOpenChange={() => undefined}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Detalhes</SheetTitle>
            <SheetDescription>Dados da loja.</SheetDescription>
          </SheetHeader>
          <SheetBody data-testid="sheet-body">Conteúdo longo</SheetBody>
          <SheetFooter>Ações</SheetFooter>
        </SheetContent>
      </Sheet>,
    )
    const sheet = screen.getByRole('dialog', { name: 'Detalhes' })
    expect(sheet).toHaveAttribute('data-mx-overlay', 'sheet')
    expect(sheet).toHaveAttribute('data-mx-overlay-layer', 'drawer')
    expect(sheet.className).toContain('mx-overlay-surface')

    const body = screen.getByTestId('sheet-body')
    expect(body).toHaveAttribute('data-mx-overlay-body', 'true')
    expect(body.className).toContain('mx-overlay-body')

    const closeButtons = sheet.querySelectorAll('button[aria-label="Fechar painel"]')
    expect(closeButtons.length).toBe(1)
    expect(closeButtons[0].className).toContain('mx-overlay-close')
    expect(sheet.textContent).not.toContain('Close')
  })

  test('vaul não é usado em runtime (16.001)', () => {
    const hits: string[] = []
    function walk(dir: string): void {
      for (const entry of readdirSync(dir)) {
        const abs = join(dir, entry)
        const rel = relative(root, abs)
        if (statSync(abs).isDirectory()) {
          if (rel.includes('.graphify') || rel === 'src/base44-reference') continue
          walk(abs)
          continue
        }
        if (!['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry))) continue
        if (rel.includes('.test.') || rel.includes('.stories.')) continue
        const src = readFileSync(abs, 'utf8')
        if (src.includes("from 'vaul'") || src.includes('from "vaul"') || src.includes('@/components/ui/drawer')) {
          hits.push(rel)
        }
      }
    }
    walk(join(root, 'src'))
    expect(hits).toEqual([])
  })
})
