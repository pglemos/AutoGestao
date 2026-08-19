export const ROLE_OPTIONS = [
  { value: 'DONO_MASTER', label: 'Dono Master' },
  { value: 'DONO_SOCIO', label: 'Dono / Sócio' },
  { value: 'DIRETOR', label: 'Diretor' },
  { value: 'GERENTE_COMERCIAL', label: 'Gerente Comercial' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'PRODUTO_ESTOQUE', label: 'Produto / Estoque' },
  { value: 'FINANCEIRO_ADMINISTRATIVO', label: 'Financeiro / Administrativo' },
  { value: 'RH', label: 'RH' },
  { value: 'OPERACOES', label: 'Operações' },
];

export const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, r.label]));

export const DECLARED_FUNCTIONS = [
  'Consultor de Vendas',
  'Gerente de Vendas',
  'Gerente Geral',
  'Diretor',
  'Sócio',
];

export const VIEW_OPTIONS = [
  { value: 'DONO', label: 'Dono', requiresRole: ['DONO_MASTER', 'DONO_SOCIO'] },
  { value: 'GERENCIAL', label: 'Gerencial', requiresRole: ['DONO_MASTER', 'DONO_SOCIO', 'DIRETOR', 'GERENTE_COMERCIAL'] },
  { value: 'VENDEDOR', label: 'Vendedor', requiresRole: ['VENDEDOR', 'GERENTE_COMERCIAL', 'DONO_MASTER', 'DONO_SOCIO'] },
  { value: 'DEPARTAMENTAL', label: 'Departamental', requiresRole: ['MARKETING', 'PRODUTO_ESTOQUE', 'FINANCEIRO_ADMINISTRATIVO', 'RH', 'OPERACOES', 'DIRETOR'] },
];

export const ASSIGNMENT_TYPES = [
  { value: 'RESPONSAVEL_PRINCIPAL', label: 'Responsável principal' },
  { value: 'CORRESPONSAVEL', label: 'Corresponsável' },
  { value: 'ACESSO_ADICIONAL', label: 'Acesso adicional' },
  { value: 'USUARIO_OPERACIONAL', label: 'Usuário operacional' },
  { value: 'SUBSTITUICAO_TEMPORARIA', label: 'Substituição temporária' },
];

export const ASSIGNMENT_LABELS = Object.fromEntries(ASSIGNMENT_TYPES.map(a => [a.value, a.label]));

export const USER_STATUS_OPTIONS = [
  { value: 'EM_PREPARACAO', label: 'Em preparação' },
  { value: 'CONVITE_PENDENTE', label: 'Convite pendente' },
  { value: 'CONVIDADO', label: 'Convidado' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'FERIAS', label: 'Férias' },
  { value: 'AFASTADO', label: 'Afastado' },
  { value: 'SUSPENSO', label: 'Suspenso' },
  { value: 'DESATIVADO', label: 'Desativado' },
];

export const USER_STATUS_LABELS = Object.fromEntries(USER_STATUS_OPTIONS.map(s => [s.value, s.label]));