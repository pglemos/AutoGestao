-- Criar plano de acao e exclusivo da area interna MX.
--
-- Regra do produto: Dono, Gerente e Vendedor NAO criam plano de acao nem plano
-- estrategico — quem cria e o Admin MX / Administrador MX / Consultor MX. Esses
-- papeis EXECUTAM o plano que a MX criou.
--
-- A checagem e separada de `can_manage_mx_action_scope` de proposito: aquela
-- continua valendo para atualizar status, progresso, checklist e evidencia, que
-- sao do Dono e do Gerente. Restringir a funcao inteira tiraria a execucao.
create or replace function public.can_create_mx_action_scope(
  p_scope_type score_scope_type,
  p_scope_id uuid,
  uid uuid default auth.uid()
) returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
BEGIN
  IF uid IS NULL OR p_scope_id IS NULL THEN RETURN false; END IF;
  IF NOT public.eh_area_interna_mx(uid) THEN RETURN false; END IF;
  RETURN public.can_manage_mx_action_scope(p_scope_type, p_scope_id, uid);
END;
$function$;

revoke all on function public.can_create_mx_action_scope(score_scope_type, uuid, uuid) from public;
grant execute on function public.can_create_mx_action_scope(score_scope_type, uuid, uuid) to authenticated, service_role;

create or replace function public.criar_plano_acao_v2(
  p_scope_type score_scope_type,
  p_scope_id uuid,
  p_objetivo text,
  p_departamento text,
  p_indicador text,
  p_problema text,
  p_acao text,
  p_como text default null,
  p_responsavel_id uuid default null,
  p_prazo date default null,
  p_prioridade action_priority default 'media'::action_priority,
  p_origem action_origin default 'manual'::action_origin
) returns planos_acao
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_row public.planos_acao;
BEGIN
  IF NOT public.can_create_mx_action_scope(p_scope_type, p_scope_id) THEN
    RAISE EXCEPTION 'Apenas a area interna MX cria plano de acao. Dono, Gerente e Vendedor executam o plano.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF nullif(trim(coalesce(p_departamento, '')), '') IS NULL
     OR nullif(trim(coalesce(p_indicador, '')), '') IS NULL
     OR nullif(trim(coalesce(p_problema, '')), '') IS NULL
     OR nullif(trim(coalesce(p_acao, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Departamento, indicador, problema e ação são obrigatórios.';
  END IF;

  INSERT INTO public.planos_acao (
    codigo, scope_type, scope_id, objetivo, departamento, indicador, problema,
    acao, como, responsavel_id, prazo, prioridade, origem, created_by
  ) VALUES (
    'PA-' || upper(replace(gen_random_uuid()::text, '-', '')),
    p_scope_type, p_scope_id, nullif(trim(p_objetivo), ''), trim(p_departamento),
    trim(p_indicador), trim(p_problema), trim(p_acao), nullif(trim(p_como), ''),
    p_responsavel_id, p_prazo, p_prioridade, p_origem, auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;
