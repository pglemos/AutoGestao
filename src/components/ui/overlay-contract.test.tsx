import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Modal } from '@/components/organisms/Modal'

afterEach(() => cleanup())

describe('MX overlay contract', () => {
  test('Dialog exposes one canonical surface and internal body scroll owner', () => {
    render(
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar loja</DialogTitle>
            <DialogDescription>Atualize os dados da loja.</DialogDescription>
          </DialogHeader>
          <DialogBody data-testid="dialog-body">Conteúdo longo</DialogBody>
          <DialogFooter>Salvar</DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Editar loja' })
    const body = screen.getByTestId('dialog-body')

    expect(dialog).toHaveAttribute('data-mx-overlay', 'dialog')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.className).toContain('mx-overlay-surface')
    expect(body).toHaveAttribute('data-mx-overlay-body', 'true')
    expect(body.className).toContain('mx-overlay-body')
    expect(screen.getByRole('button', { name: 'Fechar diálogo' }).className).toContain('mx-overlay-close')
  })

  test('DialogContent with overflow-y-auto enables scrollable body contract without clipping', () => {
    render(
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Executar próximo passo</DialogTitle>
          </DialogHeader>
          <div data-testid="long-form">Conteúdo longo de formulário</div>
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Executar próximo passo' })
    expect(dialog).toHaveAttribute('data-mx-overlay-scroll', 'body')
    expect(dialog.className).toContain('mx-overlay-body')
    expect(dialog.className).not.toContain('overflow-hidden')
  })

  test('Sheet has the same body, safe-area and close-button contract', () => {
    render(
      <Sheet open onOpenChange={() => undefined}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Detalhes</SheetTitle>
            <SheetDescription>Dados da loja.</SheetDescription>
          </SheetHeader>
          <SheetBody data-testid="sheet-body">Conteúdo</SheetBody>
        </SheetContent>
      </Sheet>,
    )

    const sheet = screen.getByRole('dialog', { name: 'Detalhes' })
    const body = screen.getByTestId('sheet-body')

    expect(sheet).toHaveAttribute('data-mx-overlay', 'sheet')
    expect(sheet).toHaveAttribute('data-mx-overlay-layer', 'drawer')
    expect(sheet.className).toContain('mx-overlay-surface')
    expect(body).toHaveAttribute('data-mx-overlay-body', 'true')
    expect(body.className).toContain('mx-overlay-body')
    expect(screen.getByRole('button', { name: 'Fechar painel' }).className).toContain('mx-overlay-close')
  })

  test('AlertDialog uses the modal family without opening a second geometry system', () => {
    render(
      <AlertDialog open onOpenChange={() => undefined}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>Cancelar Excluir</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    )

    const dialog = screen.getByRole('alertdialog', { name: 'Excluir loja?' })
    expect(dialog).toHaveAttribute('data-mx-overlay', 'alert-dialog')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.className).toContain('mx-overlay-surface')
  })

  test('Modal adapter participates in the same surface and body contract', () => {
    render(
      <Modal
        open
        onClose={() => undefined}
        title="Editar cliente"
        description="Atualize os dados."
        footer={<button type="button">Salvar</button>}
      >
        Conteúdo
      </Modal>,
    )

    const modal = screen.getByRole('dialog', { name: 'Editar cliente' })
    const body = document.querySelector('[data-mx-overlay-body="true"]')

    expect(modal).toHaveAttribute('data-mx-overlay', 'modal')
    expect(modal).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(modal.className).toContain('mx-overlay-surface')
    expect(body).toBeTruthy()
    expect(body?.className).toContain('mx-overlay-body')
    expect(screen.getByRole('button', { name: 'Fechar modal' }).className).toContain('mx-overlay-close')
  })
})
