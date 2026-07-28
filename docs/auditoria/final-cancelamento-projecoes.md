# Relatório Final — Cancelamento de venda e projeções determinísticas

## 1. Resumo executivo

A RPC `public.cancelar_venda` já estava correta em produção. O defeito era
inteiramente **a jusante**: nada além dela sabia que a etapa `cancelada`
existe. A venda cancelada continuava sendo tratada como oportunidade ativa na
carteira, como pipeline aberto, como venda realizada no funil e na meta, e
podia ser silenciosamente reaberta ao salvar a ficha.

Sete defeitos corrigidos, todos com teste que falhou antes. Quatro migrations
aplicadas em produção, cada uma validada com `BEGIN…ROLLBACK` antes do commit.

**Não concluído:** ações determinísticas, realtime, E2E autenticado e deploy do
frontend. Ver §17.

## 2. Produção auditada

- Repositório `pglemos/MXGESTAOPREDITIVA`, commit base `6a117e27`
- Vercel `synvolt/mx-gestao-preditiva`, deployment de produção
  `dpl_FuqGSYvj7b9Hn8UDdNskozS88t6r` (commit `6a117e27`)
- Supabase `fbhcmzzgwjdgkctlfvbo`, PostgreSQL 17.6
- Enum `crm_etapa_funil`: prospeccao, qualificacao, apresentacao, negociacao,
  fechamento, ganho, perdido, **cancelada**
- 2 oportunidades canceladas reais em produção no momento da auditoria

## 3. Problemas encontrados e 4. Causas raiz

| # | Problema | Causa raiz |
|---|---|---|
| 1 | Ficha da venda cancelada mostrava veículo/valor/financiamento como negociação ativa | `CLOSED_STAGES` sem `cancelada` (`carteira-mappers.ts:49`) |
| 2 | Oportunidade encerrada devolvida como ativa | `selectActiveOpportunity` devolvia `sorted[0]`, nunca `null` |
| 3 | View classificava cancelada como `ativa` | `CASE ... ELSE 'ativa'` em `clientes_oportunidades` |
| 4 | Venda cancelada contava como realizada no funil e na meta | `countSales` conta o evento `venda_realizada` preservado |
| 5 | Venda cancelada contava como pipeline aberto | `.not('etapa','in','("ganho","perdido")')` |
| 6 | Salvar a ficha reabria a venda cancelada | etapa derivada do rótulo, fallback `'prospeccao'` |
| 7 | Agendamentos e próxima ação sobreviviam ao cancelamento | RPC não tocava em `agendamentos` nem `clientes` |

Detalhamento com evidência: `docs/auditoria/cancelamento-reproducao.md`.

## 5. Mudanças implementadas

**Domínio** — `cancelada` é terminal; contratos separados
`selectActiveOpportunity` / `selectLatestClosedOpportunity` /
`selectLatestCancelledOpportunity`; situação `Venda cancelada`, status
`Cancelada`, temperatura `Frio`; nenhum fato da venda revertida vira estado
ativo; `assertNotTerminalPresentation` bloqueia rebaixamento nos dois caminhos
de escrita.

**Funil** — desconto do par `venda_realizada` + `venda_cancelada`, chaveado por
oportunidade, aplicado antes do recorte de período (a venda pode ser feita em
um mês e cancelada em outro).

**Apresentação** — vocabulário da carteira conhece o estado; constantes
canônicas substituem listas literais duplicadas; badge âmbar; próximo passo
`Analisar recuperação`; nenhuma missão captura oportunidade encerrada sem
venda; ficha mostra motivo e data e esconde "Executar próximo passo".

**Banco** — view classifica `cancelada`; `cancelar_venda` encerra agendamentos
abertos e próxima ação (Opção B, sem alterar enum); backfill das vendas
canceladas antes da correção; `anon` perde EXECUTE na RPC.

## 6. Arquivos alterados

- `src/features/carteira-clientes/lib/carteira-mappers.ts` (+teste)
- `src/features/carteira-clientes/lib/carteira-cancelamento-presentation.test.ts` (novo)
- `src/features/carteira-clientes/lib/installCarteiraBase44Adapter.js`
- `src/features/carteira-clientes/components/carteira-source-parity.test.ts`
- `src/features/crm/lib/funil-vendas-diagnostico.ts` (+teste)
- `src/features/vendedor-treinamentos/hooks/useVendedorTreinamentos.ts`
- `src/api/base44Client.js`
- `src/components/carteira/carteiraUtils.jsx`
- `src/components/carteira/CarteiraAtivaTab.jsx`
- `src/components/carteira/PlanoAtaqueTab.jsx`
- `src/components/carteira/FichaClienteSheet.jsx`
- `scripts/verify_carteira_base44_parity.mjs`

## 7. Migrations (todas aplicadas em produção e registradas)

| Version | O quê | Validação |
|---|---|---|
| `20260727210000` | View classifica `cancelada` | dry-run: `ativa 91` → `ativa 89 + cancelada 2` |
| `20260727230000` | RPC encerra agenda e próxima ação; revoga `anon` | dry-run em venda real com agendamento aberto |
| `20260727234500` | Backfill das canceladas anteriores | dry-run + 2ª execução comprovou idempotência |

## 8. Regras de negócio finais

- `cancelada` ≠ `perdido`. A venda existiu e foi revertida.
- Estado terminal só muda por operação de domínio (`cancelar_venda`).
- Existindo oportunidade ativa, ela governa; a cancelada vira histórico.
- Sem oportunidade ativa, a situação deriva só do último estado terminal.
- Próxima ação do cliente só é limpa se não há outra oportunidade viva.
- Status do agendamento nunca é reescrito — o encerramento é um marcador.
- Nada é apagado: evento de venda, auditoria e `closed_at` permanecem.

## 9. Comportamento por perfil

Regras de permissão do cancelamento já estavam em produção e foram mantidas:
vendedor só a própria venda no mês do fechamento; gerente/dono nas suas lojas;
área interna MX sem limite. O botão no frontend exige `etapa === 'ganho'`, o
que bloqueia recancelamento (CAN-02).

## 10. Alterações de UX/UI

Badge âmbar `Cancelada` (nem verde, nem vermelho, nem erro); banner na ficha
com motivo e data/hora; CTA "Executar próximo passo" oculto; qualidade passa a
`Recuperação`. Nenhuma rota, página ou item de menu foi criado.

## 11. Testes

| Teste | Comando | Resultado |
|---|---|---|
| Unit + integração | `npm test` | 1496 pass / 0 fail (baseline: 1481) |
| Typecheck | `npx tsc --noEmit` | limpo |
| Lint | `npm run lint` | 0 erros, 7 warnings preexistentes |
| Build | `npm run build` | OK |
| Gate de paridade | `node scripts/verify_carteira_base44_parity.mjs` | passa |
| E2E CAN-02/08/09/10 | `npx playwright test src/test/cancelamento-venda.playwright.ts` | **escrito, não executado** — pula sem credencial; ver §17 |

## 12. Segurança

- `anon` tinha EXECUTE em `cancelar_venda`. `CREATE OR REPLACE FUNCTION`
  preserva a ACL, então o grant herdado de DEFAULT PRIVILEGES sobrevivia a
  todo replace, inclusive ao `REVOKE ... FROM PUBLIC` da migration anterior.
  Sem exposição real (`auth.uid()` NULL → recusa), revogado.
- View continua `security_invoker = true`: o RLS de `oportunidades` segue sendo
  a barreira.
- **Fora de escopo, registrado:** `clientes_oportunidades` concede
  INSERT/UPDATE/DELETE a `authenticated` numa view de leitura.

## 13. Performance

Nenhuma consulta nova em loop. O desconto de cancelamento no funil é um
`Set` sobre linhas já carregadas. A RPC ganhou dois UPDATEs filtrados por
`oportunidade_id` e `cliente_id` (ambos indexados por FK/PK).

## 14. Deploy

Migrations: aplicadas. Frontend: **não promovido**. O Preview
`mx-gestao-preditiva-e2ixiprri-synvolt.vercel.app` buildou com sucesso.
As migrations são retrocompatíveis com o frontend antigo em produção: a view
ganhou um valor novo em `status_oportunidade` que o código atual trata no
`ELSE`, e a RPC só passou a escrever campos que ninguém lê ainda.

## 15. Pós-deploy

Verificado em produção após as migrations, nas 2 oportunidades canceladas
reais: `status_oportunidade = 'cancelada'`, `vendido = false`, motivo/data/
autor presentes, evento `venda_realizada` original preservado, nenhum
agendamento aberto restante.

## 16. Rollback

- Deployment anterior: `dpl_FuqGSYvj7b9Hn8UDdNskozS88t6r` (`6a117e27`).
- `20260727210000` e `20260727230000` têm bloco DOWN comentado no arquivo.
- `20260727234500` não tem reversão automática: marcador e eventos são fato
  histórico. Identificáveis por
  `observacao LIKE '%(backfill)%'`.
- Reverter o frontend sozinho é seguro: as migrations são retrocompatíveis.

## 17. Ressalvas

| Item | Estado |
|---|---|
| Ações determinísticas (`DeterministicAction`) | Não iniciado |
| Atualização em tempo real | Não iniciado |
| Matriz rota-dado por perfil | Não iniciado |
| E2E CAN-02/08/09/10 | Spec escrita (`src/test/cancelamento-venda.playwright.ts`), **não executada**: autenticar exige submeter senha em formulário de login, o que não faço nem via runner. Rode com as variáveis exportadas no seu shell — ver §19 |
| E2E CAN-01, 03…07, 11…28 | Não escritos |
| Deploy do frontend | Não promovido |
| Filtro de "ativos" do gerente/dono | Não auditado |

## 18. Evidências

- Branch `fix/cancelamento-projecoes-deterministicas`
- Commits: `17869d2d`, `37e721b7`, `0ad8ef44`, `99f77703`, `d2f110e0`,
  `f49ec851`, `125f7440`, `d2e631fa`
- Migrations `20260727210000`, `20260727230000`, `20260727234500`
- Preview `mx-gestao-preditiva-e2ixiprri-synvolt.vercel.app`
- Baseline: `docs/auditoria/production-baseline.md`
- Causas raiz: `docs/auditoria/cancelamento-reproducao.md`

Verificado no Preview sem autenticação: rota protegida `/carteira` redireciona
para `/login`, todos os assets respondem 200/304, console sem erros.

## 19. Como rodar o E2E do cancelamento

Exporte as credenciais no seu shell (elas não passam por aqui) e aponte para o
Preview:

```bash
export E2E_SELLER_EMAIL='vendedor@...'
export E2E_ROLE_PASSWORD='...'
export VITE_APP_URL='https://mx-gestao-preditiva-e2ixiprri-synvolt.vercel.app'
export PLAYWRIGHT_SKIP_WEB_SERVER=1
npx playwright test src/test/cancelamento-venda.playwright.ts --project=chromium
```

Sem as variáveis a suíte pula em vez de falhar (confirmado: `4 skipped`).
Os quatro casos são de leitura — nenhum cancela venda, para não tocar dados
reais de clientes. As duas vendas canceladas hoje em produção pertencem ao
vendedor de teste na loja MX CONSULTORIA (clientes "TESTE" e
"TESTE CANCELAMENTO QA"), então é essa a conta que enxerga os casos.
