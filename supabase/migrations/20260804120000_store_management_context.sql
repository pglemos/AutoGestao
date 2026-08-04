-- Contexto canônico de gestão comercial da loja.
--
-- A existência de gerente é determinada pelo vínculo ativo em vinculos_loja
-- (role = 'gerente', is_active, ended_at IS NULL), nunca por lojas.manager_email.
--
-- Nota deliberada: NÃO sincronizamos lojas.manager_email a partir do vínculo.
-- Em produção esse campo guarda listas de distribuição separadas por vírgula
-- (ex.: BROTHERS CAR, LIAL e PISCAR têm de 4 a 8 destinatários). Sobrescrever
-- com o e-mail do gerente destruiria a entrega de relatórios. O campo continua
-- sendo apenas destinatário de relatório e não comanda permissão alguma.

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
  'Resolve a estrutura de gestão comercial da loja a partir dos vínculos ativos. owner_assumes_management = NOT has_active_manager. Não usa lojas.manager_email, que é lista de destinatários de relatório.';

grant execute on function public.store_management_context(uuid) to authenticated;

-- DOWN
-- drop function if exists public.store_management_context(uuid);
