import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const root = path.resolve(import.meta.dir, '../../..')

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8')
}

/**
 * Contrato FASE O — Modal/Dialog family canônica (15.002-15.017).
 *
 * 1. Geometria única: dialog/alert-dialog consomem os tokens `--mx-overlay-*`
 *    (gutter compacto, gap, padding), não `left-4/right-4/gap-4/p-6` crus.
 * 2. Raio: nenhum `sm:rounded-lg` cru — o raio vem de `--mx-overlay-radius`.
 * 3. Close button canônico: `mx-overlay-close`, com `aria-label` pt-BR e SEM
 *    `sr-only "Close"` em inglês duplicando o rótulo.
 * 4. Focus restore explícito no adapter Modal.
 */
describe('contrato FASE O — overlay family canônica', () => {
  test('DialogContent consome tokens de overlay, sem gutter/gap/padding crus', () => {
    const src = read('src/components/ui/dialog.jsx')
    expect(src).toContain('var(--mx-overlay-compact-gutter)')
    expect(src).toContain('var(--mx-overlay-gap)')
    expect(src).toContain('var(--mx-overlay-padding)')
    expect(src).toContain('mx-overlay-surface')
    expect(src).toContain('mx-overlay-backdrop')
    expect(src).toContain('mx-overlay-close')
    expect(src).toContain('mx-overlay-body')
    // geometria crua substituída por tokens
    expect(src.includes('left-4')).toBe(false)
    expect(src.includes('right-4')).toBe(false)
    expect(src.includes('gap-4')).toBe(false)
    expect(src.includes('p-6')).toBe(false)
    // rótulo acessível pt-BR único, sem duplicata em inglês
    expect(src).toContain('aria-label="Fechar diálogo"')
    expect(src.includes('sr-only')).toBe(false)
    expect(src.includes('>Close<')).toBe(false)
  })

  test('AlertDialogContent consome a mesma geometria, sem radius cru', () => {
    const src = read('src/components/ui/alert-dialog.jsx')
    expect(src).toContain('var(--mx-overlay-compact-gutter)')
    expect(src).toContain('var(--mx-overlay-gap)')
    expect(src).toContain('var(--mx-overlay-padding)')
    expect(src).toContain('mx-overlay-surface')
    expect(src).toContain('mx-overlay-body')
    expect(src.includes('sm:rounded-lg')).toBe(false)
    expect(src.includes('left-4')).toBe(false)
    expect(src.includes('gap-4')).toBe(false)
    expect(src.includes('p-6')).toBe(false)
  })

  test('Modal adapter mantém focus restore explícito e close tokenizado', () => {
    const src = read('src/components/organisms/Modal.tsx')
    expect(src).toContain('onCloseAutoFocus')
    expect(src).toContain('mx-overlay-close')
    expect(src).toContain('mx-overlay-body')
    expect(src).toContain('mx-overlay-backdrop')
  })

  test('renderiza Dialog com um único close acessível em pt-BR', () => {
    render(
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar loja</DialogTitle>
            <DialogDescription>Atualize os dados.</DialogDescription>
          </DialogHeader>
          <DialogBody>Conteúdo</DialogBody>
        </DialogContent>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Editar loja' })
    expect(dialog).toHaveAttribute('data-mx-overlay', 'dialog')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    const closeButtons = dialog.querySelectorAll('button[aria-label="Fechar diálogo"]')
    expect(closeButtons.length).toBe(1)
    expect(closeButtons[0].className).toContain('mx-overlay-close')
    expect(dialog.textContent).not.toContain('Close')
  })

  test('renderiza AlertDialog com a mesma superfície canônica', () => {
    render(
      <AlertDialog open onOpenChange={() => undefined}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja?</AlertDialogTitle>
            <AlertDialogDescription>Ação irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogBody>Confirmação</AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    )
    const dialog = screen.getByRole('alertdialog', { name: 'Excluir loja?' })
    expect(dialog).toHaveAttribute('data-mx-overlay', 'alert-dialog')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.className).toContain('mx-overlay-surface')
  })
})
