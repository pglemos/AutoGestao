# Plano salarial Brothers Car — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pré-configurar o plano salarial "Brothers Car" (fixo + comissão/carro + bônus individual + bônus coletivo cumulativo por faixa de carros da loja + bônus de carreira) na loja de testes MX CONSULTORIA, editável por dono/gerente e somente-leitura pro vendedor, usando o motor genérico de remuneração já existente no sistema.

**Architecture:** Extensão aditiva do motor de cálculo puro (`comparativo.ts`) e do schema (`remuneracao_regras` + tabela nova `vendedor_nivel_carreira`) — sem quebrar planos/regras já cadastrados em outras lojas. UI (dono/gerente) e dashboard (vendedor) já existem e leem o motor genericamente; só precisam de campos novos no formulário de regras e uma aba nova pra nível de carreira.

**Tech Stack:** React + TypeScript, Supabase (Postgres + RLS), Bun test.

## Global Constraints

- Projeto Supabase: `fbhcmzzgwjdgkctlfvbo` (MX GESTAO PREDITIVA). MCP Supabase **sem permissão** nesse projeto — usar CLI linked (`supabase db push --linked` / `supabase gen types typescript --linked`), autenticada via keychain macOS.
- **NUNCA `supabase db push --include-all`**: 3 migrations out-of-order nunca aplicadas (`20260521120000_drop_migration_backups_pii`, `20260521130000_db016_revoke_lancamentos_diarios`, `20260521131000_db016_revoke_rollback`) seriam arrastadas. Mover pra fora de `supabase/migrations/` antes de `db push`, restaurar depois (`trap ... EXIT`).
- Loja de testes: **MX CONSULTORIA**, `loja_id = 467a19d1-af51-4b4f-9b05-d67187a2a759`, cargo `Vendedor`.
- Contas de teste: `dono@mxgestaopreditiva.com.br`, `gerente@mxgestaopreditiva.com.br`, `vendedor@mxgestaopreditiva.com.br` (nível líder), `mari.vendedor@mxgestaopreditiva.com.br` (pleno), `jose.vendedor@mxgestaopreditiva.com.br` (júnior), `daniel.vendedor@mxgestaopreditiva.com.br` (júnior). Senha fornecida somente em runtime via `MX_E2E_PASSWORD`.
- Migrations aditivas (`IF NOT EXISTS` em toda `ADD COLUMN`/`ADD VALUE`), zero impacto em regras/planos existentes de outras lojas.
- Após qualquer migration: `npm run gen:db-types` seguido de `npm run typecheck`.
- Spec completa: `docs/superpowers/specs/2026-07-07-plano-remuneracao-brothers-car-design.md`.

---

### Task 1: Migration — colunas novas em `remuneracao_regras`

**Files:**
- Create: `supabase/migrations/20260707140000_remuneracao_regras_faixa_unidade.sql`

**Interfaces:**
- Produces: colunas `unidade_meta_min integer`, `cumulativo boolean`, `valor_por_unidade boolean`, `requer_bonus_individual boolean`, `nivel_carreira text` em `public.remuneracao_regras`; novo valor de enum `bonus_carreira` em `public.remuneracao_regra_tipo`; índice único `ux_remuneracao_regras_unique` atualizado (usado pela Task 9 pra inserir as regras do plano sem colidir).

- [ ] **Step 1: Escrever a migration**

```sql
-- ============================================================================
-- Migration: 20260707140000_remuneracao_regras_faixa_unidade.sql
-- Scope: plano salarial Brothers Car (loja de testes MX CONSULTORIA) — faixas
--        absolutas de carros da loja (cumulativas, com trava de mínimo
--        individual) e bônus de carreira. Aditivo, sem impacto em regras
--        existentes de outras lojas.
-- ============================================================================

ALTER TYPE public.remuneracao_regra_tipo ADD VALUE IF NOT EXISTS 'bonus_carreira';

ALTER TABLE public.remuneracao_regras
  ADD COLUMN IF NOT EXISTS unidade_meta_min integer;

ALTER TABLE public.remuneracao_regras
  ADD COLUMN IF NOT EXISTS cumulativo boolean NOT NULL DEFAULT false;

ALTER TABLE public.remuneracao_regras
  ADD COLUMN IF NOT EXISTS valor_por_unidade boolean NOT NULL DEFAULT false;

ALTER TABLE public.remuneracao_regras
  ADD COLUMN IF NOT EXISTS requer_bonus_individual boolean NOT NULL DEFAULT false;

ALTER TABLE public.remuneracao_regras
  ADD COLUMN IF NOT EXISTS nivel_carreira text;

ALTER TABLE public.remuneracao_regras
  DROP CONSTRAINT IF EXISTS remuneracao_regras_unidade_meta_min_check;

ALTER TABLE public.remuneracao_regras
  ADD CONSTRAINT remuneracao_regras_unidade_meta_min_check
  CHECK (unidade_meta_min IS NULL OR unidade_meta_min >= 0);

ALTER TABLE public.remuneracao_regras
  DROP CONSTRAINT IF EXISTS remuneracao_regras_nivel_carreira_check;

ALTER TABLE public.remuneracao_regras
  ADD CONSTRAINT remuneracao_regras_nivel_carreira_check
  CHECK (nivel_carreira IS NULL OR nivel_carreira IN ('junior', 'pleno', 'lider'));

COMMENT ON COLUMN public.remuneracao_regras.unidade_meta_min IS
  'Limiar absoluto (ex.: carros vendidos) usado no lugar de percentual_meta_min quando preenchido. Aplica-se a bonus_meta (vendas do proprio vendedor) e comissao_equipe (vendas totais da loja).';
COMMENT ON COLUMN public.remuneracao_regras.cumulativo IS
  'Quando true, comissao_equipe soma todos os patamares atingidos em vez de aplicar so o maior.';
COMMENT ON COLUMN public.remuneracao_regras.valor_por_unidade IS
  'Quando true, valor e multiplicado pelas vendas do proprio vendedor (comissao_equipe) em vez de ser um valor fixo.';
COMMENT ON COLUMN public.remuneracao_regras.requer_bonus_individual IS
  'Quando true (comissao_equipe), a regra so se aplica se o vendedor ja atingiu o proprio bonus_meta no periodo.';
COMMENT ON COLUMN public.remuneracao_regras.nivel_carreira IS
  'Nivel de carreira (junior/pleno/lider) usado quando tipo=bonus_carreira.';

DROP INDEX IF EXISTS ux_remuneracao_regras_unique;

CREATE UNIQUE INDEX IF NOT EXISTS ux_remuneracao_regras_unique
  ON public.remuneracao_regras (
    loja_id,
    lower(cargo),
    tipo,
    vigencia_inicio,
    COALESCE(percentual_meta_min, -1),
    COALESCE(tipo_veiculo, ''),
    COALESCE(unidade_meta_min, -1),
    COALESCE(nivel_carreira, '')
  );

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Conferir sintaxe localmente**

Run: `cd "/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA" && supabase migration list --linked | tail -5`
Expected: comando roda sem erro de autenticação (confirma CLI linkada); a migration nova ainda não aparece como aplicada.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260707140000_remuneracao_regras_faixa_unidade.sql
git commit -m "feat(db): faixas absolutas e bonus de carreira em remuneracao_regras"
```

---

### Task 2: Migration — tabela `vendedor_nivel_carreira`

**Files:**
- Create: `supabase/migrations/20260707141000_vendedor_nivel_carreira.sql`

**Interfaces:**
- Consumes: `public.crm_touch_updated_at()` (trigger function já existe, usada em `20260609170000_vendedor_perfil.sql`), `public.tem_papel_loja(loja_id, roles[], uid)` (já existe).
- Produces: tabela `public.vendedor_nivel_carreira(id, seller_user_id, loja_id, nivel_carreira, updated_by, created_at, updated_at)`, RLS: vendedor só lê a própria linha, dono/gerente da loja fazem RW.

**Por que tabela separada e não coluna em `vendedor_perfil`:** `vendedor_perfil` tem a policy `vendedor_perfil_seller_rw` (`USING (seller_user_id = auth.uid())` pra `FOR ALL`) — o vendedor tem RW total da própria linha. RLS do Postgres é por linha, não por coluna, então não dá pra colocar `nivel_carreira` lá e bloquear só esse campo pro vendedor. Dono/gerente hoje só têm `SELECT` em `vendedor_perfil` (`vendedor_perfil_store_read`), não `UPDATE`.

- [ ] **Step 1: Escrever a migration**

```sql
-- ============================================================================
-- Migration: 20260707141000_vendedor_nivel_carreira.sql
-- Scope: nivel de carreira (junior/pleno/lider) por vendedor, atribuido
--        manualmente por dono/gerente (bonus de merito, plano Brothers Car).
--        Tabela dedicada porque vendedor_perfil tem RLS de escrita exclusiva
--        do proprio vendedor — nao da pra restringir por coluna dentro dela.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.vendedor_nivel_carreira (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id  uuid NOT NULL UNIQUE REFERENCES public.usuarios(id) ON DELETE CASCADE,
  loja_id         uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
  nivel_carreira  text NOT NULL DEFAULT 'junior' CHECK (nivel_carreira IN ('junior', 'pleno', 'lider')),
  updated_by      uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendedor_nivel_carreira IS
  'Nivel de carreira do vendedor (merito), atribuido por dono/gerente. Consumido pelo motor de remuneracao (regra tipo=bonus_carreira).';

CREATE INDEX IF NOT EXISTS idx_vendedor_nivel_carreira_loja ON public.vendedor_nivel_carreira(loja_id);

DROP TRIGGER IF EXISTS trg_vendedor_nivel_carreira_updated_at ON public.vendedor_nivel_carreira;
CREATE TRIGGER trg_vendedor_nivel_carreira_updated_at BEFORE UPDATE ON public.vendedor_nivel_carreira
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

ALTER TABLE public.vendedor_nivel_carreira ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendedor_nivel_carreira_seller_read ON public.vendedor_nivel_carreira;
CREATE POLICY vendedor_nivel_carreira_seller_read ON public.vendedor_nivel_carreira FOR SELECT TO authenticated
  USING (seller_user_id = auth.uid());

DROP POLICY IF EXISTS vendedor_nivel_carreira_manager_rw ON public.vendedor_nivel_carreira;
CREATE POLICY vendedor_nivel_carreira_manager_rw ON public.vendedor_nivel_carreira FOR ALL TO authenticated
  USING (
    public.user_has_role(ARRAY['master','director','hr','admin_mx'])
    OR (loja_id IS NOT NULL AND public.tem_papel_loja(loja_id, ARRAY['dono','gerente'], auth.uid()))
  )
  WITH CHECK (
    public.user_has_role(ARRAY['master','director','hr','admin_mx'])
    OR (loja_id IS NOT NULL AND public.tem_papel_loja(loja_id, ARRAY['dono','gerente'], auth.uid()))
  );

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- DOWN
-- ============================================================================
-- BEGIN;
--   DROP TABLE IF EXISTS public.vendedor_nivel_carreira;
-- COMMIT;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260707141000_vendedor_nivel_carreira.sql
git commit -m "feat(db): tabela vendedor_nivel_carreira (bonus de carreira dono/gerente)"
```

---

### Task 3: Aplicar as duas migrations no remoto + regenerar types

**Files:**
- Modify: `src/types/database.generated.ts` (gerado, não editar manualmente)

**Interfaces:**
- Consumes: Tasks 1 e 2 (arquivos de migration no working tree).
- Produces: `Database['public']['Tables']['remuneracao_regras']['Row']` com os campos novos e `Database['public']['Tables']['vendedor_nivel_carreira']['Row']` — usados pelas Tasks 4–8.

- [ ] **Step 1: Aplicar cirurgicamente (mesmo método já validado neste projeto)**

```bash
cd "/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA"
mkdir -p /tmp/mx_migrations_holdout
for f in 20260521120000_drop_migration_backups_pii 20260521130000_db016_revoke_lancamentos_diarios 20260521131000_db016_revoke_rollback; do
  mv "supabase/migrations/${f}.sql" /tmp/mx_migrations_holdout/ 2>/dev/null || true
done
trap 'for f in /tmp/mx_migrations_holdout/*.sql; do mv "$f" supabase/migrations/ 2>/dev/null || true; done' EXIT

echo y | supabase db push --linked

# trap restaura as 3 migrations holdout automaticamente ao sair do shell
```

Expected: output lista as duas migrations novas (`20260707140000_...`, `20260707141000_...`) como aplicadas, sem erro. Se pedir senha do DB (keychain dessincronizada), rodar `supabase login` e depois `supabase link --project-ref fbhcmzzgwjdgkctlfvbo` antes de repetir.

- [ ] **Step 2: Conferir que as 3 migrations holdout voltaram pro lugar**

Run: `ls supabase/migrations/ | grep -c "20260521"`
Expected: `3`

- [ ] **Step 3: Regenerar types e rodar typecheck**

```bash
npm run gen:db-types
npm run typecheck
```

Expected: `gen:db-types` sobrescreve `src/types/database.generated.ts` sem erro; `typecheck` passa limpo (nenhum código ainda usa os campos novos, então não deve quebrar nada existente).

- [ ] **Step 4: Commit dos types regenerados**

```bash
git add src/types/database.generated.ts
git commit -m "chore: regenera database.generated.ts (faixas de remuneracao + nivel_carreira)"
```

---

### Task 4: Motor de cálculo — `bonus_meta` e `comissao_equipe` por unidade absoluta

**Files:**
- Modify: `src/features/remuneracao/lib/comparativo.ts`
- Test: `src/features/remuneracao/lib/comparativo.test.ts`

**Interfaces:**
- Consumes: `RemuneracaoRegra` agora com `unidade_meta_min: number | null`, `cumulativo: boolean`, `valor_por_unidade: boolean`, `requer_bonus_individual: boolean`, `nivel_carreira: string | null` (de `database.generated.ts`, Task 3).
- Produces: `calcularRemuneracaoEstimada` aceita `carrosVendidosLoja?: number` e `nivelCarreira?: 'junior' | 'pleno' | 'lider'` em `RemuneracaoEstimadaInput`; resultado ganha `bonusCarreira: number` (também somado dentro de `bonus`); `regraBonusAplicada` e `comissaoEquipe` passam a suportar limiares em unidades, cumulativos e travados por bônus individual, mantendo 100% do comportamento antigo (percentual, não-cumulativo) quando os campos novos estão null/false.

- [ ] **Step 1: Escrever os testes que faltam (falhando)**

Adicionar ao final de `describe('calcularRemuneracaoEstimada', ...)` em `comparativo.test.ts`, antes do fechamento do `describe`:

```ts
  test('bonus_meta por unidade: aplica quando vendas >= unidade_meta_min, ignora meta em R$', () => {
    const resultado = calcularRemuneracaoEstimada({
      plano: plano('Vendedor', 1500, 0, 0),
      regras: [regra('bonus_meta', { id: 'bonus-8-carros', valor: 1000, unidade_meta_min: 8 } as Partial<RemuneracaoRegra>)],
      vendasConsideradas: 8,
      meta: 0,
    })

    expect(resultado.bonus).toBe(1000)
    expect(resultado.regraBonusAplicada?.id).toBe('bonus-8-carros')
  })

  test('bonus_meta por unidade: não aplica com um carro a menos', () => {
    const resultado = calcularRemuneracaoEstimada({
      plano: plano('Vendedor', 1500, 0, 0),
      regras: [regra('bonus_meta', { id: 'bonus-8-carros', valor: 1000, unidade_meta_min: 8 } as Partial<RemuneracaoRegra>)],
      vendasConsideradas: 7,
      meta: 0,
    })

    expect(resultado.bonus).toBe(0)
    expect(resultado.regraBonusAplicada).toBeNull()
  })

  test('comissao_equipe cumulativa por unidade: soma faixas atingidas, respeita valor_por_unidade e trava individual', () => {
    const regrasEquipe = [
      regra('comissao_equipe' as unknown as RemuneracaoRegra['tipo'], {
        id: 'faixa-35', valor: 100, unidade_meta_min: 35, cumulativo: true, valor_por_unidade: true, requer_bonus_individual: true,
      } as Partial<RemuneracaoRegra>),
      regra('comissao_equipe' as unknown as RemuneracaoRegra['tipo'], {
        id: 'faixa-40', valor: 1000, unidade_meta_min: 40, cumulativo: true, requer_bonus_individual: true,
      } as Partial<RemuneracaoRegra>),
      regra('comissao_equipe' as unknown as RemuneracaoRegra['tipo'], {
        id: 'faixa-45', valor: 1000, unidade_meta_min: 45, cumulativo: true, requer_bonus_individual: true,
      } as Partial<RemuneracaoRegra>),
      regra('comissao_equipe' as unknown as RemuneracaoRegra['tipo'], {
        id: 'faixa-50', valor: 1000, unidade_meta_min: 50, cumulativo: true, requer_bonus_individual: true,
      } as Partial<RemuneracaoRegra>),
      regra('bonus_meta', { id: 'bonus-8-carros', valor: 1000, unidade_meta_min: 8 } as Partial<RemuneracaoRegra>),
      regra('comissao_por_venda', { id: 'comissao-500', valor: 500 }),
    ]

    const resultadoCompleto = calcularRemuneracaoEstimada({
      plano: plano('Vendedor', 1500, 0, 0),
      regras: regrasEquipe,
      vendasConsideradas: 8,
      meta: 0,
      vinculoTipo: 'loja',
      carrosVendidosLoja: 50,
    })

    // 1500 fixo + 4000 comissao (8x500) + 1000 bonus individual + 800 (8x100 faixa 35) + 1000 (faixa 40) + 1000 (faixa 45) + 1000 (faixa 50) = 10300
    expect(resultadoCompleto.total).toBe(10300)
    expect(resultadoCompleto.comissaoEquipe).toBe(3800)

    const resultadoSemMinimoIndividual = calcularRemuneracaoEstimada({
      plano: plano('Vendedor', 1500, 0, 0),
      regras: regrasEquipe,
      vendasConsideradas: 5, // abaixo do minimo individual de 8
      meta: 0,
      vinculoTipo: 'loja',
      carrosVendidosLoja: 50,
    })

    // loja bateu tudo, mas vendedor nao bateu o proprio minimo -> nenhum bonus coletivo
    expect(resultadoSemMinimoIndividual.comissaoEquipe).toBe(0)
    expect(resultadoSemMinimoIndividual.bonus).toBe(0)
    expect(resultadoSemMinimoIndividual.total).toBe(1500 + 5 * 500)

    const resultadoLojaAbaixoDe40 = calcularRemuneracaoEstimada({
      plano: plano('Vendedor', 1500, 0, 0),
      regras: regrasEquipe,
      vendasConsideradas: 8,
      meta: 0,
      vinculoTipo: 'loja',
      carrosVendidosLoja: 37,
    })

    // so a faixa 35 foi atingida (37 >= 35, mas < 40)
    expect(resultadoLojaAbaixoDe40.comissaoEquipe).toBe(800)
  })

  test('comissao_equipe legado (percentual, nao-cumulativo) continua igual quando campos novos nao sao usados', () => {
    const regraEquipe = regra('comissao_equipe' as unknown as RemuneracaoRegra['tipo'], { id: 'equipe-100', valor: 700, percentual_meta_min: 100 })

    const resultado = calcularRemuneracaoEstimada({
      plano: plano('Vendedor', 2000, 0, 0),
      regras: [regraEquipe],
      vendasConsideradas: 4,
      meta: 10,
      vinculoTipo: 'loja',
      atingimentoLojaPercentual: 110,
    })

    expect(resultado.comissaoEquipe).toBe(700)
  })

  test('bonus de carreira soma dentro de bonus e aparece em bonusCarreira', () => {
    const resultado = calcularRemuneracaoEstimada({
      plano: plano('Vendedor', 1500, 0, 0),
      regras: [
        regra('bonus_carreira' as unknown as RemuneracaoRegra['tipo'], { id: 'carreira-pleno', valor: 800, nivel_carreira: 'pleno' } as Partial<RemuneracaoRegra>),
        regra('bonus_carreira' as unknown as RemuneracaoRegra['tipo'], { id: 'carreira-lider', valor: 800, nivel_carreira: 'lider' } as Partial<RemuneracaoRegra>),
      ],
      vendasConsideradas: 0,
      meta: 0,
      nivelCarreira: 'lider',
    })

    expect(resultado.bonusCarreira).toBe(800)
    expect(resultado.bonus).toBe(800)
    expect(resultado.total).toBe(2300)
  })
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `bun test src/features/remuneracao/lib/comparativo.test.ts`
Expected: FAIL nos 5 testes novos (campos `unidade_meta_min`/`cumulativo`/`valor_por_unidade`/`requer_bonus_individual`/`nivel_carreira`/`carrosVendidosLoja`/`nivelCarreira`/`bonusCarreira` ainda não existem no tipo/implementação — erro de tipo ou `undefined`).

- [ ] **Step 3: Reescrever `calcularRemuneracaoEstimada` e helpers**

Substituir o conteúdo de `src/features/remuneracao/lib/comparativo.ts` a partir da interface `RemuneracaoEstimadaInput` até o fim do arquivo (mantendo tudo antes, incluindo `totalPlano`/`montarComparativo`):

```ts
export interface RemuneracaoEstimadaInput {
  plano: RemuneracaoPlano | null
  regras: RemuneracaoRegra[]
  vendasConsideradas: number
  meta: number
  vendasDetalhadas?: RemuneracaoVenda[]
  faturamentoConsiderado?: number
  vinculoTipo?: RemuneracaoVinculoTipo
  atingimentoLojaPercentual?: number
  carrosVendidosLoja?: number
  nivelCarreira?: 'junior' | 'pleno' | 'lider'
}

export interface RemuneracaoVenda {
  valor: number
  tipo_veiculo?: RemuneracaoTipoVeiculo | string | null
}

export interface RemuneracaoBonusPatamarDetalhe {
  regra: RemuneracaoRegra
  percentualMetaMin: number
  valor: number
  atingido: boolean
  aplicado: boolean
}

export interface RemuneracaoFormulaItem {
  chave: 'salario_fixo' | 'salario_variavel' | 'beneficios' | 'comissao' | 'bonus' | 'bonus_carreira'
  label: string
  descricao: string
  valor: number
}

export interface RemuneracaoEstimadaResultado {
  disponivel: boolean
  cargo: string | null
  salarioFixo: number
  salarioVariavel: number
  beneficios: number
  base: number
  comissaoPorVenda: number
  comissaoFixa: number
  comissaoPercentual: number
  comissaoCategoria: number
  comissaoEquipe: number
  comissao: number
  bonus: number
  bonusCarreira: number
  total: number
  vendasConsideradas: number
  faturamentoConsiderado: number
  meta: number
  atingimentoPercentual: number
  regraComissaoAplicada: RemuneracaoRegra | null
  regrasComissaoAplicadas: RemuneracaoRegra[]
  regraBonusAplicada: RemuneracaoRegra | null
  bonusPatamares: RemuneracaoBonusPatamarDetalhe[]
  regrasAplicadas: RemuneracaoRegra[]
  regrasNaoAtingidas: RemuneracaoRegra[]
  formulaItens: RemuneracaoFormulaItem[]
}

export interface RemuneracaoResumoVendedorInput {
  plano: RemuneracaoPlano | null
  regras: RemuneracaoRegra[]
  vendasRealizadas: number
  vendasProjetadas: number
  meta: number
  vendasDetalhadasRealizadas?: RemuneracaoVenda[]
  faturamentoProjetado?: number
  vinculoTipo?: RemuneracaoVinculoTipo
  atingimentoLojaPercentual?: number
  carrosVendidosLoja?: number
  nivelCarreira?: 'junior' | 'pleno' | 'lider'
}

export interface RemuneracaoResumoVendedor {
  realizado: RemuneracaoEstimadaResultado
  projetado: RemuneracaoEstimadaResultado
}

/** Total mensal de um plano (fixo + variável + benefícios). */
export function totalPlano(p: Pick<RemuneracaoPlano, 'salario_fixo' | 'salario_variavel' | 'beneficios'>): number {
  return Number(p.salario_fixo || 0) + Number(p.salario_variavel || 0) + Number(p.beneficios || 0)
}

/** Classifica cada plano contra a faixa de mercado do seu cargo. */
export function montarComparativo(
  planos: RemuneracaoPlano[],
  benchmark: RemuneracaoBenchmark[],
): ComparativoLinha[] {
  const porCargo = new Map<string, RemuneracaoBenchmark>()
  for (const b of benchmark) porCargo.set(b.cargo, b)

  return planos.map((p) => {
    const total = totalPlano(p)
    const b = porCargo.get(p.cargo)
    if (!b) return { cargo: p.cargo, total, classificacao: 'sem_referencia' as const }
    const min = Number(b.faixa_min), max = Number(b.faixa_max), mediana = Number(b.faixa_mediana)
    const classificacao: Classificacao = total < min ? 'abaixo' : total > max ? 'acima' : 'dentro'
    return {
      cargo: p.cargo,
      total,
      classificacao,
      faixa: { min, mediana, max, fonte: b.fonte, data: b.data_referencia },
    }
  })
}

export function calcularRemuneracaoEstimada({
  plano,
  regras,
  vendasConsideradas,
  meta,
  vendasDetalhadas = [],
  faturamentoConsiderado,
  vinculoTipo = 'loja',
  atingimentoLojaPercentual,
  carrosVendidosLoja,
  nivelCarreira,
}: RemuneracaoEstimadaInput): RemuneracaoEstimadaResultado {
  const vendas = Math.max(Number(vendasConsideradas || 0), 0)
  const metaMensal = Math.max(Number(meta || 0), 0)
  const atingimentoPercentual = metaMensal > 0 ? Math.round((vendas / metaMensal) * 100) : 0
  const vendasValidas = vendasDetalhadas.filter(venda => Number.isFinite(Number(venda.valor)))
  const faturamento = Math.max(
    Number(faturamentoConsiderado ?? vendasValidas.reduce((acc, venda) => acc + Number(venda.valor || 0), 0)),
    0,
  )

  if (!plano) {
    return {
      disponivel: false,
      cargo: null,
      salarioFixo: 0,
      salarioVariavel: 0,
      beneficios: 0,
      base: 0,
      comissaoPorVenda: 0,
      comissaoFixa: 0,
      comissaoPercentual: 0,
      comissaoCategoria: 0,
      comissaoEquipe: 0,
      comissao: 0,
      bonus: 0,
      bonusCarreira: 0,
      total: 0,
      vendasConsideradas: vendas,
      faturamentoConsiderado: faturamento,
      meta: metaMensal,
      atingimentoPercentual,
      regraComissaoAplicada: null,
      regrasComissaoAplicadas: [],
      regraBonusAplicada: null,
      bonusPatamares: [],
      regrasAplicadas: [],
      regrasNaoAtingidas: [],
      formulaItens: [],
    }
  }

  const regrasAtivas = regras.filter((regra) => regra.ativo !== false)
  const salarioFixo = Number(plano.salario_fixo || 0)
  const salarioVariavel = Number(plano.salario_variavel || 0)
  const beneficios = Number(plano.beneficios || 0)
  const base = salarioFixo + salarioVariavel + beneficios

  const regraComissaoAplicada = selecionarRegraMaisRecente(
    regrasAtivas.filter((regra) => regra.tipo === 'comissao_por_venda'),
  )
  const comissaoPorVenda = Number(regraComissaoAplicada?.valor || 0)
  const comissaoFixa = vendas * comissaoPorVenda

  const regraPercentualAplicada = selecionarRegraMaisRecente(
    regrasAtivas.filter((regra) => regra.tipo === 'percentual_faturamento'),
  )
  const comissaoPercentual = faturamento * (Number(regraPercentualAplicada?.valor || 0) / 100)

  const regrasCategoria = selecionarRegraMaisRecentePorTipoVeiculo(
    regrasAtivas.filter((regra) => regra.tipo === 'comissao_categoria'),
  )
  const comissaoCategoria = vendasValidas.reduce((acc, venda) => {
    const regraCategoria = venda.tipo_veiculo ? regrasCategoria.get(venda.tipo_veiculo) : null
    return acc + Number(regraCategoria?.valor || 0)
  }, 0)

  // Bônus individual (bonus_meta) calculado ANTES de comissao_equipe porque
  // requer_bonus_individual precisa saber se o vendedor já bateu o próprio mínimo.
  const bonusPorPatamar = selecionarBonusMaisRecentePorPatamar(
    regrasAtivas.filter((regra) => regra.tipo === 'bonus_meta'),
  )
  const regraBonusAplicada = [...bonusPorPatamar]
    .filter((regra) => atingiuPatamarIndividual(regra, { vendas, metaValida: metaMensal > 0, atingimentoPercentual }))
    .sort((a, b) => patamarChave(b) - patamarChave(a))[0] || null
  const valorBonusIndividual = Number(regraBonusAplicada?.valor || 0)
  const bonusPatamares = bonusPorPatamar.map((regra) => {
    const atingido = atingiuPatamarIndividual(regra, { vendas, metaValida: metaMensal > 0, atingimentoPercentual })
    return {
      regra,
      percentualMetaMin: percentualMinimo(regra),
      valor: Number(regra.valor || 0),
      atingido,
      aplicado: regra.id === regraBonusAplicada?.id,
    }
  })

  const regrasEquipePorPatamar = selecionarBonusMaisRecentePorPatamar(
    regrasAtivas.filter((regra) => regra.tipo === 'comissao_equipe'),
  )
  const individualAtingiu = regraBonusAplicada !== null
  const regrasEquipeElegiveis = vinculoTipo === 'loja'
    ? regrasEquipePorPatamar.filter((regra) => atingiuPatamarEquipe(regra, {
        carrosVendidosLoja, atingimentoLojaPercentual, individualAtingiu,
      }))
    : []
  const regrasEquipeCumulativas = regrasEquipeElegiveis.filter((regra) => regra.cumulativo)
  const regrasEquipeNaoCumulativas = regrasEquipeElegiveis.filter((regra) => !regra.cumulativo)
  const melhorNaoCumulativa = [...regrasEquipeNaoCumulativas].sort((a, b) => patamarChave(b) - patamarChave(a))[0] || null
  const regrasEquipeAplicadas = melhorNaoCumulativa
    ? [...regrasEquipeCumulativas, melhorNaoCumulativa]
    : regrasEquipeCumulativas
  const comissaoEquipe = regrasEquipeAplicadas.reduce(
    (acc, regra) => acc + (regra.valor_por_unidade ? Number(regra.valor || 0) * vendas : Number(regra.valor || 0)),
    0,
  )

  const comissao = comissaoFixa + comissaoPercentual + comissaoCategoria + comissaoEquipe
  const regrasComissaoAplicadas = [
    regraComissaoAplicada,
    regraPercentualAplicada,
    ...Array.from(new Set(vendasValidas.map(venda => venda.tipo_veiculo).filter(Boolean)))
      .map(tipoVeiculo => regrasCategoria.get(String(tipoVeiculo)))
      .filter((regra): regra is RemuneracaoRegra => Boolean(regra)),
    ...regrasEquipeAplicadas,
  ].filter((regra): regra is RemuneracaoRegra => Boolean(regra))

  const regrasCarreira = selecionarRegraMaisRecentePorNivelCarreira(
    regrasAtivas.filter((regra) => regra.tipo === 'bonus_carreira'),
  )
  const regraCarreiraAplicada = nivelCarreira ? regrasCarreira.get(nivelCarreira) || null : null
  const bonusCarreira = Number(regraCarreiraAplicada?.valor || 0)

  const bonus = valorBonusIndividual + bonusCarreira
  const total = base + comissao + bonus
  const regrasAplicadas = [...regrasComissaoAplicadas, regraBonusAplicada, regraCarreiraAplicada].filter(
    (regra): regra is RemuneracaoRegra => Boolean(regra),
  )
  const regrasNaoAtingidas = bonusPatamares.filter((patamar) => !patamar.atingido).map((patamar) => patamar.regra)
  const formulaItens: RemuneracaoFormulaItem[] = [
    {
      chave: 'salario_fixo',
      label: 'Salário fixo',
      descricao: 'Valor fixo mensal cadastrado no plano.',
      valor: salarioFixo,
    },
    {
      chave: 'salario_variavel',
      label: 'Variável do plano',
      descricao: 'Valor variável mensal cadastrado no plano.',
      valor: salarioVariavel,
    },
    {
      chave: 'beneficios',
      label: 'Benefícios',
      descricao: 'Benefícios mensais cadastrados no plano.',
      valor: beneficios,
    },
    {
      chave: 'comissao',
      label: 'Comissão por vendas',
      descricao: regrasComissaoAplicadas.length > 0
        ? `Comissão calculada com ${vendas} venda(s) e ${formatCurrency(faturamento)} de faturamento.`
        : 'Nenhuma regra ativa de comissão.',
      valor: comissao,
    },
    {
      chave: 'bonus',
      label: 'Bônus de meta',
      descricao: regraBonusAplicada
        ? (regraBonusAplicada.unidade_meta_min != null
            ? `Mínimo individual atingido: ${regraBonusAplicada.unidade_meta_min} carro(s).`
            : `Maior patamar atingido: ${percentualMinimo(regraBonusAplicada)}% da meta.`)
        : 'Nenhum patamar de bônus foi atingido.',
      valor: valorBonusIndividual,
    },
    {
      chave: 'bonus_carreira',
      label: 'Bônus de carreira',
      descricao: regraCarreiraAplicada
        ? `Nível de carreira: ${nivelCarreira}.`
        : 'Nenhum nível de carreira atribuído.',
      valor: bonusCarreira,
    },
  ]

  return {
    disponivel: true,
    cargo: plano.cargo,
    salarioFixo,
    salarioVariavel,
    beneficios,
    base,
    comissaoPorVenda,
    comissaoFixa,
    comissaoPercentual,
    comissaoCategoria,
    comissaoEquipe,
    comissao,
    bonus,
    bonusCarreira,
    total,
    vendasConsideradas: vendas,
    faturamentoConsiderado: faturamento,
    meta: metaMensal,
    atingimentoPercentual,
    regraComissaoAplicada: regrasComissaoAplicadas[0] || null,
    regrasComissaoAplicadas,
    regraBonusAplicada,
    bonusPatamares,
    regrasAplicadas,
    regrasNaoAtingidas,
    formulaItens,
  }
}

export function calcularResumoRemuneracaoVendedor({
  plano,
  regras,
  vendasRealizadas,
  vendasProjetadas,
  meta,
  vendasDetalhadasRealizadas = [],
  faturamentoProjetado,
  vinculoTipo,
  atingimentoLojaPercentual,
  carrosVendidosLoja,
  nivelCarreira,
}: RemuneracaoResumoVendedorInput): RemuneracaoResumoVendedor {
  const realizadas = Math.max(Number(vendasRealizadas || 0), 0)
  const projetadas = Math.max(Number(vendasProjetadas || 0), realizadas)
  const faturamentoRealizado = vendasDetalhadasRealizadas.reduce((acc, venda) => acc + Number(venda.valor || 0), 0)
  const ticketMedio = realizadas > 0 ? faturamentoRealizado / realizadas : 0

  return {
    realizado: calcularRemuneracaoEstimada({
      plano,
      regras,
      vendasConsideradas: realizadas,
      meta,
      vendasDetalhadas: vendasDetalhadasRealizadas,
      vinculoTipo,
      atingimentoLojaPercentual,
      carrosVendidosLoja,
      nivelCarreira,
    }),
    projetado: calcularRemuneracaoEstimada({
      plano,
      regras,
      vendasConsideradas: projetadas,
      meta,
      vendasDetalhadas: vendasDetalhadasRealizadas,
      faturamentoConsiderado: faturamentoProjetado ?? ticketMedio * projetadas,
      vinculoTipo,
      atingimentoLojaPercentual,
      carrosVendidosLoja,
      nivelCarreira,
    }),
  }
}

function selecionarRegraMaisRecente(regras: RemuneracaoRegra[]): RemuneracaoRegra | null {
  return [...regras].sort(compararRegraMaisRecente)[0] || null
}

/** Chave de patamar: usa unidade_meta_min quando preenchido, senão percentual_meta_min. */
function patamarChave(regra: RemuneracaoRegra): number {
  return regra.unidade_meta_min != null ? Number(regra.unidade_meta_min) : percentualMinimo(regra)
}

function selecionarBonusMaisRecentePorPatamar(regras: RemuneracaoRegra[]): RemuneracaoRegra[] {
  const porPatamar = new Map<number, RemuneracaoRegra>()
  for (const regra of [...regras].sort(compararRegraMaisRecente)) {
    const patamar = patamarChave(regra)
    if (!porPatamar.has(patamar)) porPatamar.set(patamar, regra)
  }
  return [...porPatamar.values()].sort((a, b) => patamarChave(a) - patamarChave(b))
}

function selecionarRegraMaisRecentePorTipoVeiculo(regras: RemuneracaoRegra[]): Map<string, RemuneracaoRegra> {
  const porTipo = new Map<string, RemuneracaoRegra>()
  for (const regra of [...regras].sort(compararRegraMaisRecente)) {
    const tipoVeiculo = regra.tipo_veiculo
    if (tipoVeiculo && !porTipo.has(tipoVeiculo)) porTipo.set(tipoVeiculo, regra)
  }
  return porTipo
}

function selecionarRegraMaisRecentePorNivelCarreira(regras: RemuneracaoRegra[]): Map<string, RemuneracaoRegra> {
  const porNivel = new Map<string, RemuneracaoRegra>()
  for (const regra of [...regras].sort(compararRegraMaisRecente)) {
    const nivel = regra.nivel_carreira
    if (nivel && !porNivel.has(nivel)) porNivel.set(nivel, regra)
  }
  return porNivel
}

function compararRegraMaisRecente(a: RemuneracaoRegra, b: RemuneracaoRegra): number {
  return (
    b.vigencia_inicio.localeCompare(a.vigencia_inicio) ||
    b.updated_at.localeCompare(a.updated_at) ||
    b.id.localeCompare(a.id)
  )
}

function percentualMinimo(regra: RemuneracaoRegra): number {
  return Math.max(Number(regra.percentual_meta_min || 0), 0)
}

/** bonus_meta: unidade_meta_min compara contra vendas do próprio vendedor; senão, percentual contra a meta em R$. */
function atingiuPatamarIndividual(
  regra: RemuneracaoRegra,
  { vendas, metaValida, atingimentoPercentual }: { vendas: number; metaValida: boolean; atingimentoPercentual: number },
): boolean {
  if (regra.unidade_meta_min != null) return vendas >= Number(regra.unidade_meta_min)
  return metaValida && atingimentoPercentual >= percentualMinimo(regra)
}

/** comissao_equipe: unidade_meta_min compara contra carros da loja; senão, percentual contra atingimento da loja. Trava por requer_bonus_individual. */
function atingiuPatamarEquipe(
  regra: RemuneracaoRegra,
  { carrosVendidosLoja, atingimentoLojaPercentual, individualAtingiu }: {
    carrosVendidosLoja?: number
    atingimentoLojaPercentual?: number
    individualAtingiu: boolean
  },
): boolean {
  if (regra.requer_bonus_individual && !individualAtingiu) return false
  if (regra.unidade_meta_min != null) {
    return carrosVendidosLoja != null && Number(carrosVendidosLoja) >= Number(regra.unidade_meta_min)
  }
  return atingimentoLojaPercentual != null && Number(atingimentoLojaPercentual) >= percentualMinimo(regra)
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam (arquivo inteiro, não só os novos)**

Run: `bun test src/features/remuneracao/lib/comparativo.test.ts`
Expected: PASS em todos os testes (os antigos continuam passando — comportamento legado preservado; os 5 novos passam).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/features/remuneracao/lib/comparativo.ts src/features/remuneracao/lib/comparativo.test.ts
git commit -m "feat: motor de remuneracao suporta faixas absolutas cumulativas e bonus de carreira"
```

---

### Task 5: Hooks — expor os campos novos e nível de carreira

**Files:**
- Modify: `src/features/remuneracao/hooks/useRemuneracao.ts`

**Interfaces:**
- Consumes: `calcularResumoRemuneracaoVendedor` (Task 4, já aceita `carrosVendidosLoja`/`nivelCarreira`).
- Produces: `useRemuneracaoEstimadaVendedor` aceita `carrosVendidosLoja?: number` e `nivelCarreira?: 'junior' | 'pleno' | 'lider'` nos params; novos hooks `useVendedoresNivelCarreira(lojaId)` (dono/gerente, lista+RW) e `useMeuNivelCarreira(sellerUserId)` (vendedor, leitura da própria linha) — usados pelas Tasks 6 e 8.

- [ ] **Step 1: Adicionar os params novos em `useRemuneracaoEstimadaVendedor`**

Em `src/features/remuneracao/hooks/useRemuneracao.ts`, dentro da assinatura de `useRemuneracaoEstimadaVendedor` (linha ~117), adicionar ao tipo do parâmetro:

```ts
export function useRemuneracaoEstimadaVendedor(params: {
  lojaId: string | null
  planoId?: string | null
  cargo?: string
  vendasRealizadas: number
  vendasProjetadas: number
  meta: number
  vendasDetalhadasRealizadas?: RemuneracaoVenda[]
  faturamentoProjetado?: number
  vinculoTipo?: RemuneracaoVinculoTipo
  atingimentoLojaPercentual?: number
  carrosVendidosLoja?: number
  nivelCarreira?: 'junior' | 'pleno' | 'lider'
}) {
```

E no `useMemo` que monta `resumo` (linha ~188), adicionar as duas chaves no objeto passado e no array de dependências:

```ts
  const resumo = useMemo(() => calcularResumoRemuneracaoVendedor({
    plano,
    regras,
    vendasRealizadas: params.vendasRealizadas,
    vendasProjetadas: params.vendasProjetadas,
    meta: params.meta,
    vendasDetalhadasRealizadas: params.vendasDetalhadasRealizadas,
    faturamentoProjetado: params.faturamentoProjetado,
    vinculoTipo: params.vinculoTipo,
    atingimentoLojaPercentual: params.atingimentoLojaPercentual,
    carrosVendidosLoja: params.carrosVendidosLoja,
    nivelCarreira: params.nivelCarreira,
  }), [
    plano,
    regras,
    params.vendasRealizadas,
    params.vendasProjetadas,
    params.meta,
    params.vendasDetalhadasRealizadas,
    params.faturamentoProjetado,
    params.vinculoTipo,
    params.atingimentoLojaPercentual,
    params.carrosVendidosLoja,
    params.nivelCarreira,
  ])
```

- [ ] **Step 2: Adicionar os dois hooks novos ao final do arquivo (antes de `useBenchmark`)**

```ts
export type NivelCarreira = 'junior' | 'pleno' | 'lider'

/** Nível de carreira de todos os vendedores de uma loja + mutation (dono/gerente). */
export function useVendedoresNivelCarreira(lojaId: string | null) {
  const [niveis, setNiveis] = useState<Record<string, NivelCarreira>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!lojaId) { setNiveis({}); return }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('vendedor_nivel_carreira')
      .select('seller_user_id, nivel_carreira')
      .eq('loja_id', lojaId)
    if (error) setError(error.message)
    else {
      const map: Record<string, NivelCarreira> = {}
      for (const row of data ?? []) map[row.seller_user_id] = row.nivel_carreira as NivelCarreira
      setNiveis(map)
    }
    setLoading(false)
  }, [lojaId])

  useEffect(() => { void reload() }, [reload])

  const salvarNivel = useCallback(async (sellerUserId: string, nivel: NivelCarreira) => {
    if (!lojaId) return { error: 'Loja não selecionada.' }
    const { error } = await supabase
      .from('vendedor_nivel_carreira')
      .upsert({ seller_user_id: sellerUserId, loja_id: lojaId, nivel_carreira: nivel }, { onConflict: 'seller_user_id' })
    if (error) return { error: error.message }
    await reload()
    return { error: null }
  }, [lojaId, reload])

  return { niveis, loading, error, salvarNivel }
}

/** Nível de carreira do próprio vendedor (leitura). */
export function useMeuNivelCarreira(sellerUserId: string | null) {
  const [nivel, setNivel] = useState<NivelCarreira>('junior')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!sellerUserId) { setNivel('junior'); return }
      setLoading(true)
      const { data } = await supabase
        .from('vendedor_nivel_carreira')
        .select('nivel_carreira')
        .eq('seller_user_id', sellerUserId)
        .maybeSingle()
      if (!alive) return
      setNivel((data?.nivel_carreira as NivelCarreira) || 'junior')
      setLoading(false)
    })()
    return () => { alive = false }
  }, [sellerUserId])

  return { nivel, loading }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/features/remuneracao/hooks/useRemuneracao.ts
git commit -m "feat: hooks de nivel de carreira e novos params no calculo de remuneracao"
```

---

### Task 6: Wiring — `useVendedorHomePage.ts` passa carros da loja e nível de carreira

**Files:**
- Modify: `src/features/vendedor-home/hooks/useVendedorHomePage.ts`

**Interfaces:**
- Consumes: `useStoreMetaRules(storeId)` de `@/hooks/useGoals` (já existe, não usado hoje neste arquivo), `useStoreSales({ checkins, ranking, rules })` de `@/hooks/useStoreSales` (já existe, retorna `{ storeTotalVendas, ... }` direto, não `{ stats }`), `useMeuNivelCarreira` (Task 5).
- Produces: `useRemuneracaoEstimadaVendedor` passa a receber `carrosVendidosLoja` (total real de carros vendidos pela loja no mês) e `nivelCarreira` (do vendedor logado).

- [ ] **Step 1: Adicionar os imports novos**

No topo de `src/features/vendedor-home/hooks/useVendedorHomePage.ts`, junto dos imports existentes:

```ts
import { useGoals, useStoreMetaRules } from '@/hooks/useGoals'
import { useStoreSales } from '@/hooks/useStoreSales'
```

(A linha `import { useGoals } from '@/hooks/useGoals'` já existe — só adicionar `useStoreMetaRules` ao mesmo import.)

E no bloco de imports de `@/features/remuneracao/hooks/useRemuneracao`:

```ts
import {
  useRemuneracaoEstimadaVendedor,
  useMeuNivelCarreira,
  type RemuneracaoVenda,
} from '@/features/remuneracao/hooks/useRemuneracao'
```

- [ ] **Step 2: Buscar `metaRules` e `storeSales`, logo após o bloco de `useGoals()` (linha ~40)**

```ts
  const { metaRules } = useStoreMetaRules(storeId || undefined)
  const storeSales = useStoreSales({ checkins, ranking, rules: metaRules })
  const { nivel: nivelCarreira } = useMeuNivelCarreira(profile?.id || null)
```

- [ ] **Step 3: Passar os dois valores novos pro hook de remuneração (dentro da chamada `useRemuneracaoEstimadaVendedor`, linha ~86)**

```ts
  } = useRemuneracaoEstimadaVendedor({
    lojaId: storeId,
    planoId: vendedorPerfil.remuneracao_plano_id,
    cargo: vendedorPerfil.cargo_atual || 'Vendedor',
    vendasRealizadas: metrics?.vendasMes || 0,
    vendasProjetadas: Math.max(metrics?.projecao || 0, metrics?.vendasMes || 0),
    meta: metrics?.meta || 0,
    vendasDetalhadasRealizadas: vendasDetalhadasRemuneracao,
    vinculoTipo,
    atingimentoLojaPercentual: metrics?.atingimento || 0,
    carrosVendidosLoja: storeSales.storeTotalVendas,
    nivelCarreira,
  })
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/features/vendedor-home/hooks/useVendedorHomePage.ts
git commit -m "feat: home do vendedor passa carros da loja e nivel de carreira pro motor de remuneracao"
```

---

### Task 7: UI dono/gerente — campos novos em `CadastroRegras.tsx`

**Files:**
- Modify: `src/features/remuneracao/components/CadastroRegras.tsx`

**Interfaces:**
- Consumes: `useRegrasRemuneracao` (já existe, sem mudança de assinatura), `RemuneracaoRegraInsert` (tipo gerado, agora com os campos novos opcionais).
- Produces: formulário grava `unidade_meta_min`, `cumulativo`, `valor_por_unidade`, `requer_bonus_individual` (quando tipo = comissão de equipe ou bônus por meta) e `nivel_carreira` (quando tipo = bônus de carreira).

- [ ] **Step 1: Substituir o conteúdo de `CadastroRegras.tsx` inteiro**

```tsx
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import {
  useRegrasRemuneracao,
  type RemuneracaoRegra,
  type RemuneracaoRegraTipo,
  type RemuneracaoTipoVeiculo,
} from '../hooks/useRemuneracao'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

type NivelCarreiraForm = '' | 'junior' | 'pleno' | 'lider'

type FormState = {
  cargo: string
  tipo: RemuneracaoRegraTipo
  valor: string
  percentual_meta_min: string
  unidade_meta_min: string
  cumulativo: boolean
  valor_por_unidade: boolean
  requer_bonus_individual: boolean
  tipo_veiculo: '' | RemuneracaoTipoVeiculo
  nivel_carreira: NivelCarreiraForm
}

const EMPTY: FormState = {
  cargo: 'Vendedor',
  tipo: 'comissao_por_venda',
  valor: '',
  percentual_meta_min: '',
  unidade_meta_min: '',
  cumulativo: false,
  valor_por_unidade: false,
  requer_bonus_individual: false,
  tipo_veiculo: '',
  nivel_carreira: '',
}

const TIPO_LABEL: Record<RemuneracaoRegraTipo, string> = {
  comissao_por_venda: 'Comissão por venda',
  bonus_meta: 'Bônus por meta',
  percentual_faturamento: 'Percentual sobre faturamento',
  comissao_categoria: 'Comissão por categoria',
  comissao_equipe: 'Comissão de equipe',
  bonus_carreira: 'Bônus de carreira',
}

const TIPO_VEICULO_LABEL: Record<RemuneracaoTipoVeiculo, string> = {
  carro: 'Carro',
  moto: 'Moto',
  caminhao: 'Caminhão',
}

const NIVEL_CARREIRA_LABEL: Record<'junior' | 'pleno' | 'lider', string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  lider: 'Líder',
}

export function CadastroRegras({ lojaId }: { lojaId: string }) {
  const { regras, loading, error, salvarRegra, removerRegra } = useRegrasRemuneracao(lojaId)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const num = (v: string) => Number(String(v).replace(',', '.')) || 0
  const regraUsaMetaPercentual = form.tipo === 'bonus_meta' || form.tipo === 'comissao_equipe'
  const regraUsaUnidade = form.tipo === 'bonus_meta' || form.tipo === 'comissao_equipe'
  const regraUsaConfigEquipe = form.tipo === 'comissao_equipe'
  const regraUsaCategoria = form.tipo === 'comissao_categoria'
  const regraUsaCarreira = form.tipo === 'bonus_carreira'
  const valorLabel = {
    comissao_por_venda: 'Valor por venda (R$)',
    bonus_meta: 'Bônus (R$)',
    percentual_faturamento: 'Percentual (%)',
    comissao_categoria: 'Valor por venda (R$)',
    comissao_equipe: 'Plus de equipe (R$)',
    bonus_carreira: 'Bônus de carreira (R$)',
  }[form.tipo]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cargo.trim()) { toast.error('Informe o cargo.'); return }
    if (num(form.valor) <= 0) { toast.error('Informe um valor maior que zero.'); return }
    if (regraUsaMetaPercentual && num(form.percentual_meta_min) <= 0 && num(form.unidade_meta_min) <= 0) {
      toast.error('Informe o percentual mínimo da meta ou o mínimo em carros.')
      return
    }
    if (regraUsaCategoria && !form.tipo_veiculo) {
      toast.error('Informe a categoria do veículo.')
      return
    }
    if (regraUsaCarreira && !form.nivel_carreira) {
      toast.error('Informe o nível de carreira.')
      return
    }

    setSaving(true)
    const { error } = await salvarRegra({
      loja_id: lojaId,
      cargo: form.cargo.trim(),
      tipo: form.tipo,
      valor: num(form.valor),
      percentual_meta_min: regraUsaMetaPercentual && num(form.percentual_meta_min) > 0 ? num(form.percentual_meta_min) : null,
      unidade_meta_min: regraUsaUnidade && num(form.unidade_meta_min) > 0 ? num(form.unidade_meta_min) : null,
      cumulativo: regraUsaConfigEquipe ? form.cumulativo : false,
      valor_por_unidade: regraUsaConfigEquipe ? form.valor_por_unidade : false,
      requer_bonus_individual: regraUsaConfigEquipe ? form.requer_bonus_individual : false,
      tipo_veiculo: regraUsaCategoria ? form.tipo_veiculo : null,
      nivel_carreira: regraUsaCarreira ? form.nivel_carreira : null,
      ativo: true,
    })
    setSaving(false)

    if (error) toast.error(error)
    else {
      toast.success('Regra de remuneração salva.')
      setForm(EMPTY)
    }
  }

  const handleRemove = (regra: RemuneracaoRegra) => {
    requestToastConfirmation({
      key: `rem-regra:${regra.id}`,
      title: `Remover ${TIPO_LABEL[regra.tipo]}?`,
      description: 'Esta regra deixa de compor o salário estimado do cargo.',
      label: 'Remover',
      onConfirm: async () => {
        const { error } = await removerRegra(regra.id)
        if (error) toast.error(error)
        else toast.success('Regra removida.')
      },
    })
  }

  return (
    <div className="space-y-mx-lg">
      <form onSubmit={handleSubmit} className="rounded-mx-xl border border-border-default bg-surface-alt p-mx-md">
        <Typography variant="caption" tone="muted" className="font-black uppercase tracking-widest">
          Regras de comissão e bônus
        </Typography>
        <div className="mt-mx-sm grid gap-mx-sm md:grid-cols-2 xl:grid-cols-[1fr_1.3fr_1fr_1fr_1fr]">
          <Field label="Cargo">
            <Input value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Ex.: Vendedor" />
          </Field>
          <Field label="Tipo">
            <select
              value={form.tipo}
              onChange={e => setForm(p => ({ ...p, tipo: e.target.value as RemuneracaoRegraTipo }))}
              className="w-full h-mx-14 px-mx-sm bg-white border border-border-default rounded-mx-xl font-black uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="comissao_por_venda">Comissão por venda</option>
              <option value="bonus_meta">Bônus por meta</option>
              <option value="percentual_faturamento">Percentual sobre faturamento</option>
              <option value="comissao_categoria">Comissão por categoria</option>
              <option value="comissao_equipe">Comissão de equipe</option>
              <option value="bonus_carreira">Bônus de carreira</option>
            </select>
          </Field>
          <Field label={valorLabel}>
            <Input inputMode="decimal" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" />
          </Field>
          <Field label="Meta mínima (%)">
            <Input
              inputMode="decimal"
              value={form.percentual_meta_min}
              onChange={e => setForm(p => ({ ...p, percentual_meta_min: e.target.value }))}
              placeholder={regraUsaMetaPercentual ? '100' : 'Não se aplica'}
              disabled={!regraUsaMetaPercentual}
            />
          </Field>
          <Field label="Mínimo em carros">
            <Input
              inputMode="numeric"
              value={form.unidade_meta_min}
              onChange={e => setForm(p => ({ ...p, unidade_meta_min: e.target.value }))}
              placeholder={regraUsaUnidade ? 'Ex.: 8' : 'Não se aplica'}
              disabled={!regraUsaUnidade}
            />
          </Field>
          <Field label="Categoria">
            <select
              value={form.tipo_veiculo}
              onChange={e => setForm(p => ({ ...p, tipo_veiculo: e.target.value as FormState['tipo_veiculo'] }))}
              disabled={!regraUsaCategoria}
              className="w-full h-mx-14 px-mx-sm bg-white border border-border-default rounded-mx-xl font-black uppercase text-xs focus:outline-none focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-tertiary appearance-none cursor-pointer"
            >
              <option value="">Não se aplica</option>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
              <option value="caminhao">Caminhão</option>
            </select>
          </Field>
          <Field label="Nível de carreira">
            <select
              value={form.nivel_carreira}
              onChange={e => setForm(p => ({ ...p, nivel_carreira: e.target.value as NivelCarreiraForm }))}
              disabled={!regraUsaCarreira}
              className="w-full h-mx-14 px-mx-sm bg-white border border-border-default rounded-mx-xl font-black uppercase text-xs focus:outline-none focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-tertiary appearance-none cursor-pointer"
            >
              <option value="">Não se aplica</option>
              <option value="junior">Júnior</option>
              <option value="pleno">Pleno</option>
              <option value="lider">Líder</option>
            </select>
          </Field>
        </div>
        {regraUsaConfigEquipe && (
          <div className="mt-mx-sm flex flex-wrap gap-mx-md">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-tertiary">
              <input type="checkbox" checked={form.cumulativo} onChange={e => setForm(p => ({ ...p, cumulativo: e.target.checked }))} />
              Cumulativo com outras faixas
            </label>
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-tertiary">
              <input type="checkbox" checked={form.valor_por_unidade} onChange={e => setForm(p => ({ ...p, valor_por_unidade: e.target.checked }))} />
              Valor multiplica pelos carros do vendedor
            </label>
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-tertiary">
              <input type="checkbox" checked={form.requer_bonus_individual} onChange={e => setForm(p => ({ ...p, requer_bonus_individual: e.target.checked }))} />
              Só paga se vendedor bateu o próprio mínimo
            </label>
          </div>
        )}
        <div className="mt-mx-md flex justify-end">
          <Button type="submit" disabled={saving} icon={<Plus size={16} />}>
            {saving ? 'Salvando…' : 'Salvar regra'}
          </Button>
        </div>
      </form>

      {error && <p className="text-sm font-bold text-status-error">Erro ao carregar: {error}</p>}

      {loading ? (
        <p className="text-sm font-bold text-text-tertiary">Carregando regras…</p>
      ) : regras.length === 0 ? (
        <EmptyState title="Nenhuma regra cadastrada" description="Adicione comissão por venda e bônus por meta para ativar o salário estimado." />
      ) : (
        <div className="overflow-x-auto rounded-mx-xl border border-border-default">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr className="text-left uppercase tracking-widest text-xs font-black">
                <th className="px-mx-md py-mx-sm">Cargo</th>
                <th className="px-mx-md py-mx-sm">Tipo</th>
                <th className="px-mx-md py-mx-sm">Categoria / Nível</th>
                <th className="px-mx-md py-mx-sm text-right">Valor</th>
                <th className="px-mx-md py-mx-sm text-right">Meta mínima</th>
                <th className="px-mx-md py-mx-sm">Config.</th>
                <th className="px-mx-md py-mx-sm" />
              </tr>
            </thead>
            <tbody>
              {regras.map(regra => (
                <tr key={regra.id} className="border-t border-border-default">
                  <td className="px-mx-md py-mx-sm font-black uppercase">{regra.cargo}</td>
                  <td className="px-mx-md py-mx-sm">{TIPO_LABEL[regra.tipo]}</td>
                  <td className="px-mx-md py-mx-sm">
                    {regra.tipo_veiculo
                      ? TIPO_VEICULO_LABEL[regra.tipo_veiculo as RemuneracaoTipoVeiculo] || regra.tipo_veiculo
                      : regra.nivel_carreira
                        ? NIVEL_CARREIRA_LABEL[regra.nivel_carreira as 'junior' | 'pleno' | 'lider'] || regra.nivel_carreira
                        : '—'}
                  </td>
                  <td className="px-mx-md py-mx-sm text-right font-black">{BRL.format(Number(regra.valor))}</td>
                  <td className="px-mx-md py-mx-sm text-right">
                    {regra.unidade_meta_min != null
                      ? `${regra.unidade_meta_min} carro(s)`
                      : regra.tipo === 'bonus_meta' || regra.tipo === 'comissao_equipe'
                        ? `${Number(regra.percentual_meta_min || 0)}%`
                        : '—'}
                  </td>
                  <td className="px-mx-md py-mx-sm text-xs text-text-tertiary">
                    {[
                      regra.cumulativo && 'cumulativo',
                      regra.valor_por_unidade && 'por unidade',
                      regra.requer_bonus_individual && 'trava individual',
                    ].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-mx-md py-mx-sm text-right">
                    <Button type="button" variant="ghost" size="icon" aria-label="Remover" onClick={() => handleRemove(regra)}>
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-mx-xs">
      <span className="block px-1 text-xs font-black uppercase tracking-widest text-text-tertiary">{label}</span>
      {children}
    </label>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sem erros (`TIPO_LABEL` precisa cobrir `bonus_carreira` — já coberto acima; se o enum gerado tiver ordem diferente, TS só valida presença de todas as chaves, não ordem).

- [ ] **Step 3: Commit**

```bash
git add src/features/remuneracao/components/CadastroRegras.tsx
git commit -m "feat: formulario de regras suporta faixa por unidade, cumulativo e bonus de carreira"
```

---

### Task 8: UI dono/gerente — nova aba "Nível de carreira"

**Files:**
- Create: `src/features/remuneracao/components/CadastroCarreira.tsx`
- Modify: `src/features/remuneracao/RemuneracaoPage.tsx`

**Interfaces:**
- Consumes: `useTeam(lojaId)` de `@/hooks/useTeam` (já existe, retorna `{ sellers: TeamMember[], loading }` — `TeamMember` tem `id`, `name`, `role`), `useVendedoresNivelCarreira(lojaId)` (Task 5).
- Produces: tela onde dono/gerente vê os vendedores da loja e atribui júnior/pleno/líder a cada um.

- [ ] **Step 1: Criar `CadastroCarreira.tsx`**

```tsx
import { useState } from 'react'
import { toast } from 'sonner'
import { useTeam } from '@/hooks/useTeam'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'
import { useVendedoresNivelCarreira, type NivelCarreira } from '../hooks/useRemuneracao'

const NIVEL_LABEL: Record<NivelCarreira, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  lider: 'Líder',
}

export function CadastroCarreira({ lojaId }: { lojaId: string }) {
  const { sellers, loading: sellersLoading } = useTeam(lojaId)
  const { niveis, loading: niveisLoading, error, salvarNivel } = useVendedoresNivelCarreira(lojaId)
  const [savingId, setSavingId] = useState<string | null>(null)

  const vendedores = sellers.filter(seller => seller.role === 'vendedor')

  const handleChange = async (sellerUserId: string, nivel: NivelCarreira) => {
    setSavingId(sellerUserId)
    const { error } = await salvarNivel(sellerUserId, nivel)
    setSavingId(null)
    if (error) toast.error(error)
    else toast.success('Nível de carreira atualizado.')
  }

  const loading = sellersLoading || niveisLoading

  return (
    <div className="space-y-mx-lg">
      <div>
        <Typography variant="caption" tone="muted" className="font-black uppercase tracking-widest">
          Nível de carreira
        </Typography>
        <Typography variant="tiny" tone="muted" className="mt-1">
          Mérito atribuído por dono/gerente (tempo de casa, comportamento, volume). Libera o bônus de carreira do plano.
        </Typography>
      </div>

      {error && <p className="text-sm font-bold text-status-error">Erro ao carregar: {error}</p>}

      {loading ? (
        <p className="text-sm font-bold text-text-tertiary">Carregando vendedores…</p>
      ) : vendedores.length === 0 ? (
        <EmptyState title="Nenhum vendedor nesta loja" description="Cadastre vendedores em Equipe & Usuários primeiro." />
      ) : (
        <div className="overflow-x-auto rounded-mx-xl border border-border-default">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr className="text-left uppercase tracking-widest text-xs font-black">
                <th className="px-mx-md py-mx-sm">Vendedor</th>
                <th className="px-mx-md py-mx-sm">Nível</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map(vendedor => (
                <tr key={vendedor.id} className="border-t border-border-default">
                  <td className="px-mx-md py-mx-sm font-black">{vendedor.name}</td>
                  <td className="px-mx-md py-mx-sm">
                    <select
                      value={niveis[vendedor.id] || 'junior'}
                      disabled={savingId === vendedor.id}
                      onChange={e => handleChange(vendedor.id, e.target.value as NivelCarreira)}
                      className="h-mx-12 px-mx-sm bg-white border border-border-default rounded-mx-xl font-black uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
                    >
                      {(Object.keys(NIVEL_LABEL) as NivelCarreira[]).map(nivel => (
                        <option key={nivel} value={nivel}>{NIVEL_LABEL[nivel]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Registrar a aba em `RemuneracaoPage.tsx`**

```tsx
import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { PageHeader } from '@/components/molecules/PageHeader'
import { TabNav, type TabNavItem } from '@/components/molecules/TabNav'
import { EmptyState } from '@/components/atoms/EmptyState'
import { CadastroPlanos } from './components/CadastroPlanos'
import { CadastroRegras } from './components/CadastroRegras'
import { CadastroCarreira } from './components/CadastroCarreira'
import { ComparativoMercado } from './components/ComparativoMercado'
import { useLojasDoUsuario } from './hooks/useRemuneracao'

type TabKey = 'cadastro' | 'regras' | 'carreira' | 'comparativo'

const TABS: TabNavItem<TabKey>[] = [
  { key: 'cadastro', label: 'Plano atual' },
  { key: 'regras', label: 'Regras e bônus' },
  { key: 'carreira', label: 'Nível de carreira' },
  { key: 'comparativo', label: 'Comparativo de mercado' },
]

export default function RemuneracaoPage() {
  const { lojas, loading } = useLojasDoUsuario()
  const [lojaId, setLojaId] = useState<string>('')
  const [tab, setTab] = useState<TabKey>('cadastro')

  const lojaSelecionada = lojaId || (lojas.length === 1 ? lojas[0].id : '')

  return (
<div className="w-full space-y-mx-lg">
      <PageHeader
        title="Remuneração Inteligente"
        description="Cadastre o plano de remuneração por cargo e compare com a média de mercado."
        actions={
          <label className="flex items-center gap-mx-sm">
            <span className="text-xs font-black uppercase tracking-widest text-text-tertiary">Loja</span>
            <select
              value={lojaSelecionada}
              onChange={e => setLojaId(e.target.value)}
              disabled={loading || lojas.length === 0}
              className="h-mx-12 px-mx-sm bg-surface-alt border border-border-default rounded-mx-xl font-black uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="">Selecione…</option>
              {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        }
      />

      {!lojaSelecionada ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title={loading ? 'Carregando lojas…' : 'Selecione uma loja'}
          description="Escolha a loja para gerenciar a remuneração dos cargos."
        />
) : (
<>
<TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />
<section id={`${tab}-panel`} role="tabpanel" aria-labelledby={`${tab}-tab`}>
{tab === 'cadastro' && <CadastroPlanos lojaId={lojaSelecionada} />}
{tab === 'regras' && <CadastroRegras lojaId={lojaSelecionada} />}
{tab === 'carreira' && <CadastroCarreira lojaId={lojaSelecionada} />}
{tab === 'comparativo' && <ComparativoMercado lojaId={lojaSelecionada} />}
</section>
</>
)}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/features/remuneracao/components/CadastroCarreira.tsx src/features/remuneracao/RemuneracaoPage.tsx
git commit -m "feat: aba de nivel de carreira em Configuracoes > Remuneracao"
```

---

### Task 9: Seed — plano Brothers Car na loja MX CONSULTORIA

**Files:**
- Create: `supabase/migrations/20260707142000_seed_remuneracao_brothers_car_mx_consultoria.sql`

**Interfaces:**
- Consumes: `remuneracao_planos`, `remuneracao_regras` (com os campos da Task 1), `vendedor_nivel_carreira` (Task 2), `usuarios.email` (pra resolver os 4 `seller_user_id`).
- Produces: dados reais na loja de testes — nada consumido por outra Task, é o passo final de dados antes da verificação (Task 10).

- [ ] **Step 1: Escrever a migration de seed**

```sql
-- ============================================================================
-- Migration: 20260707142000_seed_remuneracao_brothers_car_mx_consultoria.sql
-- Scope: dados do plano salarial "Brothers Car" só na loja de testes
--        MX CONSULTORIA (467a19d1-af51-4b4f-9b05-d67187a2a759), cargo Vendedor.
--        Insere uma nova versao datada hoje (nao mexe/apaga a linha antiga de
--        remuneracao_planos — o motor sempre escolhe a versao mais recente
--        com vigencia_inicio <= hoje, entao a nova passa a valer sozinha).
-- ============================================================================

INSERT INTO public.remuneracao_planos (loja_id, cargo, salario_fixo, salario_variavel, beneficios, moeda, vigencia_inicio)
VALUES ('467a19d1-af51-4b4f-9b05-d67187a2a759', 'Vendedor', 1500, 0, 0, 'BRL', CURRENT_DATE)
ON CONFLICT (loja_id, cargo, vigencia_inicio) DO UPDATE SET
  salario_fixo = EXCLUDED.salario_fixo,
  salario_variavel = EXCLUDED.salario_variavel,
  beneficios = EXCLUDED.beneficios;

INSERT INTO public.remuneracao_regras (loja_id, cargo, tipo, valor)
SELECT '467a19d1-af51-4b4f-9b05-d67187a2a759', 'Vendedor', 'comissao_por_venda', 500
WHERE NOT EXISTS (
  SELECT 1 FROM public.remuneracao_regras
  WHERE loja_id = '467a19d1-af51-4b4f-9b05-d67187a2a759' AND lower(cargo) = 'vendedor'
    AND tipo = 'comissao_por_venda' AND vigencia_inicio = CURRENT_DATE
);

INSERT INTO public.remuneracao_regras (loja_id, cargo, tipo, valor, unidade_meta_min)
SELECT '467a19d1-af51-4b4f-9b05-d67187a2a759', 'Vendedor', 'bonus_meta', 1000, 8
WHERE NOT EXISTS (
  SELECT 1 FROM public.remuneracao_regras
  WHERE loja_id = '467a19d1-af51-4b4f-9b05-d67187a2a759' AND lower(cargo) = 'vendedor'
    AND tipo = 'bonus_meta' AND vigencia_inicio = CURRENT_DATE AND unidade_meta_min = 8
);

INSERT INTO public.remuneracao_regras (loja_id, cargo, tipo, valor, unidade_meta_min, cumulativo, valor_por_unidade, requer_bonus_individual)
SELECT v.loja_id, v.cargo, v.tipo::public.remuneracao_regra_tipo, v.valor, v.unidade_meta_min, v.cumulativo, v.valor_por_unidade, v.requer_bonus_individual
FROM (VALUES
  ('467a19d1-af51-4b4f-9b05-d67187a2a759'::uuid, 'Vendedor', 'comissao_equipe', 100::numeric,  35, true, true,  true),
  ('467a19d1-af51-4b4f-9b05-d67187a2a759'::uuid, 'Vendedor', 'comissao_equipe', 1000::numeric, 40, true, false, true),
  ('467a19d1-af51-4b4f-9b05-d67187a2a759'::uuid, 'Vendedor', 'comissao_equipe', 1000::numeric, 45, true, false, true),
  ('467a19d1-af51-4b4f-9b05-d67187a2a759'::uuid, 'Vendedor', 'comissao_equipe', 1000::numeric, 50, true, false, true)
) AS v(loja_id, cargo, tipo, valor, unidade_meta_min, cumulativo, valor_por_unidade, requer_bonus_individual)
WHERE NOT EXISTS (
  SELECT 1 FROM public.remuneracao_regras r
  WHERE r.loja_id = v.loja_id AND lower(r.cargo) = lower(v.cargo) AND r.tipo = v.tipo::public.remuneracao_regra_tipo
    AND r.vigencia_inicio = CURRENT_DATE AND r.unidade_meta_min = v.unidade_meta_min
);

INSERT INTO public.remuneracao_regras (loja_id, cargo, tipo, valor, nivel_carreira)
SELECT v.loja_id, v.cargo, v.tipo::public.remuneracao_regra_tipo, v.valor, v.nivel_carreira
FROM (VALUES
  ('467a19d1-af51-4b4f-9b05-d67187a2a759'::uuid, 'Vendedor', 'bonus_carreira', 800::numeric, 'pleno'),
  ('467a19d1-af51-4b4f-9b05-d67187a2a759'::uuid, 'Vendedor', 'bonus_carreira', 800::numeric, 'lider')
) AS v(loja_id, cargo, tipo, valor, nivel_carreira)
WHERE NOT EXISTS (
  SELECT 1 FROM public.remuneracao_regras r
  WHERE r.loja_id = v.loja_id AND lower(r.cargo) = lower(v.cargo) AND r.tipo = v.tipo::public.remuneracao_regra_tipo
    AND r.vigencia_inicio = CURRENT_DATE AND r.nivel_carreira = v.nivel_carreira
);

INSERT INTO public.vendedor_nivel_carreira (seller_user_id, loja_id, nivel_carreira)
SELECT u.id, '467a19d1-af51-4b4f-9b05-d67187a2a759', v.nivel
FROM (VALUES
  ('vendedor@mxgestaopreditiva.com.br', 'lider'),
  ('mari.vendedor@mxgestaopreditiva.com.br', 'pleno'),
  ('jose.vendedor@mxgestaopreditiva.com.br', 'junior'),
  ('daniel.vendedor@mxgestaopreditiva.com.br', 'junior')
) AS v(email, nivel)
JOIN public.usuarios u ON u.email = v.email
ON CONFLICT (seller_user_id) DO UPDATE SET
  nivel_carreira = EXCLUDED.nivel_carreira,
  loja_id = EXCLUDED.loja_id;
```

- [ ] **Step 2: Aplicar no remoto (mesmo método cirúrgico da Task 3)**

```bash
cd "/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA"
mkdir -p /tmp/mx_migrations_holdout
for f in 20260521120000_drop_migration_backups_pii 20260521130000_db016_revoke_lancamentos_diarios 20260521131000_db016_revoke_rollback; do
  mv "supabase/migrations/${f}.sql" /tmp/mx_migrations_holdout/ 2>/dev/null || true
done
trap 'for f in /tmp/mx_migrations_holdout/*.sql; do mv "$f" supabase/migrations/ 2>/dev/null || true; done' EXIT

echo y | supabase db push --linked
```

Expected: migration `20260707142000_...` aplicada sem erro.

- [ ] **Step 3: Conferir os dados**

O MCP Supabase **não tem permissão** no projeto `fbhcmzzgwjdgkctlfvbo` (confirmado nesta sessão via `list_projects` — só aparecem GOLF FOX e OUTFIT) e não há `psql` disponível localmente. A conferência dos dados semeados é feita pela UI mesmo, na Task 10 (Step 2: dono vê plano/regras/níveis; Step 4: vendedor vê o total calculado batendo com a fórmula da planilha) — isso prova tanto que os dados foram inseridos certo quanto que o motor está lendo e calculando com eles corretamente, o que uma query SQL isolada não provaria sozinha.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260707142000_seed_remuneracao_brothers_car_mx_consultoria.sql
git commit -m "feat(db): semeia plano Brothers Car na loja de testes MX CONSULTORIA"
```

---

### Task 10: Verificação end-to-end no browser (dono, gerente, vendedor)

**Files:** nenhum (só verificação manual via preview tools).

**Interfaces:**
- Consumes: tudo (Tasks 1–9) já aplicado em remoto.

- [ ] **Step 1: Rodar a suíte completa e o typecheck**

```bash
npm run test
npm run typecheck
```

Expected: tudo verde.

- [ ] **Step 2: Iniciar o dev server e logar como dono**

Usar `preview_start` (config `dev`, porta 3457). Login `dono@mxgestaopreditiva.com.br` com a senha de `MX_E2E_PASSWORD`. Navegar pra `/configuracoes/remuneracao`, selecionar loja MX CONSULTORIA.

Expected: aba "Plano atual" mostra Fixo R$ 1.500,00 / Variável R$ 0,00 / Benefícios R$ 0,00. Aba "Regras e bônus" lista as 7 regras (comissão 500, bônus 1.000 com "8 carro(s)", 4 faixas de equipe com badges `cumulativo`/`por unidade`/`trava individual`, 2 bônus de carreira). Aba "Nível de carreira" lista os 4 vendedores com os níveis certos (líder/pleno/júnior/júnior) e o select é editável.

- [ ] **Step 3: Editar uma regra como dono e confirmar que persiste**

Mudar o nível de carreira de `jose.vendedor` de júnior pra pleno na aba "Nível de carreira", confirmar toast de sucesso, recarregar a página (`preview_eval`: `location.reload()`), confirmar que o select continua em "Pleno".

Depois reverter de volta pra júnior (pra manter o cenário de demo descrito na spec).

- [ ] **Step 4: Logar como vendedor e conferir o extrato**

Login `vendedor@mxgestaopreditiva.com.br` com a senha de `MX_E2E_PASSWORD` (nível líder, seedado). Navegar pra `/minha-remuneracao`. Abrir o detalhamento do cálculo (`CalculationDetailsDrawer`).

Expected: `formulaItens` mostra as 6 linhas (fixo, variável=0, benefícios=0, comissão, bônus, bônus de carreira=800 já que é líder). Total bate com a fórmula da planilha pro número de vendas reais desse vendedor no mês (sem depender de dados fictícios — usa vendas reais do CRM). Não deve haver nenhum controle de edição na tela (somente leitura).

- [ ] **Step 5: Confirmar RLS — vendedor não consegue editar `vendedor_nivel_carreira`**

Via `preview_eval` logado como vendedor, tentar um update direto contra a tabela pelo client Supabase exposto (se não estiver exposto no `window`, pular este passo e confiar na policy validada na Task 2 — a policy `vendedor_nivel_carreira_seller_read` é `FOR SELECT`, não existe policy de escrita pro vendedor, então qualquer tentativa de update por um client autenticado como vendedor retorna erro de RLS por design).

Expected: nenhuma forma de edição do nível de carreira acessível pelo vendedor na UI (não há botão nem input — só o dono/gerente tem a aba "Nível de carreira").

- [ ] **Step 6: Screenshot final pra registro**

`preview_screenshot` da tela `/minha-remuneracao` (vendedor) e de `/configuracoes/remuneracao` aba "Regras e bônus" (dono) — anexar ao relatar a conclusão ao usuário.

- [ ] **Step 7: Commit final (se algo mudou nos passos de verificação, ex. reversão do nível de carreira)**

```bash
git status --short
```

Se não houver diffs (esperado — Task 10 é só verificação), não commitar nada.
