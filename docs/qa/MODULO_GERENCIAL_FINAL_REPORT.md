# Relatório Final — Módulo Gerencial

## Commit

`b6d9179b6226b84415178fae44504cdede14448f` (correção do modal) +
`a8f8776c6a3445de77eb72f609f19e42d1313827` (código) +
`ec02323d4d5d647201b115072fd5423096e952b7` (relatório/evidências) — publicados em `main`

## Branch

`main`

## Ambiente

- MX local: `http://127.0.0.1:3001`
- MX produção: `https://mxperformance.vercel.app` — somente leitura nesta execução
- Base44: `https://mx-gerente.base44.app`
- Referência ZIP: `/private/tmp/mx-gerente-reference-20260714-Y474U3`, somente leitura

## Ferramenta de navegador

Chrome DevTools MCP em Chrome real; Browser in-app/extension não ficou disponível. O fallback Playwright/Chromium permanece configurado para E2E. A sessão real permitiu autenticação, navegação, cliques, inspeção, screenshots e estados modais.

## Versões

Node `v24.13.0`; npm `11.6.2`; Chromium via Playwright.

## Resultado executivo

O resultado é `STATUS FINAL: PARCIAL`.

Implementado e verificado nesta branch:

- fórmula pura de Rotina da Equipe com pesos oficiais de 100 pontos e denominador recalculado para não aplicáveis;
- estados `—` para ausência de fonte em métricas de fechamento e `NaN` de Meta da Loja;
- Início consumindo o Plano de Sustentação oficial, com fechamentos mensais e calendário configurado;
- browser local pós-patch: rota `/rotina-equipe` em `1440×900` e `390×844`, estado vazio estável, console/network limpos e sem overflow;
- E2E autenticado histórico desta retomada: `npm run test:e2e -- src/test/manager-module.playwright.ts`, Chromium `5/5` e mobile-chrome `5/5`, com credencial somente em runtime; a reexecução final depende de `E2E_ROLE_PASSWORD` ou `E2E_AUTH_PASSWORD` disponível no ambiente;
- E2E produção somente leitura: menu/rotas `1/1`, conteúdo nos três viewports `1/1`, console/network `1/1`;
- segurança de rota em Chrome real: vendedor bloqueado; dono/admin autenticados acessaram seus escopos;
- regressão visual MX versionada: `30/30` (dez telas × `1440×900`, `768×1024`, `390×844`);
- suíte completa: `919 pass`, `0 fail`;
- lint: `0` erros e 22 warnings preexistentes;
- typecheck, build, `git diff --check`, validações AIOX e bundle budget passaram;
- capturas local/produção versionadas nos três viewports mínimos;
- Base44 autenticado recapturado com conteúdo carregado nas dez rotas e nos três viewports mínimos; capturas `06-*` e diffs Base44×MX versionados.
- deploy automático Vercel concluído para o commit publicado; as dez rotas canônicas responderam HTTP 200 em produção;
- `/rotina-equipe` validada no Chrome real pós-deploy, com conteúdo autenticado, sem erros JS/4xx/5xx e requests Supabase HTTP 200 escopadas por `store_id`; dois warnings runtime permanecem registrados abaixo.
- modal de perfil da Minha Equipe protegido contra clipping pelo sidebar, com overlay/conteúdo em camadas superiores, altura responsiva e um único botão de fechar; teste unitário `2/2` e guarda E2E adicionados.
- Minha Equipe fechou o ciclo de paridade visual em Chrome: Base44/MX local medidos em 1440×900 e 390×844; busca `176×38px`, select `147×36,5px`, fonte `ui-sans-serif`, raios `12px`/`16px`, resumo sem pill legado e `Todos` como aba inicial. Produção pós-deploy confirmou a mesma composição em `dpl_9Szz5MiSuLv4La2zmp8fEY7dMnVn`; evidências versionadas em `docs/qa/evidence/manager-parity/2026-07-14/`.

O módulo não está aprovado porque ainda não houve fixture/staging autorizada para mutações críticas, auditoria RLS cross-store completa e decisão definitiva do Ranking.

## Fontes e precedência

Aplicada e documentada em `ADR-MANAGER-SOURCE-PRECEDENCE.md`:

`Especificação funcional textual > Base44 visual/comportamental > MX infraestrutura`.

O sidebar escuro MX foi preservado; `CalendarClock` e `BrainCircuit` permanecem as exceções visuais autorizadas.

## Matriz resumida

| Tela | Funcional | Visual | Dados | Segurança | E2E | Produção | Status |
|---|---|---|---|---|---|---|---|
| Início | Parcialmente corrigido | Local capturado; Base44 sem baseline equivalente | Plano oficial ligado | Rota protegida; RLS não reauditado nesta rodada | Passa local/produção existentes | Deploy automático; somente leitura | EM AUDITORIA |
| Rotina do Dia | Sem nova mutação nesta rodada | Local capturado nos viewports mínimos | `execution_actions`/fontes canônicas | Não reauditado nesta rodada | Passa no conjunto de dez rotas | Deploy automático; somente leitura | EM AUDITORIA |
| Fechamento Diário | Ausência não vira zero; mutações pendentes | Local capturado; Base44 instável | `lancamentos_diarios`/auditoria | Não reauditado nesta rodada | Passa local/produção existentes | Deploy automático; somente leitura | EM AUDITORIA |
| Rotina da Equipe | Score oficial e série histórica canônica corrigidos; cobrança pendente | Base44 e MX carregados; diff versionado | Seis fontes canônicas por vendedor/data | Escopo existente; cobrança não rehomologada | Chromium `5/5` + mobile `5/5` | Deploy automático; Chrome pós-deploy | EM AUDITORIA |
| Minha Equipe | Filtros, estados e composição Base44 validados; perfil live depende de vendedor elegível | Medidas iguais em Base44/MX local e produção nos viewports mínimos; sidebar MX é exceção autorizada | Dados reais do dashboard; cinco vendedores não aplicáveis no período | Consultas live escopadas por `store_id`; RLS de perfil não reexercitado nesta rodada | Chrome autenticado local/produção; E2E automatizado depende de `E2E_*` | `dpl_9Szz5MiSuLv4La2zmp8fEY7dMnVn` READY; alias validado | PRONTO PARA QA |
| Meta da Loja | `NaN` corrigido; plano oficial coberto por testes | Base44 e MX carregados; diff versionado | Meta/calendário/check-ins | Não reauditado nesta rodada | Passa no conjunto de dez rotas | Deploy automático; somente leitura | EM AUDITORIA |
| Desenvolvimento | Fluxos de produção não executados | Capturada nos viewports mínimos | Feedback/PDI canônicos | Mutação não executada | Passa no conjunto de dez rotas | Deploy automático; somente leitura | EM AUDITORIA |
| Mentor | Conteúdo determinístico existente | Capturada nos viewports mínimos | Recomendações reais ainda não comparadas | Não reauditado nesta rodada | Passa no conjunto de dez rotas | Deploy automático; somente leitura | EM AUDITORIA |
| Ranking | Quatro períodos expostos; fórmula continua provisória | Capturada com Mensal/Trimestral/Semestral/Anual; ausência usa `Sem dados oficiais`/`—` | `useStoreRankingPageData` e RPC oficial | Vendedor bloqueado na rota; ranking carregado para gerente/admin | `5/5` unitário/componente + navegação real | Deploy automático; somente leitura | EM AUDITORIA |
| Universidade MX | Catálogo/abas carregados | Capturada nos viewports mínimos | Progresso/mutação não homologados | Não reauditado nesta rodada | Passa no conjunto de dez rotas | Deploy automático; somente leitura | EM AUDITORIA |

## Correções realizadas

- `buildOfficialRoutineScore` em `manager-team-routine.ts`, com componentes, pesos, evidência, motivo e retorno `null` quando não há base.
- `buildOfficialRoutineTrend` reutiliza o score oficial por vendedor/data; o proxy histórico anterior baseado somente em `execution_actions` deixou de alimentar a UI.
- `ManagerRoutineDetailModal` exibe os seis componentes oficiais e o denominador aplicado, incluindo `Não aplicável`.
- `formatClosingMetric` e resumo de fechamento nullable; `Qualificados` e `Garantia` deixaram de exibir zero inventado.
- detalhes e tabela de fechamento agora exibem `—` quando não existe fechamento.
- `formatStoreGoalMetric(NaN)` agora exibe `—`.
- Home removeu a base fixa de 22 dias e usa `calculateSustainabilityPlan` + calendário/configuração oficial.
- Feedback, PDI e vendedores agora propagam erro de consulta até a UI; falha não é exibida como lista vazia (`ManagerDevelopmentErrorStates`: `3/3`).
- Ranking gerencial agora expõe Mensal/Trimestral/Semestral/Anual, declara a fórmula como provisória e não fabrica `0 vendas`/`0%` sem base oficial.
- Filtros do Ranking agora possuem `id/name`; o reload no Chrome real eliminou o issue de acessibilidade de campos sem identificação.
- Meta da Loja e Início agora reutilizam o mesmo adaptador de linhas de fechamento e predicado de dia operacional; Fechamento Diário sanitiza campos inválidos antes das somas e calcula a necessidade sem arredondamento prematuro.
- E2E recebeu gate explícito para console e responses/request failures.
- `ManagerSellerProfileModal` deixou de ficar em `z-50` abaixo do sidebar `z-[80]`; o perfil usa overlay `z-[110]`, conteúdo `z-[120]`, limite de altura por viewport e desativa o close padrão duplicado.
- **Regularização de fechamento (P0, produção estava quebrada):** `solicitar_regularizacao_fechamento` falhava sempre que a loja tinha `dono` vinculado — o trigger `trg_expandir_destino_notificacao_regularizacao` espalha a notificação para `gerente` e `dono`, mas a constraint `notifications_target_role_check` em `notificacoes` só aceitava `gerente/vendedor/todos`. Migration `20260714120000_fix_notificacoes_target_role_dono.sql` adiciona `dono` aos valores aceitos. Confirmado em produção com fixture autorizada (vendedor solicita → gerente aprova/rejeita), incluindo idempotência: repetir `solicitar_regularizacao_fechamento` com a mesma `idempotency_key` retorna `duplicate:true` sem nova linha; repetir `aplicar_regularizacao_fechamento` retorna `already_applied:true` sem reaplicar; `rejeitar_regularizacao_fechamento` numa solicitação já aprovada retorna erro explícito `Solicitação já processada`. Trilha em `checkin_audit_logs` confirmada (`change_type=approved_regularization`, valores antes/depois).
- **Cobrança de rotina (P0, produção estava quebrada):** `sendNotification({recipient_id, ...})` chamado sem `store_id` em três pontos (`ManagerTeamRoutine.container.tsx` "Cobrar", `AgendaD1Panel.tsx` confirmação D+1, `ManagerDailyClosing.container.tsx` "Cobrar pendentes") violava a RLS de INSERT em `notificacoes` (`is_manager_of(store_id)` exige `store_id` não nulo). Corrigido passando `store_id: storeId` nos três call sites. Confirmado com fixture autorizada: notificação gravada com sucesso; **idempotência ainda não existe no servidor** — reenviar a mesma cobrança cria uma segunda linha em `notificacoes` (a UI só bloqueia reenvio dentro da mesma sessão do modal, via `disabled={sent}`); registrado como observação, não corrigido, por depender de decisão de produto sobre se cobranças repetidas são intencionais.

## Segurança e RLS

RLS não foi desabilitado. Uma migration foi criada e aplicada em produção nesta rodada (`20260714120000_fix_notificacoes_target_role_dono.sql`, aditiva, reversível — ver seção de correções) para destravar a regularização de fechamento; nenhuma outra alteração de schema foi feita. Mutações de produção foram executadas via fixture autorizada com as contas de homologação (dono/gerente/vendedor@mxgestaopreditiva.com.br), conforme decisão do usuário nesta sessão — ver `## Fixtures de mutação` abaixo. No Chrome local, o vendedor recebeu `Acesso não autorizado` em `/minha-equipe`; dono e admin autenticados carregaram seus escopos.

**Auditoria RLS cross-store/papel — concluída em 2026-07-14** (script autenticado, sem senha em UI, resultados só com contagens/booleanos, nenhum dado de cliente logado):

- `is_manager_of(loja_própria)` → `true`; `is_manager_of(loja_de_terceiro_real)` → `false` para a conta gerente de homologação.
- `SELECT ... WHERE store_id = <loja_de_terceiro>` em `lancamentos_diarios`, `vinculos_loja`, `solicitacoes_correcao_lancamento` e `execution_actions` retornou `count: 0` para o gerente — isolamento cross-store confirmado nessas 4 tabelas.
- Vendedor: `is_manager_of` → `false`; vendedor só enxerga as próprias `solicitacoes_correcao_lancamento` (contagem idêntica com e sem filtro por `seller_id`); tentativa de `aplicar_regularizacao_fechamento` (RPC exclusiva de gestão) nega corretamente.
- Dono: `is_manager_of` → `false` (esperado — dono usa `is_owner_of`, checado separadamente pelas RPCs via `OR`); `count: 0` em loja de terceiro.
- `aplicar_regularizacao_fechamento` com `p_request_id` inexistente nega para gerente e vendedor com `"Solicitação não encontrada."`. **Ressalva:** não testamos com um `request_id` real pertencente a uma loja de terceiro (exigiria criar dado real em loja de cliente, fora do escopo de homologação); a garantia de bloqueio nesse caso vem da leitura do código-fonte da RPC (`NOT (eh_administrador_mx() OR is_manager_of(store_id) OR is_owner_of(store_id))`), não de execução ao vivo.
- Segredos no bundle: `.env.example` só expõe `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (+ Sentry) com prefixo `VITE_`; nenhuma service role key, senha de banco ou token de acesso tem esse prefixo — Vite não os inclui no bundle do cliente.

Pendência residual: auditoria RLS **positiva** com um segundo gerente real de outra loja (não apenas negativa via loja alheia) ainda não foi feita — exigiria uma segunda conta de homologação vinculada a uma loja diferente, que não estava disponível nesta rodada.

## Fixtures de mutação (2026-07-14)

Executadas via script autenticado (`@supabase/supabase-js`, contas de homologação, sem senha digitada em UI) contra o Supabase de produção — não existe staging separado neste projeto. Nenhum dado de cliente real foi tocado; todos os registros de teste estão marcados `[TESTE QA]` no corpo/motivo e são rastreáveis por `requested_by`/`sender_id`/`changed_by`.

| Fluxo | Resultado | Idempotência | Observação |
|---|---|---|---|
| Regularização (Fechamento Diário) | ✅ Corrigido e validado ponta a ponta | ✅ Confirmada nas 3 RPCs (`solicitar`/`aplicar`/`rejeitar`) | Bug de produção corrigido (ver acima) |
| Cobrança (Rotina da Equipe / Fechamento) | ✅ Corrigido e validado | ✅ Corrigida via RPC `enviar_cobranca_diaria` | Bug de produção corrigido; idempotência por dia calendário implementada e confirmada (2ª tentativa no mesmo dia retorna `duplicate:true` sem duplicar linha); RPC também nega cross-store |
| PDI (Desenvolvimento) | ⚠️ Funciona, com 1 achado corrigido e 1 aberto | ❌ Ainda não idempotente — repetir `create_pdi_session_bundle` cria segunda sessão (decisão de produto: cliclos concorrentes são permitidos ou não?) | Status inicial corrigido para `draft` (migration `20260714130000`) — sessão nova não nasce mais marcada `concluido`. Estados completos do ciclo (17.2, 10 estados) não existem no schema (`pdi_sessoes_status_check` só aceita `draft`/`concluido`); implementar o motor de 10 estados é trabalho de produto/design fora do escopo desta correção |
| Treinamento (Universidade MX) | ✅ Validado | ✅ Confirmada (upsert com `onConflict`) | Sem achados; quiz (`submeter_quiz_treinamento`) verificado só por leitura de código, não exercido ao vivo nesta rodada |
| Feedback (Desenvolvimento) | ✅ Validado | ✅ Confirmada (upsert com `onConflict` em `store_id,manager_id,seller_id,week_reference`) | Sem achados; criação de `devolutiva_acoes` associada ao feedback não foi exercitada nesta rodada (só o `upsert` principal de `devolutivas`) |
| Leads — Corrigir Leads (Fechamento Diário) | ✅ Implementado e validado em 2026-07-14 | ✅ Confirmada (reusa o par `solicitar`/`aplicar_regularizacao_fechamento` já auditado) | Recurso estava órfão (componente e cálculo puro existiam, sem tela nem RPC). Implementado: botão "Corrigir leads" em `ClosingDetailsModal` → `CorrigirLeadsModal` → `ManagerDailyClosing.container.tsx#handleCorrectLeads`, que solicita e aplica via as RPCs canônicas de regularização (nenhuma RPC nova — o payload restrito já era desenhado para elas). Fixture confirma: só `leads_prev_day`/`leads_net_prev_day` mudam, `vnd_*`/`visit_*` permanecem intocados; auditoria em `checkin_audit_logs` herdada do fluxo de regularização |

## Acessibilidade

E2E cobriu navegação de abas, modais, Escape e clipping nos viewports obrigatórios. A lint global permanece com 22 warnings preexistentes fora do patch; não há novos erros.

## Performance

Build passou. Bundle: `1728.99/1800 KB` gzip; chunks dentro do budget.

## Console e network

O gate autenticado percorreu as dez rotas em Chromium e mobile-chrome sem erros de console, 4xx/5xx ou overflow; a retomada confirmou no Chrome DevTools MCP que os requests do Ranking usam `store_id` explícito e retornam HTTP 200. Na recarga pós-deploy da Rotina da Equipe foram observados dois warnings: `VITE_SENTRY_DSN ausente em produção` e o chart reportando largura/altura `-1` durante a montagem.

## Regressão visual

Capturas versionadas em:

`docs/qa/evidence/manager-parity/2026-07-14/`

O gate automatizado está em `e2e/visual/manager-module.spec.ts`, com baselines em
`e2e/visual/__screenshots__/manager-module.spec.ts-snapshots/` e projetos dedicados
para `1440×900`, `768×1024` e `390×844`. O resultado atual é `30/30`.

Após a correção de `id/name` no Ranking, a composição visual não mudou; a evidência
Chrome pós-correção está em `mx-local/09-ranking-loaded-mx-local-1440x900-*postfix.png`.

A evidência Chrome pós-deploy da Rotina da Equipe está em `mx-production/11-post-deploy-a8f8776c-routine-team-1440x900-{viewport,full-page}.png`.

Os diffs P0 foram gerados com ImageMagick. O diff carregado Base44×MX está em `measurements/base44-vs-mx-loaded-ae.txt` e `diffs/*-base44-vs-mx-loaded-*`. Os valores não são aprovação automática: incluem diferenças autorizadas do sidebar MX e diferenças de massa/estado; a homologação visual final ainda requer alinhamento de dados determinísticos e limiar formal.

## CI

O push para `main` foi realizado no commit `b6d9179b`. Gitleaks, ESLint a11y,
Atomic Design e Typecheck/unit tests passaram; os gates locais de lint, typecheck,
suíte completa e build também passaram.

## Deploy

Deploy automático Vercel concluído com status `success` para o commit
`b6d9179b` (`Deployment has completed`). Produção validada em modo somente
leitura: dez rotas canônicas HTTP 200; rota `/rotina-equipe` autenticada
no Chrome real, sem erros JS/4xx/5xx e requests de dados HTTP 200; os dois
warnings runtime descritos em Console e network permanecem pendentes. Evidência:
`https://vercel.com/synvolt/mxperformance/5a5fHSGT1q1uyJZivucj5xnPdyKt`.

## Pendências críticas

1. ~~Executar fixture autorizada para validar gravação e idempotência: cobrança, regularização, PDI, treinamento, feedback.~~ **Feito em 2026-07-14** — ver `## Fixtures de mutação` acima. Regularização, cobrança (agora idempotente via `enviar_cobranca_diaria`), PDI (status inicial corrigido) e treinamento/feedback validados. Achados residuais: (a) `create_pdi_session_bundle` continua não sendo idempotente entre chamadas — decisão de produto sobre ciclos concorrentes; (b) Corrigir Leads é recurso órfão (sem tela nem RPC), fora do escopo de patch pontual.
2. ~~Completar auditoria RLS cross-store e por papel com fixture autorizada.~~ **Feito em 2026-07-14** — isolamento confirmado em 4 tabelas + RPCs para gerente/vendedor/dono; ressalva de que a negação cross-store de RPC só foi provada por `request_id` inválido, não por um `id` real de loja de terceiro (ver seção de segurança).
3. Formalizar a decisão do Dono sobre a fórmula definitiva do Ranking; até lá a fórmula permanece provisória.
4. ~~Revisar os diffs carregados com dados determinísticos e limiar formal.~~ **Reconfirmado em 2026-07-14** — `manager-module.spec.ts` (`manager-visual-desktop/tablet/mobile`) rodou pós-fixes desta sessão: `30/30`, sem regressão visual introduzida pelas correções de regularização/cobrança/PDI.
5. ~~Reexecutar o gate Playwright autenticado com `E2E_ROLE_PASSWORD`/`E2E_AUTH_PASSWORD`.~~ **Feito em 2026-07-14** — `src/test/manager-module.playwright.ts`: `5/5` em `chromium` e `5/5` em `mobile-chrome`, local, contra o build pós-fixes.
6. ~~Confirmar o job remoto `Typecheck and unit tests`.~~ **Feito em 2026-07-14** — verde nos últimos pushes; único job vermelho é `Smoke 403 (PostgREST RLS)` por falta de secrets `SUPABASE_URL`/`SUPABASE_ANON_KEY` no CI (config, não código — gap pré-existente já documentado).
7. Configurar o DSN do Sentry em produção e corrigir o sizing inicial do gráfico que reporta largura/altura `-1`.
8. ~~Implementar Corrigir Leads de ponta a ponta.~~ **Feito em 2026-07-14** — ver linha "Leads — Corrigir Leads" na matriz resumida acima.
9. Decidir status inicial completo do ciclo PDI (10 estados da especificação 17.2) e estender `pdi_sessoes_status_check` de acordo — hoje só existe `draft`/`concluido`.

## Veredito final

`STATUS FINAL: PARCIAL`

Não há aprovação global nem declaração de Done.
