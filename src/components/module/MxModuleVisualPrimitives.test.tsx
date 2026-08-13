import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Activity } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxField,
  MxLoadingState,
  MxMetricCard,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxStatusBanner,
  MxTableSurface,
  MxToolbar,
} from './MxModuleVisualPrimitives'

describe('MxModuleVisualPrimitives', () => {
  test('o header de módulo delega a geometria para o PageHeader canônico', () => {
    const html = renderToStaticMarkup(
      <MxModuleHeader
        eyebrow="Gestão"
        title="Painel"
        description="Descrição operacional"
        actions={<Button>Atualizar</Button>}
      />,
    )

    expect(html).toContain('data-mx-page-header=""')
    expect(html).toContain('data-mx-module-header=""')
    expect(html).toContain('rounded-[var(--mx-card-radius)]')
    expect(html).toContain('shadow-[var(--mx-card-shadow)]')
    expect(html).not.toContain('rounded-2xl border border-border-subtle bg-white p-5 shadow-sm')
  })

  test('MxTableSurface delega à TableSurface canônica com single ownership e paridade MX', () => {
    const html = renderToStaticMarkup(
      <MxTableSurface><table><tbody><tr><td>OK</td></tr></tbody></table></MxTableSurface>,
    )

    expect(html).toContain('data-mx-table-surface=""')
    expect(html).toContain('data-mx-scroll-region=""')
    expect(html).toContain('data-mx-template-slot="table"')
    expect(html).toContain('data-mx-template-table=""')
    expect(html).toMatch(/role="region"/)
    expect(html).toMatch(/aria-label="Tabela com rolagem horizontal"/)
    expect(html).toMatch(/tabindex="0"/)
    expect(html).toContain('rounded-2xl')
    expect(html).toContain('bg-white')
    expect(html).not.toContain('rounded-mx-xl')
    expect(html).not.toContain('bg-background')
  })

  test('reproduz a anatomia visual concreta do módulo Gerente', () => {
    const html = renderToStaticMarkup(
      <MxModulePage>
        <MxModuleHeader
          title="Painel"
          description="Descrição operacional"
          actions={(
            <>
              <Button variant="outline">Atualizar</Button>
              <Button>Gerenciar</Button>
            </>
          )}
        />
        <MxToolbar aria-label="Filtros"><Button variant="ghost">Filtrar</Button></MxToolbar>
        <MxMetricCard title="Vendas" value={10} detail="no período" icon={Activity} />
        <MxSectionCard>
          <MxField label="Loja" htmlFor="store"><input id="store" /></MxField>
          <MxTableSurface><table><tbody><tr><td>OK</td></tr></tbody></table></MxTableSurface>
        </MxSectionCard>
        <MxStatusBanner tone="warning">Atenção</MxStatusBanner>
        <MxEmptyState title="Sem dados" description="Nada encontrado" />
        <MxLoadingState label="Carregando painel" />
      </MxModulePage>,
    )

    expect(html).toContain('bg-surface-alt')
    expect(html).toContain('data-mx-page-canvas=""')
    expect(html).toContain('data-mx-page-width="dashboard"')
    expect(html).toContain('space-y-5')
    // §7.6: a margem lateral e o padding vertical pertencem ao container
    // canônico (PageCanvas / --mx-page-*), não a `px-4`/`py-6` cravados no
    // módulo. A div-filha direta do MxModulePage é o ponto de regressão: se
    // ela voltar a carregar `px-4`/`py-6` literais, a página Gerente volta a
    // decidir sua própria margem, que é o que o §7.3 proíbe.
    expect(html).not.toContain('max-w-7xl')
    expect(html).not.toContain('px-[var(--mx-page-margin)]')
    expect(html).not.toContain('py-[var(--mx-page-padding-top)]')
    expect(html).not.toContain('overflow-y-auto')
    expect(html).toContain('rounded-2xl')
    expect(html).toContain('border-border-subtle')
    expect(html).toContain('bg-white')
    expect(html).toContain('shadow-sm')
    expect(html).toContain('text-foreground')
    expect(html).toContain('text-muted-foreground')
    expect(html).toContain('bg-brand-primary')
    expect(html).toContain('border-border')
    expect(html).toContain('hover:bg-surface-alt')
    expect(html).toContain('<h1')
    expect(html).toContain('<table')
    expect(html).toContain('aria-busy="true"')
    expect(html).toMatch(/role="status"[^>]*aria-busy="true"[^>]*aria-label="Carregando painel"/)

    expect(html).not.toContain('bg-mx-action')
    expect(html).not.toContain('rounded-mx-xl')
    expect(html).not.toContain('mxds-')
    expect(html).not.toContain('!important')
  })
})
