import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxEmptyState, MxInput, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import type { CatalogIndicator } from '../indicadores/indicatorCatalog'

export function ParameterPickerModal(props: {
  open: boolean
  indicators: CatalogIndicator[]
  configuredKeys: Set<string>
  onSelect: (indicator: CatalogIndicator) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const candidates = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return props.indicators
    return props.indicators.filter(indicator => [indicator.label, indicator.metric_key, indicator.area]
      .some(value => (value ?? '').toLocaleLowerCase('pt-BR').includes(term)))
  }, [props.indicators, search])

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Criar parâmetro"
      description="Selecione o indicador que receberá valores no conjunto ativo de parâmetros."
      size="lg"
      footer={<Button variant="outline" onClick={props.onClose}>Cancelar</Button>}
    >
      <div className="mt-5 space-y-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <MxInput className="pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar indicador" aria-label="Buscar indicador para parâmetro" />
        </div>
        {candidates.length ? (
          <MxTableSurface aria-label="Indicadores disponíveis para parâmetro">
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow><TableHead>Indicador</TableHead><TableHead>Área</TableHead><TableHead>Parâmetro</TableHead><TableHead className="text-right">Ação</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map(indicator => {
                  const configured = props.configuredKeys.has(indicator.metric_key)
                  return (
                    <TableRow key={indicator.metric_key}>
                      <TableCell><div className="font-semibold text-foreground">{indicator.label}</div><div className="text-xs text-muted-foreground">{indicator.metric_key}</div></TableCell>
                      <TableCell>{indicator.area}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{configured ? 'Já configurado' : 'Ainda não criado'}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => props.onSelect(indicator)}>{configured ? 'Editar' : 'Criar'}</Button></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </MxTableSurface>
        ) : <MxEmptyState variant="filter" title="Nenhum indicador encontrado" description="Ajuste a busca para selecionar um indicador." />}
      </div>
    </Modal>
  )
}
