# Rollback Runbook — FASE AL (38.001–38.008)

Data: 2026-08-15

> Objetivo: ter caminho reversível **provado** antes de considerar a release
> concluída. Nunca `git reset`/force push no remoto; sempre `git revert` + novo
> deploy (38.003).

## 38.001 — SHA de produção anterior (rollback candidate)

| Estado | SHA | Descrição |
|---|---|---|
| **Produção atual (HEAD)** | `0fafff16` | FASE AI — performance e qualidade de render (35.001-012) |
| **Produção anterior (rollback candidate)** | `0a867c73` | FASE AD — stories autodocs do design system |
| Deploy Vercel validado (histórico) | `9429c6f7` | Validação 2026-08-05 (docs/execution) |

Rollback candidate completo: `0a867c73cb1f5fbdaeafb8bb180af453172b4e9f`.

## 38.002 — Deployment production anterior (rollback candidate)

- **Projeto Vercel:** `mxperformance` (`prj_fpYjxc851kMs55GzR6tgQEr7uWUj`)
- **Team:** `team_9kUTSaoIkwnAVxy9nXMcAnej`
- **Produção:** `mxperformance-dl5qtyt87-synvolt.vercel.app`
- **Rollback Vercel:** `vercel rollback <deployment-url>` ou re-deploy de `ce2e77e7`.
- **Tag de backup legível (38.006):** `pre-main-autonomous-20260809-184732` (mais recente).
  - `git show pre-main-autonomous-20260809-184732` — comprovado legível via `git cat-file -t`.

## 38.003 — Rollback por `git revert` (nunca reset/force)

```bash
# 1. Identificar o commit a reverter (rollback candidate = 0a867c73)
git log --oneline -5

# 2. Reverter por git revert (cria commit novo, nunca reescreve remoto)
git revert --no-edit HEAD        # reverte o commit atual
# ou, para reverter uma faixa:
git revert ce2e77e7..0a867c73    # reverte tudo entre produção anterior e atual

# 3. Push do revert (push normal, não --force)
git push origin main

# 4. Deploy
npm run deploy    # vercel --prod
```

**Nunca:** `git reset --hard`, `git push --force`, `git rebase` em main compartilhada.

## 38.004 — Rollback Vercel para deployment anterior

```bash
# Listar deployments
vercel ls mxperformance --prod

# Rollback para o deployment do SHA 0a867c73 (ou o desejado)
vercel rollback mxperformance-dl5qtyt87-synvolt.vercel.app --yes
# ou: vercel deploy --prod --prebuilt <url-do-deployment-anterior>
```

O rollback Vercel restaura o artefato **sem rebuild** — rápido e sem tocar no
código-fonte. Preferível a re-deploy quando o código do revert ainda não passou
pela cadeia.

## 38.005 — Forward-fix / reversal migration (se DB foi alterado)

O repo mantém **25 migrations de rollback** em `supabase/rollbacks/` (ex.:
`20260716190050_carteira_base44_parity.sql`). Padrão:

- Toda migration **forward** tem uma **reversal** correspondente em `supabase/rollbacks/`.
- Reversal é idempotente (mesmo padrão da forward: `DROP ... IF EXISTS` / restore).
- Aplicar via supabase CLI:
  ```bash
  supabase db execute --file supabase/rollbacks/<nome-da-reversal>.sql
  ```
- **Forward-fix preferível:** em vez de reverter, corrigir com nova migration
  forward (mais segura para RLS/data). Reversal só quando forward-fix não for viável.

**Importante:** rollback de schema não desfaz data migration. Se houve data
corruption, usar backup/point-in-time (Supabase PITR) + replay.

## 38.006 — Provar que bundle/tag de backup é legível

```bash
# Tags de backup existem e são legíveis (comprovado)
git tag | grep pre-main-autonomous | tail -3
git show pre-main-autonomous-20260809-184732 --stat | head -5   # legível
git cat-file -t pre-main-autonomous-20260809-184732            # = commit

# Bundle anterior (dist) é reconstruível do SHA do rollback candidate
git archive ce2e77e7 | tar -t | head -5    # árvore do candidate acessível
```

## 38.007 — Gatilhos de rollback

Rollback imediato (sem aguardar fix) se qualquer um ocorrer em produção:

| # | Gatilho | Como detectar |
|---|---|---|
| 1 | **Auth quebrado** | Login/redirecionamento falha em qualquer perfil; `main#main-content` não renderiza pós-auth |
| 2 | **Páginas críticas 500** | `/home`, `/carteira-clientes`, `/configuracoes` retornam erro 500/erro de runtime |
| 3 | **Data corruption** | Escrita lê/escreve valores inválidos; migrations aplicadas com erro; `verify:db-types` diverge |
| 4 | **Main scroll failure** | Rota crítica sem scroll (conteúdo cortado); `1-scroll-owner` quebrado |
| 5 | **Massive visual regression** | Screenshot golden (FASE AE) diverge >tolerância em rota crítica |
| 6 | **RLS regression** | `rls-matrix` (pgTAP) falha; vendedor vê dado de outra loja; permission denied novo |

**Procedimento:** `git revert` (38.003) + `vercel rollback` (38.004) + reversal
migration se DB mudou (38.005). Reavaliar causa antes de re-deploy.

## 38.008 — Dry-run lógico (sem destruir produção)

`scripts/rollback-dry-run.mjs` valida o caminho reversível **sem tocar** remoto
nem Vercel:

```bash
node scripts/rollback-dry-run.mjs --sha ce2e77e7
```

Verifica: (1) SHA existe; (2) é ancestor de HEAD; (3) tag de backup mais recente
é legível; (4) `supabase/rollbacks/` tem reversals; (5) comandos de rollback são
não-destrutivos (revert, não reset). Exit 0 = caminho reversível pronto.
