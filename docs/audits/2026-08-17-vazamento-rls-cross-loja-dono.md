# P0 — Vazamento cross-loja pelo papel `dono` (RLS)

**Descoberto:** 2026-08-17
**SHA:** `2ed22ae1` · **Projeto Supabase:** `fbhcmzzgwjdgkctlfvbo`
**Status:** CONFIRMADO EM PRODUÇÃO — correção **não aplicada**, aguardando autorização.

## O que acontece

Um usuário com vínculo `dono` em **uma** loja lê dados de **todas** as lojas em várias tabelas comerciais.

Medido com JWT real (login `dono@mxgestaopreditiva.com.br`, vinculado só à loja MX CONSULTORIA, entre 60 lojas), consultando a API REST direto — sem passar pelo frontend:

| Tabela | Linhas visíveis | Lojas distintas | Fora da própria loja |
|---|---|---|---|
| `lojas` | 1 | 1 | 0 ✅ |
| `vinculos_loja` | 10 | 1 | 0 ✅ |
| `agendamentos` | **447** | **27** | **26** ❌ |
| `clientes` | **789** | **29** | **28** ❌ |

Gerente e vendedor da mesma loja estão corretamente isolados (1 loja, 0 vazamento). O problema é exclusivo do papel `dono`.

## Causa raiz

`public.current_user_role_codes(uid)` traduz o vínculo de loja para um código de papel:

```sql
WHEN lower(v.role) IN ('dono','owner','master') THEN 'master'
```

Ou seja: **todo `dono` recebe o código global `master`**.

As policies afetadas combinam um teste com escopo e um teste sem escopo:

```sql
-- clientes_store_read / agendamentos_store_read
is_manager_of(loja_id)                                        -- escopado ✅
OR is_owner_of(loja_id)                                       -- escopado ✅
OR user_has_role(ARRAY['admin_mx','master','consultant'])     -- GLOBAL ❌
```

O terceiro termo não recebe `loja_id`. Como o dono carrega o código `master`, ele satisfaz o `OR` global e enxerga todas as linhas da tabela.

O gerente vira `sales_manager` e o vendedor vira `seller` — nenhum dos dois está na lista, por isso ficam isolados. O bug atinge só quem é mapeado para `master`.

Note que `is_owner_of(loja_id)` **já cobre o dono corretamente**, com escopo. O `'master'` na lista global é ao mesmo tempo redundante e a origem do vazamento.

## Alcance

49 policies em `public` usam `'master'` dentro de `user_has_role`:

- **17 policies** já têm `is_owner_of(loja_id)` na mesma expressão → aqui `'master'` é redundante; removê-lo fecha o vazamento sem tirar acesso legítimo. Inclui `clientes`, `agendamentos`, `atendimentos`, `oportunidades`, `eventos_comerciais`, `carteira_missoes`, `carteira_campanhas`, `cadencia_estado_cliente`, `regularizacao_fechamento`, `seller_product_categories`, `vendedor_perfil`, `aulas_ao_vivo`, `aula_presencas`, `aula_provas`, `carteira_missao_itens`.
- **21 policies** são globais puras, sem nenhum termo de escopo — precisam de decisão de produto caso a caso, não de remoção mecânica. Entre elas: `remuneracao_benchmark`, `banco_talentos`, `carreira_niveis`, `organograma_nos`, `comportamental_*`, `push_subscriptions`, `universidade_certificacoes`. Um dono lendo `remuneracao_benchmark` de toda a base é o mesmo tipo de problema, com impacto potencialmente maior.
- **11 policies** já combinam `'master'` com um segundo termo escopado (`can_access_mx_scope`, `tem_papel_loja`, `user_is_master_loja`) → provavelmente corretas.

## Correção proposta (não aplicada)

**Fase 1 — fechar o vazamento comercial confirmado.** Migration removendo `'master'` da lista de `user_has_role` nas 17 policies que já possuem `is_owner_of(loja_id)`. O dono mantém acesso à própria loja pelo termo escopado. Reversível: a migration de rollback reinsere o literal.

**Fase 2 — auditar as 21 globais puras.** Decidir por tabela se `master` deve mesmo ser global. `remuneracao_benchmark` e `banco_talentos` são os primeiros candidatos a escopo.

**Fase 3 — renomear.** O código `master` significa "dono de uma loja", mas é lido em todo lugar como "superusuário". A ambiguidade é o que produziu o bug. Renomear para `store_owner` deixaria o erro impossível de repetir.

Antes e depois de cada fase, reexecutar a medição por JWT real acima — a mesma que expôs o problema. Suíte verde não detecta isso: os testes atuais passam com o vazamento ativo.

## Por que não apliquei

São 49 policies de RLS em produção, mexendo em acesso de usuários reais. A Fase 1 é cirúrgica e reversível, mas alterar autorização em massa sem o teu aval não é decisão minha.
