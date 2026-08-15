# Review Independente do Diff Acumulado — FASE AJ 36.019

Data: 2026-08-15 · Read-only (nenhuma correção feita)

## Escopo

- **Baseline:** `6f760650` (fix ci: visual gates portable) — início da sessão
- **HEAD:** `3a8a17e9` (feat admin-mx: seção Administração MX)
- **Diff acumulado:** **185 arquivos, +9710/-958**
- 28 commits de sessão (FASEs B..AL)

## Classificação do diff

| Categoria | Arquivos | Avaliação |
|---|---|---|
| Novos scripts/lints/gates | 44 mjs + testes | ✅ 100% fs determinístico (93/98 contratos) |
| Migrations SQL | 2 | ✅ idempotentes (IF EXISTS), RLS `eh_area_interna_mx()`, grants com RLS |
| Design-system | 13 | ✅ routeLayoutMetadata com adopted+clearance; PageViewport consistente |
| Features (migração rotas) | ~580 tsx/jsx | ✅ rotas adotadas no canônico; sem páginas soltas |
| Testes/contratos | 106 | ✅ RED→GREEN verificados por fatia |
| Types DB | 1 | ✅ regenerado com schema novo (planos_acao_templates, implementation_owner_id) |

## Apontamentos (riscos/inconsistências/dívida NÃO documentada)

### 🔴 Prioridade alta

1. **Migrations de 2026-08-15 sem reversal em `supabase/rollbacks/`.**
   - `20260815120000_add_client_contract_fields.sql` e
     `20260815130000_action_plan_templates.sql` (tabelas novas + alter em
     `clientes_consultoria`) **não têm rollback correspondente**.
   - Violação do contrato 38.005 (FASE AL: "toda migration forward tem reversal").
   - **Risco:** se a release precisar de rollback de DB, não há caminho reversível
     para essas 2 migrations.
   - **Ação sugerida (fora de escopo):** criar reversals em `supabase/rollbacks/`.

2. **FASE I (09.XXX) com 32% mas trabalho 100% feito downstream.**
   - PageViewport/PageCanvas/scroll owner foram implementados e validados (FASE W,
     X, Y/Z, `page-contract`, `canvas-matrix`), mas os itens 09.001-022 do ledger
     ficaram majoritariamente abertos.
   - **Risco:** release pode ler "FASE I incompleta" e bloquear, apesar da
     evidência existir. Dívida de **tracking**, não de código.

3. **FASEs L (12.XXX) e U (21.XXX) com 0% no ledger, mas evidência real.**
   - Form controls (`Field/Input/Select` + `audit_form_a11y`) e ícones
     (`lint-icon-*` + `icon-pattern-contract`) estão implementados, mas os itens
     de ledger não foram marcados.
   - **Risco:** mesmo do item 2 — parece não-feito quando está feito.

### 🟡 Prioridade média

4. **5 contratos ainda usam subprocess (padrão C8 legado) em vez de fs.**
   - `route-data-inventory-contract`, `route-data-inventory-stdout-contract`,
     `scroll-region-focusable-contract`, `table-horizontal-scroll-contract`,
     `typography-contract` — usam `execSync`/`captureCommandOutput`.
   - A sessão migrou 93 contratos para fs determinístico; esses 5 ficaram.
   - **Dívida menor** (não quebra, mas foge do padrão 100% fs).

5. **FASE G (147%) e AI (167%) têm itens extras no ledger.**
   - G: 07.016-022 (7 itens) e AI: 36.001-008 não são requisitos do prompt — são
     tracking do framework. **Não é bug**, mas infla a leitura de cobertura.

### 🟢 Observações (não-risco)

6. `eslint-disable` no diff: 6 ocorrências, todas justificadas (gates de lint +
   containers com role=presentation).
7. `database.generated.ts` regenerado em sincronia com o schema (8 refs novas) —
   `verify:db-types` passaria.
8. Nenhum arquivo deletado; migrations idempotentes; RLS nas tabelas novas.

## Conclusão

O diff acumulado é **saudável**: gates determinísticos, migrations idempotentes
com RLS, types em sincronia, rotas adotadas no canônico. Os riscos reais são
**1 (rollbacks ausentes das 2 migrations novas)** e **dívida de tracking nas
FASEs I/L/U** (itens abertos com evidência existente). Nenhum bloqueia a release
com o trabalho já provado, mas os rollbacks deveriam ser criados antes de chamar
release de concluída (38.005).
