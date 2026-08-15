import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'

const meta = {
  title: 'Molecules/Card',
  component: Card,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    interactive: { control: 'boolean' },
    selected: { control: 'boolean' },
  },
  args: {
    interactive: false,
    selected: false,
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Padrão: Story = {
  render: (args) => (
    <Card {...args} className="max-w-md">
      <CardHeader>
        <Typography as="h3" variant="h3">Meta do mês</Typography>
        <Typography variant="caption" className="text-muted-foreground">Janeiro de 2026</Typography>
      </CardHeader>
      <CardContent>
        <Typography variant="p">R$ 120.000 de meta de vendas, com bônus por superação.</Typography>
      </CardContent>
      <CardFooter>
        <Button size="sm">Ver detalhes</Button>
      </CardFooter>
    </Card>
  ),
}

export const Interativo: Story = {
  args: { interactive: true },
  render: (args) => (
    <Card {...args} className="max-w-md">
      <CardContent>
        <Typography as="h3" variant="h3">Ação pendente</Typography>
        <Typography variant="p">Clique para abrir o plano de ação deste vendedor.</Typography>
      </CardContent>
    </Card>
  ),
}

export const Selecionado: Story = {
  args: { selected: true },
  render: (args) => (
    <Card {...args} className="max-w-md">
      <CardContent>
        <Typography as="h3" variant="h3">Meta selecionada</Typography>
        <Typography variant="p">Card destacado com anel semântico de seleção.</Typography>
      </CardContent>
    </Card>
  ),
}

export const SomenteConteúdo: Story = {
  render: (args) => (
    <Card {...args} className="max-w-md">
      <CardContent>
        <Typography variant="p">Card sem header/footer — apenas o corpo com padding canônico.</Typography>
      </CardContent>
    </Card>
  ),
}
