# Baseline — Fechamento diário, autosave, realtime e integridade comercial

**Data (UTC):** 2026-08-05T21:56Z
**Branch:** `main` (sem worktree, sem branch de feature, sem PR)
**SHA inicial:** `ed52e0adf7f341ec35a3c537d7453d261524184b`
**Tag de checkpoint:** `pre-fechamento-autosave-20260805T215639Z`
**Working tree no início:** limpo (`git status --short` sem saída)

## Ambiente confirmado

| Item | Valor observado | Como foi confirmado |
|---|---|---|
| Repositório | `pglemos/MXGESTAOPREDITIVA`, default `main` | metadata do deployment Vercel |
| Vercel team | `team_9kUTSaoIkwnAVxy9nXMcAnej` (SYNVOLT) | `list_deployments` |
| Vercel project | `prj_fpYjxc851kMs55GzR6tgQEr7uWUj` (`mxperformance`) | `list_deployments` |
| Deployment de produção atual | `dpl_F9QdH1tHWctfKs9e8rA6RVTxjHak` — `READY`, `target=production`, `githubCommitRef=main`, `githubCommitSha=ed52e0ad…` | `list_deployments` |
| Supabase project ref | `fbhcmzzgwjdgkctlfvbo` | `supabase/.temp/project-ref` |
| Supabase CLI | `/opt/homebrew/bin/supabase` v2.75.0, projeto linkado | `supabase --version` |
| Supabase MCP | **sem permissão** (`get_project` → `You do not have permission to perform this action`) | tentativa direta |
| Migrations versionadas | 339 arquivos, última `20260805140000_lojas_hierarquia_matriz_filial.sql` | `ls supabase/migrations` |

Credenciais: usadas exclusivamente as sessões/conectores já configurados. Nenhuma rotacionada, revogada ou exposta.

## Divergências entre o prompt-mestre e o estado real

| Afirmação do prompt | Realidade |
|---|---|
| SHA base `f4311438…` | já superado; `HEAD` = `ed52e0ad…` (3 commits à frente) |
| `src/lib/observability.ts` entre os arquivos a investigar | **não existe** |
| Supabase acessível para validação direta | MCP negado; validação depende do CLI |
| Scripts do quality gate (12) | todos existem no `package.json` atual |
| Demais 24 arquivos listados | todos existem |

## Defeitos confirmados no código (evidência por arquivo)

| # | Defeito | Evidência |
|---|---|---|
| A | Preenchimento não persiste automaticamente | nenhum coordenador de autosave no `src/`; `handleSaveDraft` (`useCheckinPage.ts:749`) persiste de verdade via `saveCheckin(..., isDraft=true)`, mas só por ação manual |
| B | "Salvar rascunho" oculto em 1 px | `CheckinForm.tsx:808` — `width:1,height:1,clip:rect(0,0,0,0)` com comentário "mantém contrato de teste" |
| C | "Confirmar etapa" não persiste | `FluxoFechamento.tsx:206` `handleConfirm` só faz `setCurrentStep`; mobile só faz `commitNumberField` |
| D | Rascunho contado como fechamento oficial | `ManagerDailyClosing.container.tsx:186` — `submitted = rows.filter(row => row.checkin).length` |
| E | Funil gerencial sem Realtime | `useTeamFunnel.ts` (129 linhas) sem `channel`/`postgres_changes` |
| F | Evento comercial best-effort | `eventosComerciais.ts:47` faz `console.error` e segue; 5 call-sites em `useOportunidades`/`useAgendamentos` |
| G | Ordem mobile ≠ desktop | mobile `md:hidden` começa em Internet (`CheckinForm.tsx:284`); `FluxoFechamento` é `hidden md:block` (`:360`) |
| H | Ação final distante | bloco de finalização a partir de ~`CheckinForm.tsx:700` num arquivo de 830 linhas |

Sem controle de concorrência: `draft_revision` tem **0 ocorrências** em todo o repositório.

## Read models que já estão corretos (não regredir, não reescrever)

- `useRanking.ts:30` `isOfficialLancamento()` exclui `draft`
- `useStores.ts:594/604` filtram `draft`
- `manager-team-routine.ts:259` `submitted = submission_status !== 'draft'`
- `manager-day-routine-sources.ts:182` draft → `pendente`
- `active-closing-context.ts:50` finalizado = `submission_status !== 'draft'`

O defeito de contagem está concentrado na Central de Fechamento (`ManagerDailyClosing`), não nos rankings.

## Gate

Nenhum arquivo de produção foi alterado antes deste relatório.
