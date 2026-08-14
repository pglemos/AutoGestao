import { toast as sonnerToast } from 'sonner'

/**
 * Compatibilidade com a API shadcn antiga.
 *
 * A aplicação tem um único provider, o `Toaster` global do Sonner montado em
 * `App.tsx`. Manter um reducer local aqui criava um segundo viewport (e um
 * segundo z-index/position) apenas para os consumidores legados.
 */
/**
 * @param {{ title?: string; description?: string; variant?: string; duration?: number; [key: string]: any }} options
 */
function toast({ title, description, variant, duration, ...options } = {}) {
  const message = title ?? ''
  const sonnerOptions = {
    ...options,
    description,
    duration: duration ?? (variant === 'destructive' ? 8000 : 4000),
  }
  const id = variant === 'destructive'
    ? sonnerToast.error(message, sonnerOptions)
    : sonnerToast(message, sonnerOptions)

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (nextOptions) => sonnerToast(message, { ...sonnerOptions, ...nextOptions, id }),
  }
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId) => sonnerToast.dismiss(toastId),
  }
}

export { useToast, toast }
