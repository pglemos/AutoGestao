-- Libera os planos padrao da metodologia como recomendacao no Modulo Dono.
--
-- Ficam de fora os dois artefatos de QA ("QA paridade Cursor", "QA wizard
-- Cursor 2208"): sao restos de teste e apareceriam ao Dono de um cliente real
-- como sugestao da MX.
update public.planos_acao_templates
   set owner_suggestion_enabled = true,
       updated_at = now()
 where active
   and nome not ilike 'QA %'
   and exists (
     select 1 from public.planos_acao_template_versoes v
      where v.template_id = planos_acao_templates.id
        and v.status = 'publicada'
   );
