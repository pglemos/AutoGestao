# Plano Mestre — Convergência Total Admin MX Base44 (2026-08-17)

## Contexto

Execução autônoma de convergência do módulo Administrador MX / Consultor MX
sobre a base MX existente, usando o projeto Base44 como referência funcional
e a arquitetura canônica MX como base técnica.

## Contrato de execução

- Branch: `main` (única fonte; zero worktree; zero branch auxiliar).
- Credenciais: apenas as já fornecidas; zero rotação.
- Integração: `git merge origin/main` (sem force push).
- Fonte única: nenhum domínio concorrente; aliases legados preservados como
  compatibilidade, nunca como segunda navegação.

## Estado no início (SHA `1ebe5d48`)

- Baseline local `pre-mx-v5-20260816-203016` registrado em `CURRENT_STATE.json`.
- Divergência local: `main` 1 commit à frente / 10 atrás de `origin/main`.
- `origin/main` continha a unificação canônica (rotas, tabs, fusão de superfícies).
- CI de `origin/main` (SHA `19a66ce8`) estava **vermelha** (11 testes).

## Workstreams

### W1 — Integração e CI verde (DONE)

- Merge `origin/main` → `main` (HEAD `4c7c5323`), sem conflitos, sem perda.
- Teste de navegação canônica atualizado para travar mapa de uma entrada por
  domínio (commit `7294b70b`).
- Correção de 5 testes de release/env-dependentes quebrados na CI:
  - FASE AH/AK 37.018: evidência movida do ledger gitignored para
    `docs/audit/2026-08-15-foundation-zero-release-evidence.md`.
  - FASE AK 37.005: bundle local-only validado como contrato documentado.
  - FASE K: `execSync(grep)` → `scanSourceFiles` (determinístico) + correção da
    produção: `IconButton` passa a usar `ui/tooltip` (Radix) no lugar do
    `atoms/Tooltip` (CSS puro) — commit `1eab8ca7` (em conjunto com a
    padronização de headers do agente concorrente).
- Resultado: `npm test` 3854/0, lint 0, build 0.

### W2 — Domínios canônicos (VERIFICAR/COMPLETAR)

Domínios obrigatórios (espec §5) e estado atual:

| Domínio | Rota canônica | Aliases | Status |
|---|---|---|---|
| Clientes MX + Lojas | `/clientes` | `/lojas` → `/clientes?mode=lojas` | ✅ alias + tabs; validar CRUD loja em `/clientes` |
| Consultoria MX | `/consultoria` | `/consultoria-mx`, `/consultoria/clientes` | ✅ alias + modos; validar modos |
| Plano Estratégico + Indicadores | `/plano-estrategico` | `/indicadores` → `?mode=catalogo` | ✅ alias; validar catálogo 45 |
| Planos de Ação | `/plano-acao` | `/planos-acao` → `?mode=biblioteca` | ✅ alias; validar engine |
| Equipe | `/equipe` | `/team` | ✅ alias |

### W3 — Dados mestres (VERIFICAR)

- ✅ `catalogo_indicadores_planejamento` = 45 indicadores.
- ✅ 4 produtos oficiais (`programas_visita_consultoria`: pmr_online,
  pmr_hibrido, pmr_plus, ppa) + versões metodológicas + conteúdo de encontros.
- ✅ 14 etapas de metodologia; 6 programas de visita.
- 🔶 `planos_acao_templates` / `pacotes_indicadores_estrategicos` vazios —
  conteúdo criado pelo Admin em runtime (classificar, não semear).

### W4 — RLS / segurança / Supabase (VERIFICAR)

- Security advisor ERRORs = 0 em `CURRENT_STATE.json`.
- Migrations até `20260816235900_clientes_parity_lifecycle.sql` (383 total).
- A re-auditar: advisors, policies críticas, SECURITY DEFINER.

### W5 — Produção / SHA (EM ANDAMENTO)

- Health `19a66ce8` healthy (vercel/supabase_api/database/critical_crons ok).
- Vercel deployando `1eab8ca7`; validar SHA/health pós-deploy.

## Gates

- `npm run lint` / `typecheck` / `test` / `build` → verdes.
- CI GitHub → verde em `main`.
- Vercel READY com `production.gitSha == main`.
- `/api/health` 200, `release == main SHA`.

## Artefatos

- `docs/audits/base44-admin-parity-matrix.md` + JSON.
- `docs/audits/domain-duplication-inventory.md`.
- `artifacts/mx-total-convergence-ledger.json`.
- `artifacts/mx-admin-convergence-acceptance.json` (fase final).
