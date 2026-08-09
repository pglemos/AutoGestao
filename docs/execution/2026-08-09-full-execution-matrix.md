# Ledger integral derivado do prompt mestre

## Fechamento de release e QA — 2026-08-09T18:20:33Z

| Grupo | Resultado atual | Evidência |
|---|---|---|
| C0.1 Design System | `DONE_WITH_EVIDENCE` | workflows remotos do SHA `46c236db…` em `success` |
| C0.9 Deployment | `DONE_WITH_EVIDENCE` | `dpl_TTLku8NUz63Ac474Y9Z4HcZacHwi` `READY`, aliases e `/api/health` com release exata |
| C0.10 Evidências | `TESTED_PRODUCTION_PARTIAL` | browser real em quatro papéis efetivos, screenshots e ledger atualizado; dois papéis sem credencial |
| T10.11 Realtime | `TESTED_PRODUCTION` | migration aplicada, publicação confirmada e WebSocket autenticado com joins `notificacoes` |
| T13.1/T13.2 Sentry | `BLOCKED_EXTERNAL` | reautenticação pendente para evento sintético/source-map/alerta do SHA novo |
| T17.3/T17.4 E2E/matriz de rotas | `TESTED_PRODUCTION_PARTIAL` | quatro papéis efetivos, rotas e ações registradas; `administrador_mx`/`consultor_mx` não comprovados |
| T18.4/T18.5 Produção/SHA | `DONE_WITH_EVIDENCE` | push, CI, Vercel `READY`, aliases e health exatos confirmados |
| T18.7 Smoke autenticado | `TESTED_PRODUCTION_PARTIAL` | login, dados reais, notificações, menu/saída, overflow e console exercitados |
| T18.9 Rollback/DR | `BLOCKED_EXTERNAL` | restore/PITR/rollback real não executados em ambiente seguro |

Nota: `synvollt@gmail.com`, fornecido como Administrador MX, foi resolvido pela aplicação como `administrador_geral`. O campo deve permanecer assim na matriz; não é válido convertê-lo em prova de `administrador_mx`.

## Atualização pós-push — 2026-08-09T18:07:42Z

| Grupo | Resultado atual | Evidência |
|---|---|---|
| C0.1 Design System | `TESTED_LOCAL_ONLY` | audit local sem violações; CodeRabbit sem novos findings no diff da migration |
| C0.9 Deployment | `NOT_REEVALUATED` | push `46c236dbb4f16c942b9d0c912ca91298fa400001` concluído; CI/Vercel/health ainda pendentes |
| T10.11 Realtime | `TESTED_PRODUCTION` | migration listada e query confirma `public.notificacoes` em `supabase_realtime` |
| T13.1/T13.2 Sentry | `IN_PROGRESS` | CLI confirmou projeto/release anterior sem eventos; release nova aguarda deploy |
| T14.1/T14.3 Auditoria | `BLOCKED_EXTERNAL` parcial | `xlsx@0.18.5` high sem fix upstream; histórico gitleaks tem 116 achados antigos |
| T17.1/T17.7 Testes | `TESTED_LOCAL_ONLY` | 2.590 testes, 18.135 expectativas, 0 falhas; contrato Realtime passou |
| T18.1/T18.3 Pré-release/migration | `TESTED_PRODUCTION` parcial | backup/bundle verificados; migration aplicada e publicação confirmada |
| T18.4/T18.5 Produção/SHA | `IN_PROGRESS` | push concluído; deployment e health do SHA novo ainda não revalidados |

**SHA de referência desta atualização:** `46c236dbb4f16c942b9d0c912ca91298fa400001`.

## Atualização de gates locais — 2026-08-09T17:04:10Z

Os itens abaixo foram reexecutados com artefatos atuais no checkout `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`:

| Grupo | Resultado atual | Evidência |
|---|---|---|
| T0.2 backup | `DONE_WITH_EVIDENCE` local | tag `pre-main-autonomous-20260809-101705` e `git bundle verify` PASS |
| T2.1/T2.2/T2.4 branches | `DONE_WITH_EVIDENCE` inventário | 3 branches remotas totais; 2 Dependabot têm PRs abertas e foram preservadas |
| T14.1/T14.2/T14.3 auditoria | `BLOCKED_EXTERNAL` parcial | 1 high em `xlsx@0.18.5`, sem fix upstream; nenhum pacote corrigível restante identificado |
| T17.1 unitários | `TESTED_LOCAL_ONLY` | 2.589 testes, 18.131 expectativas, 0 falhas na execução serial final |
| T16.1/T16.6 bundle | `TESTED_LOCAL_ONLY` | 1.806,96/1.860 KB gzip; build e sourcemap PASS |
| CodeRabbit | `BLOCKED_EXTERNAL` | tentativa atual bloqueada por limite/seat da organização |
| Gate A local | `PASS` | lint, typecheck, test, build, bundle e diff-check PASS |

As linhas históricas abaixo permanecem como trilha de auditoria; este adendo é a leitura vigente para esses itens.

- **Gerado em:** 2026-08-09T17:04:10Z
- **SHA do checkout:** `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`
- **Total de tasks encontradas no prompt:** 169
- **Regra:** nenhum gerador pode promover task a DONE_WITH_EVIDENCE sem artefato externo verificável.

| Task | Nome | Estado | Evidência/Ação | Observado | Próximo passo |
|---|---|---|---|---|---|
| C0.1 | Corrigir o workflow falho do Design System | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| C0.2 | Reconciliar o módulo do Dono e a PR #175 | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| C0.3 | Eliminar scopes legados com prova de runtime | `TESTED_LOCAL_ONLY` | node scripts/audit-owner-b44-graph.mjs --check | guard runtime sem imports retirados | revalidar no SHA final quando a task for release-sensitive |
| C0.4 | Tratar as oito tabelas RLS sem policy | `TESTED_LOCAL_ONLY` | snapshot Supabase 2026-08-09T15:47:14.419Z | 225 tabelas com RLS; 0 sem policy | revalidar no SHA final quando a task for release-sensitive |
| C0.5 | Revisar 204 funções `SECURITY DEFINER` | `IN_PROGRESS` | snapshot pg_proc/has_function_privilege | 211 SECURITY DEFINER; anon=0; auth=155 | ver matriz/ledger atual e anexar artefato de fechamento |
| C0.6 | Revisar as 22 Edge Functions e as 13 sem JWT obrigatório | `IN_PROGRESS` | supabase list_edge_functions | 22 funções catalogadas; testes por endpoint pendentes | ver matriz/ledger atual e anexar artefato de fechamento |
| C0.7 | Proteger a `main` depois dos checkpoints diretos | `TESTED_LOCAL_ONLY` | proteção GitHub do checkpoint | revalidar required checks no SHA final | revalidar no SHA final quando a task for release-sensitive |
| C0.8 | Limpar as 22 branches além da `main` | `IN_PROGRESS` | git branch -r | branches dependabot remanescentes precisam de decisão documentada | ver matriz/ledger atual e anexar artefato de fechamento |
| C0.9 | Revalidar o deployment saudável após cada correção | `NOT_REEVALUATED` | deployment/health do checkpoint | revalidar após push final | revalidar no SHA final quando a task for release-sensitive |
| C0.10 | Fechar lacunas de comprovação | `IN_PROGRESS` | matrizes atuais e bloqueios | browser, Sentry, restore e rollback pendentes | ver matriz/ledger atual e anexar artefato de fechamento |
| T0.1 | Confirmar repositório, remoto, branch e working tree | `DONE_WITH_EVIDENCE` | git rev-parse HEAD e branch --show-current | checkout/branch capturados | revalidar no SHA final quando a task for release-sensitive |
| T0.2 | Criar tag e bundle de backup | `TESTED_LOCAL_ONLY` | tag pre-main-autonomous-20260809-101705 e bundle local | backup detectado; verify deve acompanhar o artefato | revalidar no SHA final quando a task for release-sensitive |
| T0.3 | Inventariar acessos existentes | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T0.4 | Capturar baseline de produção | `TESTED_PRODUCTION` | health/deployment do checkpoint | revalidar no SHA final | revalidar no SHA final quando a task for release-sensitive |
| T0.5 | Criar arquivos de controle | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T1.1 | Mapear arquitetura e entrypoints | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T1.2 | Inventariar scripts e workflows | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T1.3 | Inventariar rotas reais | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T1.4 | Inventariar componentes e legado | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T1.5 | Inventariar integrações | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T1.6 | Inventariar dívida e marcadores | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T2.1 | Inventariar todas as branches remotas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T2.2 | Classificar branches | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T2.3 | Preservar conteúdo único necessário | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T2.4 | Excluir branches obsoletas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T2.5 | Revisar PRs abertas e fechadas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T2.6 | Validar proteção da main | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T3.1 | Reproduzir falha docs-only | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T3.2 | Projetar solução compatível com clone raso | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T3.3 | Escrever testes Red | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T3.4 | Corrigir `vercel-ignore-build.mjs` | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T3.5 | Testar na Vercel real | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T3.6 | Garantir paridade de SHA | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T3.7 | Validar preview e produção | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T4.1 | Auditar tokens existentes | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T4.2 | Definir fonte canônica | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T4.3 | Consolidar cores semânticas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T4.4 | Consolidar tipografia | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T4.5 | Consolidar spacing | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T4.6 | Consolidar radius e shadow | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T4.7 | Consolidar motion | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T4.8 | Fortalecer auditoria estática | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T5.1 | Confirmar shell canônico único | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T5.2 | Remover shells concorrentes | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T5.3 | Criar PageCanvas canônico | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T5.4 | Definir larguras semânticas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T5.5 | Unificar breakpoints | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T5.6 | Implementar safe areas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T5.7 | Resolver scroll | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T5.8 | Validar landmarks e foco | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T6.1 | Inventariar primitives | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T6.2 | Consolidar botões | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T6.3 | Consolidar campos | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T6.4 | Consolidar modais e drawers | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T6.5 | Consolidar tabelas e listas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T6.6 | Consolidar cards e métricas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T6.7 | Consolidar feedback | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T6.8 | Eliminar duplicações | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.1 | Gerar manifesto perfil × rota | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.2 | Migrar Vendedor | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.3 | Migrar Gerente | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.4 | Migrar Dono | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.5 | Migrar Administrador Geral | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.6 | Migrar Administrador MX | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.7 | Migrar Consultor MX | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.8 | Migrar rotas públicas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T7.9 | Validar aliases e redirects | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T8.1 | Capturar baseline visual | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T8.2 | Validar densidade e hierarquia | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T8.3 | Validar mobile | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T8.4 | Validar tablet | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T8.5 | Validar desktop | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T8.6 | Validar textos extremos | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T8.7 | Validar loading/vazio/erro | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T8.8 | Validar microinterações | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.1 | Login e sessão | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.2 | Simulação de perfil | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.3 | Carteira e funil | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.4 | Fechamento diário | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.5 | Metas e comissões | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.6 | Feedback, PDI e ações | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.7 | Treinamentos e ranking | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.8 | Administração de lojas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.9 | Relatórios e exportações | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T9.10 | Integrações | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.1 | Sincronizar migrations | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.2 | Inventariar tabelas e views | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.3 | Revisar oito tabelas sem policy | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.4 | Revisar todas as funções SECURITY DEFINER | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.5 | Restringir grants perigosos | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.6 | Fixar search_path | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.7 | Revisar policies permissivas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.8 | Revisar Storage | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.9 | Revisar Auth | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.10 | Revisar Edge Functions | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.11 | Revisar Realtime | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.12 | Mover ou justificar pg_net | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T10.13 | Reexecutar advisors de segurança | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.1 | Medir queries críticas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.2 | Revisar FKs sem índice | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.3 | Corrigir auth_rls_initplan | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.4 | Consolidar policies permissivas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.5 | Revisar índices não usados | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.6 | Remover índices duplicados | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.7 | Adicionar PKs ausentes | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.8 | Revisar crons | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.9 | Revisar backups e retenção | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.10 | Testar restauração | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T11.11 | Reexecutar advisors de performance | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T12.1 | Inventariar endpoints | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T12.2 | Validar autenticação e autorização | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T12.3 | Validar schemas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T12.4 | Validar idempotência | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T12.5 | Validar timeouts e retries | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T12.6 | Validar CORS e headers | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T12.7 | Validar rate limiting | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T12.8 | Validar erros | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.1 | Descobrir organização e projeto | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.2 | Validar release pipeline | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.3 | Disparar erro sintético frontend | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.4 | Validar stack desminificado | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.5 | Validar contexto | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.6 | Validar backend e Edge Functions | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.7 | Validar performance | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.8 | Validar Replay | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.9 | Validar alertas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T13.10 | Revisar issues atuais | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T14.1 | Executar audits | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T14.2 | Corrigir vulnerabilidades com versão disponível | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T14.3 | Classificar vulnerabilidades sem correção | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T14.4 | Executar secret scan | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T14.5 | Revisar bundle frontend | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T14.6 | Revisar headers | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T14.7 | Revisar dependências abandonadas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T15.1 | Lint estático | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T15.2 | Axe automatizado | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T15.3 | Teclado | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T15.4 | Leitor de tela | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T15.5 | Contraste | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T15.6 | Zoom e reflow | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T15.7 | Motion | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T15.8 | Touch targets | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T16.1 | Baseline bundle | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T16.2 | Baseline Core Web Vitals | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T16.3 | Otimizar carregamento | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T16.4 | Otimizar React | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T16.5 | Otimizar rede | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T16.6 | Definir budgets | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.1 | Unitários | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.2 | Integração | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.3 | E2E autenticado | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.4 | Matriz de rotas | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.5 | Regressão visual | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.6 | Testes de API | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.7 | Testes de migration | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.8 | Testes de acessibilidade | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.9 | Testes de performance | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.10 | Eliminar flakes | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T17.11 | Organizar workflows | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.1 | Pré-release | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.2 | Publicar preview | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.3 | Aplicar migrations | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.4 | Publicar produção | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.5 | Validar SHA | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.6 | Smoke público | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.7 | Smoke autenticado | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.8 | Monitorar pós-release | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.9 | Testar rollback | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |
| T18.10 | Fechar evidências | `NOT_PROVEN` | nenhuma evidência atual anexada | não executado ou não revalidado nesta execução | capturar evidência atual ou registrar bloqueio externo genuíno |

> As matrizes Supabase, Edge Functions, RLS, browser e release devem ser vinculadas a este ledger quando cada task for exercitada. O arquivo não transforma documentação em prova.
