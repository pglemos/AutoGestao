-- Rate-limit persistente para request-password-recovery.
--
-- Achado na auditoria de 2026-07-24: a Edge Function usava um Map()
-- em memoria do processo Deno como limitador (3 tentativas / 15min).
-- Edge Functions rodam em instancias serverless efemeras/distribuidas —
-- cada invocacao pode cair numa instancia diferente, e um cold start zera
-- o Map. Na pratica o limite nao era confiavel: um atacante distribuido
-- entre instancias passava direto, e um usuario legitimo podia ser limitado
-- de forma inconsistente dependendo de qual instancia atendeu a requisicao.
--
-- Esta migration move o contador pro Postgres (upsert atomico, sem race
-- condition) para que o limite valha de verdade entre todas as instancias.

BEGIN;

CREATE TABLE IF NOT EXISTS public.password_recovery_attempts (
  attempt_key text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_recovery_attempts ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role (Edge Function) acessa esta tabela.
-- anon/authenticated ficam bloqueados por padrao (RLS deny-by-default).

CREATE OR REPLACE FUNCTION public.check_and_increment_recovery_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_attempts integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.password_recovery_attempts AS t (attempt_key, attempt_count, window_started_at, updated_at)
  VALUES (p_key, 1, now(), now())
  ON CONFLICT (attempt_key) DO UPDATE SET
    attempt_count = CASE
      WHEN t.window_started_at < now() - make_interval(secs => p_window_seconds) THEN 1
      ELSE t.attempt_count + 1
    END,
    window_started_at = CASE
      WHEN t.window_started_at < now() - make_interval(secs => p_window_seconds) THEN now()
      ELSE t.window_started_at
    END,
    updated_at = now()
  RETURNING attempt_count INTO v_count;

  RETURN v_count <= p_max_attempts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_recovery_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_recovery_rate_limit(text, integer, integer) TO service_role;

COMMIT;
