# MX Unificação Total — Relatório Final

> Relatório vivo de fechamento. Atualizado em 2026-08-10 durante os gates finais
> do worktree isolado; evidências históricas permanecem identificadas abaixo.
>
> **Revalidação mais recente (2026-08-10):** os parágrafos que citam SHAs e
> deployments anteriores são históricos. A prova vigente foi coletada no
> branch `fix/mx-final-gates-20260810`, sobre o merge
> `82191012260208c6dc82e240cd78fdf4658fb6ba`.

## Revalidação vigente — 2026-08-10

- Base do worktree: merge `82191012260208c6dc82e240cd78fdf4658fb6ba`; PR #186
  está `MERGED` e `origin/main` aponta para esse SHA.
- Correções locais: `ManagerDailyClosing`/skeleton no `PageCanvas` canônico,
  `Checkin` sem landmark `main` aninhado e toaster Sonner contido no mobile.
- Correção de banco pendente no worktree: o marcador
  `00000000000001_mark_existing_migrations_applied.sql` deixou de pré-registrar
  os 39 stubs históricos ativos. O runner passa a executar cada no-op e
  registrar a versão normalmente, tratando a falha reproduzida no reset
  local/CI (`duplicate key ... 20260407000000`) sem modificar schema ou dados
  remotos.
- PR #187 está aberto para esta branch; o patch adicional ainda não foi
  commitado e, portanto, não existe SHA remoto para esta revalidação.
- A falha seguinte do CI no mesmo PR foi `permission denied for function
  eh_area_interna_mx` durante a consulta autenticada da matriz RLS. A correção
  local adiciona grants explícitos para `authenticated` em 22 helpers, mantendo
  `PUBLIC`/`anon` revogados, e amplia o `grants_guard` pgTAP para 7 assertions.
- A revisão CodeRabbit vigente deixou quatro findings acionáveis; todos foram
  tratados neste worktree: checkout sem credencial persistida, redação de
  segurança, File List sem duplicação e migration forward-only para as relações
  auxiliares. A migration `20260810110000_harden_auxiliary_audit_backup_rls.sql`
  garante criação idempotente, RLS, revogações, acesso de `service_role` e
  policies explícitas; o guard pgTAP agora tem 19 assertions, incluindo
  privilégios efetivos, expressões de policy e probes negativos com linha
  semeada.
- RED/GREEN: contratos de PageCanvas/landmark passaram e o contrato novo do
  Sonner falhou antes da implementação e passou isoladamente depois.
- Gates locais vigentes: lint exit `0` (warning histórico em `HelpTooltip.tsx`),
  typecheck exit `0`, `npm test` `2.597 pass / 0 fail / 18.162 asserts`, build
  exit `0` sem sourcemaps públicos, bundle `1.563,57/1.860 KB gzip` e
  `git diff --check` exit `0`; checksums recalculadas e reversibilidade das
  migrations pendentes também passaram (`400` checksums válidas, `44`
  migrations validadas).
- Auditorias complementares: `validate:structure`, `validate:parity`,
  `validate:agents`, `sync:ide:check`, `audit:routes-data`,
  `audit:management-design-system` e `lint:a11y` passaram; warnings AIOX e
  `HelpTooltip` permanecem históricos e não são tratados como falhas.
- Browser local: toaster real em `390×844` ficou `x=16,width=356,right=372`,
  com `scrollWidth=390`; em `1440×900`, `x=1060,width=356,right=1416`,
  `scrollWidth=1440`. A captura mobile foi exibida na sessão.
- Produção vigente: Vercel `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc`, `READY`, aliases
  oficiais; `/api/health` HTTP `200`, `healthy`, release exatamente igual ao
  merge acima. Esse deployment ainda não contém o diff local desta retomada.
- Estado: **correções locais aprovadas, mas replay/grants RLS ainda aguardam
  commit/CI; produção atual saudável e sem alteração de banco**. O hardening
  forward-only das relações auxiliares está no checkout e ainda precisa do novo
  CI efêmero.

## 39.1 Resumo executivo — estado vigente da retomada

O repositório está no branch `fix/mx-final-gates-20260810`, sobre a fundação
visual, tokens, PageCanvas, shell canônico, auditorias estáticas e validações
de múltiplos perfis já incorporadas ao merge `82191012`. Esta retomada fechou
duas regressões estruturais e o overflow mobile do toaster, com testes e prova
de navegador local.

Status atual: **gates locais aprovados; produção saudável no merge anterior;
patch final aguardando commit, CI/Preview e nova promoção**. O prompt mestre
permanece parcial por backup restaurável/PITR, prova independente de
source maps/Sentry, matriz integral de perfis/rotas e rotação dos segredos.

## 39.2 Inventário

- Rotas: 111 (103 protegidas, 8 públicas).
- Tabelas: 127.
- RPCs: 84.
- Edge Functions: 14.
- Auditoria atual (`npm run audit:routes-data`): 109 rotas (101 protegidas, 8
  públicas), 136 tabelas, 87 RPCs e 14 Edge Functions; os números acima são
  inventário histórico do fechamento anterior e não devem ser usados como
  contagem corrente.
- Componentes alterados no fechamento anterior: `AdminHeader.tsx` e os 4
  gráficos de Performance de Vendas (evidência histórica; não fazem parte do
  gate final atual).
- Inventário estruturado: `docs/audits/route-inventory.md` e `docs/audits/route-inventory.json`.
- Biblioteca Atomic Design: inventário em `docs/audits/component-library-inventory.md` (24 atoms, 27 molecules, 6 organisms, 53 componentes `ui`, 8 stories; templates ainda não povoados).
- Evidência visual: `visual-evidence/internal-mx/`, com route matrices, screenshots e métricas para os perfis/rotas cobertos; não representa captura integral de todas as combinações do prompt.
- Shells, scopes e tokens: inventariados pelos scripts AIOX e auditorias anteriores; nenhuma alteração concorrente foi incorporada neste fechamento.
- Total de páginas migradas e testes adicionados no histórico: não reestimado nesta etapa para evitar transformar inventário histórico em fato novo.
- Arquivos do gate final local: `src/App.tsx`, `src/index.css`,
  `src/features/checkin/Checkin.container.tsx`,
  `src/features/checkin/CheckinStickyHeader.test.ts`,
  `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx`,
  `src/features/manager/daily-closing/ManagerDailyClosing.visual-contract.test.ts`
  e `src/test/sonner-layout.contract.test.ts`.

## 39.3 Evidências técnicas — estado vigente da retomada

- Branch/PR: `fix/mx-final-gates-20260810` / PR #187 aberto, base `main`.
- Base remota verificada: PR #186 `MERGED`, merge
  `82191012260208c6dc82e240cd78fdf4658fb6ba`; sete workflows desse SHA
  concluíram com sucesso.
- Gates locais do diff final: lint/typecheck/build/diff-check exit `0`,
  `npm test` `2597 pass / 0 fail / 18162 asserts`, bundle `1563,57/1860 KB`
  gzip e auditorias estruturais/paridade/rotas sem erros.
- O CI do SHA anterior `df0955b05cf3295cd85e20c382a0ea17489d22c9`
  falhou antes da correção no job `pgTAP RLS Matrix` durante `supabase db reset`
  com `duplicate key ... Key (version)=(20260407000000)`. A nova execução
  remota é obrigatória antes de tratar RLS como aprovado.
- O SHA atual do PR #187 (`1eee68444d8e807128b4175e6f417f86b16cc2c5`) também
  falhou no job `93385034779` com `permission denied for function
  eh_area_interna_mx`; a migration nova e o guard pgTAP corrigem a ACL no
  próximo SHA.
- A migration auxiliar e seus 19 invariantes são somente locais nesta medição;
  não houve `db push` nem aplicação de migration no Supabase remoto.
- A correção altera apenas o marcador de histórico, com allowlist hash-pinned
  em `.migration-checksum-allowlist.json`; não remove nem reescreve os 39
  stubs. O CI também compara o histórico antes/depois do reset.
- Worktree está deliberadamente não commitado nesta medição; o SHA do próximo
  commit será acrescentado após a revisão do diff e antes do push.
- Produção vigente: Vercel deployment
  `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc`, `READY`, aliases oficiais; `/api/health`
  HTTP `200`, `healthy`, release igual ao merge `82191012`.
- Preview do diff final: ainda não criado; não confundir a produção/preview do
  PR #186 com a validação do próximo SHA do PR #187.

## 39.4 Evidências visuais

- Evidências existentes: `visual-evidence/internal-mx/`.
- Falha reproduzida: rota `performance-vendas`, em desktop/tablet/mobile, por ausência do cabeçalho canônico.
- Evidência de produção anterior: `/relatorios/performance-vendas` renderizou dados reais (`49 lojas`, `204` sell-outs históricos, `476` meta consolidada), sem overflow horizontal.
- Screenshot final pós-deploy revisado: `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-final-f51ad48e.png`.
- Viewport da captura: desktop Chrome, 1721x1233; rota `/relatorios/performance-vendas`; estado autenticado Administrador Geral, dados reais.
- Smoke final: cabeçalho canônico presente, raio 16px, fundo branco, quatro gráficos com dimensões positivas, zero overflow e console vazio para warn/error.
- Regressão Sonner: browser real em `390×844` mediu toaster `x=16,width=356,right=372` e `scrollWidth=390`; em `1440×900`, `x=1060,width=356,right=1416` e `scrollWidth=1440`.

## 39.5 Supabase

- Projeto confirmado: `fbhcmzzgwjdgkctlfvbo`.
- A nova migration de ACL é somente local nesta medição. O CI efêmero deve
  provar que `authenticated` executa os 22 helpers de predicates RLS e que
  `anon` não executa nenhum deles; não houve `db push` remoto.
- Schema e dados de aplicação em produção não foram alterados nesta etapa; a
  alteração pendente só impede o pré-registro de versões que o runner executa.
  No replay local, a tabela `supabase_migrations.schema_migrations` é recriada
  pelo reset; o CI compara as versões antes/depois e não executa `db push` remoto.
- A auditoria funcional e de RLS anterior permanece histórica até o novo job
  `pgTAP RLS Matrix` passar no SHA desta correção.
- A migration `20260810110000_harden_auxiliary_audit_backup_rls.sql` também é
  somente local; nenhuma migration foi aplicada ao projeto Supabase remoto
  nesta retomada.

## 39.6 Vercel — estado vigente da retomada

- Projeto: `mxperformance` / equipe `synvolt`.
- Node configurado: `24.x`.
- Produção `https://www.mxperformance.com.br`: deployment
  `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc`, `READY`, aliases oficiais ativos.
- `/api/health` em 2026-08-10 retornou HTTP `200`, `healthy`, ambiente
  `production`, release `82191012260208c6dc82e240cd78fdf4658fb6ba`, com Vercel,
  Supabase API/database e crons críticos `ok`.
- O diff final local ainda não foi promovido; rollback documentado para esta
  etapa é manter/promover o deployment anterior enquanto o novo PR/preview não
  passar.

## 39.7 Sentry

- Organização/projeto confirmados por API: `synvolt` / `mx-performance-frontend`.
- A evidência histórica confirma releases anteriores, mas não é usada como prova da release atual.
- `/api/health` do deployment atual converge para o release de aplicação
  `82191012260208c6dc82e240cd78fdf4658fb6ba`; isso não comprova por si só que
  a release/source map correspondente foi aceita pelo Sentry.
- A inspeção Sentry da release atual permanece pendente; as releases `7387fb32`
  e `6d5eebe2` citadas abaixo são evidências históricas, não prova vigente.
- Evento controlado histórico: `08093d7cae174d23824a5273fa42bb91`, `MxControlledSourceMapValidation`; não é usado como prova de alinhamento da release atual.
- O build log do deployment registra `Upload type: artifact bundle` e o debug ID público `ff71a893-c507-4440-9653-17416b1f2be4` com seu `.js`/`.js.map` no `Source Map Upload Report`. A API legada de arquivos da release retornou `0`; o evento controlado foi gerado via DevTools e seu stack não é um frame do bundle, portanto a prova de stack trace desminificado permanece aberta.
- `sentry-cli` global não está instalado; `npx @sentry/cli` `2.58.5` foi usado sem persistir credenciais.
- Alertas e performance não foram comprovados nesta execução.
- Smoke real do `consultor_mx`: `1 passed` em `2,1 min`, com usuário/fixtures temporários, rotas reais, consultas Supabase e limpeza automática.
- Revalidação final no navegador autenticado como Administrador Geral: `/relatorios/performance-vendas` exibiu dados reais (`204` sell-outs e `476` meta), sem erros de console e sem overflow em viewport de 1721 px; em `390×844`, `scrollWidth === clientWidth === 390`, sem elementos fixos fora da viewport e sem erros.
- Smoke Playwright filtrado para `consultor_mx` contra produção: `1 passed (2.0m)`, com fixture temporário e limpeza automática.
- A inspeção de rede capturou um envelope Sentry de produção com HTTP 200 e `Access-Control-Allow-Origin: *`; uma execução anterior teve CORS intermitente do transporte do navegador e foi repetida com sucesso. Isso não substitui a prova de stack trace TypeScript desminificado.
- O `npx @sentry/cli` `2.58.6` local respondeu `401 Invalid token` para o token operacional da sessão; a variável criptografada da Vercel permanece fora de leitura local.
- Follow-up documental `6d5eebe2`: deployment `dpl_2nEL2EZ6yhxXz3E3TGeMzh6VBFmh` ficou `READY`, `/api/health` e o bundle convergiram para `6d5eebe206c89481336f3f1584c14ee67d6ee842`, e o smoke pós-deploy do `consultor_mx` passou `1 passed (2.4m)`.
- O caminho `.js.map` do bundle atual retornou o `index.html` da rewrite (`text/html`), não um source map público.
- CodeRabbit CLI `0.7.1` autenticado executou revisão contra `1480ea42` e reportou 6 issues. As duas issues documentais foram corrigidas; 1 crítica, 1 major e 2 menores permanecem em arquivos concorrentes de pré-cadastro/teste, não alterados para preservar o trabalho externo.

## 39.8 Pendências

| Prioridade | Pendência | Impacto | Evidência | Ação |
|---|---|---|---|---|
| P1 | Auditoria histórica de segredos | 77 achados antigos, incluindo sessão do WhatsApp e scripts com chaves; não introduzidos pelo release | Gitleaks manual run `30847366721`; Gitleaks push run `30847358188` passou no último commit | Rotacionar credenciais afetadas e planejar limpeza de histórico com backup/recuperação antes de reescrever `main` |
| P1 | Comprovar stack trace desminificado da release atual | Bundle e health estão alinhados, mas a listagem legada histórica retornou 0 e o evento controlado não veio de um frame do bundle | Bundle `index-DCQ64CaR.js`; `/api/health` em 2026-08-03; evento histórico `08093d7cae174d23824a5273fa42bb91` | Provocar uma exceção a partir de um módulo do bundle em preview e confirmar frame TypeScript, source map, alertas e performance |
| P1 | Issues CodeRabbit em arquivos concorrentes | 1 crítica, 1 major e 2 menores permanecem fora deste escopo | Revisão CLI `0.7.1`, base `1480ea42`; arquivos `supabase/functions/store-pre-registration/index.ts` e teste associado | O proprietário do trabalho concorrente deve corrigir e revalidar sem sobrescrita |
| P2 | Rotação das credenciais e tokens fornecidos na conversa | Redução de risco de exposição | Segredos foram compartilhados em texto | Rotacionar após o encerramento operacional |
| P2 | 133 alertas Dependabot abertos | Risco de dependências no default branch | API paginada atual: 3 críticas, 70 altas, 47 moderadas, 13 baixas; alertas distribuídos em `.aiox-core`, `whatsapp-service` e backends auxiliares | Triar e atualizar por pacote e subprojeto; responsável: manutenção do repositório |
| P2 | 2 vulnerabilidades high no runtime principal | `react-router`/`react-router-dom` permanecem no range reportado pelo advisory; `brace-expansion` já foi atualizado no lockfile | `npm audit --omit=dev`: 2 high após a atualização | Avaliar correção compatível do React Router e validar a árvore `whatsapp-service` separadamente |
| Info | `/home` para Administrador Geral | Rota bloqueada pela matriz de autorização | Produção exibiu mensagem de acesso negado sem erro/overflow | Não alterar sem requisito explícito; validar com perfil autorizado se necessário |
| P1 | Backup restaurável não comprovado | Sem ponto de restauração testável para rollback de banco | Supabase `backups: []`, `pitr_enabled: false`, `walg_enabled: true` | Habilitar PITR/backup no projeto correto e executar restauração em ambiente controlado |
| P1 | Patch final ainda não publicado | As correções de PageCanvas, landmark, Sonner e grants RLS estão somente no worktree final | PR #187 aberto; `git status` local em `fix/mx-final-gates-20260810`; produção continua no merge `82191012` | Revisar, commitar, pushar, validar `pgTAP`/Preview e promover somente após smoke/CI |
| P1 | Replay/grants RLS ainda sem prova remota | O primeiro SHA falhou no histórico duplicado; o SHA seguinte falhou na ACL de `eh_area_interna_mx` | CI runs `31363182145` e `31366214127`; migration nova, guard e manifest `399` locais | Executar CI novo e exigir `pgTAP RLS Matrix` verde antes do smoke/produção |
