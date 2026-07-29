import { cn } from '@/lib/utils'

/**
 * Aparência compartilhada de campo do MX Design System.
 *
 * Existe para que `SearchField`, `SelectField`, `DateField` e afins tenham a
 * mesma altura, raio, borda e anel de foco sem duplicar classes — e sem herdar
 * as bifurcações por perfil dos átomos legados (`Input`, `Select`).
 */
export const fieldBaseClasses = cn(
  'flex w-full items-center rounded-[var(--mx-input-radius)] bg-[hsl(var(--mx-color-surface))]',
  'h-[var(--mx-input-height)] px-[var(--mx-space-3)]',
  'border-[length:var(--mx-input-border-width)] border-solid border-[hsl(var(--mx-color-border))]',
  'text-[length:var(--mx-font-size-base)] text-[hsl(var(--mx-color-text-primary))]',
  'transition-colors duration-[var(--mx-duration-fast)] ease-[var(--mx-easing-standard)]',
  'placeholder:text-[hsl(var(--mx-color-text-disabled))]',
  'focus-within:border-[hsl(var(--mx-color-primary))]',
  'focus-within:ring-[length:var(--mx-input-focus-ring-width)] focus-within:ring-[hsl(var(--mx-color-focus-ring))]/25',
  'disabled:cursor-not-allowed disabled:bg-[hsl(var(--mx-color-surface-muted))] disabled:text-[hsl(var(--mx-color-text-disabled))]',
)

/** Estado de erro. A borda não é o único sinal — a mensagem acompanha (§14). */
export const fieldInvalidClasses = cn(
  'border-[hsl(var(--mx-color-danger))]',
  'focus-within:border-[hsl(var(--mx-color-danger))] focus-within:ring-[hsl(var(--mx-color-danger))]/25',
)

/** Input nu dentro de um wrapper que já carrega `fieldBaseClasses`. */
export const nakedInputClasses = cn(
  'h-full w-full min-w-0 bg-transparent outline-none',
  'text-[length:var(--mx-font-size-base)] text-inherit',
  'placeholder:text-[hsl(var(--mx-color-text-disabled))]',
  'disabled:cursor-not-allowed',
)
