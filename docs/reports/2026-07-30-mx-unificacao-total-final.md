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
- RED/GREEN: contratos de PageCanvas/landmark passaram e o contrato novo do
  Sonner falhou antes da implementação e passou isoladamente depois.
- Gates locais vigentes: lint exit `0` (warning histórico em `HelpTooltip.tsx`),
  typecheck exit `0`, `npm test` `2.597 pass / 0 fail / 18.161 asserts`, build
  exit `0` sem sourcemaps públicos, bundle `1.563,57/1.860 KB gzip` e
  `git diff --check` exit `0`.
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
- Estado: **local aprovado; produção atual saudável, mas o diff final ainda não
  foi commitado, revisado em PR/preview nem promovido**.

## 39.1 Resumo executivo — estado vigente da retomada

O repositório está no branch `fix/mx-final-gates-20260810`, sobre a fundação
visual, tokens, PageCanvas, shell canônico, auditorias estáticas e validações
de múltiplos perfis já incorporadas ao merge `82191012`. Esta retomada fechou
duas regressões estruturais e o overflow mobile do toaster, com testes e prova
de navegador local.

Status atual: **gates locais aprovados; produção saudável no merge anterior;
diff final aguardando commit, PR/preview e nova promoção**. O prompt mestre
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

- Branch/PR: `fix/mx-final-gates-20260810` / PR novo ainda não aberto, base `main`.
- Base remota verificada: PR #186 `MERGED`, merge
  `82191012260208c6dc82e240cd78fdf4658fb6ba`; sete workflows desse SHA
  concluíram com sucesso.
- Gates locais do diff final: lint/typecheck/build/diff-check exit `0`,
  `npm test` `2597 pass / 0 fail / 18161 asserts`, bundle `1563,57/1860 KB`
  gzip e auditorias estruturais/paridade/rotas sem erros.
- Worktree está deliberadamente não commitado nesta medição; o SHA do novo
  commit será acrescentado após a revisão do diff e antes do push.
- Produção vigente: Vercel deployment
  `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc`, `READY`, aliases oficiais; `/api/health`
  HTTP `200`, `healthy`, release igual ao merge `82191012`.
- Preview do diff final: ainda não criado; não confundir a produção/preview do
  PR #186 com a validação desta nova alteração.

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
- Schema alinhado até migration `20260803134000`.
- Auditoria funcional e de RLS anteriores registradas no histórico do projeto; nenhuma alteração de banco é necessária para a correção visual atual.

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
| P1 | Diff final ainda não publicado | As correções de PageCanvas, landmark e Sonner estão somente no worktree final | `git status` local em `fix/mx-final-gates-20260810`; produção continua no merge `82191012` | Commitar, abrir PR, validar preview e promover somente após smoke/CI |
