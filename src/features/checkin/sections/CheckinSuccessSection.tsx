import { CheckCircle2, Clock } from 'lucide-react'

import { Button } from '@/components/atoms/Button'

interface CheckinSuccessSectionProps {
    saveNotice: { title: string; detail: string } | null
    onHome: () => void
}

/**
 * CheckinSuccessSection — confirmação pós-submit com retorno ao início.
 * Substitui o redirect automático original.
 */
export function CheckinSuccessSection({ saveNotice, onHome }: CheckinSuccessSectionProps) {
    if (!saveNotice) return null
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
                <Clock size={16} className="shrink-0 text-[#005BFF]" aria-hidden="true" />
                <p className="text-[12px] font-semibold text-[#1e3a5f]">{saveNotice.detail}</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-body-sm font-semibold text-[#22C55E]">
                    <CheckCircle2 size={20} aria-hidden="true" />
                    {saveNotice.title}
                </div>
                <Button type="button" onClick={onHome} className="rounded-xl">
                    Voltar ao início
                </Button>
            </div>
        </div>
    )
}
