import { Link } from 'react-router-dom'
import { CalendarDays, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import MxLogo from '@/assets/mx-logo.png'

export default function OAuthHome() {
  return (
    <main className="min-h-screen bg-white text-gray-800 selection:bg-emerald-600/20">
      <section className="min-h-screen flex flex-col">
        <header className="w-full px-mx-lg sm:px-mx-2xl py-mx-lg flex items-center justify-between gap-mx-md border-b border-gray-200 bg-white/95">
          <Link to="/" className="flex items-center gap-mx-sm min-w-0" aria-label="MX PERFORMANCE">
            <img src={MxLogo} alt="MX PERFORMANCE" className="object-contain shrink-0" style={{ width: 44, height: 44 }} />
            <span className="hidden sm:inline text-sm sm:text-base font-bold tracking-tight uppercase">MX PERFORMANCE</span>
          </Link>

          <nav className="flex items-center gap-mx-sm text-label font-bold">
            <Link to="/privacy" className="text-gray-500 hover:text-emerald-600 transition-colors">
              Privacidade
            </Link>
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-mx-xs h-mx-10 px-mx-md rounded-xl bg-gray-900 text-white hover:bg-mx-green-950 transition-colors"
            >
              <LogIn size={14} />
              Entrar
            </Link>
          </nav>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-mx-lg sm:px-mx-2xl py-mx-2xl lg:py-mx-hero flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl"
            >
              <div className="inline-flex items-center gap-mx-xs rounded-mx-full border border-brand-primary/20 bg-status-success-surface px-mx-md py-mx-xs text-xs font-bold uppercase tracking-widest text-emerald-600 mb-mx-lg">
                <CalendarDays size={14} />
                Google Calendar Integration
              </div>

              <h1 className="text-display font-bold text-gray-800">
                MX PERFORMANCE
              </h1>

              <p className="mt-mx-lg text-lg sm:text-xl leading-relaxed text-gray-500 max-w-2xl">
                Plataforma operacional da MX Consultoria para organizar visitas, agendas comerciais e rotinas de acompanhamento com sincronizacao autorizada ao Google Calendar.
              </p>

              <div className="mt-mx-2xl flex flex-col sm:flex-row gap-mx-sm">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-mx-xs h-mx-12 px-mx-lg rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-mx-green-950 transition-colors"
                >
                  <LogIn size={18} />
                  Acessar Sistema
                </Link>
                <Link
                  to="/privacy"
                  className="inline-flex items-center justify-center gap-mx-xs h-mx-12 px-mx-lg rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:border-brand-primary hover:text-emerald-600 transition-colors"
                >
                  <ShieldCheck size={18} />
                  Politica de Privacidade
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="bg-gray-900 text-white px-mx-lg sm:px-mx-2xl py-mx-2xl lg:py-mx-hero flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-mx-matrix opacity-25" aria-hidden="true" />
            <div className="relative z-10 max-w-xl">
              <img src={MxLogo} alt="MX PERFORMANCE" className="object-contain mb-mx-2xl" style={{ width: 96, height: 96 }} />
              <div className="space-y-mx-lg">
                <div className="flex gap-mx-md">
                  <div className="w-mx-12 h-mx-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <CalendarDays size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-h4 font-bold">Eventos de visitas</h2>
                    <p className="mt-mx-xs text-sm leading-relaxed text-white/65">
                      Criacao, edicao e consulta de eventos autorizados para sincronizar a agenda central da MX e agendas de usuarios conectados.
                    </p>
                  </div>
                </div>

                <div className="flex gap-mx-md">
                  <div className="w-mx-12 h-mx-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <LockKeyhole size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-h4 font-bold">Acesso restrito</h2>
                    <p className="mt-mx-xs text-sm leading-relaxed text-white/65">
                      Uso exclusivo de usuarios autorizados pela MX Consultoria, com autenticação e permissoes internas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="px-mx-lg sm:px-mx-2xl py-mx-md border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-mx-sm text-xs text-gray-500">
          <span className="font-bold">MX Consultoria LTDA © {new Date().getFullYear()}</span>
          <div className="flex items-center gap-mx-md font-bold">
            <Link to="/privacy" className="hover:text-emerald-600">Politica de Privacidade</Link>
            <Link to="/terms" className="hover:text-emerald-600">Termos de Servico</Link>
          </div>
        </footer>
      </section>
    </main>
  )
}
