import type { Meta, StoryObj } from '@storybook/react'
import { AlertMessage } from '@/components/molecules/AlertMessage'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'

const meta = {
  title: 'Feedback/Alert e Banner',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AlertsInformativos: Story = {
  render: () => (
    <div className="max-w-md space-y-3">
      <AlertMessage tone="info" title="Informação" live={false}>Nova versão disponível na central.</AlertMessage>
      <AlertMessage tone="success" title="Sucesso" live={false}>Vendedor salvo com sucesso.</AlertMessage>
      <AlertMessage tone="warning" title="Atenção" live={false}>Meta em risco nesta semana.</AlertMessage>
      <AlertMessage tone="danger" title="Erro" live={false} action={<Button variant="outline" size="sm">Tentar novamente</Button>}>Não foi possível salvar.</AlertMessage>
    </div>
  ),
}

export const BannersDeStatus: Story = {
  render: () => (
    <div className="max-w-md space-y-3">
      <MxStatusBanner tone="success">Fechamento concluído com sucesso.</MxStatusBanner>
      <MxStatusBanner tone="warning">Atenção: dados parciais.</MxStatusBanner>
      <MxStatusBanner tone="danger">Erro ao sincronizar.</MxStatusBanner>
      <MxStatusBanner tone="info">Atualização em segundo plano.</MxStatusBanner>
      <MxStatusBanner tone="neutral">Nenhuma pendência.</MxStatusBanner>
    </div>
  ),
}

export const APIdeToast: Story = {
  render: () => (
    <div className="max-w-md">
      <p className="mb-3 text-sm text-muted-foreground">
        Toast canônico via <code>lib/toast</code> (wrapper Sonner). Abra o painel de ações
        para disparar os 4 kinds com as durações padrão.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => toast.success('Salvo com sucesso')}>Success</Button>
        <Button variant="outline" onClick={() => toast.info('Processando…')}>Info</Button>
        <Button variant="outline" onClick={() => toast.warning('Meta em risco')}>Warning</Button>
        <Button variant="danger" onClick={() => toast.error('Falha ao salvar')}>Error</Button>
      </div>
    </div>
  ),
}
