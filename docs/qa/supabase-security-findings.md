# Findings de Segurança Supabase — FASE AH (34.013/34.014)

Data: 2026-08-15 · Modo: **read-only, sem rotação de credenciais**

## Escopo

Relatório dedicado a **findings de segurança** separados dos de performance
(34.014). Cada item classificado como `PRODUCTION_BUG` (corrigir) ou
`SECURITY_NOISE` (não é vulnerabilidade). Nenhuma credencial foi rotacionada;
nenhum grant novo foi concedido (34.006).

## Findings de segurança

### 1. RLS Data Isolation — vendedor isolado por loja ✅ (coberto)

| Dimensão | Evidência |
|---|---|
| Teste | `src/test/security/RLS-Isolation.playwright.ts` — vendedor não vê `lancamentos_diarios` de outra loja |
| Resultado | **1 PASS** ("RLS Bloqueou acesso cruzado com sucesso") / 1 skip (admin sem credencial) |
| Owner | DS1/FASE AH |
| Classificação | `SECURITY_NOISE` (comportamento correto, não é achado) |

### 2. Grants anon/authenticated — zero privilégios que burlam RLS ✅ (coberto)

| Dimensão | Evidência |
|---|---|
| Guard | `supabase/tests/rls-matrix/grants_guard.test.sql` (6 asserts): anon zero privilégios em `public`; authenticated sem TRUNCATE/TRIGGER/REFERENCES; tabelas canônicas sem grant anon |
| Matriz | `supabase/tests/rls-matrix/` — 16 arquivos (clientes, lojas, oportunidades, vendedores_loja, vinculos_loja, veiculos_estoque, etc.) |
| Owner | DS1/FASE AH |
| Classificação | `SECURITY_NOISE` (invariantes de privilégio asseguradas por pgTAP) |

### 3. `recipient_id` permission denied — `EXPECTED_TEST_TRAFFIC` (34.004)

`from('notificacoes').eq('recipient_id', ...)` com RLS
`recipient_id = auth.uid()` filtrando vendedor de fixture sem vínculo — tráfego
de teste esperado, não vulnerabilidade. Detalhe em
`docs/qa/supabase-log-classification.md`.

| Classificação | `SECURITY_NOISE` |
|---|---|
| Owner | DS1/FASE AH |

## Findings de performance (separados)

> Performance fica em relatório próprio (fora deste arquivo de segurança).
> Único pendente: `statement timeout` classificado como `PRODUCTION_BUG` a
> investigar (34.007) — se confirmado, migration via `apply_migration` (34.008).

## Bloqueios

- **Supabase Advisor do dashboard:** exige `SUPABASE_ACCESS_TOKEN` (ausente no
  `.env`). Sem rotação de credenciais → PLANO: rodar via dashboard quando o
  access token estiver disponível (owner DS1/DS7, gate de release).
