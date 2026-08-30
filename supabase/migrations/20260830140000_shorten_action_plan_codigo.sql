-- Código executivo do PA: PA- + 8 hex (paridade Base44 / backfill 20260725190000).
-- RPCs posteriores gravaram o UUID inteiro (32 hex).

BEGIN;

-- O backfill é reversível: os códigos originais ficam num backup técnico
-- protegido, fora do alcance de anon/authenticated. O backup também torna a
-- migration idempotente sem substituir o valor original em uma segunda rodada.
CREATE TABLE IF NOT EXISTS public.migration_backup_planos_acao_codigo_20260830140000 (
  plan_id uuid PRIMARY KEY,
  codigo_original text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.migration_backup_planos_acao_codigo_20260830140000
  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.migration_backup_planos_acao_codigo_20260830140000
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.migration_backup_planos_acao_codigo_20260830140000
  TO service_role;
DROP POLICY IF EXISTS migration_backup_planos_acao_codigo_service_role
  ON public.migration_backup_planos_acao_codigo_20260830140000;
CREATE POLICY migration_backup_planos_acao_codigo_service_role
  ON public.migration_backup_planos_acao_codigo_20260830140000
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
COMMENT ON TABLE public.migration_backup_planos_acao_codigo_20260830140000 IS
  'Backup técnico protegido dos códigos de Plano de Ação antes do backfill Base44 de 2026-08-30.';

INSERT INTO public.migration_backup_planos_acao_codigo_20260830140000 (
  plan_id, codigo_original
)
SELECT id, codigo
FROM public.planos_acao
WHERE codigo ~* '^PA-[0-9a-f]{16,}$'
ON CONFLICT (plan_id) DO NOTHING;

UPDATE public.planos_acao
SET codigo = 'PA-' || substr(upper(regexp_replace(codigo, '^PA-', '', 'i')), 1, 8)
WHERE codigo ~* '^PA-[0-9a-f]{16,}$'
  AND EXISTS (
    SELECT 1
    FROM public.migration_backup_planos_acao_codigo_20260830140000 backup
    WHERE backup.plan_id = planos_acao.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.planos_acao other
    WHERE other.id <> planos_acao.id
      AND other.codigo = 'PA-' || substr(upper(regexp_replace(planos_acao.codigo, '^PA-', '', 'i')), 1, 8)
  );

CREATE OR REPLACE FUNCTION public.criar_plano_acao_v2(
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
) RETURNS planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    'PA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    p_scope_type, p_scope_id, nullif(trim(p_objetivo), ''), trim(p_departamento),
    trim(p_indicador), trim(p_problema), trim(p_acao), nullif(trim(p_como), ''),
    p_responsavel_id, p_prazo, p_prioridade, p_origem, auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

COMMIT;
