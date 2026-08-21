export type CapabilityReleaseStage = 'ETAPA_1' | 'ETAPA_2' | 'ETAPA_3' | 'ETAPA_4' | 'NA_ATIVACAO' | 'MANUAL' | 'A_DEFINIR'
export type CapabilityVisibility = 'ATIVO' | 'EM_BREVE' | 'VISIVEL_BLOQUEADO' | 'OCULTO'
export type CapabilityTechnicalStatus = 'DISPONIVEL' | 'EM_HOMOLOGACAO' | 'EM_DESENVOLVIMENTO' | 'TEMPORARIAMENTE_INDISPONIVEL'

export type CapabilityMenu = {
  code: string
  label: string
  mandatory: boolean
  releaseStage: CapabilityReleaseStage
  visibility: CapabilityVisibility
  technicalStatus: CapabilityTechnicalStatus
}

export type CapabilityModule = {
  code: 'DONO' | 'GERENTE' | 'VENDEDOR'
  label: string
  menus: CapabilityMenu[]
}

export type CapabilityReference = CapabilityMenu & {
  moduleCode: CapabilityModule['code']
  moduleLabel: string
  displayOrder: number
  moduleKey: string
}

export const RELEASE_STAGE_LABELS: Record<CapabilityReleaseStage, string> = {
  ETAPA_1: 'Etapa 1',
  ETAPA_2: 'Etapa 2',
  ETAPA_3: 'Etapa 3',
  ETAPA_4: 'Etapa 4',
  NA_ATIVACAO: 'Na ativação',
  MANUAL: 'Manual',
  A_DEFINIR: 'A definir',
}

export const VISIBILITY_LABELS: Record<CapabilityVisibility, string> = {
  ATIVO: 'Ativo',
  EM_BREVE: 'Em breve',
  VISIVEL_BLOQUEADO: 'Visível e bloqueado',
  OCULTO: 'Oculto',
}

export const TECHNICAL_STATUS_LABELS: Record<CapabilityTechnicalStatus, string> = {
  DISPONIVEL: 'Disponível',
  EM_HOMOLOGACAO: 'Em homologação',
  EM_DESENVOLVIMENTO: 'Em desenvolvimento',
  TEMPORARIAMENTE_INDISPONIVEL: 'Temporariamente indisponível',
}

export const CAPABILITY_MODULES: CapabilityModule[] = [
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
]

export type CapabilityPreviewProfile = {
  code: string
  label: string
  modules: string[]
}

export const PREVIEW_PROFILES: CapabilityPreviewProfile[] = [
  { code: 'DONO', label: 'Dono', modules: ['DONO'] },
  { code: 'DIRETOR', label: 'Diretor', modules: ['DONO'] },
  { code: 'GERENTE', label: 'Gerente', modules: ['GERENTE'] },
  { code: 'VENDEDOR', label: 'Vendedor', modules: ['VENDEDOR'] },
  { code: 'DONO_GERENTE', label: 'Dono + Gerente', modules: ['DONO', 'GERENTE'] },
  { code: 'DONO_GERENTE_VENDEDOR', label: 'Dono + Gerente + Vendedor', modules: ['DONO', 'GERENTE', 'VENDEDOR'] },
  { code: 'GERENTE_VENDEDOR', label: 'Gerente + Vendedor', modules: ['GERENTE', 'VENDEDOR'] },
  { code: 'VENDEDOR_DELEGADO', label: 'Vendedor com Delegação Gerencial', modules: ['VENDEDOR', 'GERENTE'] },
]

export function capabilityModuleKey(moduleCode: string, menuCode: string): string {
  return `${moduleCode.toLowerCase()}__${menuCode.toLowerCase()}`
}

export function buildDefaultCapabilities(): CapabilityReference[] {
  let displayOrder = 0
  return CAPABILITY_MODULES.flatMap(module => module.menus.map(menu => {
    displayOrder += 1
    return {
      ...menu,
      moduleCode: module.code,
      moduleLabel: module.label,
      displayOrder,
      moduleKey: capabilityModuleKey(module.code, menu.code),
    }
  }))
}

export function moduleInclusionState(included: number, total: number): 'full' | 'partial' | 'none' {
  if (total > 0 && included === total) return 'full'
  if (included > 0) return 'partial'
  return 'none'
}
