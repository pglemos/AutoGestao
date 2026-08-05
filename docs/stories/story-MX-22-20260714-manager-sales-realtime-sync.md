# Story MX-22.5.1 - Sincronização em tempo real das vendas no Módulo Gerencial

## Status

Ready for Review

## Epic Reference

- **Épico:** EPIC-MX-22 — Fechamento Diário do Vendedor
- **Integração:** Módulo Gerencial / LIAL / conta `vgs.victor@icloud.com`
- **Data do diagnóstico:** 2026-07-14

## Story

**As a** gerente da loja,
**I want** que a tela de Fechamento Diário atualize automaticamente quando um vendedor salva ou finaliza o lançamento do dia,
**so that** eu acompanhe as vendas sem precisar recarregar a página ou clicar em Atualizar.

## Acceptance Criteria

1. **Given** uma conta de gerente com vínculo ativo à loja, **when** `lancamentos_diarios` sofre `INSERT`, `UPDATE` ou `DELETE` para essa loja, **then** a tela gerencial refaz as consultas do dia e do histórico sem reload manual.
2. **Given** o dashboard gerencial que já assina `lancamentos_diarios`, **when** o banco publica alterações nessa tabela, **then** a subscription recebe eventos Realtime em produção.
3. **Given** uma falha ou encerramento do canal Realtime, **when** o gerente permanece na tela, **then** a tela mantém os dados atuais e exibe fallback explícito para usar `Atualizar`.
4. **Given** a conta `vgs.victor@icloud.com` na loja `LIAL`, **when** a tela `/fechamento-diario` é aberta, **then** os vendedores vinculados e os fechamentos oficiais disponíveis aparecem sem erro de autorização.
5. **Given** o vendedor salva um lançamento oficial, **when** o gerente está na tela, **then** os valores de vendas exibidos são os campos oficiais de `lancamentos_diarios`, sem duplicação ou dados inventados.

## Scope

**IN:** migration idempotente para adicionar `public.lancamentos_diarios` à publicação `supabase_realtime`; subscription/debounce e fallback da tela gerencial; testes unitários/componentes do comportamento de sincronização; evidência de banco, rede e Chrome real em LIAL.

**OUT:** alteração de regras de fechamento, autorização/RLS, cálculo de vendas, criação de vendas artificiais ou alteração de dados reais dos vendedores.

## Technical Notes

- A fonte canônica observada no código é `public.lancamentos_diarios`.
- `src/features/dashboard-loja/hooks/useDashboardLojaData.ts` já escuta `lancamentos_diarios`, mas nenhuma migration vigente encontrada adiciona a tabela à publicação `supabase_realtime`.
- `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx` usa `useCheckinsByDateRange` e só atualiza ao carregar ou ao clicar em `Atualizar`.
- A loja LIAL possui ID `855a788c-eb07-4f37-a1ec-090de14e570f` e Vitor possui vínculo gerencial ativo confirmado no diagnóstico.

## Tasks / Subtasks

- [x] Criar migration idempotente para habilitar Realtime em `lancamentos_diarios`.
- [x] Adicionar subscription da tela gerencial com debounce e tratamento de `CHANNEL_ERROR`/`TIMED_OUT`.
- [x] Cobrir montagem, evento e cleanup do canal em teste.
- [x] Rodar typecheck, lint, testes focados, build e gates completos.
- [x] Validar no Chrome real a conta de Vitor/LIAL e confirmar requisição/subscription após publicação.
- [x] Atualizar este arquivo com File List, evidências e QA Results.

## File List

- [x] `supabase/migrations/20260714185743_manager_sales_realtime_sync.sql`
- [x] `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx`
- [x] `src/features/manager/daily-closing/manager-closing-realtime.ts`
- [x] `src/features/manager/daily-closing/manager-closing-realtime.test.ts`
- [x] `src/lib/manager-sales-realtime-migration.test.ts`
- [x] `docs/stories/story-MX-22-20260714-manager-sales-realtime-sync.md`

## CodeRabbit Integration

- **Primary Type:** Database + Frontend integration
- **Primary Agents:** @dev, @data-engineer
- **Supporting Agents:** @qa, @github-devops
- **Focus:** migration idempotency, publication safety, cleanup de subscriptions, fallback observável e ausência de duplicação de refetch.

## QA Results

- Migration aplicada no Supabase remoto do projeto `fbhcmzzgwjdgkctlfvbo`; consulta de verificação retornou `lancamentos_table=lancamentos_diarios` e `in_realtime=true`.
- Teste focado: 3 pass / 0 fail (`manager-closing-realtime`, migration contract e CheckinForm contract).
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, 0 errors e 22 warnings preexistentes.
- `npm test`: PASS, 950 pass / 0 fail.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Supabase advisors: sem finding novo relacionado à migration; o projeto mantém alertas gerais preexistentes de Auth/RLS/performance.
- CodeRabbit CLI: revisão não executada por rate limit do plano (`waitTime=25 minutes`), sem findings disponíveis.
- Chrome real: PASS em `https://mxperformance.vercel.app` usando link temporário administrativo do Supabase para `vgs.victor@icloud.com`; `/minha-equipe` e `/fechamento-diario` carregaram com o nome de Vitor, unidade LIAL e os vendedores João, Dielle e Bruno.
- Realtime em produção: PASS; o WebSocket Supabase abriu e o canal `manager-closing-sync-855a788c-eb07-4f37-a1ec-090de14e570f` retornou `phx_reply status=ok` e `Subscribed to PostgreSQL` para `lancamentos_diarios` com filtro `store_id=eq.855a788c-eb07-4f37-a1ec-090de14e570f`.
- Dados remotos: PASS; LIAL está ativa, os cinco usuários informados possuem vínculo ativo correto, e o fechamento oficial de 14/07/2026 foi carregado sem erro de autorização. A única venda oficial registrada no dia consultado possui valor 0; a tela não inventa vendas.
- Console e rede: PASS; zero erros de console/page errors, requisições REST de `lancamentos_diarios` observadas e nenhum fallback de Realtime exibido. Um evento de escrita não foi injetado para não alterar dados reais; o comportamento de evento/debounce permanece coberto pelos testes automatizados.
- Evidências visuais: `output/playwright/vitor-chrome-supabase-link-minha-equipe.png`, `output/playwright/vitor-chrome-supabase-link-fechamento-diario.png` e `output/playwright/vitor-supabase-link-minha-equipe-expanded.png`.
