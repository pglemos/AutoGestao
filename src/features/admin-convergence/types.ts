export type AdminConvergenceStatus = 'existing' | 'partial' | 'missing'

export type AdminConvergenceModuleKey =
  | 'clientes'
  | 'equipe'
  | 'produtos'
  | 'indicadores'
  | 'planos-acao'
  | 'consultoria-mx'

export interface AdminConvergenceModule {
  key: AdminConvergenceModuleKey
  label: string
  route: `/${string}`
  currentStatus: AdminConvergenceStatus
  canonicalTables: readonly string[]
  preservedOperationalRoutes: readonly string[]
  base44ReferenceFiles: readonly string[]
  migrationPolicy: string
}
