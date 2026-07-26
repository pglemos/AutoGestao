-- Plano de Ação canônico: campos necessários para a tabela detalhada do Base44.
-- Mantém planos existentes e torna código, objetivo e progresso persistentes.

BEGIN;

ALTER TYPE public.action_status ADD VALUE IF NOT EXISTS 'cancelada';

ALTER TABLE public.planos_acao
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS objetivo text,
  ADD COLUMN IF NOT EXISTS progresso smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iniciado_at timestamptz,
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comentarios jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.planos_acao
SET codigo = 'PA-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE codigo IS NULL OR length(trim(codigo)) = 0;

ALTER TABLE public.planos_acao
  DROP CONSTRAINT IF EXISTS planos_acao_progresso_check,
  ADD CONSTRAINT planos_acao_progresso_check
    CHECK (progresso BETWEEN 0 AND 100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planos_acao_codigo
  ON public.planos_acao(codigo);

CREATE OR REPLACE FUNCTION public.planos_acao_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();

  IF NEW.prazo IS NOT NULL
     AND NEW.prazo < CURRENT_DATE
     AND NEW.status IN ('pendente', 'em_andamento') THEN
    NEW.status = 'atrasado';
  END IF;

  IF NEW.status = 'concluido' THEN
    NEW.progresso = 100;
    IF NEW.concluido_at IS NULL THEN NEW.concluido_at = now(); END IF;
  ELSIF NEW.status = 'cancelada' THEN
    NEW.concluido_at = NULL;
  ELSIF NEW.status IN ('em_andamento', 'atrasado', 'validando_eficacia')
        AND NEW.iniciado_at IS NULL THEN
    NEW.iniciado_at = now();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.planos_acao.codigo IS
  'Código estável exibido na tabela executiva do Plano de Ação.';
COMMENT ON COLUMN public.planos_acao.objetivo IS
  'Objetivo estratégico associado à ação.';
COMMENT ON COLUMN public.planos_acao.progresso IS
  'Percentual de execução da ação, de 0 a 100.';
COMMENT ON COLUMN public.planos_acao.checklist IS
  'Itens de execução do Plano de Ação compartilhados entre os perfis MX.';
COMMENT ON COLUMN public.planos_acao.comentarios IS
  'Comentários de execução do Plano de Ação compartilhados entre os perfis MX.';

COMMIT;
