-- P0: vazamento cross-loja pelo papel `dono`.
--
-- `current_user_role_codes` mapeia `vinculos_loja.role = 'dono'` para o código
-- global `master`. As policies abaixo combinavam um termo escopado
-- (`is_owner_of(loja_id)`) com um `user_has_role(ARRAY[...,'master',...])` que
-- NÃO recebe `loja_id` — o termo global anulava o escopado e o dono de uma loja
-- lia as linhas de todas as lojas.
--
-- `is_owner_of(loja_id)` já concede ao dono acesso à própria loja, então remover
-- o literal 'master' da lista global fecha o vazamento sem tirar acesso legítimo.
-- Papéis internos MX seguem cobertos por 'admin_mx' e 'consultant'.
--
-- Escopo: as 17 policies que já possuem `is_owner_of` na mesma expressão.
-- As policies globais puras (remuneracao_benchmark, banco_talentos, ...) não são
-- tocadas aqui — exigem decisão de produto por tabela.
--
-- Rollback: reinserir 'master'::text em cada ARRAY abaixo.

begin;

-- agendamentos
drop policy if exists agendamentos_store_read on public.agendamentos;
create policy agendamentos_store_read on public.agendamentos
  for select to authenticated
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- atendimentos
drop policy if exists atendimentos_store_read on public.atendimentos;
create policy atendimentos_store_read on public.atendimentos
  for select to authenticated
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- clientes
drop policy if exists clientes_store_read on public.clientes;
create policy clientes_store_read on public.clientes
  for select to authenticated
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- oportunidades
drop policy if exists oportunidades_store_read on public.oportunidades;
create policy oportunidades_store_read on public.oportunidades
  for select to authenticated
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- eventos_comerciais
drop policy if exists eventos_comerciais_store_read on public.eventos_comerciais;
create policy eventos_comerciais_store_read on public.eventos_comerciais
  for select to authenticated
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- cadencia_estado_cliente
drop policy if exists cadencia_estado_store_read on public.cadencia_estado_cliente;
create policy cadencia_estado_store_read on public.cadencia_estado_cliente
  for select to authenticated
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- carteira_campanhas
drop policy if exists carteira_campanhas_read on public.carteira_campanhas;
create policy carteira_campanhas_read on public.carteira_campanhas
  for select to authenticated
  using ((created_by = auth.uid()) or is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- carteira_missoes (roles {public} preservado)
drop policy if exists carteira_missoes_store_read on public.carteira_missoes;
create policy carteira_missoes_store_read on public.carteira_missoes
  for select
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- carteira_missao_itens
drop policy if exists carteira_missao_itens_read on public.carteira_missao_itens;
create policy carteira_missao_itens_read on public.carteira_missao_itens
  for select to authenticated
  using (exists (
    select 1 from carteira_missoes m
    where m.id = carteira_missao_itens.missao_id
      and (m.seller_user_id = auth.uid() or is_manager_of(m.loja_id) or is_owner_of(m.loja_id)
           or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]))
  ));

-- regularizacao_fechamento (SELECT)
drop policy if exists regularizacao_fechamento_store_manage on public.regularizacao_fechamento;
create policy regularizacao_fechamento_store_manage on public.regularizacao_fechamento
  for select to authenticated
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- regularizacao_fechamento (UPDATE)
drop policy if exists regularizacao_fechamento_store_approve on public.regularizacao_fechamento;
create policy regularizacao_fechamento_store_approve on public.regularizacao_fechamento
  for update to authenticated
  using (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]))
  with check (is_manager_of(loja_id) or is_owner_of(loja_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- seller_product_categories
drop policy if exists seller_product_categories_store_read on public.seller_product_categories;
create policy seller_product_categories_store_read on public.seller_product_categories
  for select to authenticated
  using ((store_id is not null) and (is_manager_of(store_id) or is_owner_of(store_id) or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text])));

-- vendedor_perfil
drop policy if exists vendedor_perfil_store_read on public.vendedor_perfil;
create policy vendedor_perfil_store_read on public.vendedor_perfil
  for select to authenticated
  using (((loja_id is not null) and (is_manager_of(loja_id) or is_owner_of(loja_id)))
         or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- aulas_ao_vivo (SELECT)
drop policy if exists aulas_ao_vivo_read on public.aulas_ao_vivo;
create policy aulas_ao_vivo_read on public.aulas_ao_vivo
  for select to authenticated
  using ((loja_id is null) or is_member_of(loja_id) or is_manager_of(loja_id) or is_owner_of(loja_id)
         or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- aulas_ao_vivo (ALL)
drop policy if exists aulas_ao_vivo_manage on public.aulas_ao_vivo;
create policy aulas_ao_vivo_manage on public.aulas_ao_vivo
  for all to authenticated
  using (((loja_id is not null) and (is_manager_of(loja_id) or is_owner_of(loja_id)))
         or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]))
  with check (((loja_id is not null) and (is_manager_of(loja_id) or is_owner_of(loja_id)))
         or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- aula_presencas
drop policy if exists aula_presencas_store_read on public.aula_presencas;
create policy aula_presencas_store_read on public.aula_presencas
  for select to authenticated
  using (((loja_id is not null) and (is_manager_of(loja_id) or is_owner_of(loja_id)))
         or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]));

-- aula_provas
drop policy if exists aula_provas_manage on public.aula_provas;
create policy aula_provas_manage on public.aula_provas
  for all to authenticated
  using (exists (
    select 1 from aulas_ao_vivo a
    where a.id = aula_provas.aula_id
      and (((a.loja_id is not null) and (is_manager_of(a.loja_id) or is_owner_of(a.loja_id)))
           or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]))
  ))
  with check (exists (
    select 1 from aulas_ao_vivo a
    where a.id = aula_provas.aula_id
      and (((a.loja_id is not null) and (is_manager_of(a.loja_id) or is_owner_of(a.loja_id)))
           or user_has_role(ARRAY['admin_mx'::text, 'consultant'::text]))
  ));

commit;
