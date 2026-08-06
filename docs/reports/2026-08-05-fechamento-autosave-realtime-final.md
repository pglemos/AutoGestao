# Fechamento diário — autosave, estados gerenciais, realtime e integridade comercial

**Status:** BLOCKED na validação em produção — implementação completa, banco aplicado, push retido.
**Branch:** `main` (sem worktree, sem branch de feature, sem PR).
**SHA inicial:** `ed52e0adf7f341ec35a3c537d7453d261524184b`
**SHA final (local, não enviado):** `a06c46b7`
**Tag de checkpoint:** `pre-fechamento-autosave-20260805T215639Z`

---

## 1. Bloqueio (impede concluir)

Durante o gate final, a API do projeto Supabase passou a responder **HTTP 402**:

```text
GET  {SUPABASE_URL}/rest/v1/lancamentos_diarios?select=id&limit=1  → 402
GET  {SUPABASE_URL}/auth/v1/health                                 → 402
{"message":"Service for this project is restricted due to the following violations:
 exceed_cached_egress_quota. The project owner must upgrade their plan or remove
 spend caps to restore service."}
```

Health por serviço (`GET /v1/projects/{ref}/health`), no mesmo instante:

| Serviço | Estado |
|---|---|
| `db` | healthy — `ACTIVE_HEALTHY` |
| `rest` | **UNHEALTHY** |
| `auth` | **UNHEALTHY** — mesma mensagem de restrição |

O banco está de pé (migrations aplicadas e consultadas com sucesso pela Management API), mas **PostgREST e Auth estão bloqueados por cota**. Ou seja: a aplicação em produção não autentica nem lê dados neste momento — independentemente desta entrega.

### O que isso impede

- E2E multiusuário (Task 21) e smoke real em produção (Task 28): exigem login.
- `npm run verify:db-types`: o comando regenera os tipos pela API restrita e falha por 402, não por drift. Os tipos no repositório **estão atualizados** (gerados com sucesso antes da restrição, commit `fafd9e47`).
- Push/deploy: retido por decisão — subir código que não pode ser validado em produção, com a produção fora do ar por cota, aumenta o risco sem nenhum ganho.

### Menor passo externo necessário

Ação do proprietário no painel Supabase (organização `MX GESTAO PREDITIVA`, projeto `fbhcmzzgwjdgkctlfvbo`): **subir o plano ou remover o spend cap** para restaurar o serviço. Não é ação que eu possa ou deva executar — envolve cobrança.

Nenhuma credencial foi rotacionada, revogada, substituída ou exposta.

---

## 2. Produção — banco

Migrations aplicadas via `supabase db push` (CLI linkada; MCP do Supabase segue sem permissão neste projeto):

| Migration | Efeito |
|---|---|
| `20260805220000_checkin_draft_revision_optimistic_lock` | `draft_revision`, `last_draft_saved_at`, `submit_checkin` com `expected_draft_revision`/`DRAFT_VERSION_CONFLICT`, `notify_manager_on_checkin` ignora rascunho |
| `20260805223000_official_read_models_exclude_drafts` | 3 views deixam de somar rascunho |
| `20260805224000_crm_transactional_commercial_events` | 4 RPCs transacionais + 2 helpers |
| `20260805225000_backfill_eventos_comerciais_orfaos` | reconciliou 199 eventos |
| `20260805230000_revoke_anon_from_crm_rpcs` | corrige exposição a `anon` |
| `20260805231000_restore_security_invoker_on_closing_views` | corrige `security_invoker` perdido |

Cada uma foi validada antes com `BEGIN … ROLLBACK` contra o banco real, e o rollback foi conferido consultando o schema depois.

### Dados antes → depois

| Métrica | Antes | Depois |
|---|---|---|
| Oportunidades `ganho` sem `venda_realizada` | 1 | **0** |
| Agendamentos `compareceu` sem atendimento | 76 | **0** |
| Total de `eventos_comerciais` | 1022 | 1221 |
| Eventos reconciliados pelo backfill | — | 199 |
| Linhas `draft` em `lancamentos_diarios` | 1 | 1 (inalterado) |

Evidência bruta: `docs/reports/2026-08-05-pre-condicoes-banco.json` e `2026-08-05-pos-condicoes-banco.json`.

Não medido/ não alterado: 51 duplicatas evento×oportunidade e 12 evento×agendamento **preexistentes**. Apagar fato comercial real não estava autorizado; ficam registradas aqui. A partir de agora a idempotência das RPCs impede novas duplicatas.

---

## 3. Correções entregues

### Autosave (Problemas A, B, C)

`checkin-autosave-coordinator.ts` grava de forma **serial** (uma request em voo), **coalescente** (só o snapshot mais recente é enviado), com retry apenas para erro transitório (1 s/2 s/4 s), estados terminais para conflito/auth/validação, offline e flush em `visibilitychange`. Integrado em `useCheckinPage`: alteração de campo marca sujo, confirmação de etapa força gravação, finalização faz flush antes de gravar.

### Concorrência (Problema novo, não listado no diagnóstico original)

`draft_revision` server-owned. Duas abas do mesmo vendedor não se sobrescrevem em silêncio: a revisão desatualizada recebe `DRAFT_VERSION_CONFLICT` e a finalização é recusada.

### Estados gerenciais (Problema D)

`resolveClosingOperationalState` é a fonte única dos 7 estados. A Central de Fechamento parou de usar `Boolean(row.checkin)`; `officialRows`/`draftRows`/`notStartedRows` são explícitos e só o oficial alimenta contagem, disciplina, resumo, tendência e agendamentos. O rascunho continua visível, com horário do último salvamento e o aviso de que não entra em indicador oficial.

### Realtime (Problemas E)

`team-funnel-realtime.ts` assina `eventos_comerciais` e `agendamentos` por loja, agrupa rajadas em 400 ms e limpa o canal no unmount. Polling de 30 s só entra quando o canal falha, e pausa com a aba oculta. Ligado ao funil gerencial e à Rotina do Dia.

### Integridade comercial (Problema F)

Quatro RPCs `SECURITY DEFINER` gravam entidade e evento no mesmo commit, com `auth.uid()` obrigatório, validação de vínculo/loja, ownership explícito, idempotência determinística e erro genérico que não revela existência de registro de outra loja. O frontend passou a usar as RPCs e propaga o erro.

### Responsividade (Problema G) e ação final (H)

O bloco exclusivo de mobile que começava por Internet foi removido. Os dois breakpoints renderizam `FluxoFechamento` na ordem Showroom → Carteira → Internet → Vendas. A barra de status do rascunho é sticky e sempre visível, com `aria-live`; o botão que estava escondido em 1 px virou ação real.

---

## 4. Verificações (execução fresca, SHA `a06c46b7`)

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Unit/contrato | `npm test` | **1922 testes, 0 falhas** |
| Design system de gestão | `npm run audit:management-design-system` | exit 0 |
| Rotas e dados | `npm run audit:routes-data` | exit 0 |
| Bundle | `npm run check:bundle-size` | exit 0 |
| Estrutura | `npm run validate:structure` | exit 0 |
| Agentes | `npm run validate:agents` | exit 0 |
| Paridade | `npm run validate:parity` | exit 0 |
| Build | `npm run build` | exit 0 |
| Tipos do banco | `npm run verify:db-types` | **falha por 402 da API**, não por drift |
| E2E | `npm run test:e2e` | **não executado** — depende de login |

### Falhas preexistentes corrigidas nesta execução

Duas auditorias estavam vermelhas desde `f4311438` (unificação da tela de meta), provado rodando-as com os arquivos do SHA `ed52e0ad`: matriz de rotas nunca regenerada e contagem de superfícies de gestão parada em 38 quando o manifesto tem 37.

---

## 5. Achados de segurança desta mudança

| Achado | Classificação | Situação |
|---|---|---|
| Novas RPCs de CRM executáveis por `anon` | **introduzido por esta mudança** | corrigido em `20260805230000`. Causa: `ALTER DEFAULT PRIVILEGES` concede EXECUTE nominalmente a `anon`, e `REVOKE … FROM PUBLIC` não desfaz concessão nominal |
| `security_invoker` perdido em 3 views | **introduzido por esta mudança** | corrigido em `20260805231000`. Causa: `CREATE OR REPLACE VIEW` não preserva reloptions; as views voltaram a rodar com privilégio do dono, ignorando RLS |

Auditoria após as correções: nenhuma função `SECURITY DEFINER` tocada sem `search_path`, nenhuma executável por `anon`, RLS ativa nas quatro tabelas envolvidas, nenhuma view do schema `public` sem `security_invoker`.

Advisors nativos do Supabase não puderam ser executados: o MCP não tem permissão neste projeto e o endpoint REST de advisors responde 404 para este token. As checagens acima foram feitas por consulta direta ao catálogo (`pg_proc`, `pg_class`, `pg_policy`).

---

## 6. Rollback

**Código:** `git revert` dos 10 commits desta execução, ou reset para a tag `pre-fechamento-autosave-20260805T215639Z`. Como nada foi enviado, hoje basta não enviar.

**Banco:** todas as migrations são aditivas. As colunas novas têm default e são ignoráveis; as RPCs novas podem ser removidas (bloco DOWN de `20260805224000`) sem tocar em tabela. Para voltar o `submit_checkin`, recriar o corpo anterior — clientes antigos já funcionam com o corpo novo, porque o campo de revisão é opcional. Os 199 eventos do backfill são identificáveis por `observacao LIKE 'Evento reconciliado pelo backfill de 2026-08-05%'` e **não devem** ser removidos sem decisão do dono do dado: são fatos comerciais reais.

---

## 7. Critérios de aceite

Atendidos com evidência local e de banco: persistência do rascunho, flush na confirmação de etapa, sobrevivência a refresh, concorrência sem sobrescrita silenciosa, rascunho como `Em andamento` sem contar como finalizado nem entrar em indicador oficial, transacionalidade dos eventos, backfill sem duplicar, ordem única entre breakpoints, botão de rascunho visível, status sempre visível, finalização explícita com flush e recusa em conflito, RLS e `anon` sem execução, typecheck/lint/unit/build verdes.

Pendentes de validação, todos dependentes do login em produção: E2E multiusuário, smoke com vendedor e gerente simultâneos, confirmação do funil atualizando sem F5 em produção, CI e deployment Vercel no SHA final.

---

## 8. Credenciais

Usadas exclusivamente as sessões e conectores já configurados na máquina. Nenhuma rotacionada, revogada, substituída ou exposta. Nenhum segredo em log, commit ou neste relatório.
