import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

import { AppShellFrame } from '@/design-system/shell/AppShellFrame'
import { resolveAppShellConfig } from '@/design-system/shell/appShellConfig'

/**
 * Moldura do App Shell isolada dos shells reais.
 *
 * Serve para exercitar em runtime o que a moldura acrescenta — skip-link,
 * foco ao trocar de rota e densidade por perfil — sem depender de sessão
 * autenticada.
 */
const meta = {
  title: 'Design System/App Shell',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function FakePage({ name }: { name: string }) {
  const navigate = useNavigate()
  return (
    <div className="p-[var(--mx-space-6)]">
      <h1 className="text-[length:var(--mx-font-size-h1)] font-bold text-[hsl(var(--mx-color-text-primary))]">
        {name}
      </h1>
      <p className="mt-2 text-[hsl(var(--mx-color-text-secondary))]">
        Pressione Tab a partir do topo para revelar o skip-link. Navegue para
        conferir o foco indo para o conteúdo.
      </p>
      <button
        type="button"
        onClick={() => navigate(name === 'Painel' ? '/equipe' : '/painel')}
        className="mt-[var(--mx-space-4)] h-[var(--mx-button-height-md)] rounded-[var(--mx-button-radius)] bg-[hsl(var(--mx-color-primary))] px-[var(--mx-button-padding-inline-md)] font-semibold text-[hsl(var(--mx-color-primary-foreground))]"
      >
        Ir para {name === 'Painel' ? 'Equipe' : 'Painel'}
      </button>
    </div>
  )
}

// A prop se chama `profile` e não `role` porque `role` em um elemento JSX é
// lido pelas regras de acessibilidade do lint como um papel ARIA.
function ShellHarness({ profile }: { profile: string }) {
  const config = resolveAppShellConfig(profile)
  return (
    <MemoryRouter initialEntries={['/painel']}>
      <AppShellFrame role={profile}>
        <div className="flex min-h-[320px]">
          <nav
            aria-label="Menu de exemplo"
            className="w-[var(--mx-sidebar-width-expanded)] shrink-0 border-r border-[hsl(var(--mx-color-border))] bg-[hsl(var(--mx-color-sidebar-background))] p-[var(--mx-space-4)]"
          >
            <p className="text-[length:var(--mx-font-size-xs)] text-[hsl(var(--mx-color-text-secondary))]">
              Sidebar de exemplo
            </p>
          </nav>
          <main
            id={config.mainContentId}
            tabIndex={-1}
            aria-label={config.mainContentLabel}
            className="flex-1 outline-none"
          >
            <Routes>
              <Route path="/painel" element={<FakePage name="Painel" />} />
              <Route path="/equipe" element={<FakePage name="Equipe" />} />
            </Routes>
          </main>
        </div>
      </AppShellFrame>
    </MemoryRouter>
  )
}

export const Dono: Story = { render: () => <ShellHarness profile="dono" /> }
export const Gerente: Story = { render: () => <ShellHarness profile="gerente" /> }
export const AdminMx: Story = { render: () => <ShellHarness profile="administrador_mx" /> }
