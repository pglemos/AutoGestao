-- Contexto canônico de gestão comercial da loja.
--
-- A existência de gerente é determinada pelo vínculo ativo em vinculos_loja
-- (role = 'gerente', is_active, ended_at IS NULL), nunca por lojas.manager_email.
-- O manager_email permanece apenas como destinatário de relatórios e é
-- sincronizado a partir do vínculo real.

create or replace function public.store_management_context(p_store_id uuid)
returns table (
  store_id uuid,
  has_active_manager boolean,
  active_manager_ids uuid[],
  active_manager_count integer,
  owner_assumes_management boolean,
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
  )
  select
    p_store_id,
    count(*) > 0,
    coalesce(array_agg(user_id), '{}'::uuid[]),
    count(*)::integer,
    count(*) = 0,
    case when count(*) > 0 then 'acompanhamento' else 'gestao' end
  from managers;
$$;

comment on function public.store_management_context(uuid) is
  'Resolve a estrutura de gestão comercial da loja a partir dos vínculos ativos. owner_assumes_management = NOT has_active_manager.';

-- Sincroniza lojas.manager_email a partir do vínculo gerencial ativo.
create or replace function public.sync_store_manager_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid := coalesce(new.store_id, old.store_id);
  v_email text;
begin
  select u.email
  into v_email
  from public.vinculos_loja v
  join public.usuarios u on u.id = v.user_id
  where v.store_id = v_store_id
    and v.role = 'gerente'
    and v.is_active
    and v.ended_at is null
  order by v.created_at asc
  limit 1;

  update public.lojas
  set manager_email = v_email
  where id = v_store_id
    and manager_email is distinct from v_email;

  return null;
end;
$$;

drop trigger if exists trg_sync_store_manager_email on public.vinculos_loja;
create trigger trg_sync_store_manager_email
after insert or update or delete on public.vinculos_loja
for each row
execute function public.sync_store_manager_email();

-- Reconciliação única do estado atual (3 lojas com e-mail sem vínculo,
-- 8 com vínculo sem e-mail no levantamento de 2026-08-04).
update public.lojas l
set manager_email = sub.email
from (
  select distinct on (v.store_id) v.store_id, u.email
  from public.vinculos_loja v
  join public.usuarios u on u.id = v.user_id
  where v.role = 'gerente' and v.is_active and v.ended_at is null
  order by v.store_id, v.created_at asc
) sub
where l.id = sub.store_id
  and l.manager_email is distinct from sub.email;

update public.lojas l
set manager_email = null
where l.manager_email is not null
  and not exists (
    select 1
    from public.vinculos_loja v
    where v.store_id = l.id
      and v.role = 'gerente'
      and v.is_active
      and v.ended_at is null
  );
