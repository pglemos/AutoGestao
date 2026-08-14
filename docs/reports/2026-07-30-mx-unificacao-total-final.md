# MX Unificação Total — Relatório Final

> Relatório vivo de fechamento. Os registros históricos abaixo são preservados,
> mas não substituem a revalidação corrente do worktree.

> **Estado corrente (2026-08-10):** os parágrafos que citam o SHA `7387fb32`,
> PR #186, deployments de 03/08 e a branch `feat/mx-unificacao-total-20260809`
> são históricos e não são prova do estado atual. A execução corrente ocorre no
> worktree isolado `/Users/pedroguilherme/PROJETOS/mx-full-execution-20260810`,
> branch `fix/mx-full-execution-20260810`, sobre `origin/main` `9f998e27`.

## Revalidação vigente — 2026-08-10

- Worktree corrente: branch `fix/mx-full-execution-20260810`, base remota
  `origin/main` em `9f998e27`; alterações ainda não commitadas no momento desta
  revalidação.
- Alterações locais: `PageCanvas` canônico em fechamento diário e rotina do
  gerente, loading da performance da equipe sem container próprio, `HelpTooltip`
  como botão nativo, tipografia canônica no Check-in e contratos de regressão.
- Gates locais atuais: `npm test` `2604 pass / 0 fail / 18181 expect()`;
  `npm run lint`, `npm run typecheck`, `npm run build`,
  `npm run check:bundle-size`, auditoria de layout/rotas, estrutura, paridade,
  IDE sync, a11y e `git diff --check` passaram. Bundle: `1563,80/1860 KB gzip`;
  build sem sourcemaps públicos.
- Contratos direcionados: `38 pass / 0 fail / 8221 expect()`; layout contract:
  zero violações; inventário runtime: 109 rotas, 101 protegidas, 8 públicas,
  136 tabelas, 87 RPCs, 14 Edge Functions e 263 pares tabela/operação.
- Segurança: `gitleaks protect --staged` passou sem leaks. O scan histórico
  percorreu 1.950 commits e encontrou 116 achados redigidos; o scan corrente de
  `src/` apontou três falsos positivos genéricos em fixtures/diagnósticos não
  alterados. Rotação/expurgo histórico permanece pendente.
- A revisão Agy/Antigravity foi tentada em modo somente leitura, mas o CLI
  respondeu com mensagens meta sobre agentes/modelo e não produziu achados; não
  é contada como gate. O modelo “GPT 5.6 Luna” não está disponível na listagem
  local do CLI.
- Não há nesta revalidação commit, push, PR, CI remoto, preview, promoção de
  produção, prova de backup/PITR, evento Sentry/source map da branch ou smoke
  autenticado novo. Esses gates permanecem bloqueantes.

## 39.1 Resumo executivo — estado vigente

O worktree corrente preserva a fundação visual, tokens, PageCanvas, shell
canônico, auditorias estáticas e validações de múltiplos perfis. Nesta etapa,
as rotas gerenciais restantes foram alinhadas ao `PageCanvas`, sem alterar o
banco ou promover código remoto. O diff está local e staged, mas ainda sem
commit, PR, preview ou CI remoto.

Status atual: **validação local aprovada; prompt mestre permanece parcialmente
concluído por commit/CI/preview/produção, backup restaurável/PITR, prova
independente de source maps/Sentry, matriz integral e rotação de segredos**.

## 39.2 Inventário

- Rotas runtime: 109 (101 protegidas, 8 públicas).
- Tabelas runtime: 136.
- RPCs runtime: 87.
- Edge Functions: 14.
- Componentes/contratos alterados nesta etapa: 12 arquivos staged, incluindo
  `ManagerDailyClosingBase44.tsx`, `ManagerDayRoutine*`,
  `ManagerTeamPerformance.tsx`, `HelpTooltip.tsx` e `CheckinHeader.tsx`.
- Inventário estruturado: `docs/audits/route-inventory.md` e `docs/audits/route-inventory.json`.
- Biblioteca Atomic Design: inventário em `docs/audits/component-library-inventory.md` (24 atoms, 27 molecules, 6 organisms, 53 componentes `ui`, 8 stories; templates ainda não povoados).
- Evidência visual: `visual-evidence/internal-mx/`, com route matrices, screenshots e métricas para os perfis/rotas cobertos; não representa captura integral de todas as combinações do prompt.
- Shells, scopes e tokens: inventariados pelos scripts AIOX e auditorias anteriores; nenhuma alteração concorrente foi incorporada neste fechamento.
- Total de páginas migradas e testes adicionados no histórico: não reestimado
  nesta etapa para evitar transformar inventário histórico em fato novo.

## 39.3 Evidências técnicas — estado vigente da retomada

- Branch: `fix/mx-full-execution-20260810`, base `origin/main` `9f998e27`.
- Commit/PR/CI remoto: ainda não executados para este diff.
- Gates locais atuais: `npm test` 2604 pass / 0 fail / 18181 asserts; lint,
  typecheck, build, bundle, auditorias de layout/rotas, AIOX structure/parity/
  IDE sync, a11y e diff-check sem falhas.
- Preview/produção/Vercel/GitHub: nenhuma prova nova nesta retomada corrente.

## 39.4 Evidências visuais

- Evidências visuais anteriores permanecem em `visual-evidence/internal-mx/` e
  `output/playwright/`, mas não há screenshot nova dos componentes gerenciais
  desta etapa.
- Browser autenticado novo para o diff corrente ainda não executado; portanto
  não se afirma paridade visual/console/rede em preview ou produção.

## 39.5 Supabase

- Projeto confirmado: `fbhcmzzgwjdgkctlfvbo`.
- Schema alinhado até as evidências históricas registradas; esta etapa não
  altera migrations nem executa DDL remoto.
- Auditoria funcional e de RLS anteriores registradas no histórico do projeto; nenhuma alteração de banco é necessária para a correção visual atual.

## 39.6 Vercel — estado vigente da retomada

- Projeto: `mxperformance` / equipe `synvolt`.
- Node configurado: `24.x`.
- Não há deployment de preview para o commit corrente; qualquer URL/health
  listada nos registros históricos abaixo não prova este diff.
- A produção `https://www.mxperformance.com.br` não foi alterada nem validada
  para o commit corrente.

## 39.7 Sentry

- Estado corrente: nenhuma release/evento/source map da branch
  `fix/mx-full-execution-20260810` foi validado. O token operacional não foi
  repetido nem persistido.
- Registros históricos abaixo permanecem somente para rastreabilidade:
- Organização/projeto confirmados por API: `synvolt` / `mx-performance-frontend`.
- A evidência histórica confirma releases anteriores, mas não é usada como prova da release atual.
- A inspeção do bundle servido e `/api/health` no deployment atual converge para a release Sentry `7387fb325dd645aaa2f832895e341c541c1f1d60`.
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
| P1 | Auditoria histórica de segredos | Scan atual encontrou 116 achados históricos redigidos em 1.950 commits; scan staged corrente passou; três detecções genéricas em `src/` são fixtures/diagnósticos não alterados | Gitleaks 8.30.1: histórico exit 1, `protect --staged` exit 0, scan `src/` exit 1 com três falsos positivos classificados | Rotacionar credenciais afetadas e planejar limpeza de histórico com backup/recuperação antes de reescrever `main` |
| P1 | Comprovar stack trace desminificado da release atual | Bundle e health estão alinhados, mas a listagem legada histórica retornou 0 e o evento controlado não veio de um frame do bundle | Bundle `index-DCQ64CaR.js`; `/api/health` em 2026-08-03; evento histórico `08093d7cae174d23824a5273fa42bb91` | Provocar uma exceção a partir de um módulo do bundle em preview e confirmar frame TypeScript, source map, alertas e performance |
| P1 | Issues CodeRabbit em arquivos concorrentes | 1 crítica, 1 major e 2 menores permanecem fora deste escopo | Revisão CLI `0.7.1`, base `1480ea42`; arquivos `supabase/functions/store-pre-registration/index.ts` e teste associado | O proprietário do trabalho concorrente deve corrigir e revalidar sem sobrescrita |
| P2 | Rotação das credenciais e tokens fornecidos na conversa | Redução de risco de exposição | Segredos foram compartilhados em texto | Rotacionar após o encerramento operacional |
| P2 | 133 alertas Dependabot abertos | Risco de dependências no default branch | API paginada atual: 3 críticas, 70 altas, 47 moderadas, 13 baixas; alertas distribuídos em `.aiox-core`, `whatsapp-service` e backends auxiliares | Triar e atualizar por pacote e subprojeto; responsável: manutenção do repositório |
| P2 | 2 vulnerabilidades high no runtime principal | `react-router`/`react-router-dom` permanecem no range reportado pelo advisory; `brace-expansion` já foi atualizado no lockfile | `npm audit --omit=dev`: 2 high após a atualização | Avaliar correção compatível do React Router e validar a árvore `whatsapp-service` separadamente |
| Info | `/home` para Administrador Geral | Rota bloqueada pela matriz de autorização | Produção exibiu mensagem de acesso negado sem erro/overflow | Não alterar sem requisito explícito; validar com perfil autorizado se necessário |
| P1 | Backup restaurável não comprovado | Sem ponto de restauração testável para rollback de banco | Supabase `backups: []`, `pitr_enabled: false`, `walg_enabled: true` | Habilitar PITR/backup no projeto correto e executar restauração em ambiente controlado |
