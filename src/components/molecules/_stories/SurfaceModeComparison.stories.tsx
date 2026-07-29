import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { MxSurfaceVisualProvider } from '@/components/module/MxSurfaceVisualContext'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { Textarea } from '@/components/atoms/Textarea'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Typography } from '@/components/atoms/Typography'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'

/**
 * Comparação lado a lado dos dois modos de superfície.
 *
 * `manager` é a aparência aprovada do Base44/Dono; `default` é o visual legado
 * do MX. Esta story existe para medir o delta de cada migração de módulo — o
 * que muda na tela quando um perfil passa a receber o modo aprovado.
 */
const meta = {
  title: 'Design System/Modos de superfície',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Amostra() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Padrão</Badge>
        <Badge variant="success">Sucesso</Badge>
        <Badge variant="warning">Atenção</Badge>
        <Badge variant="danger">Crítico</Badge>
        <Badge variant="outline">Contorno</Badge>
      </div>

      <Input placeholder="Nome do cliente" defaultValue="Loja Centro" />
      <Textarea placeholder="Observações" rows={2} />

      <Card>
        <CardHeader>
          <CardTitle>Fechamento do dia</CardTitle>
          <CardDescription>Resumo consolidado da equipe.</CardDescription>
        </CardHeader>
        <CardContent>
          <Typography variant="p">R$ 128.430,50 em 42 atendimentos.</Typography>
        </CardContent>
      </Card>

      <Skeleton />
    </div>
  )
}

function Coluna({ titulo, modo }: { titulo: string; modo: 'default' | 'manager' }) {
  return (
    <div className="min-w-0 flex-1">
      <h2 className="mb-3 text-[length:var(--mx-font-size-h3)] font-semibold text-[hsl(var(--mx-color-text-primary))]">
        {titulo}
      </h2>
      <div className="rounded-[var(--mx-card-radius)] border border-[hsl(var(--mx-color-border))] bg-gray-50 p-4">
        <MxSurfaceVisualProvider mode={modo}>
          <Amostra />
        </MxSurfaceVisualProvider>
      </div>
    </div>
  )
}

export const Comparacao: Story = {
  render: () => (
    <div className="flex flex-col gap-8 lg:flex-row">
      <Coluna titulo="Legado (default)" modo="default" />
      <Coluna titulo="Aprovado (manager / Base44)" modo="manager" />
    </div>
  ),
}
