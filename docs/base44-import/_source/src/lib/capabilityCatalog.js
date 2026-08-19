// Catálogo oficial de módulos e menus do MX Performance
// Fonte única de verdade para a hierarquia Módulo → Menu

export const RELEASE_STAGE_LABELS = {
  ETAPA_1: 'Etapa 1',
  ETAPA_2: 'Etapa 2',
  ETAPA_3: 'Etapa 3',
  NA_ATIVACAO: 'Na ativação',
  MANUAL: 'Manual',
  A_DEFINIR: 'A definir',
};

export const VISIBILITY_LABELS = {
  ATIVO: 'Ativo',
  EM_BREVE: 'Em breve',
  VISIVEL_BLOQUEADO: 'Visível e bloqueado',
  OCULTO: 'Oculto',
};

export const TECHNICAL_STATUS_LABELS = {
  DISPONIVEL: 'Disponível',
  EM_HOMOLOGACAO: 'Em homologação',
  EM_DESENVOLVIMENTO: 'Em desenvolvimento',
  TEMPORARIAMENTE_INDISPONIVEL: 'Temporariamente indisponível',
};

export const MODULES = [
  {
    code: 'DONO',
    label: 'Módulo Dono',
    menus: [
      { code: 'INICIO', label: 'Início', mandatory: true, releaseStage: 'NA_ATIVACAO', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'ROTINA_DIA', label: 'Rotina do Dia', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'PLANO_ESTRATEGICO', label: 'Plano Estratégico', mandatory: false, releaseStage: 'ETAPA_4', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'PLANO_ACAO', label: 'Plano de Ação', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'CONSULTORIA', label: 'Consultoria', mandatory: true, releaseStage: 'NA_ATIVACAO', visibility: 'VISIVEL_BLOQUEADO', technicalStatus: 'DISPONIVEL' },
      { code: 'MERCADO', label: 'Mercado', mandatory: false, releaseStage: 'ETAPA_4', visibility: 'EM_BREVE', technicalStatus: 'EM_HOMOLOGACAO' },
      { code: 'DEPARTAMENTOS', label: 'Departamentos', mandatory: false, releaseStage: 'ETAPA_4', visibility: 'EM_BREVE', technicalStatus: 'EM_DESENVOLVIMENTO' },
      { code: 'UNIVERSIDADE_MX', label: 'Universidade MX', mandatory: false, releaseStage: 'ETAPA_2', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'FALAR_CONSULTOR', label: 'Falar com Consultor', mandatory: true, releaseStage: 'NA_ATIVACAO', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
    ],
  },
  {
    code: 'GERENTE',
    label: 'Módulo Gerente',
    menus: [
      { code: 'INICIO', label: 'Início', mandatory: true, releaseStage: 'NA_ATIVACAO', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'ROTINA_DIA', label: 'Rotina do Dia', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'FECHAMENTO_DIARIO', label: 'Fechamento Diário', mandatory: false, releaseStage: 'ETAPA_2', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'ROTINA_EQUIPE', label: 'Rotina da Equipe', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'MINHA_EQUIPE', label: 'Minha Equipe', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'META_LOJA', label: 'Meta da Loja', mandatory: false, releaseStage: 'ETAPA_4', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'MENTOR_GERENCIAL', label: 'Mentor Gerencial', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'DESENVOLVIMENTO', label: 'Desenvolvimento', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'EM_BREVE', technicalStatus: 'EM_HOMOLOGACAO' },
      { code: 'RANKING', label: 'Ranking', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'UNIVERSIDADE_MX', label: 'Universidade MX', mandatory: false, releaseStage: 'ETAPA_2', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
    ],
  },
  {
    code: 'VENDEDOR',
    label: 'Módulo Vendedor',
    menus: [
      { code: 'INICIO', label: 'Início', mandatory: true, releaseStage: 'NA_ATIVACAO', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'FECHAMENTO_DIARIO', label: 'Fechamento Diário', mandatory: true, releaseStage: 'ETAPA_2', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'ROTINA_DIA', label: 'Rotina do Dia', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'MENTOR_COMERCIAL', label: 'Mentor Comercial', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'MINHA_META', label: 'Minha Meta', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'RANKING', label: 'Ranking', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'UNIVERSIDADE_MX', label: 'Universidade MX', mandatory: false, releaseStage: 'ETAPA_2', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
      { code: 'DESENVOLVIMENTO', label: 'Desenvolvimento', mandatory: false, releaseStage: 'ETAPA_3', visibility: 'EM_BREVE', technicalStatus: 'EM_HOMOLOGACAO' },
      { code: 'MEU_PERFIL', label: 'Meu Perfil', mandatory: true, releaseStage: 'NA_ATIVACAO', visibility: 'ATIVO', technicalStatus: 'DISPONIVEL' },
    ],
  },
];

// Perfis para a prévia de visualização
export const PREVIEW_PROFILES = [
  { code: 'DONO', label: 'Dono', modules: ['DONO'] },
  { code: 'DIRETOR', label: 'Diretor', modules: ['DONO'] },
  { code: 'GERENTE', label: 'Gerente', modules: ['GERENTE'] },
  { code: 'VENDEDOR', label: 'Vendedor', modules: ['VENDEDOR'] },
  { code: 'DONO_GERENTE', label: 'Dono + Gerente', modules: ['DONO', 'GERENTE'] },
  { code: 'DONO_GERENTE_VENDEDOR', label: 'Dono + Gerente + Vendedor', modules: ['DONO', 'GERENTE', 'VENDEDOR'] },
  { code: 'GERENTE_VENDEDOR', label: 'Gerente + Vendedor', modules: ['GERENTE', 'VENDEDOR'] },
  { code: 'VENDEDOR_DELEGADO', label: 'Vendedor com Delegação Gerencial', modules: ['VENDEDOR', 'GERENTE'] },
];

// Gera a lista plana de referências de capacidade a partir do catálogo
export function buildDefaultCapabilities() {
  const refs = [];
  let order = 0;
  MODULES.forEach(mod => {
    mod.menus.forEach(menu => {
      order += 1;
      refs.push({
        module_code: mod.code,
        module_label: mod.label,
        menu_code: menu.code,
        menu_label: menu.label,
        default_included: true,
        is_mandatory: menu.mandatory,
        default_release_stage: menu.releaseStage,
        default_visibility: menu.visibility,
        technical_status: menu.technicalStatus,
        display_order: order,
      });
    });
  });
  return refs;
}