import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    previousFocusRef.current = document.activeElement as HTMLElement

    const container = containerRef.current
    const getFocusableElements = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))

    // Focus synchronously as soon as the drawer is mounted. A deferred-only
    // focus can be lost in a real browser when the opening click completes
    // after the effect (notably on mobile navigation drawers), leaving focus
    // on <body> even though the dialog is visible. The second pass handles
    // portals/late-mounted descendants without regressing the immediate case.
    const focusFirst = () => getFocusableElements()[0]?.focus()
    focusFirst()
    const focusFrame = requestAnimationFrame(() => {
      if (document.activeElement && container.contains(document.activeElement)) return
      focusFirst()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(focusFrame)
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus()
      }
    }
  }, [containerRef, isActive])
}
