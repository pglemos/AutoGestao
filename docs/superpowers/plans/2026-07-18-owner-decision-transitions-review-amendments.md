# Owner Decision Transitions Plan: Self-Review Amendments

> Este arquivo é parte normativa do plano `2026-07-18-owner-decision-transitions.md`. Em caso de divergência, este adendo prevalece.

## 1. Enum canônico de origem

O banco usa `public.action_origin = 'alertas' | 'score' | 'consultor' | 'manual'`.

Na Task 3, além de incluir `origem_ref_key`, alterar explicitamente em `src/features/dashboard-loja/hooks/useCentralMxPlanosAcao.ts`:

```ts
export type CentralMxPlanoOrigin = 'alertas' | 'score' | 'consultor' | 'manual'
```

Não manter o valor legado singular `alerta`. Todo payload, select, cast e teste desta feature deve usar `alertas`.

Adicionar ao teste `ownerDecisionModel.test.ts`:

```ts
it('usa o enum plural canônico para alertas', () => {
  const item = buildOwnerDecisionItems([alert], [])[0]
  expect(item.databaseOrigin).toBe('alertas')
})
```

## 2. Teste correto de item resolvido

Na Task 7, o teste de remoção da fila deve renderizar o mesmo alerta e indexar o mapa pela chave real produzida pelo modelo. Substituir o teste ilustrativo por:

```tsx
import { ownerAlertDecisionKey } from './ownerDecisionModel'

it('remove da fila um item persistido como em andamento', () => {
  const decisionKey = ownerAlertDecisionKey(alerts[0])
  hookState.plansByDecisionKey = {
    [decisionKey]: {
      id: 'plan-1',
      status: 'em_andamento',
      origem_ref_key: decisionKey,
    },
  }

  render(
    <MemoryRouter>
      <OwnerDecisionCenter
        storeId="store-1"
        alerts={alerts}
        actions={[]}
      />
    </MemoryRouter>,
  )

  expect(screen.getByText('Fila executiva tratada')).toBeTruthy()
  expect(screen.queryByText('Meta em risco')).toBeNull()
})
```

O cast da massa deve completar `CentralMxPlanoAcaoRow` ou usar `as CentralMxPlanoAcaoRow`; não enfraquecer o tipo de produção.

## 3. Estado inicial e skeleton

Enquanto `useOwnerDecisionTransitions` estiver carregando, a Central de Decisões não deve exibir os itens como mutáveis. Renderizar um estado de carregamento e manter Aprovar/Delegar indisponíveis até a leitura persistida terminar.

Regra exata:

```ts
const mutationsBlocked =
  !storeId
  || transitions.loading
  || Boolean(transitions.blockingError)
```

Adicionar teste:

```tsx
it('bloqueia mutações enquanto valida decisões persistidas', () => {
  hookState.loading = true
  render(
    <MemoryRouter>
      <OwnerDecisionCenter storeId="store-1" alerts={alerts} actions={[]} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Delegar' })).toBeDisabled()
})
```

Restaurar `hookState.loading = false` no `afterEach`.

## 4. Probe SQL sem placeholder

O trecho com `<store_uuid>` no plano principal é apenas ilustrativo e não deve ser copiado. A execução deve usar o teste de integração automatizado com fixtures locais.

Criar `src/lib/owner-decision-transition-integration.test.ts` que:

1. lê `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY` e `E2E_AUTH_PASSWORD`;
2. usa a conta E2E do Dono e a loja sandbox retornada pelo perfil autenticado;
3. chama `transition_owner_decision` com chave `alert:integration-owner-transition`;
4. chama a mesma aprovação duas vezes;
5. consulta `planos_acao` e exige uma única linha;
6. consulta `historico_planos_acao` e exige `change_reason = 'owner_approval'`;
7. delega ao primeiro vínculo ativo diferente do Dono;
8. exige `change_reason = 'owner_delegation'`.

O teste deve usar:

```ts
const required = ['SUPABASE_TEST_URL', 'SUPABASE_TEST_ANON_KEY', 'E2E_AUTH_PASSWORD'] as const
const missing = required.filter((name) => !process.env[name])
const integrationTest = missing.length === 0 ? it : it.skip
```

Sem credenciais, o resultado correto é SKIP explícito, nunca PASS falso. A issue #127 continua sendo o bloqueio rastreável.

## 5. Branch e worktree de execução

A implementação não deve ocorrer diretamente na branch de documentação.

Ao iniciar a execução:

```bash
git fetch origin
git worktree add ../MXGESTAOPREDITIVA-owner-decisions \
  -b feat/owner-decision-transitions \
  origin/docs/owner-decision-transitions-design-20260718
cd ../MXGESTAOPREDITIVA-owner-decisions
```

Assim, design e plano permanecem no histórico da feature. Se a branch documental tiver sido mergeada em `main` antes da execução, usar `origin/main` como base, após confirmar que os dois documentos estão presentes.

## 6. Concorrência

Além do teste estático, adicionar teste de integração com duas chamadas simultâneas:

```ts
const [first, second] = await Promise.all([
  client.rpc('transition_owner_decision', payload),
  client.rpc('transition_owner_decision', payload),
])
expect(first.error).toBeNull()
expect(second.error).toBeNull()
```

Depois consultar:

```ts
const { data, error } = await client
  .from('planos_acao')
  .select('id, origem_ref_key')
  .eq('scope_id', storeId)
  .eq('origem_ref_table', 'owner_decision')
  .eq('origem_ref_key', payload.p_decision_key)

expect(error).toBeNull()
expect(data).toHaveLength(1)
```

## 7. RPC e plano concluído

A RPC deve rejeitar tentativa de reabrir plano `concluido` com SQLSTATE `23514`. Adicionar ao contrato estático:

```ts
expect(sql).toContain("IF v_row.status = 'concluido' THEN")
expect(sql).toContain("RAISE EXCEPTION 'decisao ja concluida'")
```

E ao teste de integração, quando uma fixture concluída estiver disponível:

```ts
expect(result.error?.code).toBe('23514')
```

## 8. Critério final da autorrevisão

O plano só pode ser considerado executável quando:

- `CentralMxPlanoOrigin` usa `alertas`;
- o teste de item resolvido usa `ownerAlertDecisionKey` real;
- loading bloqueia as mutações;
- o probe com UUID fictício não é utilizado;
- a execução ocorre em worktree/branch própria;
- concorrência é validada por duas RPCs simultâneas;
- plano concluído não é reaberto.
