import { AnimatePresence, motion } from 'motion/react'
import { MessageSquare, Zap } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { formatSafeDate, getFeedbackSellerName, type FeedbackListItem } from '../lib/helpers'

type Props = {
  feedbacks: FeedbackListItem[]
  onShareWhatsApp: (feedback: FeedbackListItem) => void
  variant?: 'admin' | 'store'
}

export function FeedbackList({ feedbacks, onShareWhatsApp, variant = 'admin' }: Props) {
  const showActionHeader = variant === 'admin'

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-mx-lg">
      <AnimatePresence mode="popLayout">
        {feedbacks.map((f, i) => {
          const sellerName = getFeedbackSellerName(f)
          return (
            <motion.li
              key={f.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.01 }}
            >
              <Card className="border p-mx-md h-full flex flex-col justify-between group hover:shadow-sm transition-all bg-white relative overflow-hidden">
                <div className="absolute top-mx-0 right-mx-0 w-mx-4xl h-mx-4xl bg-emerald-600/5 rounded-mx-full blur-mx-lg -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
                <article>
                  <header className="flex items-start justify-between mb-8 border-b border-gray-100 pb-6 relative z-10">
                    <div className="flex items-center gap-mx-sm">
                      <div
                        className={
                          variant === 'admin'
                            ? 'w-mx-xl h-mx-xl rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-foreground text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-none uppercase'
                            : 'w-mx-xl h-mx-xl rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-none uppercase'
                        }
                      >
                        {sellerName.substring(0, 2)}
                      </div>
                      <div>
                        <Typography
                          variant="h3"
                          className="text-base font-semibold tracking-tight"
                        >
                          {sellerName}
                        </Typography>
                        <Typography
                          variant="tiny"
                          tone="muted"
                          className={
                            variant === 'admin'
                              ? 'text-mx-tiny font-medium uppercase'
                              : 'font-medium uppercase'
                          }
                        >
                          {formatSafeDate(f.created_at)}
                        </Typography>
                      </div>
                    </div>
                    <Badge
                      variant={f.acknowledged ? 'success' : 'danger'}
                      className="px-4 py-1 text-mx-micro font-semibold shadow-sm border-none"
                    >
                      {f.acknowledged ? 'LIDO' : 'PENDENTE'}
                    </Badge>
                  </header>
                  <div className="space-y-mx-md relative z-10">
                    {f.caso_motivo && (
                      <div className="p-mx-md bg-status-warning-surface rounded-xl border border-status-warning/10">
                        <Typography
                          variant="tiny"
                          tone="warning"
                          className="font-semibold text-mx-micro mb-3 block"
                        >
                          Caso/Motivo
                        </Typography>
                        <Typography
                          variant="p"
                          className="text-xs font-bold leading-relaxed line-clamp-3"
                        >
                          {f.caso_motivo}
                        </Typography>
                      </div>
                    )}
                    <div className="p-mx-md bg-gray-50 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all">
                      {showActionHeader ? (
                        <header className="flex items-center justify-between mb-4 border-b border-gray-200/10 pb-3">
                          <Typography
                            variant="tiny"
                            tone="brand"
                            className="font-semibold text-mx-micro"
                          >
                            Plano de Ação
                          </Typography>
                          <Zap size={14} className="text-emerald-600" />
                        </header>
                      ) : (
                        <Typography
                          variant="tiny"
                          tone="brand"
                          className="font-semibold text-mx-micro mb-4 block"
                        >
                          Plano de Ação
                        </Typography>
                      )}
                      <Typography
                        variant="p"
                        className="text-xs font-bold leading-relaxed italic tracking-tight line-clamp-3"
                      >
                        "{f.action}"
                      </Typography>
                    </div>
                  </div>
                </article>
                <footer className="mt-10 pt-8 border-t border-gray-100 flex items-center justify-between relative z-10">
                  {variant === 'admin' ? (
                    <div className="flex gap-mx-xs">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onShareWhatsApp(f)}
                        className="w-mx-10 h-mx-10 p-mx-0 text-status-success hover:bg-status-success-surface rounded-xl border border-gray-100 shadow-sm bg-white"
                      >
                        <MessageSquare size={18} />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onShareWhatsApp(f)}
                      className="w-mx-10 h-mx-10 p-mx-0 text-status-success hover:bg-status-success-surface rounded-xl border border-gray-100 shadow-sm bg-white"
                    >
                      <MessageSquare size={18} />
                    </Button>
                  )}
                </footer>
              </Card>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

export default FeedbackList
