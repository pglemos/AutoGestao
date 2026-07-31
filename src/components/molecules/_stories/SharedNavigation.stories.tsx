import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { Avatar } from '@/components/atoms/Avatar'
import { TabNav } from '@/components/molecules/TabNav'
import { TabNavPill } from '@/components/molecules/TabNavPill'

/**
 * Componentes compartilhados de navegação e identidade.
 *
 * Estes três estão documentados juntos por um motivo concreto: `Avatar` e
 * `TabNav` pintavam texto no tom cheio da marca sobre superfície clara, e as
 * duas correções zeraram a dívida de acessibilidade de três rotas ao mesmo
 * tempo — /pdi, /organograma e /banco-talentos. Componente compartilhado
 * concentra tanto o estrago quanto o conserto, e é o que mais merece ter os
 * estados visíveis num lugar só.
 *
 * `TabNavPill` está aqui com a divergência à mostra: ele declara `uppercase`, e
 * o escopo interno desliga isso só para os perfis MX. O mesmo pill aparece em
 * caixa alta para Gerente, Dono e Vendedor e em caixa normal para o Admin — o
 * tipo de diferença por perfil que §5 proíbe, e que espera decisão de produto.
 */
const meta = {
  title: 'Design System/Navegação compartilhada',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AvatarEstados: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-[var(--mx-space-6)] p-[var(--mx-space-6)]">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-[var(--mx-space-2)]">
          <Avatar size={size} fallback="Vendedor MX" alt="Vendedor MX" />
          <span className="text-xs text-[hsl(var(--mx-color-text-secondary))]">iniciais · {size}</span>
        </div>
      ))}
      <div className="flex flex-col items-center gap-[var(--mx-space-2)]">
        <Avatar size="lg" alt="Com foto" src="https://placehold.co/96x96/198653/ffffff?text=MX" />
        <span className="text-xs text-[hsl(var(--mx-color-text-secondary))]">com imagem</span>
      </div>
      <div className="flex flex-col items-center gap-[var(--mx-space-2)]">
        <Avatar size="lg" fallback="Nome Muito Longo Para Iniciais" alt="Nome longo" />
        <span className="text-xs text-[hsl(var(--mx-color-text-secondary))]">nome longo</span>
      </div>
    </div>
  ),
}

function TabNavDemo() {
  const [tab, setTab] = React.useState('organograma')
  return (
    <TabNav
      tabs={[
        { key: 'organograma', label: 'Organograma' },
        { key: 'carreira', label: 'Plano de carreira' },
      ]}
      activeTab={tab}
      onTabChange={setTab}
    />
  )
}

/**
 * A aba ativa usa o tom de texto da marca sobre a marca a 5%. Com o tom cheio
 * ficava no limite de 4.5:1 e reprovava AA.
 */
export const AbasComEstadoAtivo: Story = {
  render: () => (
    <div className="p-[var(--mx-space-6)]">
      <TabNavDemo />
    </div>
  ),
}

function PillDemo() {
  const [tab, setTab] = React.useState('ativas')
  return (
    <TabNavPill
      tabs={[
        { key: 'ativas', label: 'Ativas (40)' },
        { key: 'arquivadas', label: 'Arquivadas (0)' },
      ]}
      activeTab={tab}
      onTabChange={setTab}
    />
  )
}

/**
 * Pills de filtro. Repare na caixa alta: é o que os perfis comerciais veem. Os
 * perfis internos MX veem o mesmo componente em caixa normal, porque
 * `.mx-canonical-template` desliga o `uppercase` dentro daquele escopo.
 */
export const PillsDeFiltro: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--mx-space-6)] p-[var(--mx-space-6)]">
      <div>
        <p className="mb-[var(--mx-space-2)] text-xs text-[hsl(var(--mx-color-text-secondary))]">
          fora do escopo interno — caixa alta
        </p>
        <PillDemo />
      </div>
      <div data-mx-internal-scope="true" className="mx-canonical-template">
        <p className="mb-[var(--mx-space-2)] text-xs text-[hsl(var(--mx-color-text-secondary))]">
          sob o escopo interno MX — caixa normal
        </p>
        <PillDemo />
      </div>
    </div>
  ),
}
