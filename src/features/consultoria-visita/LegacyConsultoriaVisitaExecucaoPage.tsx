import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Circle, Save, FileText, Send,
  AlertCircle, Info, Building2, User2, Calendar,
  Plus, Trash2, Download, Loader2, Paperclip, Image,
  ChevronDown, ChevronUp, ClipboardCheck, Copy, Sparkles,
  BookOpen, ExternalLink, Target, Clock, MessageSquare, BarChart3, Users, Zap,
  TrendingUp, Timer, ShieldAlert, Award, Presentation, Rocket, Star,
  Smartphone, Eye, Printer, Share2, Calculator, PieChart, ShieldCheck,
  BarChart, LineChart, TrendingDown, Layers, MapPin, Gauge
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { Textarea } from '@/components/atoms/Textarea'
import { DatePicker } from '@/components/atoms/DatePicker'
import { Select } from '@/components/atoms/Select'
import { useConsultingClientDetailBySlug } from '@/hooks/useConsultingClientBySlug'
import { useConsultingMethodology } from '@/hooks/useConsultingClients'
import { usePmrDiagnostics } from '@/hooks/usePmrDiagnostics'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn, slugify } from '@/lib/utils'
import { downloadHtmlAsPdf } from '@/lib/pdf/downloadHtmlAsPdf'
import { getPmrVisitDisplayLabel, isPmrSchedulableVisitNumber } from '@/lib/consultoria/pmr-visit-rules'
import {
  getVisitAnalysisPeriodFromPreset,
  isValidVisitAnalysisPeriod,
  VISIT_ANALYSIS_PERIOD_PRESETS,
  type VisitAnalysisPeriodPreset,
} from '@/lib/consultoria/visit-analysis-period'
import { downloadEvidenceAttachment, openEvidenceAttachment } from '@/lib/consultoria/evidence-attachments'
import { Modal } from '@/components/organisms/Modal'

import { VisitHeaderBase } from '@/features/consultoria/components/VisitHeaderBase'
import { VisitOneHighFidelity } from '@/features/consultoria/components/VisitOneHighFidelity'
import {
  VisitTwoExecution, VisitThreeExecution, VisitFourExecution,
  VisitFiveExecution, VisitSixExecution, VisitSevenExecution,
  VisitEightExecution,
  VisitChecklist
} from '@/features/consultoria/components/VisitExecutionViews'
import { VisitReportTemplate } from '@/features/consultoria/components/VisitReportTemplate'
import { formatVisitDraftForGroup } from '@/lib/consultoria/visit-report-draft'
import { buildExecutiveVisitReport } from '@/lib/consultoria/executive-visit-report'
import type { ConsultingVisit, ConsultingVisitAttachment, VisitHeaderBaseData, VisitOneQuantData } from '@/features/consultoria/types'

import { VisitActionQuickAdd } from '@/features/consultoria/components/VisitActionQuickAdd'

const DEFAULT_VISIT_ONE_QUANT_DATA: VisitOneQuantData = {
  sales: [ { month: 'Jan', value: 0 }, { month: 'Fev', value: 0 }, { month: 'Mar', value: 0 } ],
  marketing: { investment: 0, leads: 0, origin: [ { name: 'Porta', value: 0 }, { name: 'Internet', value: 0 }, { name: 'Carteira', value: 0 }, { name: 'Indicação', value: 0 } ] },
  stock: { qty: 0, avg_price: 0, fipe_delta: 0, mileage: 0, total_inv: 0 },
}

type ChecklistItem = { task: string; completed: boolean }
type VisitDraftPayload = Partial<ConsultingVisit> & {
  consultant_name_manual?: string
  effective_visit_date?: string
}

const VISIT_FLOW_STEPS = [
  'Contexto',
  'Periodo',
  'Metodologia',
  'Registros',
  'Evidencias',
  'Resumo',
  'Finalizacao',
]

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Operação não concluída.'
}

function isChecklistItem(item: unknown): item is ChecklistItem {
  return typeof item === 'object' && item !== null && 'task' in item
}

function isVisitOneQuantData(value: unknown): value is VisitOneQuantData {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<VisitOneQuantData>
  return Array.isArray(candidate.sales) && Boolean(candidate.marketing) && Boolean(candidate.stock)
}

export default function ConsultoriaVisitaExecucao() {
  const { clientSlug, visitNumber } = useParams<{ clientSlug: string, visitNumber: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { client, loading: clientLoading, refetch } = useConsultingClientDetailBySlug(clientSlug)

  const clientId = client?.id
  const [fallbackStoreId, setFallbackStoreId] = useState('')
  const resolvedStoreId = client?.primary_store_id || client?.store_id || fallbackStoreId || ''

  const { steps, loading: methodologyLoading } = useConsultingMethodology(client?.program_template_key || 'pmr_7')
  const { templates, responsesByTemplate, saveResponse } = usePmrDiagnostics(clientId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const visitNum = parseInt(visitNumber || '1')
  const step = useMemo(() => steps.find(s => s.visit_number === visitNum), [steps, visitNum])
  const visit = useMemo(() => client?.visits?.find(v => v.visit_number === visitNum), [client, visitNum])

  useEffect(() => {
    if (client && client.slug && clientSlug && client.slug !== clientSlug) {
      window.history.replaceState({}, '', `/consultoria/clientes/${client.slug}/visitas/${visitNumber}${window.location.search}`)
    }
  }, [client, clientSlug, visitNumber])

  useEffect(() => {
    if (!client || client.primary_store_id || client.store_id) {
      setFallbackStoreId('')
      return
    }

    let active = true
    const resolveStoreByName = async () => {
      const { data, error } = await supabase
        .from('lojas')
        .select('id,name')
        .eq('active', true)

      if (!active) return
      if (error) {
        if (import.meta.env.DEV) console.warn('Store fallback resolution failed:', error)
        setFallbackStoreId('')
        return
      }

      const clientNameSlug = slugify(client.name)
      const clientSlugValue = client.slug ? slugify(client.slug) : clientNameSlug
      const matchedStore = (data || []).find((store) => {
        const storeSlug = slugify(store.name || '')
        return storeSlug === clientNameSlug || storeSlug === clientSlugValue
      })

      setFallbackStoreId(matchedStore?.id || '')
    }

    void resolveStoreByName()

    return () => {
      active = false
    }
  }, [client])

  useEffect(() => {
    if (!client?.slug || isPmrSchedulableVisitNumber(visitNum)) return
    const normalizedVisit = visitNum < 1 ? 1 : 8
    toast.info('PMR opera com visitas de 1 a 7 e acompanhamento mensal. Redirecionando para a etapa válida.')
    navigate(`/consultoria/clientes/${client.slug}/visitas/${normalizedVisit}`, { replace: true })
  }, [client?.slug, navigate, visitNum])

  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [feedbackClient, setFeedbackClient] = useState('')
  const [nextCycleGoal, setNextCycleGoal] = useState('')
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false)
  const [attachments, setAttachments] = useState<ConsultingVisitAttachment[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [analysisPeriodPreset, setAnalysisPeriodPreset] = useState<VisitAnalysisPeriodPreset>('custom')
  const [analysisPeriodStart, setAnalysisPeriodStart] = useState('')
  const [analysisPeriodEnd, setAnalysisPeriodEnd] = useState('')

  const [headerBase, setHeaderBase] = useState<VisitHeaderBaseData>({
    meta_mensal: '', projecao: '', leads_mes: '', estoque_disponivel: '',
    consultant_name: '', visit_date: new Date().toISOString().split('T')[0],
    tempo: '1 DIA', alvo: 'Todos'
  })

  useEffect(() => {
    setAnalysisPeriodPreset((visit?.analysis_period_preset as VisitAnalysisPeriodPreset | null) || 'custom')
    setAnalysisPeriodStart(visit?.analysis_period_start || '')
    setAnalysisPeriodEnd(visit?.analysis_period_end || '')
  }, [visit?.analysis_period_end, visit?.analysis_period_preset, visit?.analysis_period_start])

  const handleAnalysisPeriodPresetChange = (preset: VisitAnalysisPeriodPreset) => {
    setAnalysisPeriodPreset(preset)
    if (preset === 'custom') return
    const period = getVisitAnalysisPeriodFromPreset(preset)
    setAnalysisPeriodStart(period.start)
    setAnalysisPeriodEnd(period.end)
  }

  const [quantData, setQuantData] = useState<VisitOneQuantData>(DEFAULT_VISIT_ONE_QUANT_DATA)

  useEffect(() => {
    if (visit) {
      setChecklist(visit.checklist_data || [])
      setExecutiveSummary(visit.executive_summary || '')
      setFeedbackClient(visit.feedback_client || '')
      setNextCycleGoal(visit.next_cycle_goal || '')
      setAttachments(visit.attachments || [])
      setHeaderBase({
        meta_mensal: visit.meta_mensal || '',
        projecao: visit.projecao || '',
        leads_mes: visit.leads_mes || '',
        estoque_disponivel: visit.estoque_disponivel || '',
        consultant_name: (visit as VisitDraftPayload).consultant_name_manual || profile?.name || '',
        visit_date: (visit as VisitDraftPayload).effective_visit_date || new Date().toISOString().split('T')[0],
        tempo: step?.duration || '1 DIA',
        alvo: step?.target || 'Todos'
      })
      if (isVisitOneQuantData(visit.quant_data)) setQuantData(visit.quant_data)
    } else if (step) {
      setChecklist((step.checklist_template || []).map(item => ({
        task: typeof item === 'string' ? item : isChecklistItem(item) ? item.task : '',
        completed: isChecklistItem(item) ? item.completed : false
      })))
      setHeaderBase(prev => ({ ...prev, consultant_name: profile?.name || '', tempo: step.duration || '1 DIA', alvo: step.target || 'Todos' }))
    }
  }, [visit?.id, step?.id, profile?.name])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const executeDeleteAttachment = async (file: ConsultingVisitAttachment) => {
    try {
      await supabase.storage.from('evidencias-consultoria').remove([file.storage_path])
      await supabase.from('evidencias_visita').delete().eq('id', file.id)
      toast.success('Evidência removida!'); refetch()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleDeleteAttachment = (file: ConsultingVisitAttachment) => {
    toast.warning('Excluir evidência da visita?', {
      description: file.filename,
      duration: 12000,
      action: {
        label: 'Excluir',
        onClick: () => void executeDeleteAttachment(file),
      },
    })
  }

  const handleOpenAttachment = async (file: ConsultingVisitAttachment) => {
    try {
      await openEvidenceAttachment(file)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleDownloadAttachment = async (file: ConsultingVisitAttachment) => {
    try {
      await downloadEvidenceAttachment(file)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleToggleCheck = (index: number) => {
    const newList = [...checklist]; newList[index].completed = !newList[index].completed
    setChecklist(newList)
  }

  const hasRequiredEvidence = useMemo(() => {
    if (!step?.evidence_required) return true
    return (attachments || []).length > 0
  }, [step?.evidence_required, attachments])

  const buildVisitPayload = (): VisitDraftPayload => {
    const hasValidAnalysisPeriod = isValidVisitAnalysisPeriod(analysisPeriodStart, analysisPeriodEnd)
    return {
      client_id: clientId, visit_number: visitNum, checklist_data: checklist,
      executive_summary: executiveSummary, feedback_client: feedbackClient,
      status: 'em_andamento',
      meta_mensal: headerBase.meta_mensal, projecao: headerBase.projecao,
      leads_mes: headerBase.leads_mes, estoque_disponivel: headerBase.estoque_disponivel,
      analysis_period_start: hasValidAnalysisPeriod ? analysisPeriodStart : null,
      analysis_period_end: hasValidAnalysisPeriod ? analysisPeriodEnd : null,
      analysis_period_preset: hasValidAnalysisPeriod ? analysisPeriodPreset : null,
      consultant_name_manual: headerBase.consultant_name,
      effective_visit_date: headerBase.visit_date, quant_data: quantData,
      next_cycle_goal: nextCycleGoal
    }
  }

  const stripUnsupportedVisitColumns = (payload: VisitDraftPayload): VisitDraftPayload => {
    const legacyPayload = { ...payload }
    delete legacyPayload.consultant_name_manual
    delete legacyPayload.effective_visit_date
    delete legacyPayload.acknowledged_at
    delete legacyPayload.acknowledged_by
    delete legacyPayload.next_cycle_goal
    delete legacyPayload.analysis_period_start
    delete legacyPayload.analysis_period_end
    delete legacyPayload.analysis_period_preset
    delete legacyPayload.quant_data
    return legacyPayload
  }

  const persistVisitPayload = async (payload: VisitDraftPayload) => {
    if (!clientId) throw new Error('Cliente não identificado para salvar a visita.')

    let savedVisitId = visit?.id
    if (!savedVisitId) {
      const { data: existingVisit, error: existingError } = await supabase
        .from('visitas_consultoria')
        .select('id')
        .eq('client_id', clientId)
        .eq('visit_number', visitNum)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existingError) throw existingError
      savedVisitId = existingVisit?.id
    }

    if (savedVisitId) {
      const { data: updatedVisit, error: updateError } = await supabase
        .from('visitas_consultoria')
        .update(payload)
        .eq('id', savedVisitId)
        .select('id')
        .single()
      if (updateError) throw updateError
      return updatedVisit?.id || savedVisitId
    }

    const scheduledAt = headerBase.visit_date || new Date().toISOString().slice(0, 10)
    const { data: insertedVisit, error: insertError } = await supabase
      .from('visitas_consultoria')
      .insert({ ...payload, scheduled_at: scheduledAt })
      .select('id')
      .single()
    if (insertError) throw insertError
    return insertedVisit?.id
  }

  const saveVisitDraft = async () => {
    const payload = buildVisitPayload()
    let savedVisitId: string | undefined
    try {
      savedVisitId = await persistVisitPayload(payload)
    } catch (error) {
      const shouldRetryLegacyPayload =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === 'PGRST204'

      if (!shouldRetryLegacyPayload) throw error
      if (import.meta.env.DEV) console.warn('Schema mismatch detected, retrying without extended fields...')
      savedVisitId = await persistVisitPayload(stripUnsupportedVisitColumns(payload))
    }

    if (!savedVisitId) throw new Error('Visita salva, mas não foi possível confirmar o identificador.')
    return savedVisitId
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !clientId) return
    setIsUploading(true)
    try {
      const visitId = visit?.id || await saveVisitDraft()
      const uploadedAttachments: ConsultingVisitAttachment[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const filePath = `${clientId}/visita-${visitNum}/${Math.random().toString(36).substring(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('evidencias-consultoria').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: evidence, error: evidenceError } = await supabase.from('evidencias_visita').insert({
          visita_id: visitId,
          tipo: file.type.startsWith('image/') ? 'foto' : 'anexo',
          nome_arquivo: file.name,
          caminho_storage: filePath,
          content_type: file.type || 'application/octet-stream',
          tamanho_bytes: file.size,
          enviado_por: profile?.id || null,
        }).select('id, nome_arquivo, tipo, caminho_storage, content_type, tamanho_bytes, created_at').single()
        if (evidenceError) throw evidenceError
        if (evidence) {
          uploadedAttachments.push({
            id: evidence.id,
            filename: evidence.nome_arquivo || evidence.tipo || 'evidencia',
            storage_path: evidence.caminho_storage,
            content_type: evidence.content_type,
            size_bytes: evidence.tamanho_bytes || 0,
            uploaded_at: evidence.created_at,
          })
        }
      }
      if (uploadedAttachments.length) {
        setAttachments(prev => [...prev, ...uploadedAttachments])
      }
      toast.success('Evidências anexadas!')
      refetch()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async (complete: boolean = false) => {
    if (!clientId || !visitNum) return
    if (!isPmrSchedulableVisitNumber(visitNum)) {
      toast.error('O PMR trabalha com visitas de 1 a 7 e acompanhamento mensal.')
      return
    }
    if (isUploading) {
      toast.error('Aguarde o upload das evidências terminar.')
      return
    }
    if (!isValidVisitAnalysisPeriod(analysisPeriodStart, analysisPeriodEnd)) {
      toast.error('Informe um período de análise válido.')
      return
    }

    if (complete && !hasRequiredEvidence) {
      toast.error(`Evidência Obrigatória: Esta etapa exige o upload de: ${step?.evidence_required}`, {
        duration: 5000,
        description: 'Por favor, adicione um anexo antes de concluir.'
      })
      return
    }

    setIsSaving(true)
    try {
      const savedVisitId = await saveVisitDraft()

      if (complete) {
        const { error: completeError } = await supabase.rpc('concluir_visita_consultoria', { p_visita_id: savedVisitId })
        if (completeError) throw completeError
      }

      toast.success(complete ? 'Etapa Concluída com Sucesso!' : 'Progresso salvo'); refetch()
      if (complete) navigate(`/consultoria/clientes/${client?.slug}`)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      toast.error('Erro ao salvar: ' + getErrorMessage(err))
    } finally { setIsSaving(false) }
  }

  const handleAcknowledge = async () => {
    if (!visit?.id) return
    try {
      const { error } = await supabase.from('visitas_consultoria').update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: profile?.id
      }).eq('id', visit.id)

      if (error && (error.code === 'PGRST204' || error.message.includes('acknowledged_at'))) {
         toast.error('Sistema em atualização: Coluna de assinatura ainda não disponível no banco de dados.')
         return
      }

      if (error) throw error
      toast.success('Visita assinada/confirmada pelo gestor!')

      try {
        supabase.functions.invoke('send-visit-report', {
          body: { visitId: visit.id }
        })
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Silent fail on email trigger:', e)
      }

      refetch()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const buildLocalGroupSummary = () => {
    const completedTasks = checklist.filter(t => t.completed).map(t => t.task)
    const pendingTasks = checklist.filter(t => !t.completed).map(t => t.task)

    return formatVisitDraftForGroup({
      draft: executiveSummary,
      clientName: client?.name,
      visitNumber: visitNum,
      objective: step?.objective,
      visitDate: headerBase.visit_date,
      consultantName: headerBase.consultant_name,
      modality: visit?.modality || 'Online',
      completedTasks,
      pendingTasks,
      feedbackClient,
      nextCycleGoal
    })
  }

  const handleGenerateAISummary = async () => {
    if (isGeneratingAiSummary) return

    const completedTasks = checklist.filter(t => t.completed).map(t => t.task)
    const pendingTasks = checklist.filter(t => !t.completed).map(t => t.task)
    setIsGeneratingAiSummary(true)

    try {
      const { data, error } = await supabase.functions.invoke<{
        success?: boolean
        text?: string
        model?: string
        fallbackUsed?: boolean
        dailyUsage?: { used: number; limit: number; date: string }
        error?: string
      }>('openrouter-generate', {
        body: {
          mode: 'visit_group_summary',
          draft: executiveSummary,
          clientName: client?.name,
          visitNumber: visitNum,
          objective: step?.objective,
          visitDate: headerBase.visit_date,
          consultantName: headerBase.consultant_name,
          modality: visit?.modality || 'Online',
          completedTasks,
          pendingTasks,
          feedbackClient,
          nextCycleGoal,
        },
      })

      if (error || !data?.success || !data.text) {
        throw new Error(error?.message || data?.error || 'IA indisponível')
      }

      setExecutiveSummary(data.text)
      const usage = data.dailyUsage ? ` (${data.dailyUsage.used}/${data.dailyUsage.limit})` : ''
      toast.success(data.fallbackUsed ? `Resumo gerado com OpenRouter fallback${usage}` : `Resumo gerado com OpenRouter Free${usage}`)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('AI summary fallback:', err)
      setExecutiveSummary(buildLocalGroupSummary())
      toast.warning('OpenRouter indisponível. Resumo local gerado para revisão.')
    } finally {
      setIsGeneratingAiSummary(false)
    }
  }

  const generateReportText = () => {
    return buildExecutiveVisitReport({
      clientName: client?.name,
      visitNumber: visitNum,
      objective: step?.objective,
      consultantName: headerBase.consultant_name,
      visitDate: headerBase.visit_date,
      analysisPeriodPreset,
      analysisPeriodStart,
      analysisPeriodEnd,
      monthlyGoal: headerBase.meta_mensal,
      projection: headerBase.projecao,
      leads: headerBase.leads_mes,
      inventory: headerBase.estoque_disponivel,
      executiveSummary,
      feedbackClient,
      nextCycleGoal,
      checklist,
      attachments,
    })
  }

  const handleDownloadPDF = async () => {
    const element = document.getElementById('report-template-render')
    if (!element) return

    const opt = {
      margin: 0,
      filename: `Relatorio-Visita-${visitNum}-${client?.slug || 'cliente'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as const

    try {
      toast.loading('Gerando PDF Oficial...')
      await downloadHtmlAsPdf(element, opt)
      toast.success('Relatório gerado com sucesso!')
    } catch (err) {
      toast.error('Erro ao gerar PDF')
      console.error(err)
    }
  }

  if (clientLoading || methodologyLoading) return <div className="flex w-full items-center justify-center p-mx-20"><Loader2 className="w-mx-8 h-mx-8 animate-spin text-brand-primary" /></div>

  if (!client) return <div className="p-mx-20 text-center opacity-50"><Typography variant="h3">Cliente não localizado.</Typography></div>

  return (
    <div className="w-full pb-mx-xl relative z-0">
      <div className="fixed !-left-full top-mx-0 overflow-hidden pointer-events-none" aria-hidden="true">
         <div id="report-template-render">
            <VisitReportTemplate
              client={client}
              visit={visit ? { ...visit, next_cycle_goal: nextCycleGoal, attachments } : {
                id: '',
                client_id: clientId || '',
                visit_number: visitNum,
                scheduled_at: new Date().toISOString(),
                duration_hours: 1,
                modality: 'Online',
                status: 'em_andamento',
                consultant_id: profile?.id || null,
                auxiliary_consultant_id: null,
                objective: step?.objective || null,
                analysis_period_start: analysisPeriodStart || null,
                analysis_period_end: analysisPeriodEnd || null,
                analysis_period_preset: analysisPeriodStart && analysisPeriodEnd ? analysisPeriodPreset : null,
                checklist_data: checklist,
                feedback_client: feedbackClient,
                executive_summary: executiveSummary,
                google_event_id: null,
                meta_mensal: headerBase.meta_mensal,
                projecao: headerBase.projecao,
                leads_mes: headerBase.leads_mes,
                estoque_disponivel: headerBase.estoque_disponivel,
                next_cycle_goal: nextCycleGoal,
                attachments,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }}
              headerBase={headerBase}
              quantData={quantData}
            />
         </div>
      </div>

      <div className="sticky top-mx-0 z-40 bg-surface-alt/80 backdrop-blur-xl px-mx-md py-mx-sm flex flex-col md:flex-row md:items-center justify-between gap-mx-sm mb-mx-md print:hidden border-b border-border-subtle shadow-mx-md transition-all">
        <div className="flex items-center gap-mx-md">
          <Link to={`/consultoria/clientes/${client?.slug}`} className="p-mx-xs border border-border-subtle rounded-mx-xl hover:bg-white hover:shadow-mx-md transition-all text-text-secondary bg-white/50 backdrop-blur-sm shadow-mx-sm group">
            <ArrowLeft className="w-mx-5 h-mx-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-mx-sm">
               <Typography variant="h1" className="text-2xl font-black text-black tracking-tighter uppercase">{getPmrVisitDisplayLabel(visitNum)}</Typography>
               <div className={cn(
                 "px-mx-sm py-0.5 rounded-mx-full text-mx-nano font-black tracking-mx-widest uppercase shadow-mx-sm border",
                 visit?.status === 'concluida' ? "bg-status-success/10 text-status-success border-status-success/20" : "bg-mx-orange-500/10 text-mx-orange-600 border-mx-orange-200 animate-pulse"
               )}>
                 {visit?.status || 'EM ABERTO'}
               </div>
            </div>
            <Typography variant="tiny" tone="muted" className="font-black tracking-mx-widest uppercase opacity-70 flex items-center gap-mx-xs mt-0.5">
              <Target size={12} className="text-brand-primary" />
              {step?.objective}
            </Typography>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-mx-sm w-full md:flex md:items-center md:w-auto">
          <Button variant="outline" className="w-full md:w-auto h-mx-11 text-xs font-black bg-white shadow-mx-sm uppercase tracking-mx-widest px-mx-sm md:px-mx-md border-border-default hover:bg-surface-alt transition-all" onClick={() => handleSave(false)} loading={isSaving}>SALVAR</Button>
          <div className="relative min-w-0">
            <Button
              variant="primary"
              className={cn("w-full md:w-auto h-mx-11 text-[10px] sm:text-xs font-black shadow-mx-lg transition-all uppercase tracking-mx-widest px-mx-sm md:px-mx-lg hover:translate-y-[-2px] active:translate-y-0", !hasRequiredEvidence ? "bg-status-error/20 text-status-error border-status-error/30" : "bg-gradient-to-r from-brand-primary to-brand-primary/80 border-none")}
              onClick={() => handleSave(true)}
              loading={isSaving}
              icon={!hasRequiredEvidence ? <AlertCircle className="w-mx-4 h-mx-4" /> : <CheckCircle2 className="w-mx-4 h-mx-4" />}
            >
              CONCLUIR VISITA
            </Button>
            {!hasRequiredEvidence && step?.evidence_required && (
              <span className="absolute -top-1 right-mx-0 flex h-mx-4 w-mx-4 animate-pulse">
                <span className="relative inline-flex rounded-mx-full h-mx-4 w-mx-4 bg-status-error items-center justify-center text-mx-micro text-white font-black">!</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-mx-md lg:px-mx-xl grid grid-cols-1 lg:grid-cols-3 gap-mx-lg print:block print:p-0">

        <div className="lg:col-span-2 space-y-mx-lg">

          <div className="rounded-mx-2xl border border-border-default bg-white p-mx-md shadow-mx-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-mx-sm">
              {VISIT_FLOW_STEPS.map((item, index) => (
                <div key={item} className="min-h-mx-14 rounded-mx-xl border border-border-subtle bg-surface-alt/40 px-mx-sm py-mx-xs">
                  <Typography variant="tiny" tone="muted" className="block font-black uppercase tracking-mx-widest">{String(index + 1).padStart(2, '0')}</Typography>
                  <Typography variant="p" className="text-xs font-black uppercase leading-tight text-black">{item}</Typography>
                </div>
              ))}
            </div>
          </div>

          <VisitHeaderBase
            data={headerBase}
            onChange={(u) => setHeaderBase(prev => ({ ...prev, ...u }))}
            clientName={client.name}
          />

          <Card className="p-mx-lg border border-border-default shadow-mx-md rounded-mx-2xl bg-white overflow-hidden">
            <div className="flex flex-col gap-mx-md">
              <div className="flex items-center gap-mx-sm border-b border-border-subtle pb-mx-md">
                <div className="p-mx-xs bg-brand-primary/10 rounded-mx-lg text-brand-primary"><Calendar size={20} /></div>
                <div>
                  <Typography variant="h3" className="text-lg uppercase font-black tracking-widest">Periodo de Analise</Typography>
                  <Typography variant="tiny" tone="muted" className="font-bold uppercase tracking-mx-widest">
                    Define o recorte usado na conversa e no relatorio
                  </Typography>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-mx-md">
                <Select
                  label="Recorte"
                  value={analysisPeriodPreset}
                  onChange={(event) => handleAnalysisPeriodPresetChange(event.target.value as VisitAnalysisPeriodPreset)}
                >
                  {VISIT_ANALYSIS_PERIOD_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                  ))}
                </Select>
                <div className="space-y-mx-xs">
                  <Typography as="label" variant="caption" className="font-black uppercase tracking-widest">Inicio</Typography>
                  <DatePicker
                    value={analysisPeriodStart}
                    onChange={(event) => {
                      setAnalysisPeriodPreset('custom')
                      setAnalysisPeriodStart(event.target.value)
                    }}
                  />
                </div>
                <div className="space-y-mx-xs">
                  <Typography as="label" variant="caption" className="font-black uppercase tracking-widest">Fim</Typography>
                  <DatePicker
                    value={analysisPeriodEnd}
                    onChange={(event) => {
                      setAnalysisPeriodPreset('custom')
                      setAnalysisPeriodEnd(event.target.value)
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-mx-lg border border-border-default shadow-mx-md rounded-mx-2xl bg-white overflow-hidden">
             <div className="flex items-center gap-mx-sm mb-mx-lg border-b border-border-subtle pb-mx-md">
                <div className="p-mx-xs bg-brand-primary/10 rounded-mx-lg text-brand-primary"><ClipboardCheck size={20} /></div>
                <Typography variant="h3" className="text-lg uppercase font-black tracking-widest">Execução Metodológica</Typography>
             </div>

             {visitNum === 1 && <VisitOneHighFidelity clientId={clientId!} clientSlug={clientSlug!} data={quantData} onChange={setQuantData} />}
             {visitNum === 2 && <VisitTwoExecution clientId={clientId!} clientSlug={clientSlug!} />}
             {visitNum === 3 && <VisitThreeExecution />}
             {visitNum === 4 && <VisitFourExecution storeId={resolvedStoreId} onGenerateSummary={(t) => setExecutiveSummary(prev => prev + '\n' + t)} />}
             {visitNum === 5 && <VisitFiveExecution storeId={resolvedStoreId} onGenerateSummary={(t) => setExecutiveSummary(prev => prev + '\n' + t)} />}
             {visitNum === 6 && <VisitSixExecution onGenerateSummary={(t) => setExecutiveSummary(prev => prev + '\n' + t)} />}
             {visitNum === 7 && <VisitSevenExecution onGenerateSummary={(t) => setExecutiveSummary(prev => prev + '\n' + t)} />}
             {visitNum === 8 && <VisitEightExecution onGenerateSummary={(t) => setExecutiveSummary(prev => prev + '\n' + t)} />}

             <div className="mt-mx-lg pt-mx-lg border-t border-border-subtle">
                <Typography variant="tiny" tone="muted" className="mb-mx-sm block font-black tracking-mx-widest uppercase">Checklist de Tarefas</Typography>
                <VisitChecklist items={checklist} onToggle={handleToggleCheck} />
             </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
            <Card className="p-mx-lg border border-border-default shadow-mx-lg rounded-mx-2xl bg-white relative overflow-hidden group">
              <div className="absolute top-mx-0 right-mx-0 p-mx-md opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none text-brand-primary">
                <FileText size={120} />
              </div>
              <div className="flex items-center justify-between mb-mx-md relative z-10">
                <div className="flex items-center gap-mx-sm">
                  <div className="p-mx-xs bg-brand-primary/10 rounded-mx-lg text-brand-primary"><FileText size={20} /></div>
                  <Typography variant="h3" className="text-lg uppercase font-black tracking-mx-widest">Relato Executivo (CRM)</Typography>
                </div>
                <Button size="xs" variant="outline" className="h-mx-9 border-brand-primary/30 text-brand-primary font-black uppercase text-mx-tiny tracking-mx-widest px-mx-md hover:bg-brand-primary hover:text-white transition-all shadow-mx-sm" onClick={handleGenerateAISummary} disabled={isGeneratingAiSummary} icon={isGeneratingAiSummary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}>RESUMIR PARA GRUPO</Button>
              </div>
              <Textarea
                id="visit-executive-summary"
                name="executive_summary"
                aria-label="Relato executivo da visita"
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                placeholder="Insira o rascunho da visita. Depois clique em RESUMIR PARA GRUPO para deixar a mensagem pronta para enviar..."
                className="min-h-mx-64 text-sm bg-surface-alt/20 border-border-default focus:border-brand-primary focus:bg-white rounded-mx-xl p-mx-md shadow-mx-inner resize-none transition-all mb-mx-md font-medium leading-relaxed relative z-10"
              />
              <div className="relative z-10">
                <VisitActionQuickAdd clientId={clientId!} visitNumber={visitNum} />
              </div>
            </Card>

            <div className="space-y-mx-lg">
              <Card className="p-mx-lg border border-border-default shadow-mx-lg rounded-mx-2xl bg-white relative overflow-hidden group">
                <div className="absolute top-mx-0 right-mx-0 p-mx-md opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none text-brand-secondary">
                  <MessageSquare size={100} />
                </div>
                <div className="flex items-center gap-mx-sm mb-mx-md relative z-10">
                  <div className="p-mx-xs bg-brand-secondary/10 rounded-mx-lg text-brand-secondary"><MessageSquare size={20} /></div>
                  <Typography variant="h3" className="text-lg uppercase font-black tracking-mx-widest">Devolutiva ao Cliente</Typography>
                </div>
                <Textarea
                  id="visit-feedback-client"
                  name="feedback_client"
                  aria-label="Devolutiva ao cliente"
                  value={feedbackClient}
                  onChange={(e) => setFeedbackClient(e.target.value)}
                  placeholder="Pontos de atenção emergenciais..."
                  className="min-h-mx-32 text-sm bg-surface-alt/20 border-border-default focus:border-brand-secondary focus:bg-white rounded-mx-xl p-mx-md shadow-mx-inner resize-none transition-all font-medium leading-relaxed relative z-10"
                />
              </Card>

              <Card className="p-mx-lg border border-border-default shadow-mx-lg rounded-mx-2xl bg-gradient-to-br from-white to-surface-alt relative overflow-hidden group">
                <div className="absolute top-mx-0 right-mx-0 p-mx-md opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none text-mx-orange-500">
                  <Target size={100} />
                </div>
                <div className="flex items-center gap-mx-sm mb-mx-md relative z-10">
                  <div className="p-mx-xs bg-mx-orange-500/10 rounded-mx-lg text-mx-orange-500"><Target size={20} /></div>
                  <Typography variant="h3" className="text-lg uppercase font-black tracking-mx-widest text-mx-orange-600">Objetivo Próximo Ciclo</Typography>
                </div>
                <Textarea
                  id="visit-next-cycle-goal"
                  name="next_cycle_goal"
                  aria-label="Objetivo do próximo ciclo"
                  value={nextCycleGoal}
                  onChange={(e) => setNextCycleGoal(e.target.value)}
                  placeholder="O que deve ser o foco da loja até a próxima visita da consultoria?"
                  className="min-h-mx-32 text-sm bg-surface-alt/20 border-border-default focus:border-mx-orange-500 focus:bg-white rounded-mx-xl p-mx-md shadow-mx-inner resize-none transition-all font-bold leading-relaxed relative z-10 text-mx-orange-700"
                />
              </Card>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-mx-lg print:hidden">
          <Card className="p-mx-lg border border-border-default shadow-mx-md rounded-mx-2xl bg-white overflow-hidden relative">
            <div className="absolute top-mx-0 right-mx-0 p-mx-md opacity-mx-5"><Info size={80} /></div>
            <Typography variant="tiny" tone="muted" className="mb-mx-md block tracking-mx-widest uppercase font-black">Informações da Etapa</Typography>
            <div className="space-y-mx-md">
              <div className="p-mx-md bg-surface-alt rounded-mx-xl border border-border-subtle">
                <Typography variant="tiny" tone="muted" className="uppercase font-black text-mx-micro mb-1">Participantes</Typography>
                <Typography variant="p" className="text-sm font-bold text-black">{step?.target || 'Todos'}</Typography>
              </div>
              <div className="p-mx-md bg-surface-alt rounded-mx-xl border border-border-subtle">
                <Typography variant="tiny" tone="muted" className="uppercase font-black text-mx-micro mb-1">Duração Estimada</Typography>
                <div className="flex items-center gap-mx-xs">
                   <Clock className="w-mx-4 h-mx-4 text-text-tertiary" />
                   <Typography variant="p" className="text-sm font-bold text-black">{step?.duration || '4 horas'}</Typography>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-mx-lg border border-border-default shadow-mx-md rounded-mx-2xl bg-white">
            <div className="flex items-center justify-between mb-mx-md">
               <Typography variant="tiny" tone="muted" className="tracking-mx-widest text-mx-micro uppercase font-black">Evidências ({attachments.length})</Typography>
               <input aria-label="Selecionar arquivo" id="visit-evidence-upload" name="visit_evidence_upload" type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" />
               <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} loading={isUploading} className="h-mx-10 font-black uppercase text-xs tracking-widest px-mx-md shadow-mx-sm" icon={<Plus size={14} />}>ADICIONAR</Button>
            </div>

            {attachments.length === 0 ? (
               <div className="p-mx-md border border-dashed border-border-subtle rounded-mx-xl text-center opacity-50">
                  <Paperclip className="w-mx-6 h-mx-6 mx-auto mb-mx-xs text-text-tertiary" />
                  <Typography variant="tiny" className="font-bold uppercase text-mx-micro">Nenhuma evidência anexada.</Typography>
               </div>
            ) : (
               <div className="space-y-mx-md">
                  {attachments.map(att => (
                     <div key={att.id} className="group p-mx-xs bg-surface-alt rounded-mx-xl border border-border-default flex items-center justify-between hover:bg-white transition-colors shadow-sm">
                        <div className="flex items-center gap-mx-sm min-w-0">
                           <div className="w-mx-10 h-mx-10 rounded-mx-lg bg-white flex items-center justify-center border border-border-subtle shadow-sm shrink-0">
                              {att.content_type?.includes('image') ? <Image className="w-mx-5 h-mx-5 text-brand-primary" /> : <FileText className="w-mx-5 h-mx-5 text-text-tertiary" />}
                           </div>
                           <div className="min-w-0">
                              <Typography variant="p" className="text-xs font-bold truncate max-w-mx-40 text-black">{att.filename}</Typography>
                              <Typography variant="tiny" className="opacity-50 text-mx-micro">{formatFileSize(att.size_bytes)}</Typography>
                           </div>
                        </div>
                        <div className="flex items-center gap-mx-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-mx-8 w-mx-8 text-status-info" onClick={() => handleOpenAttachment(att)} aria-label={`Visualizar ${att.filename}`} icon={<Eye size={14} />} />
                          <Button size="icon" variant="ghost" className="h-mx-8 w-mx-8 text-brand-primary" onClick={() => handleDownloadAttachment(att)} aria-label={`Baixar ${att.filename}`} icon={<Download size={14} />} />
                          <Button size="icon" variant="ghost" className="h-mx-8 w-mx-8 text-status-error" onClick={() => handleDeleteAttachment(att)} aria-label={`Remover ${att.filename}`} icon={<Trash2 size={14} />} />
                        </div>
                     </div>
                  ))}
               </div>
            )}

            {step?.evidence_required && (
               <div className="mt-mx-md p-mx-md bg-status-error/10 border border-status-error/30 rounded-mx-xl flex gap-mx-sm animate-pulse shadow-sm">
                  <ShieldAlert className="w-mx-5 h-mx-5 text-status-error shrink-0" />
                  <div>
                    <Typography variant="tiny" className="text-status-error font-black leading-none uppercase tracking-tighter block mb-0.5">Evidência Obrigatória</Typography>
                    <Typography variant="p" className="text-mx-micro text-status-error font-bold leading-tight uppercase">{step.evidence_required}</Typography>
                  </div>
               </div>
            )}
          </Card>

          <Card className="p-mx-lg bg-white border border-border-default shadow-mx-md rounded-mx-2xl text-center">
             <div className="w-mx-12 h-mx-12 bg-brand-primary/10 rounded-mx-full flex items-center justify-center mx-auto mb-mx-md">
               <Presentation className="w-mx-6 h-mx-6 text-brand-primary" />
             </div>
             <Typography variant="h3" className="text-lg mb-mx-xs uppercase font-black">Reporte Oficial MX</Typography>
             <Typography variant="p" className="text-mx-micro text-text-tertiary mb-mx-lg leading-tight uppercase font-bold tracking-tighter">O relatório compila os dados e o diagnóstico da visita.</Typography>
             <div className="space-y-mx-md">
               <Button className="w-full shadow-mx-lg font-black h-mx-12 uppercase tracking-mx-widest text-xs bg-gradient-to-r from-brand-primary to-brand-primary/90 border-none group relative overflow-hidden" variant="primary" icon={<Eye size={16} className="group-hover:scale-125 transition-transform" />} onClick={() => setShowReportModal(true)}>
                   <span className="relative z-10">VER RELATÓRIO</span>
                   <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>

               {visit?.status === 'concluida' && (
                 <Button
                   className={cn("w-full shadow-mx-md font-black h-mx-11 uppercase tracking-widest text-xs", visit.acknowledged_at ? "bg-status-success/10 text-status-success border-status-success/20 hover:bg-status-success/20" : "")}
                   variant="outline"
                   icon={visit.acknowledged_at ? <ShieldCheck size={14} /> : <Award size={14} />}
                   onClick={handleAcknowledge}
                   disabled={!!visit.acknowledged_at}
                 >
                   {visit.acknowledged_at ? 'VISITA ASSINADA' : 'ASSINAR VISITA'}
                 </Button>
               )}
             </div>
          </Card>
        </div>
      </div>

      <Modal open={showReportModal} onClose={() => setShowReportModal(false)} title="DOCUMENTO DE AUDITORIA">
         <div className="p-mx-md">
            <div className="p-mx-lg bg-surface-alt rounded-mx-2xl font-mono text-xs whitespace-pre-wrap border border-border-subtle max-h-mx-96 overflow-y-auto mb-mx-md">
               <div className="relative z-10 text-text-primary">{generateReportText()}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
               <Button className="h-mx-11 text-sm font-black border-border-default shadow-mx-sm bg-white uppercase tracking-widest" variant="outline" onClick={() => window.print()} icon={<Printer className="w-mx-4 h-mx-4" />}>IMPRIMIR PDF</Button>
               <Button className="h-mx-11 text-sm font-black bg-mx-green-500 hover:bg-mx-green-600 text-white border-none shadow-mx-md uppercase tracking-widest" onClick={() => { const t = encodeURIComponent(generateReportText()); window.open(`https://wa.me/?text=${t}`) }} icon={<Share2 className="w-mx-4 h-mx-4" />}>Enviar WhatsApp</Button>
               <Button variant="secondary" className="h-mx-11 text-sm font-black bg-brand-primary text-white border-none shadow-mx-lg col-span-1 sm:col-span-2 uppercase tracking-widest" onClick={handleDownloadPDF} icon={<Download className="w-mx-4 h-mx-4" />}>BAIXAR PDF OFICIAL (A4)</Button>
            </div>
         </div>
      </Modal>
    </div>
  )
}
