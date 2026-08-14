import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpCircle, RotateCcw, Sparkles, X } from 'lucide-react'
import { ManagerTourOverlay } from './ManagerTourOverlay'
import { getManagerTour } from './manager-tours'
import { useManagerTour } from './useManagerTour'

/**
 * Monta o Tour do Gerente na rota atual (porte do par `TourOverlay` +
 * `BotaoAjudaTour` que o Base44 pendura no `LayoutGerencial`).
 *
 * Sem tour para a rota, nada é renderizado — nem o botão flutuante.
 */
export function ManagerTourLauncher() {
  const location = useLocation()
  const steps = getManagerTour(location.pathname)
  const { active, dismiss, skipPermanently, restart } = useManagerTour(steps ? location.pathname : null)
  const [helpOpen, setHelpOpen] = useState(false)

  if (!steps) return null

  return (
    <>
      {active && <ManagerTourOverlay steps={steps} onClose={dismiss} onSkip={skipPermanently} />}

      <div className="fixed bottom-5 right-5 z-[var(--mx-z-overlay)]">
        {helpOpen && (
          <div className="absolute bottom-14 right-0 w-64 overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-brand-primary px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-white" />
                <p className="text-sm font-semibold text-white">Central de Ajuda</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} aria-label="Fechar ajuda" className="text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Quer rever o Tour do Gerente desta página? Você pode repetir o tour quantas vezes quiser.
              </p>
              <button
                type="button"
                onClick={() => { setHelpOpen(false); restart() }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-status-success-surface px-3 py-2 text-sm font-medium text-status-success-text transition-colors hover:bg-status-success-surface"
              >
                <RotateCcw size={14} /> Repetir tour desta página
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setHelpOpen(open => !open)}
          aria-expanded={helpOpen}
          aria-label="Ajuda"
          title="Ajuda"
          className="grid h-12 w-12 place-items-center rounded-full bg-brand-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-primary-hover"
        >
          <HelpCircle size={22} />
        </button>
      </div>
    </>
  )
}

export default ManagerTourLauncher
