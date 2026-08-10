import { useCallback, useEffect, useRef, useState } from 'react'
import { Quote, ShieldCheck, Terminal as TerminalIcon, TrendingUp, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { PageHeading } from '@/components/molecules/PageHeading'
import {
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'
import { useCheckins } from '@/hooks/useCheckins'
import { calcularFunil, gerarDiagnosticoMX } from '@/lib/calculations'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { DailyCheckin } from '@/types/database'
import { isLancamentosViaRpcEnabled } from '@/lib/feature-flags'

interface AuditLog {
  type: 'info' | 'success' | 'warning' | 'error'
  msg: string
}

const ADMIN_AUDIT_LIMIT = 1000
const ADMIN_AUDIT_DAYS = 90

function daysAgoISO(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export default function AiDiagnostics() {
  const { role } = useAuth()
  const { checkins: storeCheckins } = useCheckins()
  const [adminCheckins, setAdminCheckins] = useState<DailyCheckin[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [summary, setSummary] = useState<{ diagnostic: string; action: string } | null>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  const internalProfile = isPerfilInternoMx(role)
  const checkins: DailyCheckin[] = internalProfile ? adminCheckins : storeCheckins

  useEffect(() => {
    if (!internalProfile) return
    const fetchAll = async () => {
      if (isLancamentosViaRpcEnabled()) {
        const { data } = await supabase.rpc('get_lancamentos_rede_periodo', {
          p_start_date: daysAgoISO(ADMIN_AUDIT_DAYS),
          p_end_date: new Date().toISOString().slice(0, 10),
          p_scope: 'daily',
        })
        setAdminCheckins(((data as DailyCheckin[] | null) || []).slice(0, ADMIN_AUDIT_LIMIT))
        return
      }
      const { data } = await supabase
        .from('lancamentos_diarios')
        .select('id, seller_user_id, reference_date, leads_prev_day, agd_cart_prev_day, agd_net_prev_day, agd_cart_today, agd_net_today, vnd_porta_prev_day, vnd_cart_prev_day, vnd_net_prev_day, visit_prev_day')
        .eq('metric_scope', 'daily')
        .gte('reference_date', daysAgoISO(ADMIN_AUDIT_DAYS))
        .order('reference_date', { ascending: false })
        .limit(ADMIN_AUDIT_LIMIT)
      setAdminCheckins((data || []) as DailyCheckin[])
    }
    void fetchAll()
  }, [internalProfile])

  const addLog = useCallback((msg: string, type: AuditLog['type'] = 'info') => {
    setLogs((previous) => [...previous, { type, msg: `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}` }])
  }, [])

  const runScan = useCallback(() => {
    const startedAt = performance.now()
    setIsScanning(true)
    setLogs([])
    setSummary(null)
    addLog('Iniciando diagnóstico operacional MX.')
    addLog(`Base carregada: ${checkins.length} lançamentos diários reais${internalProfile ? ` dos últimos ${ADMIN_AUDIT_DAYS} dias` : ''}.`, 'success')
    addLog('Calculando funil e benchmarks MX 20/60/33 no navegador.')
    const funnel = calcularFunil(checkins)
    const diagnosis = gerarDiagnosticoMX(funnel)
    addLog(`Totais: ${funnel.leads} leads, ${funnel.agd_total} agendamentos, ${funnel.visitas} visitas, ${funnel.vnd_total} vendas.`)
    addLog(`Conversões: ${funnel.tx_lead_agd}% lead→agendamento, ${funnel.tx_agd_visita}% agendamento→visita, ${funnel.tx_visita_vnd}% visita→venda.`, diagnosis.gargalo ? 'warning' : 'success')
    setSummary({ diagnostic: diagnosis.diagnostico, action: diagnosis.sugestao })
    addLog(`Diagnóstico concluído em ${Math.max(1, Math.round(performance.now() - startedAt))}ms.`, 'success')
    setIsScanning(false)
  }, [addLog, checkins, internalProfile])

  const handleScan = useCallback(() => {
    if (!isScanning) runScan()
  }, [isScanning, runScan])

  useEffect(() => { runScan() }, [runScan])
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  if (!internalProfile && role !== 'gerente') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-mx-lg bg-gray-50">
        <ShieldCheck size={48} className="text-emerald-600 opacity-20 mb-6" aria-hidden="true" />
        <Typography variant="h2" className="tracking-tighter">Acesso Restrito</Typography>
        <Typography variant="caption" tone="muted" className="max-w-sm mx-auto mt-4">Diagnóstico operacional disponível para Admin MX e Gerente.</Typography>
      </div>
    )
  }

  if (!internalProfile) {
    return (
      <div className="w-full flex flex-col gap-mx-lg p-mx-lg bg-gray-50">
        <PageHeading
          title={<span>Diagnóstico <span className="text-emerald-600">Operacional</span></span>}
          subtitle="Leitura de funil MX 20/60/33"
          actions={(
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-mx-md shrink-0 w-full sm:w-auto">
              <div className="flex flex-col items-center sm:items-end">
                <Typography variant="tiny" tone="muted" className="">Status do Motor</Typography>
                <Badge variant={isScanning ? 'warning' : 'success'} className="mt-1 px-6 py-2 border-none">
                  <Typography variant="tiny" as="span">{isScanning ? 'PROCESSANDO...' : 'SISTEMA EM STANDBY'}</Typography>
                </Badge>
              </div>
              <Button size="icon" onClick={handleScan} disabled={isScanning} className="w-mx-2xl h-mx-2xl hover:bg-brand-primary-hover text-white active:scale-95 transition-all" aria-label="Reiniciar diagnóstico operacional">
                <Zap size={32} className={cn(isScanning ? 'animate-bounce' : 'fill-white')} aria-hidden="true" />
              </Button>
            </div>
          )}
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-mx-lg flex-1 min-h-0">
          <section className="lg:col-span-7 flex flex-col min-h-mx-chart lg:min-h-0">
            <Card className="flex-1 border-none p-mx-md relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-mx-sm mb-8 relative z-10">
                <TerminalIcon size={18} className="text-emerald-600/80" aria-hidden="true" />
                <Typography variant="caption" tone="white" className="">Eventos do diagnóstico operacional</Typography>
              </div>
              <div className="flex-1 font-mono text-sm leading-relaxed space-y-mx-xs overflow-y-auto pr-4 no-scrollbar border-t border-white/5 pt-8 relative z-10" role="log" aria-live="polite">
                {logs.map((log, index) => (
                  <div key={`${log.msg}-${index}`} className="flex gap-mx-sm group hover:bg-white/5 p-mx-xs rounded-lg transition-colors">
                    <Typography variant="tiny" tone="muted" as="span" className="opacity-10" aria-hidden="true">{(index + 1).toString().padStart(3, '0')}</Typography>
                    <Typography as="span" variant="caption" className={cn('font-bold tracking-tight uppercase text-xs sm:text-sm', log.type === 'error' ? 'text-status-error' : log.type === 'warning' ? 'text-status-warning' : log.type === 'success' ? 'text-status-success' : 'text-sidebar-foreground')}>{log.msg}</Typography>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
              <div className="absolute inset-0 bg-mx-matrix opacity-10 pointer-events-none" aria-hidden="true" />
            </Card>
          </section>
          <aside className="lg:col-span-5 flex flex-col pb-20 lg:pb-0">
            <Card className="p-mx-md bg-white border h-full space-y-mx-md flex flex-col">
              <header className="flex items-center gap-mx-sm border-b border-gray-100 pb-4">
                <div className="w-mx-2xl h-mx-2xl rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0" aria-hidden="true"><ShieldCheck size={32} /></div>
                <div><Typography variant="h2" className="text-xl sm:text-2xl tracking-tight">Resumo operacional</Typography><Typography variant="caption" tone="muted" className="">Conclusão e ação sugerida</Typography></div>
              </header>
              <div className="flex-1" aria-live="polite">
                <AnimatePresence mode="wait">
                  {summary ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-mx-xl">
                      <Card className="p-mx-md bg-mx-indigo-50 border relative group"><Quote size={64} className="absolute -right-4 -bottom-4 text-emerald-600 opacity-5 -rotate-12" aria-hidden="true" /><Typography variant="p" className="text-lg sm:text-xl italic leading-relaxed relative z-10 tracking-tight">“{summary.diagnostic}”</Typography></Card>
                      <div className="space-y-mx-md"><div className="flex items-center gap-mx-xs"><div className="w-mx-10 h-mx-10 rounded-xl bg-status-success-surface text-status-success flex items-center justify-center border border-status-success/20" aria-hidden="true"><TrendingUp size={20} /></div><Typography variant="tiny" tone="success" className="">Plano de Ação Gerencial</Typography></div><Typography variant="p" className="text-sm sm:text-base font-bold leading-relaxed bg-gray-50 p-mx-md border tracking-tight">{summary.action}</Typography></div>
                    </motion.div>
                  ) : <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-mx-md"><div className="w-mx-3xl h-mx-3xl rounded-mx-full border-4 border-gray-100 border-t-brand-primary animate-spin" aria-hidden="true" /><Typography variant="caption" tone="muted" className="animate-pulse">ANALISANDO MALHA...</Typography></div>}
                </AnimatePresence>
              </div>
              <footer className="pt-8 border-t border-gray-100 mt-auto"><Typography variant="tiny" tone="muted" className="text-center block opacity-60">Referência operacional: critério 20/60/33</Typography></footer>
            </Card>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <MxModulePage>
      <MxModuleHeader
        title="Diagnóstico operacional"
        description={`Leitura consolidada do funil MX 20/60/33 com dados reais dos últimos ${ADMIN_AUDIT_DAYS} dias.`}
        actions={(
          <>
            <Badge variant={isScanning ? 'warning' : 'success'}>{isScanning ? 'Processando' : 'Atualizado'}</Badge>
            <Button onClick={handleScan} disabled={isScanning} loading={isScanning}>{!isScanning && <Zap size={16} aria-hidden="true" />}Executar diagnóstico</Button>
          </>
        )}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <MxSectionCard className="min-w-0">
          <MxSectionHeader title="Eventos da análise" description="Etapas, totais e conversões calculadas durante o diagnóstico." actions={<TerminalIcon size={18} className="text-gray-500" aria-hidden="true" />} />
          <div className="max-h-[560px] min-h-[360px] overflow-y-auto bg-gray-900 p-5 font-mono text-xs leading-6 text-gray-300" role="log" aria-live="polite">
            {logs.map((log, index) => (
              <div key={`${log.msg}-${index}`} className="flex gap-3 border-b border-white/5 py-1.5 last:border-0">
                <span className="w-8 shrink-0 text-gray-600">{(index + 1).toString().padStart(3, '0')}</span>
                <span className={cn(log.type === 'error' && 'text-red-300', log.type === 'warning' && 'text-amber-300', log.type === 'success' && 'text-emerald-300')}>{log.msg}</span>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </MxSectionCard>
        <MxSectionCard>
          <MxSectionHeader title="Resumo operacional" description="Conclusão e ação recomendada para a gestão." actions={<ShieldCheck size={18} className="text-emerald-600" aria-hidden="true" />} />
          <div className="p-5" aria-live="polite">
            <AnimatePresence mode="wait">
              {summary ? (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <MxStatusBanner tone="info"><div className="flex gap-3"><Quote size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><p className="leading-6">{summary.diagnostic}</p></div></MxStatusBanner>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><div className="flex items-center gap-2 text-emerald-700"><TrendingUp size={18} aria-hidden="true" /><Typography variant="h4" tone="success">Ação recomendada</Typography></div><Typography variant="p" className="mt-3 text-emerald-800">{summary.action}</Typography></div>
                  <Typography variant="tiny" tone="muted" className="block text-center">Referência operacional: critério 20/60/33</Typography>
                </motion.div>
              ) : <MxLoadingState label="Analisando operação" />}
            </AnimatePresence>
          </div>
        </MxSectionCard>
      </div>
    </MxModulePage>
  )
}
