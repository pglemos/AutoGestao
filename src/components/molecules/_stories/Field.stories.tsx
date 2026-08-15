import type { Meta } from '@storybook/react'
import { Field } from '@/components/molecules/Field'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'

const meta = {
  title: 'Molecules/Field',
  component: Field,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta

export default meta

export const CampoInput = {
  render: () => (
    <div className="max-w-md">
      <Field label="Nome do vendedor" helperText="Nome completo como aparece no contrato.">{(control) => <Input {...control} placeholder="Ex.: Ana Souza" />}</Field>
    </div>
  ),
}

export const ComErro = {
  render: () => (
    <div className="max-w-md">
      <Field label="Nome do vendedor" error="Preencha o nome do vendedor.">{(control) => <Input {...control} defaultValue="" placeholder="Ex.: Ana Souza" />}</Field>
    </div>
  ),
}

export const CampoTextarea = {
  render: () => (
    <div className="max-w-md">
      <Field label="Observações" helperText="Anotações internas da avaliação.">{(control) => <Textarea {...control} rows={3} placeholder="Detalhes…" />}</Field>
    </div>
  ),
}

export const CampoSelect = {
  render: () => (
    <div className="max-w-md">
      <Field label="Unidade" helperText="Loja à qual o vendedor pertence.">{(control) => (
        <Select {...control}>
          <option value="">Selecione…</option>
          <option value="matriz">Matriz</option>
          <option value="filial-01">Filial 01</option>
        </Select>
      )}</Field>
    </div>
  ),
}
