import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { LayoutGrid, List, Kanban, DollarSign, Target } from 'lucide-react'

import {
  AlertMessage,
  ErrorState,
  FilterChip,
  LoadingState,
  MetricCard,
  NotificationItem,
  Pagination,
  SearchField,
  SortControl,
  UserSummary,
  ViewModeSelector,
} from '@/components/molecules'

const meta = {
  title: 'Design System/Moléculas',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[var(--mx-space-8)]">
      <h2 className="mb-[var(--mx-space-3)] text-[length:var(--mx-font-size-h3)] font-semibold text-[hsl(var(--mx-color-text-primary))]">
        {title}
      </h2>
      {children}
    </section>
  )
}

export const Catalogo: Story = {
  render: () => {
    const [query, setQuery] = React.useState('Centro')
    const [page, setPage] = React.useState(2)
    const [view, setView] = React.useState<'lista' | 'cards' | 'kanban'>('cards')
    const [sort, setSort] = React.useState<'asc' | 'desc' | null>('desc')
    const [chips, setChips] = React.useState(['Loja', 'Período'])

    return (
      <div className="max-w-[var(--mx-content-max-width)]">
        <Section title="SearchField">
          <div className="max-w-md space-y-4">
            <SearchField label="Buscar cliente" value={query} onValueChange={setQuery} placeholder="Nome, telefone ou e-mail" />
            <SearchField label="Buscando" value="carregando" onValueChange={() => {}} loading />
            <SearchField label="Vazio" value="" onValueChange={() => {}} placeholder="Digite para buscar" />
            <SearchField label="Bloqueado" value="" onValueChange={() => {}} disabled placeholder="Indisponível" />
          </div>
        </Section>

        <Section title="FilterChip">
          <div className="flex flex-wrap gap-2">
            <FilterChip label="Situação" value="Em aberto" selected count={12} />
            <FilterChip label="Temperatura" value="Quente" />
            {chips.map((c) => (
              <FilterChip
                key={c}
                label={c}
                selected
                onRemove={() => setChips((prev) => prev.filter((p) => p !== c))}
              />
            ))}
          </div>
        </Section>

        <Section title="MetricCard">
          <div className="grid gap-[var(--mx-widget-gap)] sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Faturamento"
              value="R$ 128.430,50"
              icon={<DollarSign />}
              trend={{ direction: 'up', label: '+12,5%', isPositive: true }}
            />
            <MetricCard
              label="Conversão"
              value="87,5%"
              icon={<Target />}
              trend={{ direction: 'down', label: '-3,1%', isPositive: false }}
              hint="vs. mês anterior"
            />
            <MetricCard label="Oportunidades paradas" value="14" trend={{ direction: 'down', label: '-8', isPositive: true }} />
            <MetricCard label="Carregando" value="—" loading />
          </div>
        </Section>

        <Section title="AlertMessage">
          <div className="space-y-3">
            <AlertMessage tone="info" title="Fechamento abre às 18h">
              Os lançamentos ficam disponíveis a partir do horário definido pelo gerente.
            </AlertMessage>
            <AlertMessage tone="success" title="Plano de ação salvo" onDismiss={() => {}} />
            <AlertMessage tone="warning" title="3 oportunidades sem próximo passo">
              Defina o próximo passo para não perder o acompanhamento.
            </AlertMessage>
            <AlertMessage tone="danger" title="Não foi possível salvar">
              Seus dados foram preservados. Tente novamente.
            </AlertMessage>
          </div>
        </Section>

        <Section title="LoadingState">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[var(--mx-card-radius)] border border-[hsl(var(--mx-color-border))]">
              <LoadingState />
            </div>
            <div className="rounded-[var(--mx-card-radius)] border border-[hsl(var(--mx-color-border))] p-4">
              <LoadingState variant="skeleton" rows={4} />
            </div>
          </div>
        </Section>

        <Section title="ErrorState">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[var(--mx-card-radius)] border border-[hsl(var(--mx-color-border))]">
              <ErrorState kind="network" onRetry={() => {}} />
            </div>
            <div className="rounded-[var(--mx-card-radius)] border border-[hsl(var(--mx-color-border))]">
              {/* Mesma composição usada pela rota 403 em App.tsx. */}
              <ErrorState
                kind="permission"
                reference="Perfil: vendedor · Rota: /plano-estrategico"
                action={(
                  <button
                    type="button"
                    className="inline-flex h-[var(--mx-button-height-md)] items-center rounded-[var(--mx-button-radius)] bg-[hsl(var(--mx-color-primary))] px-[var(--mx-button-padding-inline-md)] text-[length:var(--mx-font-size-base)] font-semibold text-[hsl(var(--mx-color-primary-foreground))]"
                  >
                    Voltar para minha área
                  </button>
                )}
              />
            </div>
          </div>
        </Section>

        <Section title="Pagination / SortControl / ViewModeSelector">
          <div className="space-y-4">
            <Pagination page={page} pageSize={25} totalItems={1340} onPageChange={setPage} />
            <Pagination page={1} pageSize={25} totalItems={0} onPageChange={() => {}} />
            <div className="flex items-center gap-6">
              <SortControl label="Faturamento" direction={sort} onSortChange={setSort} />
              <SortControl label="Cliente" direction={null} onSortChange={() => {}} />
              <ViewModeSelector
                label="Modo de visualização"
                value={view}
                onValueChange={setView}
                options={[
                  { value: 'lista', label: 'Lista', icon: <List /> },
                  { value: 'cards', label: 'Cards', icon: <LayoutGrid /> },
                  { value: 'kanban', label: 'Kanban', icon: <Kanban /> },
                ]}
              />
            </div>
          </div>
        </Section>

        <Section title="UserSummary / NotificationItem">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <UserSummary name="Pedro Guilherme Lemos" caption="Dono · MX Performance" />
              <UserSummary name="Ana" caption="Vendedora · Loja Centro" size="sm" />
              <UserSummary name="Carlos Eduardo Silva" caption="Avatar quebrado" avatarUrl="/imagem-inexistente.png" />
            </div>
            <ul className="rounded-[var(--mx-card-radius)] border border-[hsl(var(--mx-color-border))]">
              <NotificationItem
                title="Meta mensal atingida"
                description="A Loja Centro bateu 102% da meta de julho."
                timestamp="há 5 min"
                tone="success"
                unread
                onSelect={() => {}}
              />
              <NotificationItem
                title="4 oportunidades sem contato há 7 dias"
                timestamp="há 2 h"
                tone="warning"
                onSelect={() => {}}
              />
              <NotificationItem title="Relatório de junho disponível" timestamp="29/07/2026 15:30" tone="info" />
            </ul>
          </div>
        </Section>
      </div>
    )
  },
}
