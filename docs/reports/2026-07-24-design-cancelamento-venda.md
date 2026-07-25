# Design técnico — Cancelamento de Venda

**Data:** 2026-07-24
**Status:** Draft — proposta de arquitetura, aguardando validação (@architect/@data-engineer) antes de implementar
**Contexto:** Retoma a lacuna já mapeada em `docs/reports/2026-07-23-vendas-busca-cancelamento-divergencia.md` (Story 2, não implementada). Hoje não existe nenhuma forma de cancelar/desistir de uma venda já fechada em nenhum perfil (vendedor, gerente, dono).

## Restrições descobertas no schema atual (fatos, não suposição)

- `public.eventos_comerciais` é **append-only por design** (comentário explícito na migration de criação: "nunca editado após criado"). Cancelamento não pode apagar/editar o evento `venda_realizada` original.
- `public.vendedor_performance_oficial` (RPC oficial de meta/comissão, `20260710150000_official_seller_performance.sql:20-157`) conta vendas a partir de `eventos_comerciais WHERE tipo_evento='venda_realizada'`, não a partir de `oportunidades.etapa`. Qualquer cancelamento que não seja considerado aqui continua gerando comissão indevida.
- `crm_evento_tipo` (enum) não tem valor de cancelamento. `crm_etapa_funil` não tem valor `cancelada` (só `ganho`/`perdido`, ambos pré-fechamento; nada pós-fechamento).
- Trigger `trg_oportunidades_prevent_valor_tamper` (`20260724210000_harden_valor_tampering_and_audit_log.sql`) só trava `valor_negociado`/`valor_troca` quando `OLD.etapa='ganho'` — não trava `etapa` em si. Não impede a transição `ganho → cancelada`.
- `is_manager_of(p_store_id)` / `is_owner_of(p_store_id)` / `eh_administrador_mx()` são as funções de permissão padrão já usadas em toda RLS/trigger do projeto (`20260430190000_fundacao_portugues_permissoes_evidencias.sql:182-305`).
- RPCs de venda seguem padrão fixo: `SECURITY DEFINER`, `SET search_path = public`, parâmetro único `jsonb`, retorno `jsonb {ok, data|error}`, idempotência via `idempotency_key` (ver `registrar_venda_direta`, `20260710140000_transactional_direct_sale_and_competence.sql:119-301`).

## Decisão de modelagem

Cancelamento = **evento compensatório**, não mutação do evento original. Preserva a garantia de imutabilidade de `eventos_comerciais` e mantém rastro de auditoria completo (venda aconteceu, depois foi cancelada — os dois fatos ficam registrados).

## Mudanças de schema

### 1. `crm_evento_tipo` — novo valor
```sql
ALTER TYPE public.crm_evento_tipo ADD VALUE 'venda_cancelada';
```
Precisa ser commitado sozinho (restrição do Postgres: valor de enum novo não pode ser usado na mesma transação em que foi criado).

### 2. `crm_etapa_funil` — novo valor
```sql
ALTER TYPE public.crm_etapa_funil ADD VALUE 'cancelada';
```
Também isolado em migration própria.

### 3. `oportunidades` — colunas novas
```sql
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS cancelada_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text;
```
`valor_negociado`/`valor_troca` **não são alterados** no cancelamento — preserva valor histórico pra auditoria/relatório ("venda de R$X foi cancelada"), e evita conflito com a trigger de trava de valor.

## RPC `public.cancelar_venda(payload jsonb)`

Espelha o padrão de `registrar_venda_direta`. Pseudocódigo do fluxo:

```sql
CREATE OR REPLACE FUNCTION public.cancelar_venda(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_oportunidade_id uuid := (payload->>'oportunidade_id')::uuid;
  v_motivo text := trim(payload->>'motivo');
  v_op record;
  v_is_owner boolean;
  v_is_privileged boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  IF v_motivo IS NULL OR length(v_motivo) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Motivo do cancelamento é obrigatório (mínimo 10 caracteres).');
  END IF;

  SELECT * INTO v_op FROM public.oportunidades WHERE id = v_oportunidade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
  END IF;

  IF v_op.etapa::text <> 'ganho' OR v_op.cancelada_em IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não está em estado cancelável.');
  END IF;

  v_is_privileged := public.eh_administrador_mx(auth.uid())
    OR public.is_manager_of(v_op.loja_id)
    OR public.is_owner_of(v_op.loja_id);

  v_is_owner := v_op.seller_user_id = auth.uid()
    AND v_op.closed_at IS NOT NULL
    AND now() - v_op.closed_at <= interval '7 days';

  IF NOT (v_is_privileged OR v_is_owner) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para cancelar esta venda (fora do prazo ou não é o vendedor responsável).');
  END IF;

  UPDATE public.oportunidades
     SET etapa = 'cancelada',
         cancelada_em = now(),
         cancelada_por = auth.uid(),
         motivo_cancelamento = v_motivo,
         updated_at = now(),
         updated_by = auth.uid()
   WHERE id = v_oportunidade_id;

  INSERT INTO public.eventos_comerciais
    (cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento, observacao, origem_modulo, created_by)
  VALUES
    (v_op.cliente_id, v_op.id, v_op.loja_id, v_op.seller_user_id, 'venda_cancelada', v_motivo, 'crm', auth.uid());

  INSERT INTO public.d1_audit_log
    (usuario_id, cliente_id, tipo_alteracao, valor_anterior, valor_novo)
  VALUES
    (auth.uid(), v_op.cliente_id::text, 'cancelamento_venda', 'ganho', 'cancelada');

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('oportunidade_id', v_op.id));
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.cancelar_venda(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_venda(jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
```

Notas:
- `SECURITY DEFINER` roda com role elevada (mesmo padrão de `registrar_venda_direta`), então bypassa RLS de escrita em `oportunidades`/`eventos_comerciais` — não precisa de policy nova de UPDATE pra gerente/dono, a checagem de permissão é 100% dentro da função.
- Prazo de 7 dias pro vendedor é constante fixa no código (`interval '7 days'`), não configurável por loja — evita over-engineering; se precisar variar por loja no futuro, vira parâmetro de tabela de config existente.

## Patch em `vendedor_performance_oficial`

CTE `sales` precisa excluir vendas canceladas:
```sql
FROM public.eventos_comerciais ec
LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
WHERE ec.tipo_evento = 'venda_realizada'
  AND o.etapa IS DISTINCT FROM 'cancelada'   -- linha nova
  AND coalesce(ec.data_competencia, ...) BETWEEN p_start_date AND p_end_date
```
Precisa de `CREATE OR REPLACE FUNCTION` completo (não dá pra fazer `ALTER` parcial) — migration copia a função inteira do arquivo original com essa linha adicionada.

## Sequência de migrations

1. `20260724220000_add_venda_cancelada_evento_enum.sql` — `ALTER TYPE crm_evento_tipo ADD VALUE`
2. `20260724221000_add_cancelada_etapa_and_columns.sql` — `ALTER TYPE crm_etapa_funil ADD VALUE` + colunas em `oportunidades`
3. `20260724222000_cancelar_venda_rpc.sql` — RPC completa
4. `20260724223000_vendedor_performance_exclude_cancelada.sql` — patch da comissão

## Frontend por perfil — mapeamento real (2026-07-24)

**Achado central: hoje não existe, em lugar nenhum do app, uma tela que liste vendas fechadas individualmente (`oportunidades` com `etapa='ganho'`) para gerente ou dono.** Confirmado varrendo todo `src` por `from('oportunidades')` — só 3 usos, todos self-scoped por vendedor. Gerente e dono compartilham exatamente as mesmas telas de performance (`DashboardLoja` → `PerformanceTab`, que ramifica em `OwnerExecutiveCockpit` pro dono e `ManagerSellerParityHomeCanonical` pro gerente), ambas alimentadas só pela RPC agregada `vendedor_performance_oficial` (soma/contagem por vendedor, sem `oportunidade_id` na saída — não dá pra linkar um botão de cancelar direto nela sem mudar o RPC).

`/carteira-clientes` também não serve de base pra gerente/dono: o componente (`CarteiraClientes.container.tsx`) é reaproveitado pros 4 perfis, mas o hook por trás (`src/features/crm/hooks/useOportunidades.ts:141,154`) filtra sempre `seller_user_id = auth.uid()` — gerente/dono abrindo essa tela veem a própria carteira (vazia), não a da loja.

Não existe nenhum "detalhe da venda" (modal/página) em lugar nenhum do app, pra nenhum perfil. `FunilVendasGerente.tsx` (rota `gerente/funil`) é 100% mockado (arrays hard-coded), não é candidato. `DepartamentoComercial` (`src/pages/owner/Placeholders.jsx:21-23`) é placeholder vazio.

Busca por cancelamento existente (`cancelar`, `cancel_sale`, `CancelSale`) no repo todo: zero hits relacionados a venda — só `cancelar_regularizacao_fechamento` (RPC de auditoria de checkin, assunto diferente) e textos de UI de agendamento.

| Perfil | Onde aparece o botão | Regra de visibilidade | Situação da UI |
|---|---|---|---|
| Vendedor | `FluxoClientePanel` (`src/features/crm/CarteiraClientes.container.tsx:909`) — painel lateral da Ficha do Cliente, já carrega o objeto `Oportunidade` completo e já checa `etapa === 'ganho'` (`calcularQualidadeFicha`, linhas 860-883) | `etapa='ganho'` E `seller_user_id = usuário atual` E `now() - closed_at <= 7 dias` | Componente existe, só falta acoplar o botão — candidato maduro |
| Gerente | Não existe tela hoje | `etapa='ganho'`, qualquer vendedor da loja, sem limite de prazo | **Precisa construir do zero**: componente de lista de vendas fechadas por loja (query direta em `oportunidades` filtrada por `store_id` + `etapa='ganho'` — nenhuma tela faz isso hoje) |
| Dono | Idem gerente | Idem gerente, com escopo de todas as lojas próprias | **Precisa construir do zero** — pode reaproveitar o mesmo componente novo do gerente, parametrizado por loja(s) |

Modal de confirmação exige `motivo` (textarea, mínimo 10 caracteres) antes de habilitar o botão de confirmar. Chamada via `supabase.rpc('cancelar_venda', { oportunidade_id, motivo })`.

Onde exibir status cancelado: qualquer lugar que hoje renderiza `etapa` (badges de funil, listagens) precisa tratar `cancelada` como estado próprio — não confundir com `perdido` (perdido = nunca fechou; cancelada = fechou e foi revertido). `src/features/carteira-clientes/lib/carteira-mappers.ts:49,103,256` tem a constante `CLOSED_STAGES = ['ganho','perdido']` — precisa incluir `'cancelada'` ou tratar à parte, dependendo de como o resto da UI usa essa constante.

## Pendências / não resolvido neste design

- **UI de gerente/dono não tem onde plugar** — precisa de componente novo (lista de vendas fechadas por loja), não é só "achar e acoplar botão" como no vendedor. Escopo maior do que o previsto inicialmente.
- `vendedores_loja` não tem DDL versionada em `supabase/migrations` (existe no banco, mas fora do controle de migration rastreado) — confirmar estrutura exata via MCP Supabase antes de qualquer FK/constraint nova que dependa dela.
- Impacto em `lancamentos_diarios`/pagamento de comissão já lançado (se comissão já foi paga antes do cancelamento) não foi mapeado — precisa @data-engineer decidir se cancelamento gera estorno financeiro retroativo ou só impede contagem futura.
- `funnel_metrics` (tabela de snapshot histórico) não é recalculada retroativamente — cancelamento só afeta métricas calculadas dali pra frente.

## Design de UI — Parte A: botão "Cancelar venda" no `FluxoClientePanel` (vendedor)

Arquivo: `src/features/crm/CarteiraClientes.container.tsx`, componente `FluxoClientePanel` (~linha 909).

### Hook — `useOportunidades.ts`
Novo método `cancelarVenda`, mesmo molde de `registrarVendaDireta` (linhas 196-209) e `updateMotivoPerda`/`updateEtapa` (linhas 219-238):
```ts
const cancelarVenda = useCallback(async (oportunidadeId: string, motivo: string): Promise<{ error: string | null }> => {
  const { data, error: rpcError } = await supabase.rpc('cancelar_venda', {
    p_payload: { oportunidade_id: oportunidadeId, motivo },
  })
  if (rpcError) return { error: rpcError.message }
  const result = data as { ok?: boolean; error?: string } | null
  if (!result?.ok) return { error: result?.error || 'Não foi possível cancelar a venda.' }
  await fetchOportunidades()
  return { error: null }
}, [fetchOportunidades])
```

### Componente novo — `CancelarVendaModal`
Local sugerido: `src/features/crm/components/CancelarVendaModal.tsx` (compartilhado com a Parte B — gerente/dono usam o mesmo modal). Segue o padrão de `src/components/owner/actionplan/board/CancelModal.jsx` (textarea obrigatória + checkbox de confirmação + botão destrutivo desabilitado até válido), mas construído em cima do `Modal` organism (`src/components/organisms/Modal.tsx`) já usado dentro do próprio `CarteiraClientes.container.tsx` (ex. modal "Cliente não respondeu", linhas 771-810) — não o `ui/dialog` shadcn, pra manter consistência visual do módulo CRM.

Props:
```ts
{
  open: boolean
  vendaResumo: { veiculo: string | null; valor: number; cliente: string }
  onConfirm: (motivo: string) => Promise<void>
  onClose: () => void
  saving: boolean
}
```
Validação: `motivo.trim().length >= 10` (espelha o mínimo da RPC) E checkbox "Confirmo que desejo cancelar esta venda" marcado.

### Integração no `FluxoClientePanel`
1. Regra de visibilidade (perto de `calcularQualidadeFicha`, linha 860): `etapa === 'ganho'` já é checado ali — adicionar util `dentroJanelaCancelamento(closedAt: string | null) => closedAt != null && (Date.now() - new Date(closedAt).getTime()) <= 7 * 86400000`. Botão só aparece se `oportunidade?.etapa === 'ganho' && oportunidade.seller_user_id === currentUserId && dentroJanelaCancelamento(oportunidade.closed_at)`.
   - Este painel é alimentado pela carteira self-scoped do vendedor (`useOportunidades.ts:141,154` força `seller_user_id = auth.uid()`), então aqui só existe o caminho "vendedor cancela a própria venda dentro do prazo" — o caminho privilegiado (gerente/dono, sem janela) vive só na Parte B.
2. Novo estado local: `cancelarVendaOpen`, `cancelarVendaSaving`.
3. Botão novo no footer sticky (linhas 1176-1188), ao lado de `Editar`/`Executar próximo passo`/`Fechar`, condicionado à regra acima — estilo `text-red-600 border-red-200 hover:bg-red-50` (consistente com o vermelho de ação destrutiva usado no `CancelModal.jsx`).
4. Nova prop no `FluxoClientePanel`: `onCancelarVenda: (oportunidadeId: string, motivo: string) => Promise<{ error: string | null }>`, passada pelo container (mesmo padrão de `onSalvarEdicao`, linha 725) chamando `cancelarVenda` do hook.
5. Fluxo: clicar botão → abre `CancelarVendaModal` → confirmar → `onCancelarVenda(oportunidade.id, motivo)` → erro vira `toast.error`, sucesso vira `toast.success('Venda cancelada.')` + fecha modal + fecha painel (`onClose()`) já que a oportunidade some da lista de vendas ativas.

## Design de UI — Parte B: "Vendas fechadas da loja" (gerente/dono)

Não existe hoje tela nem hook pra isso — é componente novo, não integração. `vendedor_performance_oficial` não serve de fonte (retorna agregado por vendedor, sem `oportunidade_id`) — a listagem consulta `oportunidades` direto, o que a RLS já permite: `oportunidades_store_read` dá `SELECT` pra `is_manager_of`/`is_owner_of`/roles internos MX (sem mudança de RLS necessária pra listar).

### Ponto de encaixe — nova tab, não nova rota isolada
`DashboardLoja`/`DashboardHeader` já têm um sistema de tabs (`'performance' | 'metas' | 'equipe'`, `DashboardHeader.tsx:22,48-50`) resolvido por `pathname`/`?tab=` em `DashboardLoja.tsx:58-63`. Todas as rotas de gerente/dono (`gerente/minha-equipe`, `gerente/meta-loja`, `lojas/:storeSlug/*`) já apontam pro mesmo componente `DashboardLoja` — mais simples adicionar uma 4ª tab `'vendas'` do que criar rota nova:
1. Estender `DashboardTab` (`DashboardHeader.tsx:22`) para incluir `'vendas'`.
2. Adicionar entrada no array de tabs (`DashboardHeader.tsx:48-50`) — ícone sugerido `Receipt` ou `ShoppingCart` (lucide-react, mesma lib dos outros ícones de tab).
3. Rota dedicada opcional `gerente/vendas` (mesmo padrão `RoleSwitch` das outras: `vendedor={<ForbiddenRoute />} gerente/dono/admin={<DashboardLoja />}`), somando ao branch de `activeTab` em `DashboardLoja.tsx:58-63`.
4. Branch de renderização em `DashboardLoja.tsx:193-226` (mesmo padrão que já alterna componente por `role==='gerente'` pras tabs `metas`/`equipe`) — reaproveita `selectedStoreId` já resolvido por `useStoreResolution.ts` (dono vê `activeStores` completo com seletor, gerente só as lojas com vínculo ativo — `selectableStores`/`onStoreChange` já existem e já são passados pra `ManagerSellerParityHomeCanonical`, mesmo padrão a repetir aqui).

### Hook novo — `useVendasLoja`
Local sugerido: `src/features/vendas-loja/hooks/useVendasLoja.ts` (feature nova, não cabe em `dashboard-loja/hooks` que hoje só tem agregados). Segue o padrão `useCallback`+`useEffect`+realtime channel já usado em `useDashboardLojaData.ts:134-167,170-229`:
```ts
function useVendasLoja(storeId: string | null, periodo: { inicio: string; fim: string }) {
  // select id, cliente:clientes(nome,telefone), seller:usuarios(name),
  //   veiculo_interesse, valor_negociado, closed_at, etapa,
  //   cancelada_em, cancelada_por, motivo_cancelamento
  // from oportunidades
  // where loja_id = eq(storeId) and etapa in ('ganho','cancelada')
  //   and closed_at between periodo.inicio and periodo.fim
  // order by closed_at desc
}
```
**Pendência a verificar antes de implementar:** RLS de `clientes` e `usuarios` para leitura escopada por gerente/dono ao fazer o join (`cliente:clientes(nome,...)`, `seller:usuarios(name)`) — não confirmado nesta investigação se `is_manager_of`/`is_owner_of` já tem policy de SELECT nessas duas tabelas relacionadas. Se não tiver, PostgREST retorna o join como `null` silenciosamente (não dá erro), o que quebraria a listagem sem avisar.

### Componente novo — `VendasFechadasLoja.tsx`
Local sugerido: `src/features/vendas-loja/VendasFechadasLoja.tsx`. Referência visual: `<table>` HTML crua (não shadcn `Table`, que não é usado em lugar nenhum do app) seguindo o padrão de `src/features/ranking/components/base44/TabelaRanking.tsx:24-80` (thead/tbody, `overflow-x-auto`, badges de status) combinado com o padrão de coluna de ações por linha de `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx:904-965` (`ClosingTable`/`ClosingRow`).

Colunas: `Cliente | Vendedor | Veículo | Valor | Data fechamento | Status | Ações`.
- Badge de status: verde "Vendida" (`etapa='ganho'`) vs. cinza "Cancelada" (`etapa='cancelada'`, com `motivo_cancelamento` em tooltip/expansível).
- Coluna Ações: botão "Cancelar venda" só quando `etapa === 'ganho'` — abre o mesmo `CancelarVendaModal` da Parte A (compartilhado), sem checagem de janela de 7 dias no frontend (gerente/dono não têm limite) — a RPC já valida isso no backend de qualquer forma, então mesmo que o frontend erre a regra de exibição, a RPC barra.
- Busca/filtro: reaproveita o padrão de `search` state + chips já usado em `CarteiraClientes.container.tsx` (linhas 333, 150, 170) — filtro por nome de cliente, por vendedor, por período (usa `periodo` do hook).

### Fluxo de cancelamento (Parte B)
Igual ao da Parte A a partir do modal: `CancelarVendaModal` → `cancelarVenda(oportunidadeId, motivo)` (mesma função do hook `useOportunidades`, ou uma cópia local em `useVendasLoja` chamando a mesma RPC `cancelar_venda`) → sucesso remove a linha da lista ativa (ou marca como "Cancelada" inline) + toast.

## Autoria/aprovação necessária

Conforme regras do projeto (`.claude/rules/agent-authority.md`), esquema de banco é escopo de `@data-engineer` (delegado por `@architect`), e nenhuma migration deve ser aplicada em produção sem revisão. Este documento é insumo pra essa revisão — não foi aplicado nada no banco.
