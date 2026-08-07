/**
 * Matriz de Permissões RLS (Row Level Security) do Mentor Comercial.
 *
 * Mapeia as regras declaradas na migration `20260807120000_mentor_comercial_motor_v1.sql`
 * para as 8 tabelas de domínio `mentor_*` e `store_commercial_settings`.
 *
 * Estrutura da matriz:
 * Tabela x Perfil x Operação -> Permitido (boolean)
 */

export type MentorTable =
  | 'mentor_status_definitions'
  | 'mentor_cadences'
  | 'mentor_cadence_steps'
  | 'mentor_scripts'
  | 'mentor_transitions'
  | 'mentor_pending_flags'
  | 'mentor_score_snapshots'
  | 'store_commercial_settings';

export type MentorUserProfile =
  | 'vendedor_dono'
  | 'vendedor_outro'
  | 'gerente'
  | 'dono'
  | 'admin'
  | 'area_interna_mx'
  | 'anon';

export type RlsOperation = 'select' | 'insert' | 'update' | 'delete';

export type RlsMatrixPermissions = Record<RlsOperation, boolean>;

export type MentorRlsMatrix = Record<
  MentorTable,
  Record<MentorUserProfile, RlsMatrixPermissions>
>;

export const MENTOR_TABLES: readonly MentorTable[] = [
  'mentor_status_definitions',
  'mentor_cadences',
  'mentor_cadence_steps',
  'mentor_scripts',
  'mentor_transitions',
  'mentor_pending_flags',
  'mentor_score_snapshots',
  'store_commercial_settings',
] as const;

export const CATALOG_TABLES: readonly MentorTable[] = [
  'mentor_status_definitions',
  'mentor_cadences',
  'mentor_cadence_steps',
  'mentor_scripts',
  'mentor_transitions',
] as const;

export const MENTOR_USER_PROFILES: readonly MentorUserProfile[] = [
  'vendedor_dono',
  'vendedor_outro',
  'gerente',
  'dono',
  'admin',
  'area_interna_mx',
  'anon',
] as const;

export const RLS_OPERATIONS: readonly RlsOperation[] = [
  'select',
  'insert',
  'update',
  'delete',
] as const;

/**
 * Permissões padronizadas para catálogos do Mentor Comercial.
 * - Leitura permitida para qualquer usuário autenticado.
 * - Escrita (insert, update, delete) restrita a Admin ou Área Interna MX.
 * - Nenhuma permissão para anônimos.
 */
const CATALOG_PERMISSIONS: Record<MentorUserProfile, RlsMatrixPermissions> = {
  vendedor_dono:   { select: true,  insert: false, update: false, delete: false },
  vendedor_outro:  { select: true,  insert: false, update: false, delete: false },
  gerente:         { select: true,  insert: false, update: false, delete: false },
  dono:            { select: true,  insert: false, update: false, delete: false },
  admin:           { select: true,  insert: true,  update: true,  delete: true  },
  area_interna_mx: { select: true,  insert: true,  update: true,  delete: true  },
  anon:            { select: false, insert: false, update: false, delete: false },
};

/**
 * Matriz canônica determinística de permissões RLS.
 */
export const MENTOR_RLS_MATRIX: MentorRlsMatrix = {
  mentor_status_definitions: CATALOG_PERMISSIONS,
  mentor_cadences: CATALOG_PERMISSIONS,
  mentor_cadence_steps: CATALOG_PERMISSIONS,
  mentor_scripts: CATALOG_PERMISSIONS,
  mentor_transitions: CATALOG_PERMISSIONS,

  // Pendências complementares operacionais
  // - Vendedor cria, lê e atualiza apenas o que é da sua responsabilidade.
  // - Gestor, Dono, Admin e Área Interna MX têm gestão total da loja/sistema.
  // - Anônimo não tem acesso.
  mentor_pending_flags: {
    vendedor_dono:   { select: true,  insert: true,  update: true,  delete: false },
    vendedor_outro:  { select: false, insert: false, update: false, delete: false },
    gerente:         { select: true,  insert: true,  update: true,  delete: true  },
    dono:            { select: true,  insert: true,  update: true,  delete: true  },
    admin:           { select: true,  insert: true,  update: true,  delete: true  },
    area_interna_mx: { select: true,  insert: true,  update: true,  delete: true  },
    anon:            { select: false, insert: false, update: false, delete: false },
  },

  // Snapshots de score (auditoria append-only)
  // - Permite select e insert para usuários autorizados.
  // - Impossibilita update e delete para TODOS os perfis (garantindo imutabilidade de auditoria).
  mentor_score_snapshots: {
    vendedor_dono:   { select: true,  insert: true,  update: false, delete: false },
    vendedor_outro:  { select: false, insert: false, update: false, delete: false },
    gerente:         { select: true,  insert: true,  update: false, delete: false },
    dono:            { select: true,  insert: true,  update: false, delete: false },
    admin:           { select: true,  insert: true,  update: false, delete: false },
    area_interna_mx: { select: true,  insert: true,  update: false, delete: false },
    anon:            { select: false, insert: false, update: false, delete: false },
  },

  // Configurações comerciais por loja
  // - Vendedor lê configurações da sua loja, mas NÃO edita.
  // - Vendedor de outra loja não visualiza.
  // - Gestor, Dono, Admin e Área Interna MX gerenciam as configurações da loja.
  store_commercial_settings: {
    vendedor_dono:   { select: true,  insert: false, update: false, delete: false },
    vendedor_outro:  { select: false, insert: false, update: false, delete: false },
    gerente:         { select: true,  insert: true,  update: true,  delete: true  },
    dono:            { select: true,  insert: true,  update: true,  delete: true  },
    admin:           { select: true,  insert: true,  update: true,  delete: true  },
    area_interna_mx: { select: true,  insert: true,  update: true,  delete: true  },
    anon:            { select: false, insert: false, update: false, delete: false },
  },
};

/**
 * Consulta se uma operação é permitida para uma tabela e perfil de usuário.
 */
export function hasRlsPermission(
  table: MentorTable,
  profile: MentorUserProfile,
  operation: RlsOperation
): boolean {
  return MENTOR_RLS_MATRIX[table][profile][operation];
}

/**
 * Obtém o mapa de permissões de uma tabela específica.
 */
export function getTablePermissions(
  table: MentorTable
): Record<MentorUserProfile, RlsMatrixPermissions> {
  return MENTOR_RLS_MATRIX[table];
}

/**
 * Obtém o mapa de permissões de um perfil em todas as tabelas.
 */
export function getProfilePermissions(
  profile: MentorUserProfile
): Record<MentorTable, RlsMatrixPermissions> {
  const result = {} as Record<MentorTable, RlsMatrixPermissions>;
  for (const table of MENTOR_TABLES) {
    result[table] = MENTOR_RLS_MATRIX[table][profile];
  }
  return result;
}

/**
 * Verifica se a tabela pertence ao grupo de catálogos mestre.
 */
export function isCatalogTable(table: string): boolean {
  return (CATALOG_TABLES as readonly string[]).includes(table);
}
