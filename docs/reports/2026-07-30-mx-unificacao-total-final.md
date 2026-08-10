# MX Unificação Total — Relatório Final

> Relatório vivo de fechamento. Atualizado em 2026-08-03 após a publicação de `7387fb32` e a revalidação real do consultor.

> **Revalidação mais recente (2026-08-10):** os parágrafos que citam o SHA
> `7387fb32`, deployments de 03/08 e a execução direta na `main` são históricos
> e estão superseded como prova do estado atual. A retomada ocorreu no worktree
> isolado da story, branch `feat/mx-unificacao-total-20260809`, sobre
> `origin/main` `71d9286a`.

## Revalidação vigente — 2026-08-10

- Correção local commitada em `a3ede247ed3db02a4aa0cbb1a97cd6f79670f75d`.
- Causa raiz: a aba de performance do Dono desligava o `ConditionalPageCanvas`
  e o `OwnerExecutiveCockpit` mantinha padding lateral próprio.
- Correção: canvas habilitado para Dono com `as="div"`; padding próprio removido;
  contrato RED/GREEN adicionado e restrito à abertura JSX real.
- Gates locais: lint, typecheck, suíte (`2.594 pass`, `18.152 asserts`), build,
  bundle (`1.567,08/1.860 KB gzip`), auditoria de rotas e `git diff --check`
  passaram. O lint mantém somente o warning a11y histórico de `HelpTooltip.tsx`.
- Browser local autenticado como Dono: `1440×900` e `390×844` passaram com um
  canvas `DIV`, margens canônicas `32px`/`16px`, cockpit sem padding próprio,
  um landmark `main`, zero overflow e console sem erros.
- O PR #186 está aberto no GitHub; o preview está `READY` em
  `https://mxperformance-git-feat-mx-unificacao-total-20260809-synvolt.vercel.app`.
  O `/api/health` do preview retornou HTTP 200, `healthy`, ambiente `preview` e
  release `79928725b4ce49ba48f94a418ad59623bcd9d65c`.
- O workflow remoto `31353510899` passou nos gates protegidos, incluindo o
  `authenticated-visual`; o TestSprite informativo falhou por “No tests
  detected”. Produção ainda não foi promovida nesta retomada.
- Pendências bloqueantes continuam: backup restaurável/PITR, prova independente
  de source maps/Sentry, validação integral de perfis/rotas e rotação dos
  segredos fornecidos na sessão.

## 39.1 Resumo executivo — estado vigente da retomada

O repositório está no branch `feat/mx-unificacao-total-20260809`, com a fundação
visual, tokens, PageCanvas, shell canônico, auditorias estáticas e validações
de múltiplos perfis preservados. A correção desta retomada trata o cockpit do
Dono: o `ConditionalPageCanvas` agora é habilitado com `as="div"` e o padding
lateral duplicado foi removido. O PR #186 tem preview e CI protegido aprovados,
mas ainda não foi promovido à produção.

Status atual: **preview aprovado; prompt mestre permanece parcialmente
concluído por produção ainda não promovida, backup restaurável/PITR, prova
independente de source maps/Sentry, matriz integral e rotação de segredos**.

## 39.2 Inventário

- Rotas: 111 (103 protegidas, 8 públicas).
- Tabelas: 127.
- RPCs: 84.
- Edge Functions: 14.
- Componentes alterados nesta etapa: 5 componentes — `AdminHeader.tsx` e os 4 gráficos de Performance de Vendas.
- Inventário estruturado: `docs/audits/route-inventory.md` e `docs/audits/route-inventory.json`.
- Biblioteca Atomic Design: inventário em `docs/audits/component-library-inventory.md` (24 atoms, 27 molecules, 6 organisms, 53 componentes `ui`, 8 stories; templates ainda não povoados).
- Evidência visual: `visual-evidence/internal-mx/`, com route matrices, screenshots e métricas para os perfis/rotas cobertos; não representa captura integral de todas as combinações do prompt.
- Shells, scopes e tokens: inventariados pelos scripts AIOX e auditorias anteriores; nenhuma alteração concorrente foi incorporada neste fechamento.
- Total de páginas migradas e testes adicionados no histórico: não reestimado nesta etapa para evitar transformar inventário histórico em fato novo.

## 39.3 Evidências técnicas — estado vigente da retomada

- Branch/PR: `feat/mx-unificacao-total-20260809` / #186, base `main`.
- Commits da retomada: `a3ede247ed3db02a4aa0cbb1a97cd6f79670f75d` (correção) e
  `79928725b4ce49ba48f94a418ad59623bcd9d65c` (documentação/contratos).
- Gates locais registrados: `npm test` 2.594 pass / 0 fail / 18.152 asserts;
  lint, typecheck, build, bundle, auditoria de rotas e `git diff --check` sem
  falhas.
- GitHub Actions run `31353510899`: gates protegidos, incluindo
  `authenticated-visual`, `success`; o status informativo TestSprite falhou por
  “No tests detected” e o Supabase Preview foi skipped por configuração.
- Preview Vercel: `READY`, URL imutável
  `https://mxperformance-git-feat-mx-unificacao-total-20260809-synvolt.vercel.app`;
  `/api/health` converge para `79928725b4ce49ba48f94a418ad59623bcd9d65c`.

## 39.4 Evidências visuais

- Evidências existentes: `visual-evidence/internal-mx/`.
- Falha reproduzida: rota `performance-vendas`, em desktop/tablet/mobile, por ausência do cabeçalho canônico.
- Evidência de produção anterior: `/relatorios/performance-vendas` renderizou dados reais (`49 lojas`, `204` sell-outs históricos, `476` meta consolidada), sem overflow horizontal.
- Screenshot final pós-deploy revisado: `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-final-f51ad48e.png`.
- Viewport da captura: desktop Chrome, 1721x1233; rota `/relatorios/performance-vendas`; estado autenticado Administrador Geral, dados reais.
- Smoke final: cabeçalho canônico presente, raio 16px, fundo branco, quatro gráficos com dimensões positivas, zero overflow e console vazio para warn/error.

## 39.5 Supabase

- Projeto confirmado: `fbhcmzzgwjdgkctlfvbo`.
- Schema alinhado até migration `20260803134000`.
- Auditoria funcional e de RLS anteriores registradas no histórico do projeto; nenhuma alteração de banco é necessária para a correção visual atual.

## 39.6 Vercel — estado vigente da retomada

- Projeto: `mxperformance` / equipe `synvolt`.
- Node configurado: `24.x`.
- Deployment de preview do PR #186: `READY`, URL imutável
  `https://mxperformance-git-feat-mx-unificacao-total-20260809-synvolt.vercel.app`.
- `/api/health` do preview retornou HTTP 200, `healthy`, com Vercel, Supabase
  API, database e crons críticos `ok`; release reportada pelo health:
  `79928725b4ce49ba48f94a418ad59623bcd9d65c`.
- A produção `https://www.mxperformance.com.br` permanece a referência
  operacional anterior e ainda precisa ser revalidada após o merge; READY do
  preview não é prova de produção.

## 39.7 Sentry

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
| P1 | Auditoria histórica de segredos | 77 achados antigos, incluindo sessão do WhatsApp e scripts com chaves; não introduzidos pelo release | Gitleaks manual run `30847366721`; Gitleaks push run `30847358188` passou no último commit | Rotacionar credenciais afetadas e planejar limpeza de histórico com backup/recuperação antes de reescrever `main` |
| P1 | Comprovar stack trace desminificado da release atual | Bundle e health estão alinhados, mas a listagem legada histórica retornou 0 e o evento controlado não veio de um frame do bundle | Bundle `index-DCQ64CaR.js`; `/api/health` em 2026-08-03; evento histórico `08093d7cae174d23824a5273fa42bb91` | Provocar uma exceção a partir de um módulo do bundle em preview e confirmar frame TypeScript, source map, alertas e performance |
| P1 | Issues CodeRabbit em arquivos concorrentes | 1 crítica, 1 major e 2 menores permanecem fora deste escopo | Revisão CLI `0.7.1`, base `1480ea42`; arquivos `supabase/functions/store-pre-registration/index.ts` e teste associado | O proprietário do trabalho concorrente deve corrigir e revalidar sem sobrescrita |
| P2 | Rotação das credenciais e tokens fornecidos na conversa | Redução de risco de exposição | Segredos foram compartilhados em texto | Rotacionar após o encerramento operacional |
| P2 | 133 alertas Dependabot abertos | Risco de dependências no default branch | API paginada atual: 3 críticas, 70 altas, 47 moderadas, 13 baixas; alertas distribuídos em `.aiox-core`, `whatsapp-service` e backends auxiliares | Triar e atualizar por pacote e subprojeto; responsável: manutenção do repositório |
| P2 | 2 vulnerabilidades high no runtime principal | `react-router`/`react-router-dom` permanecem no range reportado pelo advisory; `brace-expansion` já foi atualizado no lockfile | `npm audit --omit=dev`: 2 high após a atualização | Avaliar correção compatível do React Router e validar a árvore `whatsapp-service` separadamente |
| Info | `/home` para Administrador Geral | Rota bloqueada pela matriz de autorização | Produção exibiu mensagem de acesso negado sem erro/overflow | Não alterar sem requisito explícito; validar com perfil autorizado se necessário |
| P1 | Backup restaurável não comprovado | Sem ponto de restauração testável para rollback de banco | Supabase `backups: []`, `pitr_enabled: false`, `walg_enabled: true` | Habilitar PITR/backup no projeto correto e executar restauração em ambiente controlado |
