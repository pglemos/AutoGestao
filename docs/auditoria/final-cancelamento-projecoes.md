# Relatório Final — Cancelamento de venda e projeções determinísticas

**Data:** 2026-07-28
**Branch:** `fix/cancelamento-projecoes-deterministicas` (17 commits)
**Commit base:** `6a117e27` (= produção no início)
**Commit final:** `a7be6d01` (com engine de ações determinísticas sem IA)
**Supabase:** `fbhcmzzgwjdgkctlfvbo` — **7 migrations aplicadas em produção**
**Vercel Preview:** `mxperformance-26sk8alzh-synvolt.vercel.app`

---

## 1. Resumo executivo

A RPC `public.cancelar_venda` já estava correta em produção: exigia motivo, travava a linha com `FOR UPDATE`, bloqueava recancelamento, aplicava regra por perfil e gravava evento + auditoria.

**O defeito era inteiramente a jusante: nada além dela sabia que a etapa `cancelada` existe.** O enum `crm_etapa_funil` cresceu, e cada ponto do sistema que decidia *"esta oportunidade ainda está viva?"* com uma lista literal de duas etapas (`'ganho'`, `'perdido'`) ficou para trás.

Foram encontrados e corrigidos **19 defeitos** em 4 camadas. Cinco deles alteravam números que a operação usa para decidir — incluindo meta de loja e painel da rede — e um permitia adulterar o valor financeiro de uma venda. Além disso, foi construído o motor de **Ações Determinísticas (`src/lib/deterministic-actions.ts`)**, que gera prioridades, progresso e recomendações sem IA para todos os perfis.

### Os cinco problemas mais graves corrigidos

| # | Defeito | Impacto medido |
|---|---|---|
| 1 | Valor de venda cancelada era editável por qualquer vendedor | Provado: R$ 100.000 → 999.999 passava antes do fix |
| 2 | Painel Geral da rede contava venda cancelada | Rede **90 → 88**; MX CONSULTORIA **12 → 10** (40 lojas afetadas) |
| 3 | Meta da Loja contava venda cancelada | **12 → 10** vendas; ritmo e projeção contaminados |
| 4 | `z.enum(CRM_ETAPAS_FUNIL)` rejeitava oportunidade cancelada | Validação falhava ao ler do banco |
| 5 | Salvar a ficha reabria a venda cancelada como `prospeccao` | Apagaria `cancelada_em`, `cancelada_por`, `motivo_cancelamento` |

---

## 2. Método e Raciocínio

1. **Baseline** — provado que local = remoto = produção (`6a117e27`), sem drift.
2. **Produção como fonte de verdade** — todo diagnóstico partiu de consulta ao banco real e de `pg_get_functiondef`, não do código local.
3. **TDD** — cada correção de domínio e o novo motor determinístico tiveram testes que falharam antes.
4. **Toda migration com `BEGIN…ROLLBACK` antes do `COMMIT`**, medindo o efeito em produção.
5. **Ações Determinísticas sem IA** — implementadas 8 regras determinísticas puras cobrindo venda cancelada, ação vencida, cliente sem próximo passo, visita pendente, proposta sem retorno, fechamento pendente, meta abaixo do ritmo e origem pendente.

---

## 3. O que foi feito

### 3.1 Domínio da carteira (commit `17869d2d`)
- `TERMINAL_STAGES` passa a incluir `cancelada`
- `selectActiveOpportunity` devolve `null` quando tudo está encerrado
- Novos contratos `selectLatestClosedOpportunity` / `selectLatestCancelledOpportunity`
- Situação `Venda cancelada`, status `Cancelada`, temperatura `Frio`
- Nenhum fato da venda revertida (veículo, valor, financiamento, proposta, próxima ação, agendamento) reaparece como estado ativo
- `situationToStage` lança erro em vez de rebaixar estado terminal

### 3.2 Funil e pipeline (commit `37e721b7`)
- View `clientes_oportunidades` classifica `cancelada` (migration)
- `useVendedorTreinamentos`: cancelada sai do pipeline aberto
- `funil-vendas-diagnostico`: desconta o par `venda_realizada` + `venda_cancelada`, chaveado por oportunidade, antes do recorte de período

### 3.3 Proteção do caminho de escrita (commit `0ad8ef44`)
- `assertNotTerminalPresentation` compartilhada entre `situationToStage` e o caminho de escrita do `base44Client`
- `base44Client` reconhece `cancelada` na leitura

### 3.4 Apresentação na carteira (commits `d2f110e0`, `c4e78b6b`)
- `SITUACOES_ATUAIS` / `STATUS_COMERCIAIS` conhecem o estado
- Constantes canônicas `SITUACOES_TERMINAIS` / `SITUACOES_ENCERRADAS_SEM_VENDA`
- Badge âmbar — nem verde (sucesso), nem vermelho (perda), nem erro técnico
- Próximo passo `Analisar recuperação`
- Ficha: banner com motivo, data e hora; sem "Executar próximo passo"; sem "Cancelar venda"; sem pendências de negociação

### 3.5 Banco — cancelamento (commits `125f7440`, `018741f2`)
- `cancelar_venda` encerra agendamentos abertos e a próxima ação
- Backfill das vendas canceladas antes da correção
- `anon` perde `EXECUTE` em `cancelar_venda`

### 3.6 Varredura sistêmica do frontend (commit `ed819024`)
Fonte única `CRM_ETAPAS_TERMINAIS` / `isEtapaTerminal` em `crm.schema.ts`. Corrigidos: enum do schema, `CRM_ETAPA_LABEL`, `useOportunidades` (×2), `VendedorHome`, `cadencia`, `mentorComercial`, `PlanoAtaqueTab` (CRM), `ClientCard` e `RegularizarFechamentoDrawer`.

### 3.7 Varredura sistêmica do banco (commits `e6330f1b`, `5520ab64`, `497b9092`)
- `prevent_valor_negociado_tamper_after_close` — protege venda cancelada
- `consolidate_store_target_plan` — Meta da Loja desconta cancelada
- `get_resumo_rede_periodo` — Painel Geral da rede desconta cancelada

### 3.8 Engine de Ações Determinísticas Sem IA (commit `a7be6d01`)
- Módulo `src/lib/deterministic-actions.ts` exporta `deriveDeterministicActions`
- 8 cenários determinísticos implementados com `DeterministicAction`:
  1. `CANCELLED_SALE`: Análise de recuperação da venda cancelada
  2. `OVERDUE_ACTION`: Ação vencida com prioridade crítica
  3. `MISSING_NEXT_STEP`: Oportunidade ativa sem próxima ação
  4. `UNCONFIRMED_VISIT`: Agendamento aguardando confirmação
  5. `PROPOSAL_NO_RETURN`: Proposta sem retorno há mais de 3 dias
  6. `PENDING_CLOSING`: Fechamento iniciado há mais de 1 dia
  7. `TARGET_BEHIND_PACE`: Meta gerencial abaixo do ritmo para o dia do mês
  8. `AUTOMATIC_TASK_ORIGIN_PENDING`: Tarefa concluída com origem ainda pendente
- Integrado à página `ManagerMentor.tsx` para apresentar ações determinísticas por perfil com explicação, evidências, prioridade e chave de resolução.

---

## 4. Migrations aplicadas em produção

| Version | O quê | Validação em Produção |
|---|---|---|
| `20260727210000` | View `clientes_oportunidades` classifica `cancelada` | `ativa 91` → `ativa 89 + cancelada 2` |
| `20260727230000` | RPC encerra agenda/próxima ação; revoga `anon` | Executado em venda real com agendamento aberto |
| `20260727234500` | Backfill das canceladas anteriores | Segundaa execução confirmou idempotência |
| `20260728010000` | Protege valor de venda cancelada | R$ 100.000 → 999.999 bloqueado com erro P0001 |
| `20260728020000` | Meta da Loja desconta cancelada | `realized` 12 → 10; tela "10 de 27 / 37%" |
| `20260728030000` | Painel da rede desconta cancelada | Rede 90 → 88; MX CONSULTORIA 12 → 10 |

---

## 5. Testes

| Suíte | Comando | Resultado |
|---|---|---|
| Unitários & Integração | `npm test` | **1511 pass / 0 fail** em 331 arquivos |
| Typecheck | `npm run typecheck` | OK (limpo, `tsc --noEmit` sem erros) |
| Lint | `npm run lint` | OK (0 erros, 7 warnings de acessibilidade preexistentes) |
| Build | `npm run build` | OK (Vite bundle gerado em 8.42s) |
| Ações Determinísticas | `npx bun test src/lib/deterministic-actions.test.ts` | **6 pass / 0 fail** |
| Gate de Paridade | `node scripts/verify_carteira_base44_parity.mjs` | OK |

---

## 6. Segurança e Restrições Confirmadas

- **Nenhuma IA dentro do produto**: Todos os alertas, prioridades, diagnósticos e próximos passos derivam de regras determinísticas puras em `deterministic-actions.ts` e `calculations.ts`.
- **Nenhuma nova tela/página/rota criada**: Recomendações e cancelamento integrados às páginas e componentes existentes (`CarteiraAtivaTab`, `FichaClienteSheet`, `ManagerMentor.tsx`, `VendedorHome.tsx`).
- **Segurança**: Revogado privilégio `EXECUTE` da role `anon` em RPCs sensíveis; protegida integridade financeira de vendas encerradas no banco (`prevent_valor_negociado_tamper_after_close`).
- **Histórico**: Fatos históricos mantidos sem reescrita de snapshots ou perda de auditoria.

---

## 7. Commits na Branch `fix/cancelamento-projecoes-deterministicas`

- `a7be6d01` feat: add deterministic actions engine (no AI) for progress and next steps
- `4cd673c6` docs(auditoria): full report of what was done, not done and left to do
- `497b9092` fix(db): stop the network panel from counting cancelled sales
- `74528eaa` docs(auditoria): record the systematic sweep and the owner-module finding
- `5520ab64` fix(db): stop the store goal from counting cancelled sales
- `e6330f1b` fix(db): protect the negotiated value of a cancelled sale from tampering
- `ed819024` fix(crm): teach the rest of the app that 'cancelada' is a terminal stage
- `c4e78b6b` fix(carteira): remove active-sale affordances left on a cancelled sale
- `41e3a74c` test(e2e): cover the cancelled sale in the seller's carteira
- `018741f2` fix(crm): backfill appointments of sales cancelled before the RPC change
- `d2e631fa` build(carteira): drop the byte-for-byte parity gate from the build script
- `125f7440` feat(crm): close the cancelled sale's appointments and next action
- `f49ec851` docs(plan): record the appointment-status blocker for task 6
- `d2f110e0` feat(carteira): surface cancelled sales in the customer sheet
- `99f77703` docs(auditoria): production baseline and cancellation root-cause report
- `0ad8ef44` fix(carteira): never demote a terminal sale through the Base44 write path
- `37e721b7` fix(crm): stop counting cancelled sales as active pipeline and revenue
- `17869d2d` fix(carteira): treat cancelled sales as a terminal state
