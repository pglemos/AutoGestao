-- Acrescenta owner_can_sell ao contexto de gestão comercial.
--
-- A capacidade do dono de lançar vendas próprias (usuarios.is_venda_loja) é
-- independente de ele acumular ou não a gestão comercial. Retornamos as duas
-- dimensões juntas para que o frontend não precise cruzar as fontes.

drop function if exists public.store_management_context(uuid);

create or replace function public.store_management_context(
  p_store_id uuid,
  p_owner_user_id uuid default null
)
returns table (
  store_id uuid,
  has_active_manager boolean,
  active_manager_ids uuid[],
  active_manager_count integer,
  owner_assumes_management boolean,
  owner_can_sell boolean,
  commercial_access_mode text
)
language sql
stable
security invoker
set search_path = public
as $$
  with managers as (
    select v.user_id
    from public.vinculos_loja v
    where v.store_id = p_store_id
      and v.role = 'gerente'
      and v.is_active
      and v.ended_at is null
  ),
  owner_flag as (
    select coalesce(bool_or(u.is_venda_loja), false) as can_sell
    from public.usuarios u
    where p_owner_user_id is not null and u.id = p_owner_user_id
  )
  select
    p_store_id,
    (select count(*) from managers) > 0,
    coalesce((select array_agg(user_id) from managers), '{}'::uuid[]),
    (select count(*) from managers)::integer,
    (select count(*) from managers) = 0,
    coalesce((select can_sell from owner_flag), false),
    case when (select count(*) from managers) > 0 then 'acompanhamento' else 'gestao' end;
$$;

comment on function public.store_management_context(uuid, uuid) is
  'Resolve a estrutura de gestão comercial da loja pelos vínculos ativos. owner_assumes_management = NOT has_active_manager; owner_can_sell vem de usuarios.is_venda_loja e é independente. Não usa lojas.manager_email, que é lista de destinatários de relatório.';

grant execute on function public.store_management_context(uuid, uuid) to authenticated;

-- DOWN
-- drop function if exists public.store_management_context(uuid, uuid);
