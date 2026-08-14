import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/atoms/Label'

/**
 * FASE L — 12.011/12.017
 *
 * Wrapper formal de campo: qualquer controle (Input, Textarea, Select,
 * Checkbox, RadioGroup, Switch, DatePicker) recebe via render prop o contrato
 * a11y completo — `id`, `aria-describedby` (helper + error), `aria-invalid` e
 * `aria-required` — sem acoplar o wrapper ao tipo do controle.
 *
 * Label nunca é substituído por placeholder (§16.1); HelperText e FieldError
 * viram descrição via `aria-describedby` (12.017); o error também carrega
 * `role="alert"` — a borda não é o único sinal (§14).
 */

/** Props injetadas no controle. O consumidor faz `<Input {...control} />`. */
export interface FieldControlProps
  extends React.InputHTMLAttributes<HTMLElement> {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'aria-required'?: boolean
}

export interface FieldProps {
  label: string
  required?: boolean
  error?: string
  /** Texto de apoio que vira descrição do campo (aria-describedby). */
  helperText?: string
  id?: string
  className?: string
  'aria-describedby'?: string
  children: (control: FieldControlProps) => React.ReactNode
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ label, required, error, helperText, id, className, 'aria-describedby': externalDescribedBy, children }, ref) => {
    const generatedId = React.useId()
    const fieldId = id || generatedId
    const helperId = `${fieldId}-helper`
    const errorId = `${fieldId}-error`
    const describedBy = [externalDescribedBy, helperText ? helperId : undefined, error ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined

    return (
      <div ref={ref} className={cn('space-y-mx-xs w-full', className)}>
        <Label htmlFor={fieldId} required={required} className="ml-2">{label}</Label>
        {children({
          id: fieldId,
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : undefined,
          'aria-required': required || undefined,
        })}
        {helperText && (
          <p id={helperId} className="text-xs text-text-secondary ml-2">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-status-error-text text-caption font-medium ml-2 animate-in fade-in slide-in-from-top-1" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)
Field.displayName = 'Field'

export { Field }
