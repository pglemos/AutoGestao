import { useState } from 'react'
import type { ConsultingClientDetail, ConsultingVisit, VisitHeaderBaseData, VisitOneQuantData } from '@/features/consultoria/types'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getPmrVisitDisplayLabel } from '@/lib/consultoria/pmr-visit-rules'
import { formatVisitAnalysisPeriodLabel } from '@/lib/consultoria/visit-analysis-period'
import { getSupabaseUrl } from '@/lib/supabase'

const STORAGE_URL = () => `${getSupabaseUrl().replace(/\/$/, '')}/storage/v1/object/evidencias-consultoria/`

function EvidenceImage({ src, alt, style }: { src: string; alt: string; style: React.CSSProperties }) {
  const [erro, setErro] = useState(false)
  if (erro) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '12px', fontWeight: 700 }}>Falha ao carregar imagem</div>
  return <img src={src} alt={alt} style={style} crossOrigin="anonymous" onError={() => setErro(true)} />
}

interface Props {
  client: ConsultingClientDetail
  visit: ConsultingVisit
  headerBase: VisitHeaderBaseData
  quantData?: VisitOneQuantData
}

export function VisitReportTemplate({ client, visit, headerBase, quantData }: Props) {
  const visitDateRaw = headerBase.visit_date || visit.scheduled_at || new Date().toISOString()
  const visitDate = new Date(visitDateRaw)
  const attachments = visit.attachments || []
  const imageAttachments = attachments.filter((att) => att.content_type?.includes('image') && att.storage_path)
  const documentAttachments = attachments.filter((att) => !att.content_type?.includes('image') || !att.storage_path)
  const visitLabel = getPmrVisitDisplayLabel(visit.visit_number)
  const analysisPeriodLabel = formatVisitAnalysisPeriodLabel({
    preset: visit.analysis_period_preset,
    start: visit.analysis_period_start,
    end: visit.analysis_period_end,
  })
  
  const formattedDate = !isNaN(visitDate.getTime()) 
    ? format(visitDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Data não informada'

  // Estilos inline para máxima compatibilidade com html2canvas (evitando oklab)
  const colors = {
    primary: '#071822',
    secondary: '#00A89D',
    warning: '#FACC15',
    danger: '#EF4343',
    textMuted: '#6B7280',
    bgLight: '#F9FAFB',
    border: '#DFE0E1'
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '40px', width: '210mm', minHeight: '297mm', margin: '0 auto', color: '#000000', fontFamily: 'sans-serif' }}>
      {/* Header com Logo */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${colors.primary}`, paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <img src="/mx-logo.png" alt="MX Performance" style={{ height: '48px', marginBottom: '8px' }} />
          <div style={{ fontSize: '10px', color: colors.primary, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Sistema de Gestão de Alta Performance
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: colors.primary, margin: 0 }}>RELATÓRIO DE AUDITORIA</h3>
          <div style={{ display: 'inline-block', backgroundColor: colors.primary, color: '#FFFFFF', padding: '4px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold', marginTop: '8px' }}>
            {visitLabel.toUpperCase()}
          </div>
        </div>
      </header>

      {/* Dados do Cliente */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px', backgroundColor: colors.bgLight, padding: '24px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
        <div>
          <div style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Cliente / Loja</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#000000' }}>{client.name.toUpperCase()}</div>
          <div style={{ fontSize: '14px', color: '#333333' }}>{client.legal_name || 'Razão Social não informada'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Data da Auditoria</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000' }}>{formattedDate}</div>
          <div style={{ fontSize: '14px', color: '#333333' }}>Consultor: {headerBase.consultant_name || 'Consultor MX'}</div>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>Periodo analisado: {analysisPeriodLabel}</div>
        </div>
      </section>

      {/* Indicadores de Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
        {[
          { l: 'Meta Mensal', v: headerBase.meta_mensal },
          { l: 'Projeção', v: headerBase.projecao },
          { l: 'Leads no Mês', v: headerBase.leads_mes },
          { l: 'Estoque', v: headerBase.estoque_disponivel }
        ].map(i => (
          <div key={i.l} style={{ border: `1px solid ${colors.border}`, padding: '16px', borderRadius: '12px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>{i.l}</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: colors.primary }}>{i.v || '0'}</div>
          </div>
        ))}
      </div>

      {/* Resumo Executivo */}
      <section style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '6px', height: '24px', backgroundColor: colors.primary, borderRadius: '999px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#000000', margin: 0 }}>Diagnóstico e Relato Executivo</h3>
        </div>
        <div style={{ padding: '24px', border: `1px solid ${colors.border}`, borderRadius: '16px', backgroundColor: '#FFFFFF', minHeight: '150px', whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6', color: '#000000', fontStyle: 'italic', borderStyle: 'dashed' }}>
          {visit.executive_summary || 'Nenhum relato registrado para esta visita.'}
        </div>
      </section>

      {/* Devolutiva Direta */}
      <section style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '6px', height: '24px', backgroundColor: colors.warning, borderRadius: '999px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#000000', margin: 0 }}>Pontos de Atenção e Devolutiva</h3>
        </div>
        <div style={{ padding: '24px', border: `1px solid #FEF08A`, borderRadius: '16px', backgroundColor: '#FEFCE8', fontSize: '14px', lineHeight: '1.6', color: '#000000' }}>
          {visit.feedback_client || 'Nenhum feedback direto registrado.'}
        </div>
      </section>

      {/* Objetivo do Próximo Ciclo */}
      <section style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '6px', height: '24px', backgroundColor: '#F59F0A', borderRadius: '999px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#000000', margin: 0 }}>Objetivo do Próximo Ciclo (30 dias)</h3>
        </div>
        <div style={{ padding: '24px', border: `1px solid #FED7AA`, borderRadius: '16px', backgroundColor: '#FFF7ED', fontSize: '14px', fontWeight: 'bold', lineHeight: '1.6', color: '#000000' }}>
          {visit.next_cycle_goal || 'A ser definido na próxima auditoria.'}
        </div>
      </section>

      {/* Evidências Fotográficas */}
      {attachments.length > 0 && (
        <section style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '6px', height: '24px', backgroundColor: colors.textMuted, borderRadius: '999px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#000000', margin: 0 }}>Evidências da Visita</h3>
          </div>
          {imageAttachments.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {imageAttachments.map((att) => (
                <div key={att.id} style={{ border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
                  <EvidenceImage
                    src={`${STORAGE_URL()}${att.storage_path}`}
                    alt={att.filename}
                    style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '8px', fontSize: '10px', color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: '#FFFFFF' }}>
                    {att.filename}
                  </div>
                </div>
              ))}
            </div>
          )}
          {documentAttachments.length > 0 && (
            <div style={{ marginTop: imageAttachments.length > 0 ? '16px' : 0, display: 'grid', gap: '8px' }}>
              {documentAttachments.map((att) => (
                <div key={att.id} style={{ border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '10px 12px', backgroundColor: '#FFFFFF', fontSize: '11px', color: colors.textMuted, fontWeight: 700 }}>
                  {att.filename}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Assinaturas */}
      <footer style={{ marginTop: '80px', paddingTop: '24px', borderTop: `1px solid ${colors.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px' }}>
        <div style={{ textAlign: 'center', color: '#000000' }}>
          <div style={{ height: '1px', backgroundColor: '#000000', marginBottom: '8px', margin: '0 auto', width: '180px' }} />
          <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>ASSINATURA CONSULTOR</div>
          <div style={{ fontSize: '10px' }}>{headerBase.consultant_name}</div>
        </div>
        <div style={{ textAlign: 'center', color: '#000000' }}>
          <div style={{ height: '1px', backgroundColor: '#000000', marginBottom: '8px', margin: '0 auto', width: '180px' }} />
          <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>ASSINATURA GESTOR DA LOJA</div>
          <div style={{ fontSize: '10px' }}>
            {visit.acknowledged_at ? `Assinado em ${format(new Date(visit.acknowledged_at), 'dd/MM/yyyy HH:mm')}` : '(Pendente de Assinatura)'}
          </div>
        </div>
      </footer>
      
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: colors.textMuted }}>
          Documento gerado eletronicamente via MX PERFORMANCE — A plataforma oficial de gestão preditiva.
        </div>
      </div>
    </div>
  )
}
