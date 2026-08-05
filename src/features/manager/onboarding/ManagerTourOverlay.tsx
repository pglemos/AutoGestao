import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ManagerTourStep } from './manager-tours'

const SPOTLIGHT_PADDING = 8
const POPOVER_HEIGHT = 210

type Rect = { top: number; left: number; width: number; height: number }

/**
 * Overlay do Tour do Gerente (porte do `TourOverlay` do Base44).
 *
 * O original usa framer-motion; aqui as transições são CSS para não adicionar
 * dependência de animação ao bundle. O comportamento é o mesmo: spotlight no
 * elemento, popover posicionado acima ou abaixo conforme o espaço, teclas
 * ESC/setas/Enter e clique no destaque avançando o passo.
 */
export function ManagerTourOverlay({
  steps,
  onClose,
  onSkip,
}: {
  steps: ManagerTourStep[]
  onClose: () => void
  onSkip: () => void
}) {
  const [index, setIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<Rect | null>(null)
  const [popover, setPopover] = useState<{ top: number; left: number; width: number } | null>(null)
  const frameRef = useRef<number | null>(null)

  const step = steps[index]
  const isLast = index === steps.length - 1
  const progress = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 100

  const updatePosition = useCallback(() => {
    if (!step?.selector) {
      setSpotlight(null)
      setPopover(null)
      return
    }
    const element = document.querySelector(step.selector)
    if (!element) {
      setSpotlight(null)
      setPopover(null)
      return
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const rect = element.getBoundingClientRect()
    setSpotlight({
      top: rect.top - SPOTLIGHT_PADDING,
      left: rect.left - SPOTLIGHT_PADDING,
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2,
    })

    const width = Math.min(360, window.innerWidth - 24)
    const placeAbove = rect.bottom + 16 + POPOVER_HEIGHT > window.innerHeight && rect.top - 16 - POPOVER_HEIGHT > 12
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12))
    const top = placeAbove ? Math.max(12, rect.top - 16 - POPOVER_HEIGHT) : rect.bottom + 16
    setPopover({ top, left, width })
  }, [step])

  useLayoutEffect(() => { updatePosition() }, [index, updatePosition])

  useEffect(() => {
    const handler = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(updatePosition)
    }
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [updatePosition])

  const next = useCallback(() => {
    if (index >= steps.length - 1) onClose()
    else setIndex(current => current + 1)
  }, [index, steps.length, onClose])

  const previous = useCallback(() => setIndex(current => Math.max(0, current - 1)), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSkip()
      else if (event.key === 'ArrowRight' || event.key === 'Enter') next()
      else if (event.key === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, previous, onSkip])

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tour do Gerente">
      {!spotlight && (
        <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]" role="presentation" onClick={onSkip} />
      )}

      {spotlight && (
        <div
          role="presentation"
          onClick={next}
          style={{
            position: 'fixed',
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: 16,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.58)',
            zIndex: 170,
            cursor: 'pointer',
          }}
        >
          <span className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl border-2 border-emerald-400" />
        </div>
      )}

      <section
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-all"
        style={popover
          ? { position: 'fixed', top: popover.top, left: popover.left, width: popover.width, zIndex: 180 }
          : { position: 'fixed', top: '50%', left: '50%', marginLeft: -190, marginTop: -100, width: 380, zIndex: 180 }}
      >
        <div className="relative h-1 bg-emerald-100">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <header className="flex items-center justify-between bg-emerald-600 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/20 text-xs font-bold text-white">{index + 1}</span>
            <p className="text-sm font-semibold text-white">{step?.title || 'Tour do Gerente'}</p>
          </div>
          <button type="button" onClick={onSkip} aria-label="Fechar tour" className="text-white/80 transition-colors hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="px-5 py-4">
          {step?.subtitle && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">{step.subtitle}</p>
          )}
          <p className="text-sm leading-relaxed text-gray-600">{step?.description}</p>
        </div>

        <footer className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3">
          <span className="text-xs tabular-nums text-gray-400">Passo {index + 1} de {steps.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onSkip} className="h-8 rounded-lg px-2 text-xs text-gray-500 hover:text-gray-700">
              Pular tour
            </button>
            {index > 0 && (
              <button type="button" onClick={previous} className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 hover:bg-gray-50">
                <ChevronLeft size={14} /> Voltar
              </button>
            )}
            <button type="button" onClick={next} className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">
              {isLast ? <><Check size={14} /> Concluir</> : <>Próximo <ChevronRight size={14} /></>}
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default ManagerTourOverlay
