import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect } from '@/components/module/MxModuleVisualPrimitives'
import { evaluateFormula, extractIndicatorDeps, extractParameterDeps } from '../indicadores/indicatorFormulas'
import type { FormulaAwareIndicator } from '../indicadores/indicatorData'

export function FormulaTesterModal(props: {
  open: boolean
  indicators: FormulaAwareIndicator[]
  parameterDefaults: Record<string, number>
  onClose: () => void
}) {
  const [selectedKey, setSelectedKey] = useState('')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [result, setResult] = useState<number | null | 'SEM_BASE'>(null)

  const selected = props.indicators.find(indicator => indicator.metric_key === selectedKey)
  const indDeps = selected ? extractIndicatorDeps(selected.formula_expression) : []
  const parDeps = selected ? extractParameterDeps(selected.formula_expression) : []

  const runTest = () => {
    if (!selected?.formula_expression) {
      setResult('SEM_BASE')
      return
    }
    const indMap: Record<string, number> = {}
    for (const code of indDeps) {
      const value = Number(inputs[`IND_${code}`])
      if (Number.isNaN(value)) return
      indMap[code] = value
    }
    const parMap: Record<string, number> = {}
    for (const code of parDeps) {
      const raw = inputs[`PAR_${code}`]
      const value = raw !== undefined && raw !== '' ? Number(raw) : props.parameterDefaults[code]
      if (value == null || Number.isNaN(value)) return
      parMap[code] = value
    }
    const computed = evaluateFormula(selected.formula_expression, indMap, parMap)
    setResult(computed)
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Testar cálculo"
      size="lg"
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose}>Fechar</Button>
          <Button onClick={runTest} disabled={!selected?.formula_expression}>
            <Calculator size={14} />Calcular
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxField label="Indicador">
          <MxSelect
            aria-label="Indicador para teste"
            value={selectedKey}
            onChange={event => {
              setSelectedKey(event.target.value)
              setInputs({})
              setResult(null)
            }}
          >
            <option value="">Selecionar...</option>
            {props.indicators.filter(indicator => indicator.formula_expression).map(indicator => (
              <option key={indicator.metric_key} value={indicator.metric_key}>{indicator.label}</option>
            ))}
          </MxSelect>
        </MxField>

        {selected?.formula_expression ? (
          <>
            <div className="rounded-lg border border-border bg-background-muted p-3 font-mono text-xs">{selected.formula_expression}</div>

            {indDeps.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">Indicadores de entrada</div>
                {indDeps.map(code => (
                  <MxField key={code} label={code}>
                    <Input
                      type="number"
                      placeholder="0"
                      value={inputs[`IND_${code}`] ?? ''}
                      onChange={event => setInputs(current => ({ ...current, [`IND_${code}`]: event.target.value }))}
                    />
                  </MxField>
                ))}
              </div>
            ) : null}

            {parDeps.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">Parâmetros</div>
                {parDeps.map(code => (
                  <MxField key={code} label={code} hint={props.parameterDefaults[code] != null ? `Padrão MX: ${props.parameterDefaults[code]}` : undefined}>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={props.parameterDefaults[code] != null ? String(props.parameterDefaults[code]) : '0'}
                      value={inputs[`PAR_${code}`] ?? ''}
                      onChange={event => setInputs(current => ({ ...current, [`PAR_${code}`]: event.target.value }))}
                    />
                  </MxField>
                ))}
              </div>
            ) : null}

            {result === 'SEM_BASE' ? (
              <div className="rounded-lg border border-border bg-warning/10 p-3 text-sm text-foreground">Sem base para cálculo — verifique as entradas.</div>
            ) : result !== null ? (
              <div className="rounded-lg border border-border bg-success/10 p-3 text-center">
                <div className="text-xs text-muted-foreground">Resultado</div>
                <div className="text-2xl font-bold text-foreground">{result}</div>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">O teste não altera dados oficiais.</p>
          </>
        ) : (
          <div className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">Selecione um indicador calculado para testar.</div>
        )}
      </div>
    </Modal>
  )
}
