import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { PageCanvas, PAGE_WIDTHS, type PageWidth } from '@/design-system/page'
import { PageTemplate } from '@/components/templates/PageTemplate'

/**
 * Container canônico de página e o template que o embala.
 *
 * O que estas histórias servem para responder, e que nenhum teste responde tão
 * rápido: como cada largura semântica se comporta lado a lado, e onde a régua de
 * 16/24/32 muda quando a janela do preview encolhe.
 *
 * Não há história por tipo de conteúdo (dashboard, formulário, relatório…) —
 * a variante é a `width`, e uma história por tipo repetiria o mesmo componente
 * com nome diferente.
 */
const meta = {
  title: 'Design System/Page Canvas',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Bloco que torna a caixa do canvas visível sem depender de conteúdo real. */
function Bloco({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--mx-radius-xl)] border border-[hsl(var(--mx-color-border))] bg-[hsl(var(--mx-color-surface))] p-[var(--mx-space-6)]">
      {children}
    </div>
  )
}

/**
 * As seis larguras, uma sob a outra, sobre um fundo que denuncia a margem.
 * O contorno tracejado é a área total; o bloco branco é o conteúdo.
 */
export const LargurasSemanticas: Story = {
  render: () => (
    <div className="min-h-screen bg-[hsl(var(--mx-color-surface-muted))] py-[var(--mx-space-8)]">
      {PAGE_WIDTHS.map((width: PageWidth) => (
        <div key={width} className="mb-[var(--mx-space-8)] outline outline-1 outline-dashed outline-[hsl(var(--mx-color-border-strong))]">
          <PageCanvas as="div" width={width}>
            <Bloco>
              <p className="font-bold text-[hsl(var(--mx-color-text-primary))]">{width}</p>
              <p className="text-[hsl(var(--mx-color-text-secondary))]">
                Máximo de <code>--mx-page-width-{width}</code>. A margem lateral vem do
                breakpoint, não desta história.
              </p>
            </Bloco>
          </PageCanvas>
        </div>
      ))}
    </div>
  ),
}

/**
 * Reserva no fim da página. Redimensione para o mobile: o espaço abaixo do
 * último bloco cresce, e é ele que impede a navegação inferior de cobrir
 * conteúdo.
 */
export const ReservaInferior: Story = {
  render: () => (
    <div className="min-h-screen bg-[hsl(var(--mx-color-surface-muted))]">
      {(['none', 'navigation', 'actions'] as const).map((clearance) => (
        <div key={clearance} className="mb-[var(--mx-space-4)] outline outline-1 outline-dashed outline-[hsl(var(--mx-color-border-strong))]">
          <PageCanvas as="div" width="focused" bottomClearance={clearance}>
            <Bloco>
              <p className="font-bold text-[hsl(var(--mx-color-text-primary))]">bottomClearance="{clearance}"</p>
              <p className="text-[hsl(var(--mx-color-text-secondary))]">
                Compõe com <code>env(safe-area-inset-bottom)</code>, então o resultado muda
                entre um aparelho com notch e um desktop.
              </p>
            </Bloco>
          </PageCanvas>
        </div>
      ))}
    </div>
  ),
}

/**
 * O template completo: casca que rola mais o canvas.
 *
 * A diferença aparece ao rolar — a margem lateral fica parada, porque pertence
 * ao filho e não ao elemento que rola. Era esse o motivo de manter os dois
 * separados.
 */
export const TemplateComRolagem: Story = {
  render: () => (
    <div className="h-[420px]">
      <PageTemplate as="div" width="dashboard" className="flex flex-col gap-[var(--mx-space-4)]">
        {Array.from({ length: 8 }).map((_, index) => (
          <Bloco key={index}>
            <p className="text-[hsl(var(--mx-color-text-primary))]">Bloco {index + 1}</p>
          </Bloco>
        ))}
      </PageTemplate>
    </div>
  ),
}

/** Casca clara, para telas que não usam o cinza padrão. */
export const TemplateSuperficieClara: Story = {
  render: () => (
    <div className="h-[320px]">
      <PageTemplate as="div" width="form" surface="plain" className="flex flex-col gap-[var(--mx-space-4)]">
        <Bloco>
          <p className="text-[hsl(var(--mx-color-text-primary))]">surface="plain"</p>
          <p className="text-[hsl(var(--mx-color-text-secondary))]">
            Fundo branco no elemento que rola. A largura de formulário limita a linha de
            leitura.
          </p>
        </Bloco>
      </PageTemplate>
    </div>
  ),
}
