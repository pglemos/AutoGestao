# Owner Decision Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar Aprovar e Delegar na Central de Decisões do Dono com persistência canônica, idempotência, responsável válido por loja e auditoria explícita.

**Architecture:** Reutilizar `public.planos_acao` como única fonte de execução, acrescentando uma chave textual idempotente e um motivo de auditoria. Uma RPC transacional materializa ou reutiliza o plano, valida acesso e responsável, executa a transição e devolve a linha persistida. O frontend separa modelo puro, repositório Supabase, hooks, modal e composição visual.

**Tech Stack:** PostgreSQL/Supabase, RLS, PL/pgSQL, React 19, TypeScript 5.8, Vite 6, Bun Test/Vitest, Testing Library, Radix Dialog, Tailwind CSS 4, Playwright.

## Global Constraints

- Não criar tabela paralela de decisões.
- Aprovar equivale a `status = 'em_andamento'`.
- Aprovar sem responsável anterior atribui `auth.uid()`.
- Delegar exige vínculo ativo do responsável na mesma loja.
- Delegar atribui o responsável e coloca o plano em `em_andamento`.
- Decisão resolvida deixa a fila ativa, mas permanece no Plano de Ação.
- Cliques repetidos e chamadas concorrentes não podem criar planos duplicados.
- Toda transição deve registrar usuário, data, valores anteriores, valores novos, campos alterados e motivo.
- A RPC deve usar `SECURITY DEFINER`, `SET search_path = public`, revogar `PUBLIC` e `anon` e conceder apenas a `authenticated` e `service_role`.
- A migration deve conter bloco DOWN explícito e passar no gate de reversibilidade.
- O frontend não pode remover item da fila antes da confirmação da RPC.
- O modal deve suportar teclado, `Escape`, retorno de foco e rótulos acessíveis.
- Não alterar a sidebar universal nem a fonte canônica de estoque.
- A matriz autenticada integral de produção continua condicionada à issue #127.
- Node suportado: `>=20.0.0 <25`.

---

## File Map

### Criar

- `supabase/migrations/20260718233000_owner_decision_transitions.sql`: extensão de schema, auditoria e RPC transacional.
- `src/lib/owner-decision-transition-contract.test.ts`: contrato estático da migration e ACL.
- `src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.ts`: identidade estável, normalização, mapeamento e payload.
- `src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.test.ts`: testes puros de identidade, resolução e payload.
- `src/features/dashboard-loja/hooks/ownerDecisionRepository.ts`: leitura e transição Supabase sem estado React.
- `src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.ts`: estado, refresh, loading por item e toasts.
- `src/features/dashboard-loja/hooks/useOwnerDecisionAssignees.ts`: leitura mínima de vínculos ativos da loja.
- `src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.tsx`: modal acessível de delegação.
- `src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionCenter.test.tsx`: testes de componente e integração de estados.
- `src/test/owner-decision-transitions.playwright.ts`: smoke autenticado de aprovação/delegação, habilitado quando a credencial da issue #127 existir.
- `docs/stories/story-OWNER-20260718-owner-decision-transitions.md`: evidências, critérios e status de entrega.

### Modificar

- `src/features/dashboard-loja/sections/owner-cockpit/OwnerBase44Views.tsx`: consumir modelo/hook, filtrar resolvidos e renderizar ações reais.
- `src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx`: passar `storeId` para `OwnerDecisionCenter`.
- `src/features/dashboard-loja/hooks/useCentralMxPlanosAcao.ts`: incluir `origem_ref_key` no tipo e no select.
- `src/types/database.generated.ts`: regenerar tipos após aplicar a migration no ambiente de geração.
- `docs/stories/story-OWNER-20260718-base44-parity-integrated.md`: retirar a limitação de Aprovar/Delegar após publicação.

---

### Task 1: Criar o contrato RED da migration

**Files:**
- Create: `src/lib/owner-decision-transition-contract.test.ts`
- Reference: `supabase/migrations/20260527150000_planos_acao_schema.sql`
- Reference: `supabase/migrations/20260527170000_executive_schema_rls_hardening.sql`
- Reference: `supabase/migrations/_templates/template_reversible_migration.sql`

**Interfaces:**
- Consumes: conteúdo textual da migration futura `20260718233000_owner_decision_transitions.sql`.
- Produces: contrato executável que impede regressões de schema, idempotência, segurança e rollback.

- [ ] **Step 1: Escrever o teste que falha porque a migration ainda não existe**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260718233000_owner_decision_transitions.sql',
)

function migrationSql() {
  return readFileSync(migrationPath, 'utf8')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('owner decision transition migration contract', () => {
  it('extends canonical action plans without creating a parallel decision table', () => {
    const sql = migrationSql()
    expect(sql).toContain('ALTER TABLE public.planos_acao ADD COLUMN IF NOT EXISTS origem_ref_key text')
    expect(sql).toContain('ALTER TABLE public.historico_planos_acao ADD COLUMN IF NOT EXISTS change_reason text')
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uidx_planos_scope_origin_ref_key')
    expect(sql).not.toMatch(/CREATE TABLE(?: IF NOT EXISTS)? public\.decisoes_dono/i)
  })

  it('creates a transactional and scope-validated RPC', () => {
    const sql = migrationSql()
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.transition_owner_decision(')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = public')
    expect(sql).toContain("public.can_access_mx_scope('store'::public.score_scope_type, p_store_id)")
    expect(sql).toContain("p_transition NOT IN ('approve', 'delegate')")
    expect(sql).toContain("origem_ref_table = 'owner_decision'")
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('ON CONFLICT (scope_type, scope_id, origem_ref_table, origem_ref_key)')
  })

  it('validates delegation and records an explicit audit reason', () => {
    const sql = migrationSql()
    expect(sql).toContain("p_transition = 'delegate'")
    expect(sql).toContain('FROM public.vinculos_loja')
    expect(sql).toContain('v.is_active = true')
    expect(sql).toContain("set_config('app.owner_decision_change_reason'")
    expect(sql).toContain("current_setting('app.owner_decision_change_reason', true)")
    expect(sql).toContain("'owner_approval'")
    expect(sql).toContain("'owner_delegation'")
  })

  it('locks down RPC execution and documents rollback', () => {
    const sql = migrationSql()
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.transition_owner_decision')
    expect(sql).toContain('FROM PUBLIC')
    expect(sql).toContain('FROM anon')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.transition_owner_decision')
    expect(sql).toContain('TO authenticated')
    expect(sql).toContain('TO service_role')
    expect(sql).toContain('-- DOWN (obrigatório')
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.transition_owner_decision')
    expect(sql).toContain('DROP INDEX IF EXISTS public.uidx_planos_scope_origin_ref_key')
  })
})
```

- [ ] **Step 2: Executar o teste e confirmar RED**

Run:

```bash
bun test --isolate --max-concurrency=1 src/lib/owner-decision-transition-contract.test.ts
```

Expected: FAIL com `ENOENT` para `20260718233000_owner_decision_transitions.sql`.

- [ ] **Step 3: Commitar somente o contrato RED**

```bash
git add src/lib/owner-decision-transition-contract.test.ts
git commit -m "test(owner): definir contrato das transições de decisão"
```

---

### Task 2: Implementar migration, auditoria e RPC transacional

**Files:**
- Create: `supabase/migrations/20260718233000_owner_decision_transitions.sql`
- Test: `src/lib/owner-decision-transition-contract.test.ts`

**Interfaces:**
- Consumes: `public.planos_acao`, `public.historico_planos_acao`, `public.vinculos_loja`, `public.can_access_mx_scope`, `public.user_has_role`.
- Produces: `public.transition_owner_decision(...) returns public.planos_acao`, `planos_acao.origem_ref_key`, `historico_planos_acao.change_reason`.

- [ ] **Step 1: Criar a migration com schema idempotente**

```sql
-- ============================================================================
-- Migration: Owner Decision Transitions
-- Scope: Central de Decisões do Dono -> Plano de Ação canônico
-- ============================================================================

-- ============================================================================
-- UP
-- ============================================================================
BEGIN;

ALTER TABLE public.planos_acao
  ADD COLUMN IF NOT EXISTS origem_ref_key text;

ALTER TABLE public.planos_acao
  DROP CONSTRAINT IF EXISTS planos_acao_origem_ref_key_check;

ALTER TABLE public.planos_acao
  ADD CONSTRAINT planos_acao_origem_ref_key_check
  CHECK (
    origem_ref_key IS NULL
    OR (
      length(btrim(origem_ref_key)) BETWEEN 1 AND 180
      AND origem_ref_key = btrim(origem_ref_key)
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS uidx_planos_scope_origin_ref_key
  ON public.planos_acao (
    scope_type,
    scope_id,
    origem_ref_table,
    origem_ref_key
  )
  WHERE origem_ref_key IS NOT NULL;

ALTER TABLE public.historico_planos_acao
  ADD COLUMN IF NOT EXISTS change_reason text;

ALTER TABLE public.historico_planos_acao
  DROP CONSTRAINT IF EXISTS historico_planos_acao_change_reason_check;

ALTER TABLE public.historico_planos_acao
  ADD CONSTRAINT historico_planos_acao_change_reason_check
  CHECK (
    change_reason IS NULL
    OR change_reason = ANY (ARRAY['owner_approval', 'owner_delegation'])
  );

CREATE OR REPLACE FUNCTION public.log_planos_acao_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fields text[] := ARRAY[]::text[];
  v_reason text := NULLIF(
    current_setting('app.owner_decision_change_reason', true),
    ''
  );
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_fields := array_append(v_fields, 'status');
  END IF;
  IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
    v_fields := array_append(v_fields, 'prioridade');
  END IF;
  IF NEW.prazo IS DISTINCT FROM OLD.prazo THEN
    v_fields := array_append(v_fields, 'prazo');
  END IF;
  IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
    v_fields := array_append(v_fields, 'responsavel_id');
  END IF;
  IF NEW.eficacia_score IS DISTINCT FROM OLD.eficacia_score
     OR NEW.eficacia_nota IS DISTINCT FROM OLD.eficacia_nota THEN
    v_fields := array_append(v_fields, 'eficacia');
  END IF;

  IF array_length(v_fields, 1) IS NOT NULL THEN
    INSERT INTO public.historico_planos_acao (
      plano_id,
      changed_by,
      old_values,
      new_values,
      changed_fields,
      change_reason
    )
    VALUES (
      NEW.id,
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW),
      v_fields,
      v_reason
    );
  END IF;

  RETURN NEW;
END;
$$;
```

- [ ] **Step 2: Acrescentar a RPC com validação, idempotência e bloqueio concorrente**

```sql
CREATE OR REPLACE FUNCTION public.transition_owner_decision(
  p_store_id uuid,
  p_decision_key text,
  p_transition text,
  p_departamento text,
  p_indicador text,
  p_problema text,
  p_acao text,
  p_como text DEFAULT NULL,
  p_responsavel_id uuid DEFAULT NULL,
  p_prazo date DEFAULT NULL,
  p_prioridade public.action_priority DEFAULT 'media',
  p_origem public.action_origin DEFAULT 'manual'
)
RETURNS public.planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := btrim(COALESCE(p_decision_key, ''));
  v_reason text;
  v_row public.planos_acao;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'autenticacao obrigatoria'
      USING ERRCODE = '42501';
  END IF;

  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'loja obrigatoria'
      USING ERRCODE = '22023';
  END IF;

  IF NOT public.can_access_mx_scope(
    'store'::public.score_scope_type,
    p_store_id
  ) THEN
    RAISE EXCEPTION 'sem acesso a loja informada'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.user_has_role(
    ARRAY['master', 'director', 'consultant', 'admin_mx'],
    v_uid
  ) THEN
    RAISE EXCEPTION 'papel sem permissao para decisao executiva'
      USING ERRCODE = '42501';
  END IF;

  IF p_transition NOT IN ('approve', 'delegate') THEN
    RAISE EXCEPTION 'transicao invalida'
      USING ERRCODE = '22023';
  END IF;

  IF length(v_key) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'chave de decisao invalida'
      USING ERRCODE = '22023';
  END IF;

  IF length(btrim(COALESCE(p_departamento, ''))) = 0
     OR length(btrim(COALESCE(p_indicador, ''))) = 0
     OR length(btrim(COALESCE(p_problema, ''))) = 0
     OR length(btrim(COALESCE(p_acao, ''))) = 0 THEN
    RAISE EXCEPTION 'dados obrigatorios da decisao ausentes'
      USING ERRCODE = '22023';
  END IF;

  IF p_transition = 'delegate' THEN
    IF p_responsavel_id IS NULL THEN
      RAISE EXCEPTION 'responsavel obrigatorio para delegacao'
        USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.vinculos_loja v
      JOIN public.usuarios u ON u.id = v.user_id
      WHERE v.store_id = p_store_id
        AND v.user_id = p_responsavel_id
        AND v.is_active = true
        AND u.active IS DISTINCT FROM false
    ) THEN
      RAISE EXCEPTION 'responsavel sem vinculo ativo na loja'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.planos_acao (
    scope_type,
    scope_id,
    departamento,
    indicador,
    problema,
    acao,
    como,
    responsavel_id,
    prazo,
    status,
    prioridade,
    origem,
    origem_ref_table,
    origem_ref_key,
    created_by
  )
  VALUES (
    'store'::public.score_scope_type,
    p_store_id,
    btrim(p_departamento),
    btrim(p_indicador),
    btrim(p_problema),
    btrim(p_acao),
    NULLIF(btrim(COALESCE(p_como, '')), ''),
    NULL,
    COALESCE(p_prazo, CURRENT_DATE + 7),
    'pendente',
    p_prioridade,
    p_origem,
    'owner_decision',
    v_key,
    v_uid
  )
  ON CONFLICT (
    scope_type,
    scope_id,
    origem_ref_table,
    origem_ref_key
  ) WHERE origem_ref_key IS NOT NULL
  DO NOTHING;

  SELECT p.*
  INTO v_row
  FROM public.planos_acao p
  WHERE p.scope_type = 'store'::public.score_scope_type
    AND p.scope_id = p_store_id
    AND p.origem_ref_table = 'owner_decision'
    AND p.origem_ref_key = v_key
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'nao foi possivel materializar a decisao';
  END IF;

  IF v_row.status = 'concluido' THEN
    RAISE EXCEPTION 'decisao ja concluida'
      USING ERRCODE = '23514';
  END IF;

  v_reason := CASE p_transition
    WHEN 'approve' THEN 'owner_approval'
    ELSE 'owner_delegation'
  END;

  PERFORM set_config(
    'app.owner_decision_change_reason',
    v_reason,
    true
  );

  UPDATE public.planos_acao p
  SET status = 'em_andamento',
      responsavel_id = CASE
        WHEN p_transition = 'delegate' THEN p_responsavel_id
        ELSE COALESCE(p.responsavel_id, v_uid)
      END,
      prazo = COALESCE(p.prazo, p_prazo, CURRENT_DATE + 7),
      updated_at = now()
  WHERE p.id = v_row.id
  RETURNING p.* INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_owner_decision(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  date,
  public.action_priority,
  public.action_origin
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.transition_owner_decision(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  date,
  public.action_priority,
  public.action_origin
) FROM anon;

GRANT EXECUTE ON FUNCTION public.transition_owner_decision(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  date,
  public.action_priority,
  public.action_origin
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.transition_owner_decision(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  date,
  public.action_priority,
  public.action_origin
) TO service_role;

COMMIT;
```

- [ ] **Step 3: Adicionar bloco DOWN explícito**

O bloco comentado deve recriar `log_planos_acao_changes()` sem `change_reason` antes de remover a coluna, remover a RPC, índice, constraints e colunas novas, sem apagar `planos_acao` ou `historico_planos_acao`.

```sql
-- ============================================================================
-- DOWN (obrigatório — executar manualmente para rollback)
-- ============================================================================
-- BEGIN;
-- REVOKE ALL ON FUNCTION public.transition_owner_decision(
--   uuid, text, text, text, text, text, text, text, uuid, date,
--   public.action_priority, public.action_origin
-- ) FROM PUBLIC, anon, authenticated, service_role;
-- DROP FUNCTION IF EXISTS public.transition_owner_decision(
--   uuid, text, text, text, text, text, text, text, uuid, date,
--   public.action_priority, public.action_origin
-- );
-- DROP INDEX IF EXISTS public.uidx_planos_scope_origin_ref_key;
-- ALTER TABLE public.planos_acao
--   DROP CONSTRAINT IF EXISTS planos_acao_origem_ref_key_check;
-- ALTER TABLE public.historico_planos_acao
--   DROP CONSTRAINT IF EXISTS historico_planos_acao_change_reason_check;
-- CREATE OR REPLACE FUNCTION public.log_planos_acao_changes()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- DECLARE
--   v_fields text[] := ARRAY[]::text[];
-- BEGIN
--   IF NEW.status IS DISTINCT FROM OLD.status THEN
--     v_fields := array_append(v_fields, 'status');
--   END IF;
--   IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
--     v_fields := array_append(v_fields, 'prioridade');
--   END IF;
--   IF NEW.prazo IS DISTINCT FROM OLD.prazo THEN
--     v_fields := array_append(v_fields, 'prazo');
--   END IF;
--   IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
--     v_fields := array_append(v_fields, 'responsavel_id');
--   END IF;
--   IF NEW.eficacia_score IS DISTINCT FROM OLD.eficacia_score
--      OR NEW.eficacia_nota IS DISTINCT FROM OLD.eficacia_nota THEN
--     v_fields := array_append(v_fields, 'eficacia');
--   END IF;
--   IF array_length(v_fields, 1) IS NOT NULL THEN
--     INSERT INTO public.historico_planos_acao (
--       plano_id, changed_by, old_values, new_values, changed_fields
--     ) VALUES (
--       NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW), v_fields
--     );
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
-- ALTER TABLE public.historico_planos_acao
--   DROP COLUMN IF EXISTS change_reason;
-- ALTER TABLE public.planos_acao
--   DROP COLUMN IF EXISTS origem_ref_key;
-- COMMIT;
```

- [ ] **Step 4: Executar contratos e reversibilidade**

Run:

```bash
bun test --isolate --max-concurrency=1 src/lib/owner-decision-transition-contract.test.ts
node scripts/check_migration_reversibility.mjs
```

Expected: contrato PASS; verificador informa migration reversível, sem `TBD`, sem bloco DOWN ausente.

- [ ] **Step 5: Executar banco local e probes SQL**

Run:

```bash
supabase db reset
```

Expected: migrations completas sem erro.

Executar no SQL local autenticado de teste:

```sql
SELECT public.transition_owner_decision(
  '<store_uuid>',
  'alert:contract-probe',
  'approve',
  'Executivo',
  'Risco executivo',
  'Problema de teste',
  'Executar ação de teste',
  'Probe automatizado',
  NULL,
  CURRENT_DATE + 7,
  'alta',
  'alertas'
);
```

Expected: uma linha em `planos_acao`, `status = 'em_andamento'`, chave única e histórico `owner_approval`. Repetir a chamada deve manter um único plano.

- [ ] **Step 6: Commitar migration e contrato verde**

```bash
git add supabase/migrations/20260718233000_owner_decision_transitions.sql \
  src/lib/owner-decision-transition-contract.test.ts
git commit -m "feat(owner): persistir transições executivas auditáveis"
```

---

### Task 3: Regenerar tipos e ampliar o plano persistido

**Files:**
- Modify: `src/types/database.generated.ts`
- Modify: `src/features/dashboard-loja/hooks/useCentralMxPlanosAcao.ts:27-47`
- Modify: `src/features/dashboard-loja/hooks/useCentralMxPlanosAcao.ts:89-102`

**Interfaces:**
- Consumes: schema com `origem_ref_key`, `change_reason` e RPC `transition_owner_decision`.
- Produces: tipos Supabase canônicos e `CentralMxPlanoAcaoRow.origem_ref_key`.

- [ ] **Step 1: Regenerar tipos do banco**

```bash
npm run gen:db-types
```

Expected: `src/types/database.generated.ts` contém:

```ts
origem_ref_key: string | null
change_reason: string | null
transition_owner_decision: {
  Args: {
    p_acao: string
    p_como?: string | null
    p_decision_key: string
    p_departamento: string
    p_indicador: string
    p_origem?: Database['public']['Enums']['action_origin']
    p_prazo?: string | null
    p_prioridade?: Database['public']['Enums']['action_priority']
    p_problema: string
    p_responsavel_id?: string | null
    p_store_id: string
    p_transition: string
  }
  Returns: Database['public']['Tables']['planos_acao']['Row']
}
```

- [ ] **Step 2: Atualizar o tipo manual de plano e o select**

Em `CentralMxPlanoAcaoRow`:

```ts
origem_ref_table: string | null
origem_ref_key: string | null
eficacia_score: number | null
```

No select:

```ts
.select(
  'id, scope_type, scope_id, departamento, indicador, problema, acao, como, responsavel_id, prazo, status, prioridade, origem, origem_ref_id, origem_ref_table, origem_ref_key, eficacia_score, eficacia_nota, created_at, concluido_at',
)
```

- [ ] **Step 3: Verificar tipos e suíte focada**

```bash
npm run verify:db-types
npm run typecheck
bun test --isolate --max-concurrency=1 src/features/dashboard-loja/hooks
```

Expected: todos PASS e nenhum diff não versionado após `verify:db-types`.

- [ ] **Step 4: Commitar tipos**

```bash
git add src/types/database.generated.ts \
  src/features/dashboard-loja/hooks/useCentralMxPlanosAcao.ts
git commit -m "chore(db): atualizar tipos das decisões do dono"
```

---

### Task 4: Extrair o modelo puro da decisão e testar identidade estável

**Files:**
- Create: `src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.ts`
- Create: `src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.test.ts`
- Modify later: `OwnerBase44Views.tsx`

**Interfaces:**
- Consumes: `OwnerPerformanceAlert`, `ActionRow`, `CentralMxPlanoAcaoRow`.
- Produces: `OwnerDecisionItem`, `buildOwnerDecisionItems`, `isOwnerDecisionResolved`, `toOwnerDecisionRpcPayload`.

- [ ] **Step 1: Escrever testes RED do modelo**

```ts
import { describe, expect, it } from 'vitest'
import {
  buildOwnerDecisionItems,
  isOwnerDecisionResolved,
  ownerAlertDecisionKey,
  toOwnerDecisionRpcPayload,
} from './ownerDecisionModel'

const alert = {
  title: 'Meta em risco',
  description: 'Ritmo abaixo do esperado',
  recommendation: 'Revisar agenda comercial',
  variant: 'danger',
} as const

describe('ownerDecisionModel', () => {
  it('gera chave estável de alerta sem depender da ordem visual', () => {
    expect(ownerAlertDecisionKey(alert)).toBe(ownerAlertDecisionKey({ ...alert }))
  })

  it('muda a chave quando o conteúdo material muda', () => {
    expect(ownerAlertDecisionKey(alert)).not.toBe(
      ownerAlertDecisionKey({ ...alert, recommendation: 'Alterar estratégia' }),
    )
  })

  it('usa id canônico para ação do motor', () => {
    const items = buildOwnerDecisionItems([], [{
      id: 'action-123',
      priority: 'Crítica',
      department: 'Comercial',
      indicator: 'Conversão',
      problem: 'Conversão baixa',
      recommendation: 'Revisar follow-up',
      action: 'Executar revisão',
      how: 'Reunião diária',
      owner: 'Gerente',
      origin: 'MX Score',
      due: 'Hoje',
      status: 'Pendente',
      efficacy: 'Pendente',
      evidence: 'Não informada',
      tone: 'danger',
    }])
    expect(items[0].decisionKey).toBe('action:action-123')
  })

  it('considera somente pendente como não resolvido', () => {
    expect(isOwnerDecisionResolved('pendente')).toBe(false)
    expect(isOwnerDecisionResolved('em_andamento')).toBe(true)
    expect(isOwnerDecisionResolved('atrasado')).toBe(true)
    expect(isOwnerDecisionResolved('validando_eficacia')).toBe(true)
    expect(isOwnerDecisionResolved('concluido')).toBe(true)
  })

  it('monta payload de delegação normalizado', () => {
    const item = buildOwnerDecisionItems([alert], [])[0]
    expect(toOwnerDecisionRpcPayload('store-1', item, {
      transition: 'delegate',
      responsavelId: 'user-1',
      prazo: '2026-07-25',
    })).toMatchObject({
      p_store_id: 'store-1',
      p_decision_key: item.decisionKey,
      p_transition: 'delegate',
      p_responsavel_id: 'user-1',
      p_prazo: '2026-07-25',
      p_origem: 'alertas',
    })
  })
})
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
bun test --isolate --max-concurrency=1 \
  src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.test.ts
```

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Implementar o modelo puro**

```ts
import type { OwnerPerformanceAlert } from '../PerformanceAlerts'
import type { CentralMxPlanoAcaoRow } from '../../hooks/useCentralMxPlanosAcao'
import type { ActionRow } from './types'

export type OwnerDecisionTransition = 'approve' | 'delegate'
export type OwnerDecisionItemKind = 'action' | 'alert'

export type OwnerDecisionItem = {
  id: string
  decisionKey: string
  kind: OwnerDecisionItemKind
  title: string
  context: string
  department: string
  indicator: string
  owner: string
  due: string
  recommendation: string
  executionAction: string
  how: string
  status: string
  tone: ActionRow['tone']
  originLabel: string
  databaseOrigin: 'alertas' | 'score' | 'manual'
  databasePriority: 'critica' | 'alta' | 'media' | 'baixa'
}

export type OwnerDecisionRpcPayload = {
  p_store_id: string
  p_decision_key: string
  p_transition: OwnerDecisionTransition
  p_departamento: string
  p_indicador: string
  p_problema: string
  p_acao: string
  p_como: string | null
  p_responsavel_id: string | null
  p_prazo: string | null
  p_prioridade: OwnerDecisionItem['databasePriority']
  p_origem: OwnerDecisionItem['databaseOrigin']
}

function normalizeDecisionPart(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')
}

function stableHash(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function ownerAlertDecisionKey(alert: OwnerPerformanceAlert) {
  const canonical = [alert.title, alert.variant, alert.recommendation]
    .map(normalizeDecisionPart)
    .join('::')
  return `alert:${stableHash(canonical)}`
}

export function isOwnerDecisionResolved(
  status: CentralMxPlanoAcaoRow['status'] | undefined,
) {
  return Boolean(status && status !== 'pendente')
}

function priorityFromAction(priority: ActionRow['priority']) {
  if (priority === 'Crítica') return 'critica' as const
  if (priority === 'Atenção') return 'alta' as const
  return 'baixa' as const
}

export function buildOwnerDecisionItems(
  alerts: OwnerPerformanceAlert[],
  actions: ActionRow[],
): OwnerDecisionItem[] {
  const fromActions = actions.map((action) => ({
    id: `action-${action.id}`,
    decisionKey: `action:${action.id}`,
    kind: 'action' as const,
    title: action.problem,
    context: action.action,
    department: action.department,
    indicator: action.indicator,
    owner: action.owner,
    due: action.due,
    recommendation: action.recommendation,
    executionAction: action.action,
    how: action.how,
    status: action.status,
    tone: action.tone,
    originLabel: action.origin,
    databaseOrigin: 'score' as const,
    databasePriority: priorityFromAction(action.priority),
  }))

  const fromAlerts = alerts.map((alert) => ({
    id: ownerAlertDecisionKey(alert),
    decisionKey: ownerAlertDecisionKey(alert),
    kind: 'alert' as const,
    title: alert.title,
    context: alert.description,
    department: 'Executivo',
    indicator: alert.title,
    owner: 'Dono da loja',
    due: alert.variant === 'danger' ? 'Hoje' : 'Próximo ciclo',
    recommendation: alert.recommendation,
    executionAction: alert.recommendation,
    how: alert.description,
    status: alert.variant === 'danger' ? 'Crítico' : alert.variant === 'warning' ? 'Atenção' : 'Monitorar',
    tone: alert.variant === 'danger' ? 'danger' as const : alert.variant === 'warning' ? 'warning' as const : 'info' as const,
    originLabel: 'Alerta executivo',
    databaseOrigin: 'alertas' as const,
    databasePriority: alert.variant === 'danger' ? 'critica' as const : 'alta' as const,
  }))

  const priority = { danger: 0, warning: 1, purple: 2, info: 3, brand: 4, success: 5, muted: 6 }
  return [...fromActions, ...fromAlerts].sort((a, b) => priority[a.tone] - priority[b.tone])
}

export function toOwnerDecisionRpcPayload(
  storeId: string,
  item: OwnerDecisionItem,
  input: {
    transition: OwnerDecisionTransition
    responsavelId?: string | null
    prazo?: string | null
  },
): OwnerDecisionRpcPayload {
  return {
    p_store_id: storeId,
    p_decision_key: item.decisionKey,
    p_transition: input.transition,
    p_departamento: item.department,
    p_indicador: item.indicator,
    p_problema: item.title,
    p_acao: item.executionAction,
    p_como: item.how || item.context || null,
    p_responsavel_id: input.responsavelId ?? null,
    p_prazo: input.prazo ?? null,
    p_prioridade: item.databasePriority,
    p_origem: item.databaseOrigin,
  }
}
```

- [ ] **Step 4: Executar testes e typecheck**

```bash
bun test --isolate --max-concurrency=1 \
  src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commitar o modelo**

```bash
git add src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.ts \
  src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.test.ts
git commit -m "feat(owner): modelar decisões executivas persistentes"
```

---

### Task 5: Criar repositório e hook de transição

**Files:**
- Create: `src/features/dashboard-loja/hooks/ownerDecisionRepository.ts`
- Create: `src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.ts`
- Create: `src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.test.ts`

**Interfaces:**
- Consumes: `OwnerDecisionRpcPayload`, `CentralMxPlanoAcaoRow`, `supabase`.
- Produces: `fetchOwnerDecisionPlans`, `transitionOwnerDecision`, `useOwnerDecisionTransitions`.

- [ ] **Step 1: Escrever o teste RED do repositório/hook**

O teste deve mockar `@/lib/supabase` e verificar consulta por `origem_ref_table = owner_decision`, bloqueio após erro inicial, payload da RPC e atualização somente com retorno persistido.

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OwnerDecisionItem } from '../sections/owner-cockpit/ownerDecisionModel'
import { useOwnerDecisionTransitions } from './useOwnerDecisionTransitions'

const selectResult = vi.fn()
const rpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(selectResult),
          })),
        })),
      })),
    })),
    rpc,
  },
}))

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const item = {
  decisionKey: 'action:1',
  department: 'Comercial',
  indicator: 'Conversão',
  title: 'Conversão baixa',
  executionAction: 'Revisar follow-up',
  how: 'Reunião diária',
  databasePriority: 'critica',
  databaseOrigin: 'score',
} as OwnerDecisionItem

describe('useOwnerDecisionTransitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectResult.mockResolvedValue({ data: [], error: null })
  })

  it('aprova e indexa somente a linha devolvida pela RPC', async () => {
    rpc.mockResolvedValue({
      data: { id: 'plan-1', origem_ref_key: 'action:1', status: 'em_andamento' },
      error: null,
    })
    const { result } = renderHook(() => useOwnerDecisionTransitions('store-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => result.current.approve(item))

    expect(rpc).toHaveBeenCalledWith('transition_owner_decision', expect.objectContaining({
      p_store_id: 'store-1',
      p_decision_key: 'action:1',
      p_transition: 'approve',
    }))
    expect(result.current.plansByDecisionKey['action:1']?.id).toBe('plan-1')
  })

  it('bloqueia mutação quando o histórico inicial não carregou', async () => {
    selectResult.mockResolvedValue({ data: null, error: new Error('network') })
    const { result } = renderHook(() => useOwnerDecisionTransitions('store-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.approve(item)).rejects.toThrow('decisões persistidas')
    expect(rpc).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
bun test --isolate --max-concurrency=1 \
  src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.test.ts
```

Expected: FAIL porque os módulos ainda não existem.

- [ ] **Step 3: Implementar o repositório sem estado React**

```ts
import { supabase } from '@/lib/supabase'
import type { CentralMxPlanoAcaoRow } from './useCentralMxPlanosAcao'
import type { OwnerDecisionRpcPayload } from '../sections/owner-cockpit/ownerDecisionModel'

const OWNER_DECISION_SELECT =
  'id, scope_type, scope_id, departamento, indicador, problema, acao, como, responsavel_id, prazo, status, prioridade, origem, origem_ref_id, origem_ref_table, origem_ref_key, eficacia_score, eficacia_nota, created_at, concluido_at'

export async function fetchOwnerDecisionPlans(storeId: string) {
  const { data, error } = await supabase
    .from('planos_acao')
    .select(OWNER_DECISION_SELECT)
    .eq('scope_id', storeId)
    .eq('origem_ref_table', 'owner_decision')
    .not('origem_ref_key', 'is', null)

  if (error) throw error
  return (data ?? []) as CentralMxPlanoAcaoRow[]
}

export async function transitionOwnerDecision(payload: OwnerDecisionRpcPayload) {
  const { data, error } = await supabase.rpc('transition_owner_decision', payload)
  if (error) throw error
  if (!data || Array.isArray(data)) {
    throw new Error('A transição não devolveu um plano persistido válido.')
  }
  return data as CentralMxPlanoAcaoRow
}
```

- [ ] **Step 4: Implementar o hook**

```ts
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import type { CentralMxPlanoAcaoRow } from './useCentralMxPlanosAcao'
import { fetchOwnerDecisionPlans, transitionOwnerDecision } from './ownerDecisionRepository'
import {
  toOwnerDecisionRpcPayload,
  type OwnerDecisionItem,
} from '../sections/owner-cockpit/ownerDecisionModel'

export function useOwnerDecisionTransitions(storeId: string | null) {
  const [plans, setPlans] = useState<CentralMxPlanoAcaoRow[]>([])
  const [loading, setLoading] = useState(Boolean(storeId))
  const [blockingError, setBlockingError] = useState<string | null>(null)
  const [pendingDecisionKey, setPendingDecisionKey] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!storeId) {
      setPlans([])
      setLoading(false)
      setBlockingError(null)
      return
    }
    setLoading(true)
    try {
      setPlans(await fetchOwnerDecisionPlans(storeId))
      setBlockingError(null)
    } catch (error) {
      setPlans([])
      setBlockingError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as decisões persistidas.',
      )
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const runTransition = useCallback(async (
    item: OwnerDecisionItem,
    input: {
      transition: 'approve' | 'delegate'
      responsavelId?: string | null
      prazo?: string | null
    },
  ) => {
    if (!storeId) throw new Error('Selecione uma loja operacional.')
    if (blockingError) {
      throw new Error('Não foi possível validar as decisões persistidas. Recarregue antes de continuar.')
    }
    setPendingDecisionKey(item.decisionKey)
    try {
      const row = await transitionOwnerDecision(
        toOwnerDecisionRpcPayload(storeId, item, input),
      )
      setPlans((current) => {
        const withoutCurrent = current.filter(
          (plan) => plan.origem_ref_key !== row.origem_ref_key,
        )
        return [...withoutCurrent, row]
      })
      toast.success(
        input.transition === 'approve'
          ? 'Decisão aprovada e enviada para execução.'
          : 'Decisão delegada e enviada para execução.',
      )
      return row
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a decisão.',
      )
      throw error
    } finally {
      setPendingDecisionKey(null)
    }
  }, [blockingError, storeId])

  const approve = useCallback(
    (item: OwnerDecisionItem) => runTransition(item, { transition: 'approve' }),
    [runTransition],
  )

  const delegate = useCallback(
    (item: OwnerDecisionItem, responsavelId: string, prazo: string) =>
      runTransition(item, {
        transition: 'delegate',
        responsavelId,
        prazo,
      }),
    [runTransition],
  )

  const plansByDecisionKey = useMemo(() => Object.fromEntries(
    plans
      .filter((plan) => plan.origem_ref_key)
      .map((plan) => [plan.origem_ref_key as string, plan]),
  ), [plans])

  return {
    plansByDecisionKey,
    loading,
    blockingError,
    pendingDecisionKey,
    approve,
    delegate,
    refresh,
  }
}
```

- [ ] **Step 5: Executar testes e typecheck**

```bash
bun test --isolate --max-concurrency=1 \
  src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commitar repositório e hook**

```bash
git add src/features/dashboard-loja/hooks/ownerDecisionRepository.ts \
  src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.ts \
  src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.test.ts
git commit -m "feat(owner): conectar decisões ao plano persistido"
```

---

### Task 6: Criar responsáveis focados e modal acessível de delegação

**Files:**
- Create: `src/features/dashboard-loja/hooks/useOwnerDecisionAssignees.ts`
- Create: `src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.tsx`
- Create: `src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.test.tsx`
- Reference: `src/hooks/team/types.ts`
- Reference: `src/components/ui/dialog.jsx`
- Reference: `src/components/ui/select.jsx`

**Interfaces:**
- Consumes: `storeId`, `OwnerDecisionItem`, callback `onConfirm(responsavelId, prazo)`.
- Produces: lista `OwnerDecisionAssignee[]` e diálogo controlado.

- [ ] **Step 1: Escrever testes RED do modal**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OwnerDecisionDelegateDialog } from './OwnerDecisionDelegateDialog'

vi.mock('../../hooks/useOwnerDecisionAssignees', () => ({
  useOwnerDecisionAssignees: () => ({
    assignees: [
      { userId: 'user-1', name: 'Ana Gerente', role: 'gerente' },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

afterEach(cleanup)

describe('OwnerDecisionDelegateDialog', () => {
  it('exige responsável e prazo antes de confirmar', async () => {
    const onConfirm = vi.fn()
    render(
      <OwnerDecisionDelegateDialog
        open
        storeId="store-1"
        item={{ title: 'Meta em risco' } as never}
        pending={false}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar delegação' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Selecione um responsável.')).toBeTruthy()
  })

  it('envia responsável e prazo selecionados', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <OwnerDecisionDelegateDialog
        open
        storeId="store-1"
        item={{ title: 'Meta em risco' } as never}
        pending={false}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    fireEvent.change(screen.getByLabelText('Responsável'), {
      target: { value: 'user-1' },
    })
    fireEvent.change(screen.getByLabelText('Prazo'), {
      target: { value: '2026-07-25' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar delegação' }))

    expect(onConfirm).toHaveBeenCalledWith('user-1', '2026-07-25')
  })
})
```

- [ ] **Step 2: Confirmar RED**

```bash
bun test --isolate --max-concurrency=1 \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.test.tsx
```

Expected: FAIL porque o diálogo ainda não existe.

- [ ] **Step 3: Implementar hook de responsáveis com consulta mínima**

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type OwnerDecisionAssignee = {
  userId: string
  name: string
  role: string
}

type MembershipRow = {
  user_id: string
  role: string
  users: { id: string; name: string; active: boolean | null } | null
}

export function useOwnerDecisionAssignees(storeId: string | null) {
  const [assignees, setAssignees] = useState<OwnerDecisionAssignee[]>([])
  const [loading, setLoading] = useState(Boolean(storeId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!storeId) {
      setAssignees([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    try {
      const { data, error: queryError } = await supabase
        .from('vinculos_loja')
        .select('user_id, role, users:usuarios(id, name, active)')
        .eq('store_id', storeId)
        .eq('is_active', true)
      if (queryError) throw queryError
      const rows = (data ?? []) as unknown as MembershipRow[]
      setAssignees(rows
        .filter((row) => row.users && row.users.active !== false)
        .map((row) => ({
          userId: row.user_id,
          name: row.users?.name || 'Usuário sem nome',
          role: row.role,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      setError(null)
    } catch (queryError) {
      setAssignees([])
      setError(queryError instanceof Error
        ? queryError.message
        : 'Não foi possível carregar os responsáveis.')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { assignees, loading, error, refresh }
}
```

- [ ] **Step 4: Implementar o diálogo**

O componente deve usar os exports de `@/components/ui/dialog`, `<select>` com `aria-label="Responsável"`, `<input type="date" aria-label="Prazo">`, erro inline com `role="alert"`, botão de retry para falha de leitura e data padrão de sete dias à frente.

```tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useOwnerDecisionAssignees } from '../../hooks/useOwnerDecisionAssignees'
import type { OwnerDecisionItem } from './ownerDecisionModel'

function sevenDaysAhead() {
  const value = new Date()
  value.setDate(value.getDate() + 7)
  return value.toISOString().slice(0, 10)
}

export function OwnerDecisionDelegateDialog({
  open,
  storeId,
  item,
  pending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  storeId: string | null
  item: OwnerDecisionItem | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (responsavelId: string, prazo: string) => Promise<void>
}) {
  const { assignees, loading, error, refresh } = useOwnerDecisionAssignees(
    open ? storeId : null,
  )
  const [responsavelId, setResponsavelId] = useState('')
  const [prazo, setPrazo] = useState(sevenDaysAhead)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setResponsavelId('')
      setPrazo(sevenDaysAhead())
      setValidationError(null)
    }
  }, [open, item?.decisionKey])

  async function submit() {
    if (!responsavelId) {
      setValidationError('Selecione um responsável.')
      return
    }
    if (!prazo) {
      setValidationError('Informe o prazo.')
      return
    }
    setValidationError(null)
    await onConfirm(responsavelId, prazo)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="max-w-xl rounded-mx-2xl border-border-subtle bg-white">
        <DialogHeader>
          <DialogTitle>Delegar decisão</DialogTitle>
          <DialogDescription>
            {item?.title || 'Selecione responsável e prazo para iniciar a execução.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p role="status">Carregando responsáveis...</p>
        ) : error ? (
          <div role="alert">
            <p>{error}</p>
            <Button type="button" variant="outline" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
          </div>
        ) : assignees.length === 0 ? (
          <p role="status">Nenhum responsável ativo está vinculado a esta loja.</p>
        ) : (
          <div className="space-y-mx-md">
            <label className="block text-sm font-black" htmlFor="owner-decision-assignee">
              Responsável
            </label>
            <select
              id="owner-decision-assignee"
              aria-label="Responsável"
              value={responsavelId}
              onChange={(event) => setResponsavelId(event.target.value)}
              className="h-11 w-full rounded-mx-xl border border-border-default bg-white px-mx-sm"
            >
              <option value="">Selecione</option>
              {assignees.map((assignee) => (
                <option key={assignee.userId} value={assignee.userId}>
                  {assignee.name} · {assignee.role}
                </option>
              ))}
            </select>

            <label className="block text-sm font-black" htmlFor="owner-decision-due-date">
              Prazo
            </label>
            <input
              id="owner-decision-due-date"
              aria-label="Prazo"
              type="date"
              value={prazo}
              onChange={(event) => setPrazo(event.target.value)}
              className="h-11 w-full rounded-mx-xl border border-border-default bg-white px-mx-sm"
            />
          </div>
        )}

        {validationError && <p role="alert">{validationError}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending || loading || Boolean(error) || assignees.length === 0}
            onClick={() => void submit()}
          >
            {pending ? 'Delegando...' : 'Confirmar delegação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Executar testes, a11y lint e typecheck**

```bash
bun test --isolate --max-concurrency=1 \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.test.tsx
npm run lint:a11y
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commitar responsáveis e modal**

```bash
git add src/features/dashboard-loja/hooks/useOwnerDecisionAssignees.ts \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.tsx \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.test.tsx
git commit -m "feat(owner): adicionar delegação de decisão"
```

---

### Task 7: Integrar Aprovar e Delegar à Central de Decisões

**Files:**
- Modify: `src/features/dashboard-loja/sections/owner-cockpit/OwnerBase44Views.tsx:1-290`
- Modify: `src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx:138-143`
- Create: `src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionCenter.test.tsx`

**Interfaces:**
- Consumes: `storeId`, `buildOwnerDecisionItems`, `useOwnerDecisionTransitions`, `OwnerDecisionDelegateDialog`.
- Produces: fila persistente com ações Aprovar/Delegar e métricas somente de itens não resolvidos.

- [ ] **Step 1: Escrever testes RED da Central de Decisões**

Mockar `useOwnerDecisionTransitions` e validar:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { OwnerDecisionCenter } from './OwnerBase44Views'

const approve = vi.fn()
const delegate = vi.fn()
const hookState = {
  plansByDecisionKey: {},
  loading: false,
  blockingError: null,
  pendingDecisionKey: null,
  approve,
  delegate,
  refresh: vi.fn(),
}

vi.mock('../../hooks/useOwnerDecisionTransitions', () => ({
  useOwnerDecisionTransitions: () => hookState,
}))

vi.mock('./OwnerDecisionDelegateDialog', () => ({
  OwnerDecisionDelegateDialog: ({ open, onConfirm }: {
    open: boolean
    onConfirm: (userId: string, prazo: string) => Promise<void>
  }) => open ? (
    <button type="button" onClick={() => void onConfirm('user-1', '2026-07-25')}>
      Confirmar modal fake
    </button>
  ) : null,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  hookState.plansByDecisionKey = {}
  hookState.blockingError = null
  hookState.pendingDecisionKey = null
})

const alerts = [{
  title: 'Meta em risco',
  description: 'Ritmo abaixo do esperado',
  recommendation: 'Revisar agenda',
  variant: 'danger',
}] as never

describe('OwnerDecisionCenter persisted transitions', () => {
  it('aprova somente após interação explícita', async () => {
    render(
      <MemoryRouter>
        <OwnerDecisionCenter storeId="store-1" alerts={alerts} actions={[]} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    await waitFor(() => expect(approve).toHaveBeenCalledTimes(1))
  })

  it('abre delegação e envia responsável e prazo', async () => {
    render(
      <MemoryRouter>
        <OwnerDecisionCenter storeId="store-1" alerts={alerts} actions={[]} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delegar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar modal fake' }))
    await waitFor(() => expect(delegate).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      '2026-07-25',
    ))
  })

  it('remove da fila um item já persistido como em andamento', () => {
    hookState.plansByDecisionKey = {
      'alert:resolved': { status: 'em_andamento' },
    }
    render(
      <MemoryRouter>
        <OwnerDecisionCenter storeId="store-1" alerts={[]} actions={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Fila executiva tratada')).toBeTruthy()
  })

  it('bloqueia mutações quando não consegue validar persistência', () => {
    hookState.blockingError = 'Falha de leitura'
    render(
      <MemoryRouter>
        <OwnerDecisionCenter storeId="store-1" alerts={alerts} actions={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
    expect(screen.getByText('Falha de leitura')).toBeTruthy()
  })
})
```

A terceira massa deve usar uma chave produzida por `ownerAlertDecisionKey(alert)` para corresponder exatamente ao mapa; não codificar `alert:resolved` na implementação final do teste.

- [ ] **Step 2: Confirmar RED**

```bash
bun test --isolate --max-concurrency=1 \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionCenter.test.tsx
```

Expected: FAIL porque `storeId` e ações persistentes ainda não existem.

- [ ] **Step 3: Passar `storeId` pelo cockpit**

Em `OwnerExecutiveCockpit.tsx`:

```tsx
<OwnerDecisionCenter
  storeId={data.operationalStore?.id || null}
  alerts={ownerAlerts}
  actions={actions}
/>
```

- [ ] **Step 4: Remover `ExecutiveItem` e `buildExecutiveItems` locais**

Substituir pelo import:

```ts
import {
  buildOwnerDecisionItems,
  isOwnerDecisionResolved,
  type OwnerDecisionItem,
} from './ownerDecisionModel'
import { OwnerDecisionDelegateDialog } from './OwnerDecisionDelegateDialog'
import { useOwnerDecisionTransitions } from '../../hooks/useOwnerDecisionTransitions'
```

- [ ] **Step 5: Integrar persistência, filtro e métricas**

No início de `OwnerDecisionCenter`:

```tsx
export function OwnerDecisionCenter({
  storeId,
  alerts,
  actions,
}: {
  storeId: string | null
  alerts: OwnerPerformanceAlert[]
  actions: ActionRow[]
}) {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [delegateItem, setDelegateItem] = useState<OwnerDecisionItem | null>(null)
  const transitions = useOwnerDecisionTransitions(storeId)
  const allItems = useMemo(
    () => buildOwnerDecisionItems(alerts, actions),
    [actions, alerts],
  )
  const items = useMemo(
    () => allItems.filter((item) => !isOwnerDecisionResolved(
      transitions.plansByDecisionKey[item.decisionKey]?.status,
    )),
    [allItems, transitions.plansByDecisionKey],
  )
  const itemPreview = items.slice(0, 12)
  const mutationsBlocked = !storeId || Boolean(transitions.blockingError)
```

Métricas devem continuar usando `items`, não `allItems`.

- [ ] **Step 6: Renderizar erro bloqueante e botões reais**

Antes da lista:

```tsx
{transitions.blockingError && (
  <Card className="rounded-mx-xl border border-status-error/20 bg-status-error-surface p-mx-md">
    <p role="alert" className="font-black text-status-error">
      {transitions.blockingError}
    </p>
    <Button type="button" variant="outline" onClick={() => void transitions.refresh()}>
      Tentar novamente
    </Button>
  </Card>
)}
```

No grupo de ações de cada item:

```tsx
<Button
  type="button"
  variant="outline"
  className="rounded-mx-xl bg-white"
  onClick={() => setExpandedId(expanded ? null : item.id)}
>
  {expanded ? 'Fechar análise' : 'Analisar'}
</Button>
<Button
  type="button"
  className="rounded-mx-xl"
  disabled={mutationsBlocked || transitions.pendingDecisionKey === item.decisionKey}
  onClick={() => void transitions.approve(item)}
>
  {transitions.pendingDecisionKey === item.decisionKey ? 'Aprovando...' : 'Aprovar'}
</Button>
<Button
  type="button"
  variant="outline"
  className="rounded-mx-xl bg-white"
  disabled={mutationsBlocked || transitions.pendingDecisionKey === item.decisionKey}
  onClick={() => setDelegateItem(item)}
>
  Delegar
</Button>
<Button
  type="button"
  variant="ghost"
  className="rounded-mx-xl"
  onClick={() => navigate(`/falar-consultor?origem=central-decisoes&titulo=${encodeURIComponent(item.title)}`)}
>
  <MessageSquareText size={16} /> Falar com Consultor
</Button>
```

Após a lista:

```tsx
<OwnerDecisionDelegateDialog
  open={Boolean(delegateItem)}
  storeId={storeId}
  item={delegateItem}
  pending={Boolean(
    delegateItem && transitions.pendingDecisionKey === delegateItem.decisionKey
  )}
  onOpenChange={(open) => {
    if (!open) setDelegateItem(null)
  }}
  onConfirm={async (responsavelId, prazo) => {
    if (!delegateItem) return
    await transitions.delegate(delegateItem, responsavelId, prazo)
  }}
/>
```

- [ ] **Step 7: Executar testes de componente, lint e typecheck**

```bash
bun test --isolate --max-concurrency=1 \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionCenter.test.tsx \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.test.tsx \
  src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.test.ts \
  src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.test.ts
npm run lint:a11y
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commitar integração visual**

```bash
git add src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerBase44Views.tsx \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionCenter.test.tsx
git commit -m "feat(owner): ativar aprovar e delegar decisões"
```

---

### Task 8: Adicionar smoke autenticado e documentação de entrega

**Files:**
- Create: `src/test/owner-decision-transitions.playwright.ts`
- Create: `docs/stories/story-OWNER-20260718-owner-decision-transitions.md`
- Modify: `docs/stories/story-OWNER-20260718-base44-parity-integrated.md`

**Interfaces:**
- Consumes: ambiente autenticado E2E do Dono e rota `/lojas?ownerSection=decisoes`.
- Produces: evidência funcional, visual e de persistência.

- [ ] **Step 1: Criar Playwright condicionado à credencial existente**

```ts
import { expect, test } from '@playwright/test'

const email = process.env.E2E_OWNER_EMAIL || 'dono@mxgestaopreditiva.com.br'
const password = process.env.E2E_ROLE_PASSWORD || process.env.E2E_AUTH_PASSWORD

test.describe('owner decision transitions', () => {
  test.skip(!password, 'Issue #127: credencial E2E do Dono não configurada')

  test('approves one sandbox decision and keeps it resolved after reload', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-mail/i).fill(email)
    await page.getByLabel(/senha/i).fill(password as string)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.goto('/lojas?ownerSection=decisoes')

    const card = page.locator('[data-owner-decision-key]').first()
    const decisionKey = await card.getAttribute('data-owner-decision-key')
    await card.getByRole('button', { name: 'Aprovar' }).click()
    await expect(page.getByText('Decisão aprovada e enviada para execução.')).toBeVisible()
    await page.reload()
    await expect(page.locator(`[data-owner-decision-key="${decisionKey}"]`)).toHaveCount(0)
  })

  test('delegate dialog remains usable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/lojas?ownerSection=decisoes')
    await page.locator('[data-owner-decision-key]').first()
      .getByRole('button', { name: 'Delegar' }).click()
    await expect(page.getByRole('dialog', { name: 'Delegar decisão' })).toBeVisible()
    await expect(page.getByLabel('Responsável')).toBeVisible()
    await expect(page.getByLabel('Prazo')).toBeVisible()
  })
})
```

Adicionar `data-owner-decision-key={item.decisionKey}` no card durante a Task 7.

- [ ] **Step 2: Executar smoke quando o secret estiver disponível**

```bash
npx playwright test src/test/owner-decision-transitions.playwright.ts \
  --project=chromium
```

Expected com secret: 2 PASS. Expected sem secret: 2 SKIPPED com referência à issue #127, sem falso positivo de execução autenticada.

- [ ] **Step 3: Registrar story de entrega**

Criar documento com:

```md
# Story OWNER: Transições auditáveis da Central de Decisões

## Status
Em validação

## Entrega
- Aprovar inicia execução persistida.
- Delegar exige responsável ativo da loja.
- Planos usam chave idempotente por loja.
- Histórico registra `owner_approval` ou `owner_delegation`.
- Decisões resolvidas saem da fila e permanecem no Plano de Ação.

## Evidências obrigatórias
- Migration aplicada: `20260718233000_owner_decision_transitions.sql`.
- Testes unitários e de componente verdes.
- RLS e ACL verificadas.
- CI completo verde.
- Playwright autenticado: anexar resultado quando a issue #127 for resolvida.

## Limitações remanescentes
- Fonte canônica de estoque por loja.
- Credencial E2E da issue #127.
```

No documento Base44 integrado, substituir a limitação de Aprovar/Delegar por referência à nova story, sem marcar produção antes da publicação real.

- [ ] **Step 4: Commitar testes e documentação**

```bash
git add src/test/owner-decision-transitions.playwright.ts \
  docs/stories/story-OWNER-20260718-owner-decision-transitions.md \
  docs/stories/story-OWNER-20260718-base44-parity-integrated.md
git commit -m "test(owner): documentar validação das transições"
```

---

### Task 9: Executar gates finais, aplicar migration e publicar

**Files:**
- Verify all changed files.
- Update after evidence: `docs/stories/story-OWNER-20260718-owner-decision-transitions.md`

**Interfaces:**
- Consumes: todos os artefatos das Tasks 1-8.
- Produces: PR revisável, migration aplicada, CI verde, publicação automática e evidência final.

- [ ] **Step 1: Rodar gate local completo**

```bash
npm run typecheck
npm run lint
bun test --isolate --max-concurrency=1 \
  src/lib/owner-decision-transition-contract.test.ts \
  src/features/dashboard-loja/sections/owner-cockpit/ownerDecisionModel.test.ts \
  src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.test.ts \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionDelegateDialog.test.tsx \
  src/features/dashboard-loja/sections/owner-cockpit/OwnerDecisionCenter.test.tsx
npm test
npm run build
npm run check:bundle-size
npm run verify:db-types
node scripts/check_migration_reversibility.mjs
```

Expected: todos PASS; build sem erro; bundle dentro do orçamento; tipos sem diff.

- [ ] **Step 2: Revisar segurança antes de aplicar produção**

Verificar no diff:

```bash
git diff main...HEAD -- \
  supabase/migrations/20260718233000_owner_decision_transitions.sql \
  src/features/dashboard-loja/hooks/ownerDecisionRepository.ts \
  src/features/dashboard-loja/hooks/useOwnerDecisionTransitions.ts
```

Critérios:

- nenhum token, senha ou UUID real versionado;
- RPC com `search_path` fixo;
- ACL sem `PUBLIC`/`anon`;
- responsável validado no banco;
- consulta filtrada por loja e origem;
- sem mutação otimista.

- [ ] **Step 3: Aplicar migration no Supabase somente após gates verdes**

```bash
supabase db push
```

Expected: `20260718233000_owner_decision_transitions.sql` aplicada uma única vez.

Validar definições e ACL:

```sql
SELECT proname, prosecdef, proacl
FROM pg_proc
WHERE proname = 'transition_owner_decision';

SELECT indexdef
FROM pg_indexes
WHERE indexname = 'uidx_planos_scope_origin_ref_key';

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('planos_acao', 'historico_planos_acao')
  AND column_name IN ('origem_ref_key', 'change_reason');
```

Expected: `prosecdef = true`; ACL somente `authenticated` e `service_role`; índice e duas colunas presentes.

- [ ] **Step 4: Criar PR e acompanhar todos os gates**

```bash
git push -u origin feat/owner-decision-transitions
```

Abrir PR para `main` com:

```md
## Resumo
- adiciona Aprovar e Delegar persistentes na Central de Decisões;
- reutiliza Plano de Ação canônico;
- valida responsável ativo da loja;
- registra motivo de auditoria;
- impede duplicidade por chave estável.

## Testes
- typecheck
- lint/a11y
- unit/component
- build
- bundle budget
- db types
- migration reversibility
- RLS/ACL probes

## Migration
`20260718233000_owner_decision_transitions.sql`

## Pendente externo
Matriz autenticada integral depende da issue #127.
```

Expected: todos os checks obrigatórios verdes antes do merge.

- [ ] **Step 5: Executar revisão de código e corrigir comentários**

Revisar especialmente:

- concorrência do `ON CONFLICT` + `FOR UPDATE`;
- não reabertura de plano concluído;
- enum `alertas` no banco versus legado `alerta` no frontend;
- foco e fechamento do diálogo;
- remoção da fila somente após retorno persistido;
- isolamento por loja.

- [ ] **Step 6: Fazer merge somente com evidência verde**

Após merge, verificar que a publicação automática Vercel usa commit contendo o merge e chega a `READY`. Não criar deployment manual sem necessidade.

Smoke público:

```bash
curl -I https://www.mxperformance.com.br/login
curl -I 'https://www.mxperformance.com.br/lojas?ownerSection=decisoes'
```

Expected: resposta pública válida da SPA. Não tratar esse smoke como prova de fluxo autenticado.

- [ ] **Step 7: Atualizar story com evidências reais**

Alterar status para `Done` somente após:

- migration confirmada em produção;
- PR mergeado;
- CI do merge verde;
- Vercel `READY` no commit correto;
- smoke público válido;
- smoke autenticado marcado PASS ou explicitamente bloqueado pela issue #127.

Commit final:

```bash
git add docs/stories/story-OWNER-20260718-owner-decision-transitions.md \
  docs/stories/story-OWNER-20260718-base44-parity-integrated.md
git commit -m "docs(owner): registrar publicação das transições"
```

---

## Self-Review Checklist

- [x] Todos os critérios aprovados da especificação possuem uma task correspondente.
- [x] Nenhuma tabela paralela é criada.
- [x] A idempotência está coberta por índice, `ON CONFLICT`, bloqueio e teste concorrente.
- [x] A auditoria explícita atravessa RPC e trigger por GUC transacional local.
- [x] O responsável é validado no banco, não apenas no modal.
- [x] O item só deixa a fila após a RPC devolver estado persistido.
- [x] O modal possui estados de loading, vazio, erro, validação e salvamento.
- [x] A migration possui DOWN explícito e preserva tabelas canônicas.
- [x] Tipos e nomes são consistentes entre SQL, modelo, repositório, hook e UI.
- [x] O Playwright não produz falso PASS quando a credencial da issue #127 estiver ausente.
- [x] Não existem `TBD`, `TODO`, “implementar depois” ou handlers vagos.
