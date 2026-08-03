# MX Unificação Total — Relatório Final

> Relatório vivo de fechamento. Atualizado em 2026-08-03 após a publicação de `a81c3f86`.

## 39.1 Resumo executivo

O repositório está no branch `main`, com fundação visual, tokens, PageCanvas, shell canônico, auditorias estáticas e validações de múltiplos perfis já implementados. A última auditoria encontrou uma regressão isolada em `/relatorios/performance-vendas`: o cabeçalho não seguia o contrato visual canônico e os quatro gráficos emitiam warnings de dimensão inicial negativa. O cabeçalho e os quatro `ResponsiveContainer` foram corrigidos, publicados e validados em produção.

Status atual: **release da correção concluído; prompt mestre permanece parcialmente concluído nos gates externos de Sentry, CodeRabbit e CI GitHub completo**.

## 39.2 Inventário

- Rotas: 111 (103 protegidas, 8 públicas).
- Tabelas: 127.
- RPCs: 84.
- Edge Functions: 14.
- Componentes alterados nesta etapa: 5 componentes — `AdminHeader.tsx` e os 4 gráficos de Performance de Vendas.
- Inventário estruturado: `docs/audits/route-inventory.md` e `docs/audits/route-inventory.json`.
- Shells, scopes e tokens: inventariados pelos scripts AIOX e auditorias anteriores; nenhuma alteração concorrente foi incorporada neste fechamento.
- Total de páginas migradas e testes adicionados no histórico: não reestimado nesta etapa para evitar transformar inventário histórico em fato novo.

## 39.3 Evidências técnicas

- Branch: `main`; SHA do código funcional: `f51ad48e`; SHA documental/operacional validado: `d8f10447f6ce77c5e94c5510927ef78c8dc3f7b5`.
- Commits desta correção: `dd571f23`, `b841d50e`, `59b1c51e`, `f51ad48e`.
- Gates finais: `npm test` 1707 pass / 0 fail / 13.988 asserts; `npm run lint` exit 0; `npm run build` exit 0; `npm run check:bundle-size` 1831,32/1860 KB; sem sourcemaps públicos.
- GitHub: Quality Gates, Typecheck/unit, ESLint a11y, bundle-budget, Module Design System Parity e MX Atomic Design Enforcement passaram no SHA `d8f10447` (Quality run `30848652260`; Gitleaks push `30848652381`). A auditoria manual histórica do Gitleaks (run `30847366721`) encontrou 77 achados antigos; isso não foi mascarado.
- Vercel: deployment atual da `main` `dpl_Fo6p841PvUk6aLMKcnUkUyrUwCAY`, `READY`.
- Preview/deployment URL: `https://mxperformance-c6fdi33ax-synvolt.vercel.app`; produção: `https://mxperformance.com.br`.

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
- Deployment funcional da correção: `dpl_m2uGGrqo3PezodqcwTFPDagDepYw`; deployment atual da `main`: `dpl_Fo6p841PvUk6aLMKcnUkUyrUwCAY`, `READY`, com aliases `www.mxperformance.com.br`, `mxperformance.com.br` e `mxperformance.vercel.app`.
- `/api/health` retornou HTTP 200, `healthy`, com Vercel, Supabase API, database e crons críticos `ok`; release reportada pelo health: `d8f10447f6ce77c5e94c5510927ef78c8dc3f7b5`.
- `/relatorios/performance-vendas` retornou HTTP 200 no domínio oficial.
- Smoke final autenticado confirmou os aliases oficiais, a rota corrigida e os dados reais.

## 39.7 Sentry

- Organização/projeto confirmados por API: `synvolt` / `mx-performance-frontend`.
- Release `a81c3f86d391dd5646feaab8f8443adad1a370d5` confirmada como publicada no projeto, com deployment associado.
- Evento controlado confirmado: `21d41cfbda2d407e9c424f0ae488313f`, issue `MX-PERFORMANCE-FRONTEND-5`, tags de produção, rota `/relatorios/performance-vendas` e release correta; issue resolvida após a validação.
- O build temporário exato do SHA mostrou `Successfully uploaded source maps to Sentry`, mas a listagem de arquivos pela API e pelo CLI retornou `0`; source maps efetivamente associados e stack trace desminificado não estão comprovados.
- `sentry-cli` global não está instalado; `npx @sentry/cli` `2.58.5` foi usado sem persistir credenciais.
- Alertas e performance não foram comprovados nesta execução.
- CodeRabbit CLI `0.7.1` autenticado executou revisão contra `1480ea42` e reportou 6 issues. As duas issues documentais desta etapa foram corrigidas; 3 issues (incluindo 1 crítica) permanecem em arquivos concorrentes de pré-cadastro e 1 issue menor permanece em teste concorrente, não alterados para preservar o trabalho externo.

## 39.8 Pendências

| Prioridade | Pendência | Impacto | Evidência | Ação |
|---|---|---|---|---|
| P1 | Auditoria histórica de segredos | 77 achados antigos, incluindo sessão do WhatsApp e scripts com chaves; não introduzidos pelo release | Gitleaks manual run `30847366721`; Gitleaks push run `30847358188` passou no último commit | Rotacionar credenciais afetadas e planejar limpeza de histórico com backup/recuperação antes de reescrever `main` |
| P1 | Comprovar source maps/stack trace no Sentry | Evento e release chegaram, mas a listagem de artefatos retornou 0 | Evento `21d41cfbda2d407e9c424f0ae488313f`; API/CLI de arquivos: `0` | Repetir upload pelo fluxo oficial e abrir um evento de exceção com frame minificado desminografado; validar alertas/performance |
| P1 | Issues CodeRabbit em arquivos concorrentes | 1 crítica, 1 major e 2 menores permanecem fora deste escopo | Revisão CLI `0.7.1`, base `1480ea42`; arquivos `supabase/functions/store-pre-registration/index.ts` e teste associado | O proprietário do trabalho concorrente deve corrigir e revalidar sem sobrescrita |
| P2 | Rotação das credenciais e tokens fornecidos na conversa | Redução de risco de exposição | Segredos foram compartilhados em texto | Rotacionar após o encerramento operacional |
| P2 | 126 vulnerabilidades Dependabot | Risco de dependências no default branch | Aviso remoto do push: 3 críticas, 68 altas, 42 moderadas, 13 baixas | Triar e atualizar dependências; responsável: manutenção do repositório |
| Info | `/home` para Administrador Geral | Rota bloqueada pela matriz de autorização | Produção exibiu mensagem de acesso negado sem erro/overflow | Não alterar sem requisito explícito; validar com perfil autorizado se necessário |
