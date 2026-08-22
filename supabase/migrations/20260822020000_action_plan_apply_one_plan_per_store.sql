-- Base44 cria EXATAMENTE UM ActionPlan por aplicação (itens no checklist).
-- O índice antigo chaveava por template_item_id e empurrava N linhas por loja.
-- Novas aplicações: 1 plano por unidade, sem template_item_id no nível do plano.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS planos_acao_template_application_scope_uidx
ON public.planos_acao (
  scope_id,
  origem_ref_id,
  ((transition_metadata ->> 'template_application_request_id'))
)
WHERE scope_type = 'store'
  AND origem_ref_table = 'planos_acao_template_versoes'
  AND origem_ref_id IS NOT NULL
  AND transition_metadata ? 'template_application_request_id'
  AND NOT (transition_metadata ? 'template_item_id');

COMMENT ON INDEX public.planos_acao_template_application_scope_uidx IS
  'Uma aplicação (request_id) materializa no máximo um plano por unidade. Itens ficam no checklist.';

COMMIT;
