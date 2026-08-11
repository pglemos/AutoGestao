/**
 * Declarações de tipo para os primitivos de UI escritos em JSX.
 *
 * Motivo: `src/components/ui/*.jsx` não é tipado, então um arquivo `.tsx` que os
 * importa recebe `RefAttributes<any>` sem `children` e o typecheck quebra em toda
 * composição. Até esta feature, nenhum `.tsx` do projeto consumia esses primitivos
 * — eram usados apenas por outros `.jsx`, e o problema nunca apareceu.
 *
 * Este arquivo é ADITIVO: não altera nenhum componente existente e não muda
 * comportamento em runtime. As assinaturas foram transcritas das implementações
 * reais (`button.jsx`, `badge.jsx`, `sheet.jsx`, `dialog.jsx`), não inventadas.
 *
 * Ao migrar um primitivo para `.tsx`, remova a declaração correspondente daqui.
 */

declare module '@/components/ui/button' {
  import type * as React from 'react'

  export type ButtonVariant =
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'

  export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    /** Radix Slot: delega a renderização ao filho em vez de emitir <button>. */
    asChild?: boolean
  }

  export const Button: React.ForwardRefExoticComponent<
    ButtonProps & React.RefAttributes<HTMLButtonElement>
  >
  export function buttonVariants(options?: {
    variant?: ButtonVariant
    size?: ButtonSize
    className?: string
  }): string
}

declare module '@/components/ui/badge' {
  import type * as React from 'react'

  export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

  export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: BadgeVariant
  }

  export function Badge(props: BadgeProps): React.ReactElement
  export function badgeVariants(options?: { variant?: BadgeVariant; className?: string }): string
}

declare module '@/components/ui/sheet' {
  import type * as React from 'react'

  type Div = React.HTMLAttributes<HTMLDivElement>

  export const Sheet: React.FC<{
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    modal?: boolean
    children?: React.ReactNode
  }>
  export const SheetTrigger: React.FC<{ asChild?: boolean; children?: React.ReactNode }>
  export const SheetClose: React.FC<{ asChild?: boolean; children?: React.ReactNode }>
  export const SheetPortal: React.FC<{ children?: React.ReactNode }>
  export const SheetOverlay: React.ForwardRefExoticComponent<
    Div & React.RefAttributes<HTMLDivElement>
  >
  export const SheetContent: React.ForwardRefExoticComponent<
    Div & { side?: 'top' | 'bottom' | 'left' | 'right' } & React.RefAttributes<HTMLDivElement>
  >
  export const SheetHeader: React.FC<Div>
  export const SheetBody: React.ForwardRefExoticComponent<
    Div & React.RefAttributes<HTMLDivElement>
  >
  export const SheetFooter: React.FC<Div>
  export const SheetTitle: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>
  >
  export const SheetDescription: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>
  >
}

declare module '@/components/ui/dialog' {
  import type * as React from 'react'

  type Div = React.HTMLAttributes<HTMLDivElement>

  export const Dialog: React.FC<{
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    modal?: boolean
    children?: React.ReactNode
  }>
  export const DialogTrigger: React.FC<{ asChild?: boolean; children?: React.ReactNode }>
  export const DialogPortal: React.FC<{ children?: React.ReactNode }>
  export const DialogClose: React.FC<{ asChild?: boolean; children?: React.ReactNode }>
  export const DialogOverlay: React.ForwardRefExoticComponent<
    Div & React.RefAttributes<HTMLDivElement>
  >
  export const DialogContent: React.ForwardRefExoticComponent<
    Div & {
      overlayClassName?: string
      showClose?: boolean
    } & React.RefAttributes<HTMLDivElement>
  >
  export const DialogHeader: React.FC<Div>
  export const DialogBody: React.ForwardRefExoticComponent<
    Div & React.RefAttributes<HTMLDivElement>
  >
  export const DialogFooter: React.FC<Div>
  export const DialogTitle: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>
  >
  export const DialogDescription: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>
  >
}

declare module '@/components/ui/alert-dialog' {
  import type * as React from 'react'

  type Div = React.HTMLAttributes<HTMLDivElement>

  export const AlertDialog: React.FC<{
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    modal?: boolean
    children?: React.ReactNode
  }>
  export const AlertDialogTrigger: React.FC<{ asChild?: boolean; children?: React.ReactNode }>
  export const AlertDialogPortal: React.FC<{ children?: React.ReactNode }>
  export const AlertDialogOverlay: React.ForwardRefExoticComponent<
    Div & React.RefAttributes<HTMLDivElement>
  >
  export const AlertDialogContent: React.ForwardRefExoticComponent<
    Div & React.RefAttributes<HTMLDivElement>
  >
  export const AlertDialogHeader: React.FC<Div>
  export const AlertDialogBody: React.ForwardRefExoticComponent<
    Div & React.RefAttributes<HTMLDivElement>
  >
  export const AlertDialogFooter: React.FC<Div>
  export const AlertDialogTitle: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>
  >
  export const AlertDialogDescription: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>
  >
  export const AlertDialogAction: React.ForwardRefExoticComponent<
    React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>
  >
  export const AlertDialogCancel: React.ForwardRefExoticComponent<
    React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>
  >
}
