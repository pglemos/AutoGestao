import { useEffect, useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, FileBarChart, FileText, Users, Video, Zap } from 'lucide-react'
import { Modal } from '@/components/organisms/Modal'
import { MxLoadingState, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { CONTENT_TYPES, splitRoles } from './methodology'
import { fetchEncounterEditorData } from './consultoriaMxData'

export function EncounterPreview(props: {
  versionId: string
  visitNumber: number
  productName: string
  onClose: () => void
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchEncounterEditorData>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await fetchEncounterEditorData(props.versionId, props.visitNumber)
      if (!active) return
      setData(result)
      setError(result.error)
    })()
    return () => { active = false }
  }, [props.versionId, props.visitNumber])

  const contentRefs = (data?.contentRefs ?? []).filter(ref => ref.status !== 'arquivado' && ref.visibility !== 'INTERNAL_ONLY')
  const deliverables = (data?.deliverables ?? []).filter(item => item.status !== 'arquivado')
  const evidence = (data?.evidence ?? []).filter(item => item.status !== 'arquivado')
  const actionPlans = (data?.actionPlans ?? []).filter(item => item.status === 'ativo')

  const title = data?.content?.objective
    ? `Encontro ${props.visitNumber}: ${data.content.objective} — ${props.productName}`
    : `Encontro ${props.visitNumber}: ${props.productName}`

  return (
    <Modal open onClose={props.onClose} title={title} description="Prévia do Módulo Dono" size="2xl">
      <div className="space-y-5">
        {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
        <div className="rounded-lg border border-status-warning/30 bg-status-warning-surface px-5 py-2 text-center text-xs font-medium text-status-warning-text">
          PRÉVIA DO MÓDULO DONO — VISUALIZAÇÃO COMO CLIENTE
        </div>
        {!data ? <MxLoadingState label="Carregando prévia" /> : (
          <>
            <PreviewSection icon={BookOpen} title="Objetivo">
              {data.content?.objective ? <p className="text-sm text-foreground">{data.content.objective}</p> : <Empty />}
              {data.content?.reason && <div className="mt-2 text-xs text-muted-foreground"><span className="font-medium">Justificativa: </span>{data.content.reason}</div>}
              {data.content?.expected_result && <div className="mt-2 text-xs text-muted-foreground"><span className="font-medium">Resultado esperado: </span>{data.content.expected_result}</div>}
              {data.content?.client_observation && <div className="mt-2 text-xs text-muted-foreground"><span className="font-medium">Observação: </span>{data.content.client_observation}</div>}
            </PreviewSection>

            {(data.content?.required_participant_roles || data.content?.recommended_participant_roles) && (
              <PreviewSection icon={Users} title="Participantes">
                {data.content?.required_participant_roles && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-foreground">Obrigatórios: </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {splitRoles(data.content.required_participant_roles).map(role => (
                        <span key={role} className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{role}</span>
                      ))}
                    </div>
                  </div>
                )}
                {data.content?.recommended_participant_roles && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Recomendados: </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {splitRoles(data.content.recommended_participant_roles).map(role => (
                        <span key={role} className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-muted-foreground">{role}</span>
                      ))}
                    </div>
                  </div>
                )}
              </PreviewSection>
            )}

            {data.content?.prerequisites && (
              <PreviewSection icon={FileText} title="Pré-requisitos">
                <p className="text-sm text-foreground">{data.content.prerequisites}</p>
              </PreviewSection>
            )}

            <PreviewSection icon={Video} title="Aula e Vídeo">
              {contentRefs.filter(ref => ref.content_type !== 'FILE').length === 0 ? <Empty /> : (
                <div className="space-y-2">
                  {contentRefs.filter(ref => ref.content_type !== 'FILE').map(ref => (
                    <div key={ref.id} className="flex items-center gap-2 rounded-lg bg-surface-alt p-2">
                      <Video size={14} className="text-muted-foreground" />
                      <div>
                        <div className="text-sm text-foreground">{ref.title}</div>
                        {ref.duration_minutes && <div className="text-xs text-muted-foreground">{ref.duration_minutes} min · {CONTENT_TYPES[ref.content_type]?.label ?? ref.content_type}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PreviewSection>

            <PreviewSection icon={FileText} title="Entrega">
              {deliverables.length === 0 ? <Empty /> : (
                <div className="space-y-1.5">
                  {deliverables.map(deliverable => <div key={deliverable.id} className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 size={14} className="text-status-success-text" />{deliverable.title}</div>)}
                </div>
              )}
            </PreviewSection>

            <PreviewSection icon={AlertCircle} title="Evidências">
              {evidence.length === 0 ? <Empty /> : (
                <div className="space-y-1.5">
                  {evidence.map(item => <div key={item.id} className="flex items-center gap-2 text-sm text-foreground"><AlertCircle size={14} className="text-status-info-text" />{item.name}</div>)}
                </div>
              )}
            </PreviewSection>

            <PreviewSection icon={FileText} title="Arquivos">
              {contentRefs.filter(ref => ref.content_type === 'FILE').length === 0 ? <Empty /> : (
                <div className="space-y-1.5">
                  {contentRefs.filter(ref => ref.content_type === 'FILE').map(ref => <div key={ref.id} className="flex items-center gap-2 text-sm text-foreground"><FileText size={14} className="text-status-warning-text" />{ref.title}</div>)}
                </div>
              )}
            </PreviewSection>

            <PreviewSection icon={FileBarChart} title="Relatório">
              {data.reportRef?.report_template_id ? <p className="text-sm text-foreground">{data.reportRef.report_template_name || 'Modelo vinculado'} {data.reportRef.report_required && <span className="text-xs text-status-error-text">(obrigatório)</span>}</p> : <Empty />}
            </PreviewSection>

            {actionPlans.length > 0 && (
              <PreviewSection icon={Zap} title="Planos de Ação">
                <div className="space-y-1.5">
                  {actionPlans.map(ref => <div key={ref.id} className="flex items-center gap-2 text-sm text-foreground"><Zap size={14} className="text-status-warning-text" />{ref.action_plan_template_name}</div>)}
                </div>
              </PreviewSection>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

function PreviewSection({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2"><Icon size={16} className="text-brand-primary" /><h4 className="text-sm font-semibold text-foreground">{title}</h4></div>
      <div className="pl-6">{children}</div>
    </div>
  )
}

function Empty() { return <p className="text-xs text-muted-foreground">Não configurado.</p> }
