import { useState, useEffect } from 'react'
import { Sparkles, X, ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

const STORAGE_KEY = 'mx_checkin_onboarding_dismissed'

interface CheckinFirstTimeBannerProps {
  onOpenHelp?: () => void
}

export function CheckinFirstTimeBanner({ onOpenHelp }: CheckinFirstTimeBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (!dismissed) {
        setVisible(true)
      }
    } catch {
      // Ignora erro de acesso a localStorage
    }
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // Ignora erro de gravação
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          aria-labelledby="onboarding-banner-title"
          className="relative overflow-hidden rounded-2xl border border-brand-primary/25 bg-gradient-to-r from-brand-primary-subtle via-white to-status-info-surface p-4 sm:p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white shadow-sm">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="onboarding-banner-title" className="text-body font-bold text-mx-navy">
                    Bem-vindo ao seu Fechamento Diário
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-brand-primary px-2.5 py-0.5 text-caption font-bold text-white">
                    Guia Rápido · 1 min
                  </span>
                </div>
                <p className="text-body-sm text-muted-foreground leading-relaxed">
                  Conclua seu dia com clareza e conquiste <strong>100% de disciplina</strong> em 3 passos simples:
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info/40"
              aria-label="Fechar guia de introdução"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-white/90 p-3 shadow-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-text" aria-hidden="true" />
              <div className="text-caption">
                <strong className="block text-foreground">1. Lançar 3 Canais (70%)</strong>
                <span className="text-muted-foreground">Informe Showroom, Carteira e Internet.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-white/90 p-3 shadow-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-info-text" aria-hidden="true" />
              <div className="text-caption">
                <strong className="block text-foreground">2. Detalhar D+1 (+30%)</strong>
                <span className="text-muted-foreground">Cadastre os clientes de amanhã no CRM.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-white/90 p-3 shadow-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              <div className="text-caption">
                <strong className="block text-foreground">3. Finalizar e Celebrar</strong>
                <span className="text-muted-foreground">Envio seguro com faturamento auditado.</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              {onOpenHelp && (
                <button
                  type="button"
                  onClick={onOpenHelp}
                  className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-status-info-text transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info/40"
                >
                  <BookOpen className="h-4 w-4" />
                  Entenda como funciona a pontuação
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleDismiss}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-body-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-primary-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
            >
              Começar fechamento
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

export default CheckinFirstTimeBanner
