import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'
import { ShieldCheck, Calendar, Clock, User, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'

interface SolicitacaoDetalhe {
  id: string
  vendedorId: string
  vendedorNome: string
  dataFechamento: string
  dataHoraSolicitacao: string
  status: 'pendente' | 'liberado'
}

export function LiberacaoFechamento() {
  const { profile, role } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? searchParams.get('id') // ?id= = link antigo (pré EV-1.6)

  const [solicitacao, setSolicitacao] = useState<SolicitacaoDetalhe | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [liberando, setLiberando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const allowedRoles = ['gerente', 'supervisor', 'administrador', 'dono', 'administrador_geral', 'administrador_mx']
  const hasPermission = allowedRoles.includes(role || '')

  useEffect(() => {
    if (!token || !hasPermission) { setLoading(false); return }
    let cancelled = false
    supabase
      .rpc('consultar_liberacao_por_token', { p_token: token })
      .then(({ data, error }) => {
        if (cancelled) return
        const result = data as { ok?: boolean; error?: string; data?: SolicitacaoDetalhe } | null
        if (error || !result?.ok || !result.data) {
          setLoadError(result?.error || error?.message || 'Solicitação não encontrada ou link inválido.')
        } else {
          setSolicitacao(result.data)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [token, hasPermission])

  const handleLiberar = async () => {
    if (!token || !profile) return
    setLiberando(true)
    try {
      const { data, error } = await supabase.rpc('liberar_fechamento_por_token', {
        p_token: token,
        p_motivo: motivo.trim() || null,
      })
      const result = data as { ok?: boolean; error?: string } | null
      if (error || !result?.ok) {
        toast.error(result?.error || error?.message || 'Erro ao liberar fechamento.')
        return
      }
      setSolicitacao(prev => prev ? { ...prev, status: 'liberado' } : null)
      toast.success('Fechamento liberado com sucesso.')
    } catch {
      toast.error('Erro inesperado ao liberar fechamento.')
    } finally {
      setLiberando(false)
    }
  }

  if (!hasPermission) {
    return (
      // lint-page-roots-ignore: tela de estado centrada em viewport cheio, não
      // página em canvas — o padding serve à centralização.
      <div className="h-screen w-screen flex flex-col items-center justify-center text-center p-6 bg-surface-alt">
        <ShieldCheck size={64} className="text-status-error/20 mb-6" />
        <Typography variant="h2" className="mb-2 text-status-error font-extrabold">
          Acesso Restrito
        </Typography>
        <Typography variant="p" tone="muted" className="max-w-md mx-auto text-xs font-semibold leading-relaxed">
          Apenas gestores, supervisores, administradores ou donos de loja podem aprovar a liberação de fechamentos diários atrasados.
        </Typography>
        <Button onClick={() => navigate('/home')} className="mt-6 bg-emerald-600 hover:bg-brand-primary-hover text-white font-bold rounded-xl">
          Voltar para Início
        </Button>
      </div>
    )
  }

  if (!loading && (!solicitacao || loadError)) {
    return (
      // lint-page-roots-ignore: idem — estado de recurso inexistente.
      <div className="h-screen w-screen flex flex-col items-center justify-center text-center p-6 bg-surface-alt">
        <AlertTriangle size={64} className="text-status-warning/20 mb-6" />
        <Typography variant="h2" className="mb-2 font-extrabold">
          Solicitação Não Encontrada
        </Typography>
        <Typography variant="p" tone="muted" className="max-w-md mx-auto text-xs font-semibold leading-relaxed">
          {loadError || 'O link de liberação é inválido ou a solicitação expirou. Confirme o link enviado pelo vendedor.'}
        </Typography>
        <Button onClick={() => navigate('/home')} className="mt-6 bg-emerald-600 hover:bg-brand-primary-hover text-white font-bold rounded-xl">
          Voltar para Início
        </Button>
      </div>
    )
  }

  if (loading || !solicitacao) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-alt">
        <Typography variant="p" tone="muted" className="text-xs font-semibold">Carregando solicitação...</Typography>
      </div>
    )
  }

  return (
    // lint-page-roots-ignore: fluxo de aprovação por link, um card centrado em
    // max-w-lg. Não tem sidebar nem margem de página para padronizar.
    <div className="min-h-screen w-full bg-surface-alt flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <Card className="w-full max-w-lg bg-white border p-mx-md space-y-mx-md">
        <header className="border-b border-gray-100 pb-4 flex items-center justify-between">
          <div>
            <Typography variant="h1" className="!text-lg !">
              Liberação de Fechamento
            </Typography>
            <Typography variant="p" tone="muted" className="text-xs font-semibold mt-1">
              Aprove o fechamento operacional retroativo para o vendedor.
            </Typography>
          </div>
          <ShieldCheck size={32} className="text-emerald-600 shrink-0" />
        </header>

        <div className="space-y-4 text-xs leading-relaxed text-gray-500">
          {/* Details */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 shadow-none">
            <div className="flex items-center gap-2">
              <User size={15} className="text-emerald-600" />
              <span className="font-bold text-gray-800">Vendedor:</span>
              <span className="font-semibold">{solicitacao.vendedorNome}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-emerald-600" />
              <span className="font-bold text-gray-800">Data do Fechamento:</span>
              <span className="font-extrabold text-emerald-600">
                {solicitacao.dataFechamento.split('-').reverse().join('/')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-emerald-600" />
              <span className="font-bold text-gray-800">Data/Hora Solicitação:</span>
              <span className="font-semibold">
                {new Date(solicitacao.dataHoraSolicitacao).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span className="font-bold text-gray-800">Status:</span>
              <span className={`inline-block px-2 py-0.5 rounded-xl text-caption font-extrabold ${
                solicitacao.status === 'liberado'
                  ? 'bg-status-success-surface text-status-success border border-status-success/20'
                  : 'bg-status-warning-surface text-status-warning border border-status-warning/20 animate-pulse'
              }`}>
                {solicitacao.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Action Input */}
          {solicitacao.status === 'pendente' ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="motivo-liberacao" className="font-bold text-gray-800">
                Motivo da Liberação (Opcional)
              </label>
              <textarea
                id="motivo-liberacao"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ex: Vendedor teve problemas com a conexão ou ausência justificada..."
                className="h-20 w-full resize-none rounded-xl border border-gray-100 p-3 text-xs text-gray-800 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all"
              />
            </div>
          ) : (
            <div className="bg-status-success-surface text-status-success border border-status-success/20 p-mx-md rounded-xl flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 size={18} className="shrink-0 text-status-success mt-0.5" />
              <div>
                <p className="font-bold text-xs uppercase text-status-success">Fechamento Liberado</p>
                <p className="font-semibold mt-1">
                  Este fechamento já foi liberado e o vendedor já pode preencher e finalizar os dados.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button
            onClick={() => navigate('/home')}
            variant="outline"
            className="h-9 px-4 text-xs font-bold border-gray-100 text-gray-500 hover:bg-background flex items-center gap-1.5 rounded-xl"
          >
            <ArrowLeft size={13} /> Cockpit
          </Button>
          {solicitacao.status === 'pendente' && (
            <Button
              onClick={handleLiberar}
              disabled={liberando}
              className="h-9 px-6 text-xs font-bold hover:bg-brand-primary-hover text-white shadow-sm"
            >
              {liberando ? 'Processando...' : 'Liberar Fechamento'}
            </Button>
          )}
        </footer>
      </Card>
    </div>
  )
}

export default LiberacaoFechamento
