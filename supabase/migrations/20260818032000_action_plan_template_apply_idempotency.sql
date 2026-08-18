-- Garante idempotência por item na aplicação de versões publicadas de Plano Padrão.
--
-- O frontend grava em transition_metadata:
--   template_application_request_id = UUID estável da tentativa
--   template_item_id                = UUID do item da versão
--
-- A mesma requisição pode ser reenviada após timeout/retry/refresh sem materializar
-- o mesmo item duas vezes. Aplicações deliberadamente novas usam outro request_id.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS planos_acao_template_application_item_uidx
ON public.planos_acao (
  scope_id,
  origem_ref_id,
  ((transition_metadata ->> 'template_application_request_id')),
  ((transition_metadata ->> 'template_item_id'))
)
WHERE scope_type = 'store'
  AND origem_ref_table = 'planos_acao_template_versoes'
  AND origem_ref_id IS NOT NULL
  AND transition_metadata ? 'template_application_request_id'
  AND transition_metadata ? 'template_item_id';

COMMENT ON INDEX public.planos_acao_template_application_item_uidx IS
  'Impede duplicação do mesmo item de Plano Padrão na mesma requisição de aplicação. Request IDs distintos continuam permitindo reaplicação deliberada.';

COMMIT;

-- DOWN
-- DROP INDEX IF EXISTS public.planos_acao_template_application_item_uidx;
