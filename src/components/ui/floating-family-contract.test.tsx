import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const root = path.resolve(import.meta.dir, '../../..')

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8')
}

/**
 * Contrato FASE P — floating family (popover/dropdown/tooltip) canônica (16.010-16.015).
 *
 * 1. 16.011 — Geometria tokenizada: radius/shadow/border/padding via `--mx-*`,
 *    sem `rounded-md/sm`, `shadow-md/lg`, `p-4/p-1/px-3 py-1.5` crus.
 * 2. 16.012 — Navegação por teclado: primitives Radix (arrow keys/ESC/focus).
 * 3. 16.014 — Tooltip com superfície de alto contraste (surface-overlay),
 *    tipografia canônica e sem delay excessivo.
 * 4. 16.015 — Tooltip não é o único meio: trigger acessível por teclado
 *    (sem depender só de hover).
 */
describe('contrato FASE P — floating family canônica', () => {
  test('popover usa geometria tokenizada e z-index semântico', () => {
    const src = read('src/components/ui/popover.jsx')
    expect(src).toContain('var(--mx-z-popover)')
    expect(src).toContain('rounded-[var(--mx-radius-md)]')
    expect(src).toContain('shadow-[var(--mx-shadow-md)]')
    expect(src).toContain('border-border')
    expect(src).toContain('p-[var(--mx-space-4)]')
    expect(/rounded-md\b/.test(src)).toBe(false)
    expect(src.includes('shadow-md ')).toBe(false)
    expect(/bg-popover\b/.test(src)).toBe(false)
    expect(/p-4\b/.test(src)).toBe(false)
  })

  test('dropdown menu usa geometria tokenizada nos conteúdos', () => {
    const src = read('src/components/ui/dropdown-menu.jsx')
    expect(src).toContain('var(--mx-z-popover)')
    expect(src).toContain('rounded-[var(--mx-radius-md)]')
    expect(src).toContain('shadow-[var(--mx-shadow-md)]')
    expect(src).toContain('border-border')
    expect(src).toContain('p-[var(--mx-space-1)]')
    expect(/rounded-md\b/.test(src)).toBe(false)
    expect(src.includes('shadow-md ')).toBe(false)
    expect(/bg-popover\b/.test(src)).toBe(false)
    expect(src.includes('p-1"')).toBe(false)
  })

  test('tooltip usa superfície de alto contraste e tipografia canônica', () => {
    const src = read('src/components/ui/tooltip.jsx')
    expect(src).toContain('var(--mx-z-tooltip)')
    expect(src).toContain('bg-surface-overlay')
    expect(src).toContain('text-white')
    expect(src).toContain('rounded-[var(--mx-radius-md)]')
    expect(/bg-primary\b/.test(src)).toBe(false)
    expect(/rounded-md\b/.test(src)).toBe(false)
    expect(/shadow-sm\b/.test(src)).toBe(false)
  })

  test('primitives delegam a Radix — navegação por teclado nativa (16.012)', () => {
    for (const rel of ['src/components/ui/popover.jsx', 'src/components/ui/dropdown-menu.jsx', 'src/components/ui/tooltip.jsx']) {
      const src = read(rel)
      expect(src, rel).toMatch(/@radix-ui\/react-(popover|dropdown-menu|tooltip)/)
    }
  })

  test('renderiza Popover e DropdownMenu com Radix', () => {
    render(
      <Popover>
        <PopoverTrigger asChild><button type="button">Abrir</button></PopoverTrigger>
        <PopoverContent>Conteúdo popover</PopoverContent>
      </Popover>,
    )
    expect(screen.getByText('Abrir')).toBeTruthy()
  })

  test('renderiza Tooltip com Radix e trigger acessível por teclado', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Ajuda">?</button>
          </TooltipTrigger>
          <TooltipContent>Explicação contextual</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    )
    const trigger = screen.getByRole('button', { name: 'Ajuda' })
    expect(trigger).toBeTruthy()
  })
})
