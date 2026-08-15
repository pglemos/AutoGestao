import type { Meta } from '@storybook/react'
import { Button } from '@/components/atoms/Button'
import { StatusBadge } from '@/components/molecules/StatusBadge'
import { DataGrid, type Column } from '@/components/organisms/DataGrid'

type Row = { id: string; nome: string; comissao: number; status: 'ativo' | 'risco' | 'inativo' }

const columns: Column<Row>[] = [
  { key: 'nome', header: 'Nome' },
  { key: 'comissao', header: 'Comissão', align: 'right' },
  {
    key: 'status',
    header: 'Status',
    status: (row) =>
      row.status === 'ativo'
        ? { status: 'success', label: 'Ativa' }
        : row.status === 'risco'
          ? { status: 'warning', label: 'Meta em risco' }
          : { status: 'error', label: 'Inativa' },
  },
]

const rows: Row[] = [
  { id: '1', nome: 'Ana Souza', comissao: 12500, status: 'ativo' },
  { id: '2', nome: 'Bia Lima', comissao: 8200, status: 'risco' },
  { id: '3', nome: 'Caio Mendes', comissao: 5100, status: 'inativo' },
]

const meta = {
  title: 'Organisms/DataGrid',
  component: DataGrid,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta

export default meta

export const Padrão = {
  render: () => <DataGrid columns={columns} data={rows} label="Vendedores do mês" />,
}

export const Vazio = {
  render: () => (
    <DataGrid
      columns={columns}
      data={[]}
      label="Vendedores do mês"
      emptyMessage="Nenhum vendedor localizado"
      emptyDescription="Cadastre um vendedor ou ajuste os filtros."
    />
  ),
}

export const Carregando = {
  render: () => <DataGrid columns={columns} data={[]} loading label="Vendedores do mês" />,
}

export const ComErro = {
  render: () => (
    <DataGrid
      columns={columns}
      data={[]}
      error="Falha ao carregar os vendedores."
      label="Vendedores do mês"
    />
  ),
}

export const ComAcaoERowClick = {
  render: () => (
    <DataGrid
      columns={[
        ...columns,
        {
          key: 'acao',
          header: 'Ações',
          render: (row) => <Button variant="outline" size="sm">Abrir {row.nome.split(' ')[0]}</Button>,
        },
      ]}
      data={rows}
      label="Vendedores do mês"
    />
  ),
}

export const ComStatusBadge = {
  render: () => (
    <div className="space-y-2">
      <StatusBadge status="success" label="Ativa" />
      <StatusBadge status="warning" label="Meta em risco" />
      <StatusBadge status="error" label="Inativa" />
    </div>
  ),
}
