-- Fixa `search_path` nas 28 funcoes de `public` que ainda o tinham mutavel
-- (Security Advisor: `function_search_path_mutable`).
--
-- Sem `search_path` fixo, a resolucao de nomes dentro da funcao depende do
-- `search_path` de quem chama. Um usuario que consiga criar objetos em um schema a
-- frente de `public` faz a funcao chamar o objeto dele. Em `get_user_agency_id()`,
-- que e SECURITY DEFINER, isso vale execucao com os privilegios do owner -- e o unico
-- caso de escalacao real desta lista; as demais sao triggers de `updated_at` e
-- helpers, corrigidas junto por higiene.
--
-- `public, pg_catalog` e o mesmo valor ja usado pelas funcoes sadias do projeto. Todas
-- as funcoes abaixo resolvem apenas objetos de `public`, entao o comportamento nao
-- muda.

do $$
declare
  fn record;
  touched int := 0;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        p.proconfig is null
        or not exists (
          select 1 from unnest(p.proconfig) c where c like 'search_path=%'
        )
      )
  loop
    execute format('alter function %s set search_path = public, pg_catalog', fn.sig);
    touched := touched + 1;
  end loop;

  raise notice 'search_path fixado em % funcao(oes)', touched;
end $$;

-- ============================================================
-- DOWN
-- ============================================================
-- Remove o search_path fixo das funcoes que esta migration tocou.
-- BEGIN;
-- do $$
-- declare fn record;
-- begin
--   for fn in
--     select p.oid::regprocedure as sig
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public' and p.prokind = 'f'
--   loop
--     execute format('alter function %s reset search_path', fn.sig);
--   end loop;
-- end $$;
-- COMMIT;
