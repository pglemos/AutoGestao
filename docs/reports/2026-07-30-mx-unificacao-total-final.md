# MX Unificação Total — Relatório Final

> Relatório vivo de fechamento. Atualizado em 2026-08-03 após a publicação de `7a233312`.

## 39.1 Resumo executivo

O repositório está no branch `main`, com fundação visual, tokens, PageCanvas, shell canônico, auditorias estáticas e validações de múltiplos perfis já implementados. A última auditoria encontrou uma regressão isolada em `/relatorios/performance-vendas`: o cabeçalho não seguia o contrato visual canônico e os quatro gráficos emitiam warnings de dimensão inicial negativa. O cabeçalho e os quatro `ResponsiveContainer` foram corrigidos, publicados e validados em produção.

Status atual: **release da correção concluído; prompt mestre permanece parcialmente concluído por dívida histórica de segredos, alertas de dependências, findings CodeRabbit concorrentes e falta de stack trace desminificado comprovado no evento controlado**.

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

## 39.3 Evidências técnicas

- Branch: `main`; SHA publicado: `7a2333120f9ec16143915b7cc13c98d3bd350347`.
- Commits desta correção: `dd571f23`, `b841d50e`, `59b1c51e`, `f51ad48e`.
- Gates finais desta etapa: `npm test` 1710 pass / 0 fail / 13.997 asserts; `npm run lint` exit 0; `npm run build` exit 0; `npm run check:bundle-size` 1831,30/1860 KB; sem sourcemaps públicos.
- GitHub no SHA publicado: Quality Gates `30849035817`, Typecheck/unit `30849035801`, ESLint a11y `30849035811`, Atomic Design `30849035823` e Gitleaks push `30849035835`, todos `success`. A auditoria manual histórica do Gitleaks (`30847366721`) encontrou 77 achados antigos; isso não foi mascarado.
- Vercel: deployment atual da `main` `dpl_2afY6n86SsmiTGu8xeta6K8atzZb`, `READY`; URL imutável `https://mxperformance-1ookye42i-synvolt.vercel.app`; produção `https://mxperformance.com.br`.

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

## 39.6 Vercel

- Projeto: `mxperformance` / equipe `synvolt`.
- Node configurado: `24.x`.
- Deployment atual da `main`: `dpl_2afY6n86SsmiTGu8xeta6K8atzZb`, `READY`, com aliases `www.mxperformance.com.br`, `mxperformance.com.br` e `mxperformance.vercel.app`.
- `/api/health` retornou HTTP 200, `healthy`, com Vercel, Supabase API, database e crons críticos `ok`; release reportada pelo health: `7a2333120f9ec16143915b7cc13c98d3bd350347`.
- `/relatorios/performance-vendas` retornou HTTP 200 no domínio oficial.
- Smoke final autenticado confirmou os aliases oficiais, a rota corrigida e os dados reais.

## 39.7 Sentry

- Organização/projeto confirmados por API: `synvolt` / `mx-performance-frontend`.
- Release `7a2333120f9ec16143915b7cc13c98d3bd350347` confirmada como publicada no projeto, com deployment associado.
- Evento controlado confirmado: `08093d7cae174d23824a5273fa42bb91`, `MxControlledSourceMapValidation`, tags de produção, rota `/`, branch `main`, deployment `dpl_2afY6n86SsmiTGu8xeta6K8atzZb` e release correta.
- O build log do deployment registra `Upload type: artifact bundle` e o debug ID público `ff71a893-c507-4440-9653-17416b1f2be4` com seu `.js`/`.js.map` no `Source Map Upload Report`. A API legada de arquivos da release retornou `0`; o evento controlado foi gerado via DevTools e seu stack não é um frame do bundle, portanto a prova de stack trace desminificado permanece aberta.
- `sentry-cli` global não está instalado; `npx @sentry/cli` `2.58.5` foi usado sem persistir credenciais.
- Alertas e performance não foram comprovados nesta execução.
- CodeRabbit CLI `0.7.1` autenticado executou revisão contra `1480ea42` e reportou 6 issues. As duas issues documentais foram corrigidas; 1 crítica, 1 major e 2 menores permanecem em arquivos concorrentes de pré-cadastro/teste, não alterados para preservar o trabalho externo.

## 39.8 Pendências

| Prioridade | Pendência | Impacto | Evidência | Ação |
|---|---|---|---|---|
| P1 | Auditoria histórica de segredos | 77 achados antigos, incluindo sessão do WhatsApp e scripts com chaves; não introduzidos pelo release | Gitleaks manual run `30847366721`; Gitleaks push run `30847358188` passou no último commit | Rotacionar credenciais afetadas e planejar limpeza de histórico com backup/recuperação antes de reescrever `main` |
| P1 | Comprovar stack trace desminificado no Sentry | Bundle artifact foi enviado, mas a listagem legada retornou 0 e o evento controlado não veio de um frame do bundle | Event `08093d7cae174d23824a5273fa42bb91`; build log `dpl_2afY6n86SsmiTGu8xeta6K8atzZb`; API legada: `0` | Provocar uma exceção a partir de um módulo do bundle em preview e confirmar frame TypeScript no evento; validar alertas/performance |
| P1 | Issues CodeRabbit em arquivos concorrentes | 1 crítica, 1 major e 2 menores permanecem fora deste escopo | Revisão CLI `0.7.1`, base `1480ea42`; arquivos `supabase/functions/store-pre-registration/index.ts` e teste associado | O proprietário do trabalho concorrente deve corrigir e revalidar sem sobrescrita |
| P2 | Rotação das credenciais e tokens fornecidos na conversa | Redução de risco de exposição | Segredos foram compartilhados em texto | Rotacionar após o encerramento operacional |
| P2 | 129 alertas Dependabot abertos | Risco de dependências no default branch | API atual: 3 críticas, 69 altas, 44 moderadas, 13 baixas; inclui `python-jose`, `tar`, `Pillow`, `basic-ftp` e `brace-expansion` em árvores auxiliares | Triar e atualizar por pacote e subprojeto; responsável: manutenção do repositório |
| P2 | 2 vulnerabilidades high no runtime principal | `react-router`/`react-router-dom` permanecem no range reportado pelo advisory; `brace-expansion` já foi atualizado no lockfile | `npm audit --omit=dev`: 2 high após a atualização | Avaliar correção compatível do React Router e validar a árvore `whatsapp-service` separadamente |
| Info | `/home` para Administrador Geral | Rota bloqueada pela matriz de autorização | Produção exibiu mensagem de acesso negado sem erro/overflow | Não alterar sem requisito explícito; validar com perfil autorizado se necessário |
