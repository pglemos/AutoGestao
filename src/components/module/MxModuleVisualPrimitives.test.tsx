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

    expect(html).toContain('bg-gray-50')
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
    expect(html).toContain('border-gray-100')
    expect(html).toContain('bg-white')
    expect(html).toContain('shadow-sm')
    expect(html).toContain('text-gray-800')
    expect(html).toContain('text-gray-500')
    expect(html).toContain('bg-emerald-600')
    expect(html).toContain('border-gray-200')
    expect(html).toContain('hover:bg-gray-50')
    expect(html).toContain('<h1')
    expect(html).toContain('<table')
    expect(html).toContain('aria-busy="true"')

    expect(html).not.toContain('bg-mx-action')
    expect(html).not.toContain('bg-surface-alt')
    expect(html).not.toContain('rounded-mx-xl')
    expect(html).not.toContain('border-border-subtle')
    expect(html).not.toContain('mxds-')
    expect(html).not.toContain('!important')
  })
})
