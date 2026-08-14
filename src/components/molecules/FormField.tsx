import * as React from 'react'
import { cn } from '@/lib/utils'
import { Field, type FieldControlProps } from './Field'
import { Input } from '@/components/atoms/Input'

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  /** Texto de apoio que vira descrição do campo (aria-describedby). */
  helperText?: string
  required?: boolean
  id?: string
  icon?: React.ReactNode
  rightAdornment?: React.ReactNode
}

/** Campo de texto com Label/HelperText/FieldError — delega a a11y ao `Field`. */
const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, required, id, icon, rightAdornment, className, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    return (
      <Field
        label={label}
        error={error}
        helperText={helperText}
        required={required}
        id={id}
        className={className}
        aria-describedby={ariaDescribedBy}
      >
        {(control: FieldControlProps) => (
          <div className="relative group">
            {icon && (
              <div className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" aria-hidden="true">
                {icon}
              </div>
            )}
            <Input
              ref={ref}
              {...control}
              aria-invalid={error ? true : ariaInvalid}
              {...props}
              className={cn(
                icon && "pl-12",
                rightAdornment && "pr-12",
                error && "border-status-error focus-visible:border-status-error focus-visible:ring-status-error/25"
              )}
            />
            {rightAdornment && (
              <div className="absolute right-mx-sm top-1/2 -translate-y-1/2 flex items-center">
                {rightAdornment}
              </div>
            )}
          </div>
        )}
      </Field>
    )
  },
)
FormField.displayName = "FormField"

export { FormField }
