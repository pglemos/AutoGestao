# Plano — Mentor Comercial: Motor de Regras Determinístico V1

> Status: EXECUTADO (2026-08-08)
> Especificação: [`docs/superpowers/specs/2026-08-07-mentor-comercial-motor-v1-design.md`](../specs/2026-08-07-mentor-comercial-motor-v1-design.md)
> Prompt mestre: aprovação executiva da especificação (sem nova aprovação necessária).

## 1. Objetivo

Transformar a carteira de clientes em um Mentor Comercial: o sistema determina, de forma
auditável e 100% determinística (sem IA em runtime), **quem** precisa de atenção, **por que**,
**o que** fazer, **quando**, **como** abordar e **qual resultado** registrar — mantendo a
interface existente (referência Base44) como camada visual.

## 2. Escopo

| Área | Entregáveis |
|---|---|
| Catálogos | 86 status, 13 cadências, 57 passos, 77 scripts, 52 transições |
| Motor | `engine`, `score` (5 pilares), `priority` (45/35/20), `cadence`, `script`, `transition`, `pending flags`, `return status` |
| Dados | Migração aditiva (`20260807120000_mentor_comercial_motor_v1.sql`), seed idempotente |
| Integrações | Daily processor, Central de Execução, Plano de Ataque, Fechamento, RLS/auditoria |
| Ops | Sentry, Vercel deploy, GitHub Actions, testes 15 cenários oficiais |

## 3. Fases (TASKS 0–68)

1. **Inventário e baseline** (T0–T4): inventário completo, extração integral da planilha,
   validator da matriz, referências órfãs, matriz de traceabilidade.
2. **Modelagem** (T5–T9): modelo de dados, catálogos mestre, migrations, constraints, seed idempotente.
3. **Motor** (T10–T20): motor puro de decisão, service transacional, status, pending flags,
   transition engine, cadência, script engine, score oficial, prioridade oficial, settings, qualidade da carteira.
4. **Migração e integração** (T21–T45): clientes reais, deduplicação, canais, update guiado,
   próximo passo, carteira ativa, ficha, fechamento, Central, plano de ataque, processamento
   automático, idempotência, concorrência, RLS, auditoria.
5. **Qualidade e produção** (T46–T68): Sentry, Vercel, CI, performance, paridade Base44,
   identidade visual, testes (unit/banco/integração/15 cenários), regressão, preservação,
   reconciliação, idempotência E2E, critic/security pass, gates (build/migration/deploy),
   smoke em produção, monitoramento pós-deploy, commit direto na main.

## 4. Definition of Done

- DoD funcional (§84): 86 status, 13 cadências, todos os passos, 77 scripts, 52 transições,
  zero órfãs, dados/histórico preservados, guided status, pending flags, return status, cadence,
  scripts, score 5 pilares, prioridade 45/35/20, SLA configurável, Central/Plano de Ataque/
  Fechamento/processor idempotentes, carteira ordenada, busca/ficha corretas, 15 cenários PASS.
- DoD técnico (§85): main sem worktree/branch, migrations versionadas, RLS e constraints
  validadas, seed idempotente, tests/lint/typecheck/build/CI green.

## 5. Gates e estado de produção

- Migration aplicada em produção (aditiva, zero linhas perdidas).
- Deploy `dpl_EcVqTSvN5K` READY no SHA `33292e98cddc` (2026-08-08T02:25:03Z), CI 5/5 verde.
- Smoke produção 12/17 PASS + 4 N/A (GuidedStatusUpdate não montado; Base44 ativa) + 1 PASS-com-divergência (score 0-100).
- Sentry/Vercel/Supabase pós-deploy: verificado, sem erros novos.
- Relatório final: `docs/mentor-comercial/PRODUCTION_VALIDATION.md`.

## 6. Critério de conclusão

Releitura integral do prompt mestre + verificação requisito-por-requisito (IMPLEMENTAÇÃO + TESTE + EVIDÊNCIA) antes de declarar concluído.
