import { useState } from 'react'
import { BookOpen, ChevronRight, Eye, GitCompare, History as HistoryIcon } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxStatusBanner, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import { nextMethodologyVersion, productMethodologyStatus, type MethodologyVersionStatus } from './methodology'
import { ProductMethodologyView } from './ProductMethodologyView'
import type { MethodologyVersion, ProductWithMethodology } from './consultoriaMxData'
import type { ConsultoriaMxController } from './useConsultoriaMx'

export function MethodologyByProductTab(props: {
  rows: ProductWithMethodology[]
  loading: boolean
  error: string | null
  controller: ConsultoriaMxController
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [compare, setCompare] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const selected = props.rows.find(product => product.program_key === selectedKey) ?? null

  if (selected) {
    return (
      <ProductMethodologyView
        product={selected}
        controller={props.controller}
        compareVersions={compare}
        showHistory={showHistory}
        onCloseCompare={() => setCompare(false)}
        onCloseHistory={() => setShowHistory(false)}
        onBack={() => { setSelectedKey(null); setCompare(false); setShowHistory(false) }}
      />
    )
  }

  if (props.loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Carregando metodologia...</div>
  }

  if (props.error) {
    return <MxEmptyState title="Não foi possível carregar" description={props.error} />
  }

  if (props.rows.length === 0) {
    return (
      <MxEmptyState
        title="Nenhum produto cadastrado"
        description="Cadastre produtos em Produtos de Consultoria para configurar a metodologia."
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Selecione um produto para configurar a metodologia dos encontros.</p>
      <MxTableSurface>
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Configurados</TableHead>
              <TableHead>Pendências</TableHead>
              <TableHead>Versão metodológica</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.rows.filter(product => product.status !== 'arquivado').map(product => {
              const versions = product.versions
              const state = productMethodologyStatus(versions)
              const published = versions.find(version => version.status === 'publicado')
              const draft = versions.find(version => version.status === 'rascunho')
              const configured = versions.reduce((acc, version) => acc + version.encounters_configured, 0)
              const pending = versions.reduce((acc, version) => acc + version.encounters_pending, 0)
              return (
                <TableRow key={product.program_key}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{product.name ?? product.program_key}</div>
                    <div className="text-xs text-muted-foreground">{product.program_key} · v{product.versao} · {product.total_visits ?? 0} encontros</div>
                  </TableCell>
                  <TableCell>
                    <MxStatusBanner tone={state.tone}>{state.label}</MxStatusBanner>
                  </TableCell>
                  <TableCell>{configured}</TableCell>
                  <TableCell>{pending}</TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">
                      {published ? `v${published.methodology_version_number} (publicada)` : draft ? `v${draft.methodology_version_number} (rascunho)` : 'nenhuma'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => setSelectedKey(product.program_key)}>
                        <BookOpen size={16} />{versions.length === 0 ? 'Iniciar' : 'Abrir'}
                      </Button>
                      {versions.length > 0 && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedKey(product.program_key); setCompare(true) }}>
                            <GitCompare size={16} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedKey(product.program_key); setShowHistory(true) }}>
                            <HistoryIcon size={16} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedKey(product.program_key) }}>
                            <Eye size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </MxTableSurface>
    </div>
  )
}
