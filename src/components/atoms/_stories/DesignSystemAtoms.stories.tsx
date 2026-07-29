import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { Pencil, Trash2, Plus, Search } from 'lucide-react'

import {
  Checkbox,
  Divider,
  IconButton,
  Kbd,
  Label,
  Link,
  Progress,
  Radio,
  RadioGroup,
  Spinner,
  StatusDot,
  Switch,
  VisuallyHidden,
} from '@/components/atoms'

/**
 * Catálogo dos átomos do MX Design System.
 *
 * Cada bloco mostra o componente em todos os estados que ele precisa cobrir
 * (§12), para que a validação visual seja feita sobre estados reais e não
 * apenas sobre o caso feliz.
 */
const meta = {
  title: 'Design System/Átomos',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[var(--mx-space-8)]">
      <h2 className="mb-[var(--mx-space-3)] text-[length:var(--mx-font-size-h3)] font-semibold text-[hsl(var(--mx-color-text-primary))]">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-[var(--mx-space-4)]">{children}</div>
    </section>
  )
}

export const Catalogo: Story = {
  render: () => {
    const [checked, setChecked] = React.useState<boolean | 'indeterminate'>(true)
    const [on, setOn] = React.useState(true)

    return (
      <div className="max-w-[var(--mx-content-max-width)]">
        <Section title="IconButton">
          <IconButton icon={<Plus />} label="Adicionar" variant="primary" />
          <IconButton icon={<Pencil />} label="Editar" variant="outline" />
          <IconButton icon={<Search />} label="Buscar" variant="ghost" />
          <IconButton icon={<Trash2 />} label="Excluir" variant="danger" />
          <IconButton icon={<Plus />} label="Salvando" variant="primary" loading />
          <IconButton icon={<Plus />} label="Indisponível" variant="primary" disabled />
          <IconButton icon={<Plus />} label="Pequeno" size="sm" variant="outline" />
          <IconButton icon={<Plus />} label="Grande" size="lg" variant="outline" />
        </Section>

        <Section title="Checkbox e Radio">
          <div className="flex items-center gap-2">
            <Checkbox id="cb1" checked={checked} onCheckedChange={setChecked} />
            <Label htmlFor="cb1">Selecionado</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cb2" checked={false} />
            <Label htmlFor="cb2">Vazio</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cb3" checked="indeterminate" />
            <Label htmlFor="cb3">Indeterminado</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cb4" disabled />
            <Label htmlFor="cb4">Desabilitado</Label>
          </div>
          <RadioGroup defaultValue="a">
            <div className="flex items-center gap-2">
              <Radio value="a" id="r1" />
              <Label htmlFor="r1">Opção A</Label>
            </div>
            <div className="flex items-center gap-2">
              <Radio value="b" id="r2" />
              <Label htmlFor="r2">Opção B</Label>
            </div>
          </RadioGroup>
        </Section>

        <Section title="Switch">
          <Switch checked={on} onCheckedChange={setOn} aria-label="Notificações" />
          <Switch checked={false} aria-label="Desligado" />
          <Switch disabled aria-label="Bloqueado" />
        </Section>

        <Section title="Label obrigatório">
          <Label htmlFor="in1" required>
            Meta mensal
          </Label>
        </Section>

        <Section title="Progress">
          <div className="w-64 space-y-3">
            <Progress value={25} />
            <Progress value={60} tone="warning" />
            <Progress value={92} tone="success" size="lg" />
            <Progress value={8} tone="danger" size="sm" />
          </div>
        </Section>

        <Section title="StatusDot">
          <StatusDot tone="success" label="No prazo" showLabel />
          <StatusDot tone="warning" label="Atenção" showLabel />
          <StatusDot tone="danger" label="Crítico" showLabel pulse />
          <StatusDot tone="info" label="Em análise" showLabel />
          <StatusDot tone="neutral" label="Sem dados" showLabel />
        </Section>

        <Section title="Spinner">
          <Spinner size="sm" />
          <Spinner size="md" tone="primary" />
          <Spinner size="lg" tone="muted" />
        </Section>

        <Section title="Link">
          <Link to="/ranking">Link interno</Link>
          <Link to="https://www.mxperformance.com.br">Link externo</Link>
        </Section>

        <Section title="Kbd">
          <span className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </Section>

        <Section title="Divider">
          <div className="w-96 space-y-4">
            <Divider />
            <Divider label="ou" />
          </div>
        </Section>

        <Section title="VisuallyHidden">
          <p className="text-[length:var(--mx-font-size-base)] text-[hsl(var(--mx-color-text-secondary))]">
            Há texto invisível aqui, lido apenas por leitores de tela.
            <VisuallyHidden>Conteúdo somente para leitores de tela.</VisuallyHidden>
          </p>
        </Section>
      </div>
    )
  },
}
