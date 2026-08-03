# MX Unificação Total — Relatório Final

> Relatório vivo de fechamento. Atualizado em 2026-08-03 após o release `f51ad48e`.

## 39.1 Resumo executivo

O repositório está no branch `main`, com fundação visual, tokens, PageCanvas, shell canônico, auditorias estáticas e validações de múltiplos perfis já implementados. A última auditoria encontrou uma regressão isolada em `/relatorios/performance-vendas`: o cabeçalho não seguia o contrato visual canônico e os quatro gráficos emitiam warnings de dimensão inicial negativa. O cabeçalho e os quatro `ResponsiveContainer` foram corrigidos, publicados e validados em produção.

Status atual: **release da correção concluído; prompt mestre permanece parcialmente concluído nos gates externos de Sentry, CodeRabbit e CI GitHub completo**.

## 39.2 Inventário

- Rotas: 111 (103 protegidas, 8 públicas).
- Tabelas: 127.
- RPCs: 84.
- Edge Functions: 14.
- Componentes alterados nesta etapa: 4 gráficos de Performance de Vendas.
- Shells, scopes e tokens: inventariados pelos scripts AIOX e auditorias anteriores; nenhuma alteração concorrente foi incorporada neste fechamento.
- Total de páginas migradas e testes adicionados no histórico: não reestimado nesta etapa para evitar transformar inventário histórico em fato novo.

## 39.3 Evidências técnicas

- Branch: `main`; SHA do código funcional publicado: `f51ad48e`; os commits documentais posteriores permanecem na mesma `main`.
- Commits desta correção: `dd571f23`, `b841d50e`, `59b1c51e`, `f51ad48e`.
- Gates finais: `npm test` 1707 pass / 0 fail / 13.988 asserts; `npm run lint` exit 0; `npm run build` exit 0; `npm run check:bundle-size` 1831,32/1860 KB; sem sourcemaps públicos.
- GitHub: nenhum workflow Actions foi associado ao SHA; o check externo Vercel terminou `success`.
- Vercel: deployment final `dpl_m2uGGrqo3PezodqcwTFPDagDepYw`, `READY`.
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
- Deployment final: `dpl_m2uGGrqo3PezodqcwTFPDagDepYw`, `READY`, com aliases `www.mxperformance.com.br`, `mxperformance.com.br` e `mxperformance.vercel.app`.
- Smoke final autenticado confirmou os aliases oficiais, a rota corrigida e os dados reais.

## 39.7 Sentry

- `sentry-cli` não está instalado.
- SDK e integração permanecem presentes no ambiente publicado, mas a validação real exigida pelo prompt não foi comprovada.
- Evento controlado, release, source maps desminificados, stack trace, alertas e performance não foram comprovados nesta execução; `sentry-cli` está ausente.

## 39.8 Pendências

| Prioridade | Pendência | Impacto | Evidência | Ação |
|---|---|---|---|---|
| P1 | CI GitHub completo do SHA final | Não existe workflow associado ao commit | `gh run list --commit f51ad48e` vazio; status só Vercel | Configurar ou disparar pipeline de qualidade no repositório; responsável: manutenção do CI |
| P1 | Validar Sentry com evento controlado | Observabilidade não comprovada | `sentry-cli` ausente | Usar painel/SDK autorizado ou instalar ferramenta autorizada e registrar evidência |
| P1 | CodeRabbit no SHA final | Revisão complementar não executada | Instalação/limitação registrada no histórico | Executar se disponível; nunca tratar ausência como aprovação |
| P2 | Rotação das credenciais e tokens fornecidos na conversa | Redução de risco de exposição | Segredos foram compartilhados em texto | Rotacionar após o encerramento operacional |
| P2 | 126 vulnerabilidades Dependabot | Risco de dependências no default branch | Aviso remoto do push: 3 críticas, 68 altas, 42 moderadas, 13 baixas | Triar e atualizar dependências; responsável: manutenção do repositório |
| Info | `/home` para Administrador Geral | Rota bloqueada pela matriz de autorização | Produção exibiu mensagem de acesso negado sem erro/overflow | Não alterar sem requisito explícito; validar com perfil autorizado se necessário |
