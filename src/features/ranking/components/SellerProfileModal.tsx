import { useEffect, useRef } from 'react'
import { X, Crown, Flame } from 'lucide-react'
import type { RankingEntry } from '@/types/database'
import { motion } from 'motion/react'
import { Avatar } from '@/components/atoms/Avatar'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface SellerProfileModalProps {
    seller: RankingEntry
    onClose: () => void
}

type Metrica = { label: string; valor: string; ajuda: string; destaque?: boolean }

/**
 * Perfil do vendedor a partir do ranking.
 *
 * O painel anterior era um radar de "atributos" com multiplicadores mágicos
 * (`ritmo * 10`, `visitas * 5`, volume dividido por `meta * 3`) e um "Nível"
 * derivado de `atingimento / 10` — números que ninguém consegue auditar, num
 * produto cujo primeiro princípio é dado rastreável. Aqui só entram grandezas
 * que existem na fonte, com o cálculo escrito ao lado.
 */
export function SellerProfileModal({ seller, onClose }: SellerProfileModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    useFocusTrap(dialogRef, true)

    useEffect(() => {
        closeButtonRef.current?.focus()
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const temMeta = seller.meta > 0
    const conversao = seller.visitas > 0 ? Math.round((seller.vnd_total / seller.visitas) * 100) : null

    const metricas: Metrica[] = [
        { label: 'Vendas', valor: String(seller.vnd_total), ajuda: 'Vendas oficiais no período.', destaque: true },
        { label: 'Meta', valor: temMeta ? String(seller.meta) : '—', ajuda: temMeta ? 'Meta individual do período.' : 'Sem meta individual cadastrada.' },
        { label: '% da Meta', valor: temMeta ? `${seller.atingimento}%` : '—', ajuda: temMeta ? 'Vendas divididas pela meta individual.' : 'Sem meta, não há percentual a calcular.' },
        { label: 'Conversão', valor: conversao === null ? '—' : `${conversao}%`, ajuda: conversao === null ? 'Sem atendimentos registrados no período.' : 'Vendas divididas pelos atendimentos.' },
        { label: 'Leads', valor: String(seller.leads), ajuda: 'Leads recebidos no período.' },
        { label: 'Agendamentos', valor: String(seller.agd_total), ajuda: 'Agendamentos confirmados no período.' },
        { label: 'Atendimentos', valor: String(seller.visitas), ajuda: 'Atendimentos registrados no período.' },
        { label: 'Rotina', valor: seller.routine_execution === null || seller.routine_execution === undefined ? '—' : `${seller.routine_execution}%`, ajuda: 'Execução da rotina diária. Sem snapshot oficial, fica sem valor.' },
    ]

    const lidera = seller.position === 1
    const bateuMeta = temMeta && seller.atingimento >= 100

    return (
        <div className="fixed inset-0 z-[var(--mx-z-modal)] flex items-center justify-center p-mx-md">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                ref={dialogRef}
                initial={{ opacity: 0, scale: 0.98, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative z-[var(--mx-z-modal)] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="seller-profile-title"
            >
                <header className="flex items-start gap-4 border-b border-border-subtle bg-surface-alt px-5 py-4">
                    <div className="relative shrink-0">
                        <Avatar
                            src={seller.avatar_url || undefined}
                            alt={`Avatar de ${seller.user_name}`}
                            fallback={seller.user_name}
                            className="h-14 w-14 rounded-full border-2 border-border bg-white"
                        />
                        <span className="absolute -bottom-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full border border-border bg-white px-1 text-mx-tiny font-bold text-foreground">
                            {seller.position}º
                        </span>
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 id="seller-profile-title" className="truncate text-xl font-bold text-foreground">{seller.user_name}</h2>
                        <p className="truncate text-sm text-muted-foreground">{seller.store_name || 'Loja não informada'}</p>
                        {(lidera || bateuMeta) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {lidera && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-status-warning-surface px-2.5 py-1 text-mx-tiny font-semibold text-status-warning-text">
                                        <Crown className="h-3.5 w-3.5" aria-hidden="true" /> Líder do ranking
                                    </span>
                                )}
                                {bateuMeta && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary-subtle px-2.5 py-1 text-mx-tiny font-semibold text-brand-primary-hover">
                                        <Flame className="h-3.5 w-3.5" aria-hidden="true" /> Meta batida
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        ref={closeButtonRef}
                        type="button"
                        aria-label="Fechar perfil do vendedor"
                        onClick={onClose}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <div className="overflow-y-auto px-5 py-5">
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {metricas.map(({ label, valor, ajuda, destaque }) => (
                            <div key={label} className="rounded-xl border border-border-subtle bg-white p-3" title={ajuda}>
                                <dt className="text-mx-tiny font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                                <dd className={`mt-1 text-xl font-bold leading-tight ${destaque ? 'text-status-success-text' : 'text-foreground'}`}>{valor}</dd>
                                <p className="mt-1 text-mx-tiny leading-snug text-muted-foreground">{ajuda}</p>
                            </div>
                        ))}
                    </dl>
                </div>
            </motion.div>
        </div>
    )
}
