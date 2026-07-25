import type { ReactNode } from 'react'
import {
  MxErrorState,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'

export function ReportPageShell(props: {
  id?: string
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  header?: ReactNode
  loading?: boolean
  refreshing?: boolean
  error?: string | null
  hasData?: boolean
  onRetry?: () => void
  filters?: ReactNode
  metrics?: ReactNode
  children: ReactNode
}) {
  const loading = props.loading ?? false
  const hasData = props.hasData ?? true

  return (
    <MxModulePage id={props.id ?? 'internal-report'}>
      {props.header ?? (
        <MxModuleHeader
          eyebrow={props.eyebrow}
          title={props.title}
          description={props.description}
          actions={props.actions}
        />
      )}
      {props.refreshing ? (
        <MxStatusBanner tone="info">Atualizando dados sem remover a leitura atual.</MxStatusBanner>
      ) : null}
      {props.error && hasData ? (
        <MxStatusBanner tone="warning">Os dados anteriores foram mantidos. {props.error}</MxStatusBanner>
      ) : null}
      {props.filters}
      {loading && !hasData ? (
        <MxLoadingState label="Carregando relatório" />
      ) : props.error && !hasData ? (
        <MxErrorState description={props.error} retry={props.onRetry} />
      ) : (
        <>
          {props.metrics}
          {props.children}
        </>
      )}
    </MxModulePage>
  )
}
