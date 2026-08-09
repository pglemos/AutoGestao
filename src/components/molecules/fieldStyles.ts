import { cn } from '@/lib/utils'

/**
 * Aparência compartilhada de campo do MX Design System.
 *
 * Existe para que `SearchField`, `SelectField`, `DateField` e afins tenham a
 * mesma altura, raio, borda e anel de foco sem duplicar classes — e sem herdar
 * as bifurcações por perfil dos átomos legados (`Input`, `Select`).
 */
export const fieldBaseClasses = cn(
  'flex w-full items-center rounded-[var(--mx-input-radius)] bg-surface-default',
  'h-[var(--mx-input-height)] px-[var(--mx-space-3)]',
  'border-[length:var(--mx-input-border-width)] border-solid border-border',
  'text-[length:var(--mx-font-size-base)] text-text-primary',
  'transition-colors duration-[var(--mx-duration-fast)] ease-standard',
  'placeholder:text-text-disabled',
  'focus-within:border-primary',
  'focus-within:ring-[length:var(--mx-input-focus-ring-width)] focus-within:ring-focus-ring/25',
  'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-disabled',
)

/** Estado de erro. A borda não é o único sinal — a mensagem acompanha (§14). */
export const fieldInvalidClasses = cn(
  'border-danger',
  'focus-within:border-danger focus-within:ring-danger/25',
)

/** Input nu dentro de um wrapper que já carrega `fieldBaseClasses`. */
export const nakedInputClasses = cn(
  'h-full w-full min-w-0 bg-transparent outline-none',
  'text-[length:var(--mx-font-size-base)] text-inherit',
  'placeholder:text-text-disabled',
  'disabled:cursor-not-allowed',
)
