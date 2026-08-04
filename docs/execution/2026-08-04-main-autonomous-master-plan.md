# Execução autônoma MX — 2026-08-04

## Fonte de requisitos

- Prompt: `/Users/pedroguilherme/Downloads/PROMPT_DEFINITIVO_MAIN_SEM_WORKTREE_EXECUCAO_100_AUTONOMA_MX.md`
- Story associada à correção visual: `docs/stories/story-UX-20260718-paridade-visual-gerente-admin-v2.md`
- Branch autorizada: `main`; nenhum worktree ou branch auxiliar será criado.
- SHA inicial revalidado: `11a9465f253ce8f96052db70c9171b14425e9d4e`.
- Backup revalidado: tag `pre-main-autonomous-20260804-051820` e bundle `/Users/pedroguilherme/PROJETOS/MXGESTAOPREDITIVA-pre-main-autonomous-20260804-051820.bundle`.

## Restrições globais

1. Preservar `mx-v3-csv-VzMBNx/` e qualquer alteração não identificada do usuário.
2. Não registrar, commitar ou imprimir credenciais, tokens, links temporários ou PII.
3. Não rotacionar, revogar, regenerar ou substituir credenciais existentes.
4. Cada correção de código deve ter teste RED antes, GREEN depois, revisão de task e revisão ampla.
5. Push remoto só depois de lint, typecheck, testes relacionados, build, secret scan e revisão QA.
6. Toda evidência deve indicar ambiente, SHA, timestamp, perfil/rota/viewport quando aplicável e resultado observado.
7. Bloqueios externos devem permanecer explícitos; nenhuma cobertura parcial será declarada como integral.

## Tasks executáveis

### Task 1 — Controle e baseline

- Estado: `IN_PROGRESS`
- Criar e manter os nove arquivos obrigatórios, o ledger SDD e o registro de baseline.
- Revalidar Git, backup, acessos sem segredos, produção, branches e alterações do usuário.

### Task 2 — Warning de dimensões no gráfico do Gerente

- Estado: `NOT_STARTED`
- Rota/perfil: superfície inicial do Gerente, produção e local autenticado.
- Causa candidata: `ResponsiveContainer` em `AppointmentsChart` dentro de `.h-64` calcula largura/altura negativa ou zero durante o primeiro layout.
- Aceite: teste falha antes da correção; depois passa sem warning `width(-1)`/`height(-1)`, preserva dados reais, responsividade e acessibilidade; sem regressão em outras superfícies.

### Task 3 — Auditorias independentes

- Estado: `NOT_STARTED`
- Git/PRs/branches, Vercel/SHAs, rotas/perfis/viewports/estados, Supabase segurança/performance, APIs, Sentry, dependências, acessibilidade, performance e CI.
- Cada domínio deve produzir evidência ou `BLOCKED_EXTERNAL` com causa e alternativas tentadas.

### Task 4 — Matriz funcional e visual

- Estado: `NOT_STARTED`
- Exercitar os seis perfis previstos pelo prompt quando houver credencial/sessão real; registrar ausência de acesso para Consultor MX e Administrador Geral se não houver alternativa autorizada.
- Exercitar `390×844`, `600×900`, `768×1024`, `840×1024`, `1024×768`, `1280×800`, `1440×900`, `1600×1000`, `1920×1080`, sem overflow, erros de console ou rede não explicados.

### Task 5 — Gates locais e revisão

- Estado: `NOT_STARTED`
- Rodar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:bundle-size`, secret scan e CodeRabbit disponível.
- Executar revisão por task e uma revisão whole-branch; corrigir findings críticos/importantes dentro do limite SDD.

### Task 6 — Release e prova publicada

- Estado: `NOT_STARTED`
- Commit atômico em `main`, push sem force, checks do SHA exato, Vercel `READY`, `/api/health`, release/runtime SHA, smoke público e autenticado, monitoramento e rollback não destrutivo.

## Definition of Done aplicada

Uma task só será `DONE_WITH_EVIDENCE` com causa raiz, teste RED/GREEN, gates locais, revisão, commit/push, checks remotos, deployment correspondente, prova no ambiente publicado, console/rede limpos e artefato de evidência. O relatório final só poderá usar `CONCLUÍDO COM EVIDÊNCIA INTEGRAL` se nenhum gate ou perfil aplicável permanecer aberto.
