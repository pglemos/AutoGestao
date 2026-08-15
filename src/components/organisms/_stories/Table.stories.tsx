import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/atoms/Button'
import { StatusBadge } from '@/components/molecules/StatusBadge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from '@/components/organisms/Table'

const meta = {
  title: 'Organisms/Table',
  component: Table,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function DemoRows() {
  return (
    <>
      <TableRow>
        <TableCell>Ana Souza</TableCell>
        <TableCell className="text-right">R$ 12.500</TableCell>
        <TableCell><StatusBadge status="success" label="Ativa" /></TableCell>
        <TableCell className="text-right"><Button variant="outline" size="sm">Abrir</Button></TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Bia Lima</TableCell>
        <TableCell className="text-right">R$ 8.200</TableCell>
        <TableCell><StatusBadge status="warning" label="Meta em risco" /></TableCell>
        <TableCell className="text-right"><Button variant="outline" size="sm">Abrir</Button></TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Caio Mendes</TableCell>
        <TableCell className="text-right">R$ 5.100</TableCell>
        <TableCell><StatusBadge status="error" label="Inativo" /></TableCell>
        <TableCell className="text-right"><Button variant="outline" size="sm">Abrir</Button></TableCell>
      </TableRow>
    </>
  )
}

export const Básica: Story = {
  render: () => (
    <TableSurface label="Tabela de demonstração">
      <Table>
        <TableCaption>Vendedores do mês</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody><DemoRows /></TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell colSpan={2} className="text-right font-semibold">R$ 25.800</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableSurface>
  ),
}

export const SomenteCorpo: Story = {
  render: () => (
    <TableSurface label="Tabela de demonstração">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody><DemoRows /></TableBody>
      </Table>
    </TableSurface>
  ),
}
