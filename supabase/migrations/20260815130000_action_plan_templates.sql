-- Módulo Administrador MX — biblioteca de templates de plano de ação.
--
-- O admin monta um template por departamento/indicador, versiona, publica e
-- aplica em clientes. Cada aplicação materializa linhas em planos_acao com
-- origem = 'consultor' e rastro para a versão aplicada.
--
-- Três tabelas em vez de uma: o template é a identidade estável (o que a
-- equipe chama de "template de ruptura de estoque"), a versão é o que se
-- publica e congela, e os itens pertencem à versão. Sem isso, editar um
-- template mudaria retroativamente o que já foi aplicado em cliente.

CREATE TABLE IF NOT EXISTS public.planos_acao_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key  text NOT NULL UNIQUE CHECK (template_key ~ '^[a-z0-9_]+$'),
  nome          text NOT NULL CHECK (length(trim(nome)) > 0),
  departamento  text NOT NULL CHECK (length(trim(departamento)) > 0),
  indicador     text,
  descricao     text,
  program_key   text,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planos_acao_template_versoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES public.planos_acao_templates(id) ON DELETE CASCADE,
  versao        integer NOT NULL CHECK (versao >= 1),
  status        text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicada', 'arquivada')),
  notas         text,
  published_at  timestamptz,
  published_by  uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, versao),
  CHECK (status <> 'publicada' OR published_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.planos_acao_template_itens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id          uuid NOT NULL REFERENCES public.planos_acao_template_versoes(id) ON DELETE CASCADE,
  ordem               integer NOT NULL DEFAULT 1 CHECK (ordem >= 1),
  problema            text NOT NULL CHECK (length(trim(problema)) > 0),
  acao                text NOT NULL CHECK (length(trim(acao)) > 0),
  como                text,
  departamento        text,
  indicador           text,
  prioridade          public.action_priority NOT NULL DEFAULT 'media',
  prazo_dias          integer CHECK (prazo_dias IS NULL OR prazo_dias >= 0),
  evidencia_requerida boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_template_versoes_template
  ON public.planos_acao_template_versoes (template_id, versao DESC);
CREATE INDEX IF NOT EXISTS idx_pa_template_itens_version
  ON public.planos_acao_template_itens (version_id, ordem);
CREATE INDEX IF NOT EXISTS idx_pa_templates_departamento
  ON public.planos_acao_templates (departamento)
  WHERE active;

-- Uma versão publicada por template é o padrão de aplicação; o índice parcial
-- deixa a regra explícita no banco em vez de depender da aplicação.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pa_template_versao_publicada
  ON public.planos_acao_template_versoes (template_id)
  WHERE status = 'publicada';

ALTER TABLE public.planos_acao_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_acao_template_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_acao_template_itens ENABLE ROW LEVEL SECURITY;

-- A biblioteca é material interno MX: leitura e escrita só para a área interna.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['planos_acao_templates', 'planos_acao_template_versoes', 'planos_acao_template_itens'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_select ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_select ON public.%I FOR SELECT TO authenticated USING (public.eh_area_interna_mx())',
      t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_write ON public.%I FOR ALL TO authenticated USING (public.eh_area_interna_mx()) WITH CHECK (public.eh_area_interna_mx())',
      t, t
    );
  END LOOP;
END $$;

REVOKE ALL ON public.planos_acao_templates FROM PUBLIC;
REVOKE ALL ON public.planos_acao_template_versoes FROM PUBLIC;
REVOKE ALL ON public.planos_acao_template_itens FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_acao_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_acao_template_versoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_acao_template_itens TO authenticated;

COMMENT ON TABLE public.planos_acao_templates IS
  'Biblioteca interna MX de templates de plano de ação (identidade estável).';
COMMENT ON TABLE public.planos_acao_template_versoes IS
  'Versões do template; só a versão publicada pode ser aplicada em cliente.';
COMMENT ON TABLE public.planos_acao_template_itens IS
  'Itens congelados de uma versão — viram linhas de planos_acao na aplicação.';
