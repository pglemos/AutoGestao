import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ENCOUNTER_INNER_TABS, calculateCompleteness } from '@/lib/consultingMxConstants';
import ObjectiveTab from '@/components/consultingMx/encounter/ObjectiveTab';
import ConsultantGuideTab from '@/components/consultingMx/encounter/ConsultantGuideTab';
import ContentTab from '@/components/consultingMx/encounter/ContentTab';
import DeliverableTab from '@/components/consultingMx/encounter/DeliverableTab';
import EvidenceTab from '@/components/consultingMx/encounter/EvidenceTab';
import FilesTab from '@/components/consultingMx/encounter/FilesTab';
import ReportTab from '@/components/consultingMx/encounter/ReportTab';
import ActionPlansTab from '@/components/consultingMx/encounter/ActionPlansTab';
import { ExternalLink, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EncounterEditor({ encounter, product, methodologyVersion, onAudit, onSummaryUpdate }) {
  const [activeInner, setActiveInner] = useState('objetivo');
  const [content, setContent] = useState(null);
  const [guide, setGuide] = useState(null);
  const [contentRefs, setContentRefs] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [reportRef, setReportRef] = useState(null);
  const [actionPlans, setActionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const mvId = methodologyVersion?.id;
  const encId = encounter.id;

  const loadAll = useCallback(async () => {
    if (!mvId) return;
    const [contents, guides, refs, dels, evs, reportRefs, apRefs] = await Promise.all([
      base44.entities.EncounterMethodologyContent.filter({ methodology_version_id: mvId, encounter_template_id: encId }),
      base44.entities.ConsultantEncounterGuide.filter({ methodology_version_id: mvId, encounter_template_id: encId }),
      base44.entities.EncounterContentReference.filter({ methodology_version_id: mvId, encounter_template_id: encId }),
      base44.entities.EncounterDeliverableTemplate.filter({ methodology_version_id: mvId, encounter_template_id: encId }),
      base44.entities.EncounterEvidenceTemplate.filter({ methodology_version_id: mvId, encounter_template_id: encId }),
      base44.entities.EncounterReportTemplate.filter({ methodology_version_id: mvId, encounter_template_id: encId }),
      base44.entities.EncounterActionPlanReference.filter({ methodology_version_id: mvId, encounter_template_id: encId }),
    ]);
    setContent(contents[0] || null);
    setGuide(guides[0] || null);
    setContentRefs(refs);
    setDeliverables(dels);
    setEvidence(evs);
    setReportRef(reportRefs[0] || null);
    setActionPlans(apRefs);
    setLoading(false);

    const completeness = calculateCompleteness(contents[0], guides[0], dels, evs, reportRefs[0], refs);
    onSummaryUpdate({
      ...completeness,
      checks: {
        objective: !!(contents[0]?.objective?.trim()),
        expectedResult: !!(contents[0]?.expected_result?.trim()),
        guide: !!(guides[0]?.internal_objective?.trim()),
        deliverable: dels.length > 0,
        evidence: evs.length > 0,
        report: !!reportRefs[0]?.report_template_id,
        visibility: contents[0]?.owner_visibility !== undefined,
        contentReviewed: refs.length > 0,
      },
    });
  }, [mvId, encId, onSummaryUpdate]);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="p-4 md:p-6">
      {/* Cabeçalho do encontro */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-white bg-[#198653] px-2 py-0.5 rounded-full">
                {encounter.encounter_number === 0 ? 'Onboarding' : `Encontro ${encounter.encounter_number}`}
              </span>
              <h3 className="font-semibold text-gray-900">{encounter.title}</h3>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap mt-1">
              <span>Produto: <span className="font-medium text-gray-700">{product.name}</span></span>
              <span>v{product.version_number}</span>
              <span>Metodologia: <span className="font-medium text-gray-700">v{methodologyVersion.methodology_version_number}</span></span>
            </div>
          </div>
          <button onClick={() => navigate('/produtos')} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-50">
            <ExternalLink size={12} /> Editar estrutura no Produto
          </button>
        </div>

        {/* Campos estruturais somente leitura */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-50">
          <ReadonlyField label="Modalidade padrão" value={encounter.default_modality?.replace(/_/g, ' ') || '—'} />
          <ReadonlyField label="Duração" value={encounter.duration_hours ? `${encounter.duration_hours}h` : '—'} />
          <ReadonlyField label="Público-alvo" value={encounter.target_audience || '—'} />
          <ReadonlyField label="Ordem" value={encounter.encounter_number} />
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
          <Lock size={11} /> Campos estruturais são editáveis em Produtos de Consultoria
        </div>
      </div>

      {/* Abas internas */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-0.5 bg-white rounded-t-xl border border-gray-100 border-b-0 px-2 pt-2">
        {ENCOUNTER_INNER_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveInner(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${activeInner === tab.id ? 'bg-[#198653] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-xl border border-gray-100 border-t-0 p-4 md:p-5">
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">Carregando...</div>
        ) : (
          <>
            {activeInner === 'objetivo' && <ObjectiveTab content={content} mvId={mvId} encounter={encounter} onSaved={loadAll} onAudit={onAudit} />}
            {activeInner === 'orientacao' && <ConsultantGuideTab guide={guide} mvId={mvId} encounter={encounter} onSaved={loadAll} onAudit={onAudit} />}
            {activeInner === 'aula' && <ContentTab refs={contentRefs.filter(r => r.content_type !== 'FILE')} mvId={mvId} encounter={encounter} product={product} onSaved={loadAll} onAudit={onAudit} />}
            {activeInner === 'entrega' && <DeliverableTab deliverables={deliverables} mvId={mvId} encounter={encounter} onSaved={loadAll} onAudit={onAudit} />}
            {activeInner === 'evidencias' && <EvidenceTab evidence={evidence} mvId={mvId} encounter={encounter} onSaved={loadAll} onAudit={onAudit} />}
            {activeInner === 'arquivos' && <FilesTab refs={contentRefs.filter(r => r.content_type === 'FILE')} mvId={mvId} encounter={encounter} product={product} onSaved={loadAll} onAudit={onAudit} />}
            {activeInner === 'relatorio' && <ReportTab reportRef={reportRef} mvId={mvId} encounter={encounter} onSaved={loadAll} onAudit={onAudit} />}
            {activeInner === 'planos' && <ActionPlansTab actionPlans={actionPlans} mvId={mvId} encounter={encounter} onSaved={loadAll} onAudit={onAudit} />}
          </>
        )}
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-[10px] font-medium text-gray-400 uppercase">{label}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{value}</div>
    </div>
  );
}