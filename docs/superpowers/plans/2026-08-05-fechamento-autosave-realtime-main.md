# Plano de execução — fechamento-autosave-realtime-main

**Branch:** `main` direto (sem worktree, sem branch de feature, sem PR).
**Ledger:** `.superpowers/sdd/fechamento-autosave-realtime-main/progress.md`.
**Regra de push:** commits locais atômicos; push apenas nos gates de release, por `@devops`.

## Ondas

### Onda 1 — Fundação (sem UI)
1. **T2** Testes RED provando os 8 defeitos.
2. **T3** `closing-operational-state.ts` — resolução canônica + tabela completa de casos.
3. **T4** Migration `draft_revision`/`last_draft_saved_at` + `submit_checkin` com `expected_draft_revision`. Criada e testada localmente; **não aplicada** em produção nesta onda.

### Onda 2 — Autosave
4. **T5** `checkin-autosave-coordinator.ts` puro (serial, coalescente, latest-wins, retry com backoff 1/2/4 s, offline, conflito) + `useCheckinAutosave`.
5. **T6** Integração em `useCheckinPage`: snapshot puro, hidratação sem disparo, flush antes de `submitCheckin()`.

### Onda 3 — UI e fluxo
6. **T7** Barra de status visível (`aria-live`), botão de rascunho real, copy sem ambiguidade entre confirmar e finalizar.
7. **T8** Fluxo único Showroom → Carteira → Internet → Vendas em todos os breakpoints; remoção do bloco mobile Internet-first.
8. **T9** Finalização segura: commit de inputs, flush, checagem de revisão, resumo, confirmação, bloqueio.

### Onda 4 — Leitura gerencial
9. **T10** `officialCheckins` / `draftCheckins` / `notStartedRows` na Central de Fechamento; badges e prévia não oficial.
10. **T11** Testes de contrato dos read models oficiais (ranking, dashboard, disciplina) — reuso, sem reescrever o que já filtra `draft`.

### Onda 5 — Realtime
11. **T12** `team-funnel-realtime.ts` — assinatura de `eventos_comerciais` por loja, debounce 300–500 ms, fallback de polling 30 s, cleanup no unmount.
12. **T13** Inventário das telas de agendamentos e realtime onde o usuário espera tempo real.

### Onda 6 — Integridade comercial
13. **T14** RPCs transacionais de oportunidade/agendamento criando o evento no mesmo commit; frontend deixa de ignorar erro.
14. **T15** Relatório de órfãos em produção + backfill idempotente (`INSERT … SELECT … WHERE NOT EXISTS`).

### Onda 7 — Qualidade
15. **T16–T19** Observabilidade, segurança/RLS/advisors, a11y/responsividade, unit tests.
16. **T20–T23** Integração, E2E multiusuário, quality gate local completo, revisão adversarial.

### Onda 8 — Produção
17. **T24** Aplicar migration via Supabase CLI (MCP está sem permissão), regenerar tipos, rodar advisors.
18. **T25–T27** Commit de release, push por `@devops`, CI verde, deployment `READY` no SHA correto.
19. **T28–T30** Smoke real com vendedor + gerente simultâneos, teste de rollback, relatório final.

## Serialização

Um implementador por vez na mesma checkout. Revisores só leem. Nenhuma onda começa antes de a anterior ter revisão aprovada e commit local.

## Critérios de parada

Parar apenas nas condições do §13 do prompt-mestre (credencial insuficiente, indisponibilidade externa, risco de perda irreversível, drift destrutivo, bloqueio de permissão em CI/deploy, P0 não resolvível). Ao parar: preservar commits locais, registrar comando e erro exatos, informar o menor passo externo necessário.
