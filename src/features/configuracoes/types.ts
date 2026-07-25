import type { ComponentType } from 'react'
import type { UserRole } from '@/types/database'

export type ConfigTabKey =
  | 'perfil'
  | 'seguranca'
  | 'notificacoes'
  | 'equipe-usuarios'
  | 'lojas-rede'
  | 'operacional-loja'
  | 'remuneracao'
  | 'consultoria-pmr'
  | 'catalogos'
  | 'broadcasts'
  | 'integracoes'
  | 'sistema-mx'
  | 'aparencia'

export interface SettingsTabProps {
  isReadOnly: boolean
  role: UserRole
}

export type TabContext = SettingsTabProps

export interface ConfigTabDefinition {
  key: ConfigTabKey
  label: string
  description: string
  icon: ComponentType<{ size?: number; className?: string }>
  component: ComponentType<SettingsTabProps>
  roles: UserRole[]
  readOnlyRoles?: UserRole[]
  section: 'pessoal' | 'gestao' | 'mx' | 'sistema'
}
