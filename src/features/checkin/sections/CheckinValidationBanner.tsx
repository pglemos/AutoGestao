import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, Clock } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { CHECKIN_EDIT_LIMIT_LABEL } from '@/hooks/useCheckins'

interface CheckinValidationBannerProps {
    metricScope: 'daily' | 'adjustment'
    minutesUntilEditLock: number
    funnelError: string | null
    inputError: string | null
}

/**
 * CheckinValidationBanner — exibe avisos de bloqueio próximo, inconsistência
 * do funil e erros de input agregados.
 */
export function CheckinValidationBanner({
    metricScope,
    minutesUntilEditLock,
    inputError,
    ..._props
}: CheckinValidationBannerProps) {
    return (
        <>
            {minutesUntilEditLock <= 15 && minutesUntilEditLock >= 0 && metricScope === 'daily' && (
                <Card className="p-mx-md border border-status-warning/20 bg-status-warning-surface">
                    <div className="flex flex-col gap-mx-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-mx-sm">
                            <div className="w-mx-xl h-mx-xl rounded-mx-xl bg-white text-status-warning border border-status-warning/20 flex items-center justify-center shrink-0">
                                <Clock size={20} />
                            </div>
                            <div>
                                <Typography variant="h3" tone="warning" className="tracking-tight">Bloqueio próximo</Typography>
                                <Typography variant="p" tone="warning" className="text-sm font-bold">
                                    Faltam {minutesUntilEditLock === 0 ? 'menos de 1 minuto' : `${minutesUntilEditLock} minutos`} para o fechamento das edições diárias.
                                </Typography>
                            </div>
                        </div>
                        <Badge variant="warning" className="w-fit rounded-mx-full px-4 py-1">Até {CHECKIN_EDIT_LIMIT_LABEL}</Badge>
                    </div>
                </Card>
            )}



            <AnimatePresence>
                {inputError && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                        <Card id="checkin-input-error" role="alert" className="p-mx-md bg-status-warning-surface border border-status-warning/20">
                            <Typography variant="p" tone="warning" className="font-semibold tracking-tight">{inputError}</Typography>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
