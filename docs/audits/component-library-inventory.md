# Inventário da biblioteca de componentes — Fase 4

> Medido em 2026-07-31, contra `origin/main` em `3474e6d6`.

## Estado atual

| Camada | Quantidade |
|---|---|
| `components/atoms` | 24 |
| `components/molecules` | 27 |
| `components/organisms` | 6 |
| `components/templates` | **0** |
| `components/ui` (shadcn) | 53 |
| Stories (`*.stories.tsx`) | 8 |

A estrutura de Atomic Design existe e está povoada nas três primeiras camadas. Os dois gaps de estrutura são a camada de templates, vazia, e a cobertura de Storybook — 8 stories para mais de 100 componentes.

## Duplicata confirmada: `CreateStoreModal`

Três implementações do mesmo modal, uma por feature. É o caso que §11.5 nomeia — "não criar uma cópia de componente para cada perfil".

| Arquivo | Linhas | API | Acessibilidade |
|---|---|---|---|
| `features/lojas/modals/CreateStoreModal.tsx` | 159 | estado externo + `modalRef` | focus trap, ESC, botão de fechar rotulado |
| `features/configuracoes/components/CreateStoreModal.tsx` | 99 | estado interno, `onSubmit(name, email)` devolve erro | — |
| `features/dashboard-loja/sections/CreateStoreModal.tsx` | 70 | estado externo, `onSubmit(FormEvent)` | — |

Os três coletam exatamente os mesmos dois campos: nome da loja e e-mail do gestor. Divergem em placeholder (`MX FORTALEZA`, `MX SÃO PAULO - LESTE`), em quem guarda o estado e em quanto de §20 cumprem.

O de `lojas` é o único que satisfaz o §20 (foco preso, Escape fecha, nome acessível). Deve ser o canônico.

### Por que não consolidei junto com este inventário

A consolidação não é mover arquivo: as três APIs são incompatíveis entre si. Uma guarda o estado internamente e devolve erro pelo retorno; as outras duas recebem estado de fora, e mesmo entre elas o `onSubmit` tem assinatura diferente (`FormEvent` contra nada). Unificar exige escolher uma forma e reescrever os três pontos de uso, com verificação em três telas — Lojas, Configurações e Dashboard da Loja — cada uma com fluxo de criação real contra o Supabase.

É trabalho de uma sessão dedicada, com teste de criação ponta a ponta em cada tela. Fazer pela metade aqui deixaria duas telas com um modal que compila e não salva.

## Próximos passos, em ordem de retorno

1. **Consolidar `CreateStoreModal`** no de `lojas`, com API de estado externo. Migrar Configurações e Dashboard da Loja. Verificar criação real nas três.
2. **Camada de templates** (§11.4): dashboard, listagem, detalhe, formulário, fluxo em etapas, relatório, configuração, estado vazio, erro. Hoje cada tela remonta a própria composição.
3. **Storybook** para os componentes compartilhados que já provaram render mais: `Avatar`, `TabNav`, `TabNavPill`, `Button`, `PageCanvas`. Corrigir `Avatar` e `TabNav` zerou três rotas de acessibilidade de uma vez — são exatamente os que merecem estado documentado.
4. **Avaliar sobreposição `ui/` × `atoms/`**: 53 componentes shadcn convivem com 24 atoms. Parte é base do shadcn consumida pelos atoms, parte pode ser par redundante. Precisa de contagem de uso antes de qualquer decisão.

## Observação de método

O maior retorno desta frente veio de componentes compartilhados, não de telas. Duas edições — `Avatar` e `TabNav` — zeraram a dívida de acessibilidade de `/pdi`, `/organograma` e `/banco-talentos` simultaneamente. Vale priorizar por número de consumidores, não por tamanho do arquivo.
