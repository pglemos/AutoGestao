-- Jornada de Consultoria com autonomia assistida.
-- Reutiliza clientes, visitas, aulas, agenda e evidências canônicas.
BEGIN;

ALTER TABLE public.visitas_consultoria
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.universidade_aulas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS materiais jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS anticipation_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confidentiality_level text NOT NULL DEFAULT 'standard';

ALTER TABLE public.evidencias_visita DROP CONSTRAINT IF EXISTS evidencias_visita_tipo_check;
ALTER TABLE public.evidencias_visita
  ADD CONSTRAINT evidencias_visita_tipo_check CHECK (
    tipo IN ('foto','anexo','ata','print','documento','observacao','link','texto','planilha','pdf')
  );
ALTER TABLE public.evidencias_visita
  ADD COLUMN IF NOT EXISTS url_externa text,
  ADD COLUMN IF NOT EXISTS texto_conteudo text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'enviada',
  ADD COLUMN IF NOT EXISTS devolutiva text,
  ADD COLUMN IF NOT EXISTS analisada_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analisada_at timestamptz,
  ADD COLUMN IF NOT EXISTS versao_anterior_id uuid REFERENCES public.evidencias_visita(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS substituida_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS substituida_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.evidencias_visita DROP CONSTRAINT IF EXISTS evidencias_visita_status_check;
ALTER TABLE public.evidencias_visita
  ADD CONSTRAINT evidencias_visita_status_check CHECK (
    status IN ('pendente','enviada','em_analise','aprovada','devolvida','substituida')
  );

CREATE TABLE IF NOT EXISTS public.consultoria_progresso_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visitas_consultoria(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.universidade_aulas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  position_seconds integer NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  played_seconds integer NOT NULL DEFAULT 0 CHECK (played_seconds >= 0),
  percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  started_at timestamptz,
  last_played_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, lesson_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.consultoria_itens_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.visitas_consultoria(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.universidade_aulas(id) ON DELETE SET NULL,
  evidence_id uuid REFERENCES public.evidencias_visita(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('lesson','participant','document','data','material','task','evidence')),
  source_key text NOT NULL,
  title text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','reopened')),
  responsible_user_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  due_at timestamptz,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consultoria_participantes_encontro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.visitas_consultoria(id) ON DELETE CASCADE,
  participant_key text NOT NULL,
  user_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  name text NOT NULL,
  role_label text,
  required boolean NOT NULL DEFAULT true,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_id, participant_key)
);

CREATE TABLE IF NOT EXISTS public.consultoria_solicitacoes_antecipacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.visitas_consultoria(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'under_review' CHECK (
    status IN ('draft','under_review','approved','date_adjustment_requested','rejected','cancelled')
  ),
  reason text NOT NULL,
  preferred_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  eligibility_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  approved_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_consultoria_antecipacao_ativa
  ON public.consultoria_solicitacoes_antecipacao(visit_id)
  WHERE status IN ('draft','under_review','date_adjustment_requested','approved');

CREATE TABLE IF NOT EXISTS public.consultoria_historico_antecipacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.consultoria_solicitacoes_antecipacao(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultoria_itens_entrega
  ADD COLUMN IF NOT EXISTS source_key text;
UPDATE public.consultoria_itens_entrega
SET source_key = 'legacy:' || id::text
WHERE source_key IS NULL OR trim(source_key) = '';
ALTER TABLE public.consultoria_itens_entrega
  ALTER COLUMN source_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_consultoria_entrega_source
  ON public.consultoria_itens_entrega(visit_id, source_key);

CREATE OR REPLACE FUNCTION public.sincronizar_jornada_consultoria_visita(p_visit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visitas_consultoria;
  v_store_id uuid;
  v_item jsonb;
  v_order integer;
  v_evidence_required text;
BEGIN
  SELECT * INTO v_visit FROM public.visitas_consultoria WHERE id = p_visit_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT primary_store_id INTO v_store_id FROM public.clientes_consultoria WHERE id = v_visit.client_id;
  IF v_store_id IS NULL THEN RETURN; END IF;

  -- O progresso da aula é persistido separadamente; não transforma a aula em item de Entrega.

  v_order := 0;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_visit.checklist_data, '[]'::jsonb))
  LOOP
    v_order := v_order + 1;
    INSERT INTO public.consultoria_itens_entrega(
      client_id, store_id, visit_id, item_type, source_key, title, required,
      status, sort_order
    ) VALUES (
      v_visit.client_id, v_store_id, v_visit.id, 'task', 'checklist:' || v_order::text,
      COALESCE(NULLIF(v_item ->> 'task', ''), NULLIF(v_item #>> '{}', ''), 'Item de preparação'),
      true,
      CASE WHEN lower(COALESCE(v_item ->> 'completed', 'false')) IN ('true','t','1','yes','sim') THEN 'completed' ELSE 'pending' END,
      10 + v_order
    )
    ON CONFLICT (visit_id, source_key) DO UPDATE
      SET title = EXCLUDED.title, required = EXCLUDED.required,
          sort_order = EXCLUDED.sort_order, updated_at = now();
  END LOOP;

  SELECT evidence_required INTO v_evidence_required
  FROM public.etapas_metodologia_consultoria
  WHERE visit_number = v_visit.visit_number
  LIMIT 1;
  IF NULLIF(trim(COALESCE(v_evidence_required, '')), '') IS NOT NULL THEN
    INSERT INTO public.consultoria_itens_entrega(
      client_id, store_id, visit_id, item_type, source_key, title, description,
      required, status, sort_order
    ) VALUES (
      v_visit.client_id, v_store_id, v_visit.id, 'evidence', 'evidence:required',
      'Enviar evidência obrigatória', v_evidence_required, true, 'pending', 900
    )
    ON CONFLICT (visit_id, source_key) DO UPDATE
      SET title = EXCLUDED.title, description = EXCLUDED.description,
          required = true, updated_at = now();
  END IF;

  INSERT INTO public.consultoria_participantes_encontro(
    client_id, store_id, visit_id, participant_key, name, role_label, required
  )
  SELECT v_visit.client_id, v_store_id, v_visit.id, 'contact:' || c.id::text,
    c.name, c.role, c.is_primary
  FROM public.contatos_cliente_consultoria c
  WHERE c.client_id = v_visit.client_id
  ON CONFLICT (visit_id, participant_key) DO UPDATE
    SET name = EXCLUDED.name, role_label = EXCLUDED.role_label,
        required = EXCLUDED.required, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sincronizar_jornada_consultoria_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sincronizar_jornada_consultoria_visita(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visitas_consultoria_jornada ON public.visitas_consultoria;
CREATE TRIGGER trg_visitas_consultoria_jornada
AFTER INSERT OR UPDATE OF client_id, lesson_id, checklist_data, visit_number
ON public.visitas_consultoria
FOR EACH ROW EXECUTE FUNCTION public.trg_sincronizar_jornada_consultoria_visita();

DO $$
DECLARE v_visit_id uuid;
BEGIN
  FOR v_visit_id IN SELECT id FROM public.visitas_consultoria LOOP
    PERFORM public.sincronizar_jornada_consultoria_visita(v_visit_id);
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_consultoria_progresso_store_visit ON public.consultoria_progresso_aula(store_id, visit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_consultoria_entrega_visit ON public.consultoria_itens_entrega(visit_id, required, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_consultoria_participantes_visit ON public.consultoria_participantes_encontro(visit_id, required, confirmed);
CREATE INDEX IF NOT EXISTS idx_consultoria_antecipacao_store ON public.consultoria_solicitacoes_antecipacao(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidencias_visita_status ON public.evidencias_visita(visita_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.pode_acessar_jornada_consultoria(
  p_store_id uuid,
  p_client_id uuid,
  uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid IS NOT NULL AND (
    public.eh_area_interna_mx(uid)
    OR public.can_access_consulting_client(p_client_id)
    OR public.user_is_master_loja(p_store_id, uid)
    OR public.tem_papel_loja(p_store_id, ARRAY['dono'], uid)
    OR public.is_owner_of(p_store_id)
  ) AND EXISTS (
    SELECT 1 FROM public.clientes_consultoria c
    WHERE c.id = p_client_id
      AND c.primary_store_id = p_store_id
  )
$$;

ALTER TABLE public.consultoria_progresso_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultoria_itens_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultoria_participantes_encontro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultoria_solicitacoes_antecipacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultoria_historico_antecipacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultoria_progresso_select ON public.consultoria_progresso_aula;
CREATE POLICY consultoria_progresso_select ON public.consultoria_progresso_aula
  FOR SELECT TO authenticated
  USING (public.pode_acessar_jornada_consultoria(store_id, client_id));
DROP POLICY IF EXISTS consultoria_progresso_write ON public.consultoria_progresso_aula;
CREATE POLICY consultoria_progresso_write ON public.consultoria_progresso_aula
  FOR ALL TO authenticated
  USING (public.pode_acessar_jornada_consultoria(store_id, client_id) AND (user_id = auth.uid() OR public.eh_area_interna_mx(auth.uid())))
  WITH CHECK (public.pode_acessar_jornada_consultoria(store_id, client_id) AND (user_id = auth.uid() OR public.eh_area_interna_mx(auth.uid())));

DROP POLICY IF EXISTS consultoria_entrega_select ON public.consultoria_itens_entrega;
CREATE POLICY consultoria_entrega_select ON public.consultoria_itens_entrega
  FOR SELECT TO authenticated USING (public.pode_acessar_jornada_consultoria(store_id, client_id));
DROP POLICY IF EXISTS consultoria_entrega_write ON public.consultoria_itens_entrega;
CREATE POLICY consultoria_entrega_write ON public.consultoria_itens_entrega
  FOR ALL TO authenticated
  USING (public.pode_acessar_jornada_consultoria(store_id, client_id))
  WITH CHECK (public.pode_acessar_jornada_consultoria(store_id, client_id));

DROP POLICY IF EXISTS consultoria_participantes_select ON public.consultoria_participantes_encontro;
CREATE POLICY consultoria_participantes_select ON public.consultoria_participantes_encontro
  FOR SELECT TO authenticated USING (public.pode_acessar_jornada_consultoria(store_id, client_id));
DROP POLICY IF EXISTS consultoria_participantes_write ON public.consultoria_participantes_encontro;
CREATE POLICY consultoria_participantes_write ON public.consultoria_participantes_encontro
  FOR ALL TO authenticated
  USING (public.pode_acessar_jornada_consultoria(store_id, client_id))
  WITH CHECK (public.pode_acessar_jornada_consultoria(store_id, client_id));

DROP POLICY IF EXISTS consultoria_antecipacao_select ON public.consultoria_solicitacoes_antecipacao;
CREATE POLICY consultoria_antecipacao_select ON public.consultoria_solicitacoes_antecipacao
  FOR SELECT TO authenticated USING (public.pode_acessar_jornada_consultoria(store_id, client_id));
DROP POLICY IF EXISTS consultoria_antecipacao_insert ON public.consultoria_solicitacoes_antecipacao;
CREATE POLICY consultoria_antecipacao_insert ON public.consultoria_solicitacoes_antecipacao
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_acessar_jornada_consultoria(store_id, client_id) AND requested_by = auth.uid());
DROP POLICY IF EXISTS consultoria_antecipacao_internal_update ON public.consultoria_solicitacoes_antecipacao;
CREATE POLICY consultoria_antecipacao_internal_update ON public.consultoria_solicitacoes_antecipacao
  FOR UPDATE TO authenticated
  USING (requested_by = auth.uid() OR public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (requested_by = auth.uid() OR public.eh_area_interna_mx(auth.uid()));

DROP POLICY IF EXISTS consultoria_antecipacao_history_select ON public.consultoria_historico_antecipacao;
CREATE POLICY consultoria_antecipacao_history_select ON public.consultoria_historico_antecipacao
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.consultoria_solicitacoes_antecipacao r
    WHERE r.id = request_id AND public.pode_acessar_jornada_consultoria(r.store_id, r.client_id)
  ));

CREATE OR REPLACE FUNCTION public.get_consultoria_jornada_loja(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client public.clientes_consultoria;
  v_program_key text;
  v_program_name text;
  v_program_total_visits integer;
  v_can_strategic boolean;
  v_visits jsonb;
BEGIN
  SELECT * INTO v_client
  FROM public.clientes_consultoria c
  WHERE c.primary_store_id = p_store_id
    AND c.status = 'ativo'
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT public.pode_acessar_jornada_consultoria(p_store_id, v_client.id) THEN
    RAISE EXCEPTION 'Sem permissão para consultar a jornada.' USING ERRCODE = '42501';
  END IF;

  SELECT p.program_key, p.name, p.total_visits
  INTO v_program_key, v_program_name, v_program_total_visits
  FROM public.programas_visita_consultoria p
  WHERE p.program_key = v_client.program_template_key
  LIMIT 1;

  v_can_strategic := lower(COALESCE(v_client.program_template_key, '')) <> 'ppa'
    OR public.eh_area_interna_mx(auth.uid())
    OR public.tem_papel_loja(p_store_id, ARRAY['dono'], auth.uid())
    OR public.user_is_master_loja(p_store_id, auth.uid())
    OR public.is_owner_of(p_store_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', v.id,
    'visitNumber', v.visit_number,
    'scheduledAt', v.scheduled_at,
    'status', v.status,
    'objective', CASE WHEN v_can_strategic THEN v.objective ELSE NULL END,
    'googleMeetLink', v.google_meet_link,
    'materials', CASE WHEN v_can_strategic THEN v.materiais ELSE '[]'::jsonb END,
    'lesson', CASE WHEN v_can_strategic AND a.id IS NOT NULL THEN jsonb_build_object(
      'id', a.id, 'title', a.titulo, 'type', a.tipo, 'videoUrl', a.url_video,
      'content', a.conteudo_md, 'metadata', a.metadata
    ) ELSE NULL END,
    'lessonProgress', CASE WHEN pr.id IS NOT NULL THEN jsonb_build_object(
      'positionSeconds', pr.position_seconds, 'durationSeconds', pr.duration_seconds,
      'playedSeconds', pr.played_seconds, 'percentage', pr.percentage,
      'completedAt', pr.completed_at
    ) ELSE NULL END,
    'deliveryItems', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order, i.created_at)
      FROM public.consultoria_itens_entrega i WHERE i.visit_id = v.id), '[]'::jsonb),
    'participants', COALESCE((SELECT jsonb_agg(to_jsonb(pp) ORDER BY pp.required DESC, pp.name)
      FROM public.consultoria_participantes_encontro pp WHERE pp.visit_id = v.id), '[]'::jsonb),
    'evidences', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', e.id, 'visitId', e.visita_id, 'type', e.tipo, 'name', e.nome_arquivo,
      'storagePath', e.caminho_storage, 'externalUrl', e.url_externa,
      'textContent', CASE WHEN v_can_strategic THEN e.texto_conteudo ELSE NULL END,
      'status', e.status, 'feedback', e.devolutiva, 'createdAt', e.created_at, 'updatedAt', e.updated_at
    ) ORDER BY e.created_at DESC) FROM public.evidencias_visita e WHERE e.visita_id = v.id), '[]'::jsonb),
    'anticipation', (SELECT to_jsonb(r) FROM public.consultoria_solicitacoes_antecipacao r
      WHERE r.visit_id = v.id ORDER BY r.created_at DESC LIMIT 1)
  ) ORDER BY v.visit_number), '[]'::jsonb)
  INTO v_visits
  FROM public.visitas_consultoria v
  LEFT JOIN public.universidade_aulas a ON a.id = v.lesson_id
  LEFT JOIN public.consultoria_progresso_aula pr
    ON pr.visit_id = v.id AND pr.lesson_id = v.lesson_id AND pr.user_id = auth.uid()
  WHERE v.client_id = v_client.id;

  RETURN jsonb_build_object(
    'clientId', v_client.id,
    'storeId', p_store_id,
    'programKey', COALESCE(v_program_key, v_client.program_template_key),
    'programName', COALESCE(v_program_name, v_client.product_name, 'Consultoria'),
    'programRules', CASE lower(COALESCE(v_program_key, v_client.program_template_key, 'pmr'))
      WHEN 'pmr' THEN jsonb_build_object('label', 'PMR', 'description', 'Aprender, preparar, implementar, comprovar e validar em cada encontro.')
      WHEN 'pmr_7' THEN jsonb_build_object('label', 'PMR', 'description', 'Sete encontros e acompanhamento mensal com autonomia assistida.')
      WHEN 'pmr_9' THEN jsonb_build_object('label', 'PMR', 'description', 'Nove encontros e acompanhamento ampliado com autonomia assistida.')
      WHEN 'pmr_plus' THEN jsonb_build_object('label', 'PMR Plus', 'description', 'Jornada ampliada com Entrega e acompanhamento reforçados.')
      WHEN 'ppa' THEN jsonb_build_object('label', 'PPA', 'description', 'Conteúdo estratégico confidencial, restrito a Dono, sócios autorizados e equipe interna MX.')
      ELSE jsonb_build_object('label', COALESCE(v_program_name, v_client.product_name, 'Consultoria'), 'description', 'Jornada de Consultoria contratada.')
    END,
    'confidentialityLevel', CASE WHEN lower(COALESCE(v_program_key, v_client.program_template_key, '')) = 'ppa' THEN 'restricted' ELSE 'standard' END,
    'clientStatus', v_client.status,
    'visitsCompleted', (SELECT count(*) FROM public.visitas_consultoria WHERE client_id = v_client.id AND status = 'concluida'),
    'totalVisits', COALESCE(v_program_total_visits, (SELECT count(*)::integer FROM public.visitas_consultoria WHERE client_id = v_client.id)),
    'nextVisitNumber', (SELECT visit_number FROM public.visitas_consultoria WHERE client_id = v_client.id AND status IN ('agendada','em_andamento') ORDER BY scheduled_at NULLS LAST, visit_number LIMIT 1),
    'nextStep', CASE WHEN v_can_strategic THEN COALESCE((SELECT objective FROM public.visitas_consultoria WHERE client_id = v_client.id AND status IN ('agendada','em_andamento') ORDER BY scheduled_at NULLS LAST, visit_number LIMIT 1), 'Acompanhar a jornada') ELSE 'Acompanhar a jornada' END,
    'canViewStrategicContent', v_can_strategic,
    'visits', v_visits
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.salvar_progresso_aula_consultoria(
  p_store_id uuid,
  p_client_id uuid,
  p_visit_id uuid,
  p_lesson_id uuid,
  p_position_seconds integer,
  p_duration_seconds integer,
  p_played_delta_seconds integer
)
RETURNS public.consultoria_progresso_aula
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.consultoria_progresso_aula;
  v_existing public.consultoria_progresso_aula;
  v_requested_delta integer;
  v_elapsed_seconds integer;
  v_allowed_delta integer;
  v_duration integer;
  v_played integer;
  v_percentage numeric(5,2);
BEGIN
  IF NOT public.pode_acessar_jornada_consultoria(p_store_id, p_client_id) THEN
    RAISE EXCEPTION 'Sem permissão para salvar progresso.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.visitas_consultoria
    WHERE id = p_visit_id AND client_id = p_client_id AND lesson_id = p_lesson_id
  ) THEN
    RAISE EXCEPTION 'Encontro ou aula inválidos.';
  END IF;

  v_requested_delta := GREATEST(0, COALESCE(p_played_delta_seconds, 0));
  SELECT * INTO v_existing
  FROM public.consultoria_progresso_aula
  WHERE client_id = p_client_id AND lesson_id = p_lesson_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    v_duration := GREATEST(0, COALESCE(p_duration_seconds, 0));
    v_allowed_delta := LEAST(7, v_requested_delta, v_duration);
    v_played := v_allowed_delta;
    v_percentage := CASE WHEN v_duration > 0 THEN LEAST(100, (v_played::numeric / v_duration) * 100) ELSE 0 END;

    INSERT INTO public.consultoria_progresso_aula (
      client_id, store_id, visit_id, lesson_id, user_id, position_seconds,
      duration_seconds, played_seconds, percentage, started_at, last_played_at,
      completed_at, updated_at
    ) VALUES (
      p_client_id, p_store_id, p_visit_id, p_lesson_id, auth.uid(),
      GREATEST(0, COALESCE(p_position_seconds, 0)), v_duration, v_played, v_percentage,
      now(), now(), CASE WHEN v_percentage >= 90 THEN now() ELSE NULL END, now()
    ) RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  v_elapsed_seconds := GREATEST(
    0,
    FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(v_existing.last_played_at, v_existing.updated_at, v_existing.created_at))))::integer
  );
  v_duration := GREATEST(v_existing.duration_seconds, GREATEST(0, COALESCE(p_duration_seconds, 0)));
  v_allowed_delta := LEAST(10, v_requested_delta, v_elapsed_seconds + 2);
  v_played := LEAST(v_duration, v_existing.played_seconds + v_allowed_delta);
  v_percentage := CASE WHEN v_duration > 0 THEN LEAST(100, (v_played::numeric / v_duration) * 100) ELSE 0 END;

  UPDATE public.consultoria_progresso_aula
  SET visit_id = p_visit_id,
      store_id = p_store_id,
      position_seconds = GREATEST(0, COALESCE(p_position_seconds, 0)),
      duration_seconds = v_duration,
      played_seconds = v_played,
      percentage = v_percentage,
      last_played_at = now(),
      completed_at = CASE WHEN v_percentage >= 90 THEN COALESCE(completed_at, now()) ELSE completed_at END,
      updated_at = now()
  WHERE id = v_existing.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_item_entrega_consultoria(
  p_item_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS public.consultoria_itens_entrega
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.consultoria_itens_entrega;
BEGIN
  IF p_status NOT IN ('pending','in_progress','completed','reopened') THEN RAISE EXCEPTION 'Status de Entrega inválido.'; END IF;
  SELECT * INTO v_row FROM public.consultoria_itens_entrega WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR NOT public.pode_acessar_jornada_consultoria(v_row.store_id, v_row.client_id) THEN
    RAISE EXCEPTION 'Item indisponível.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.consultoria_itens_entrega SET
    status = p_status,
    note = p_note,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
    completed_by = CASE WHEN p_status = 'completed' THEN auth.uid() ELSE NULL END,
    updated_at = now()
  WHERE id = p_item_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_participante_consultoria(
  p_participant_id uuid,
  p_confirmed boolean,
  p_note text DEFAULT NULL
)
RETURNS public.consultoria_participantes_encontro
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.consultoria_participantes_encontro;
BEGIN
  SELECT * INTO v_row FROM public.consultoria_participantes_encontro WHERE id = p_participant_id FOR UPDATE;
  IF NOT FOUND OR NOT public.pode_acessar_jornada_consultoria(v_row.store_id, v_row.client_id) THEN
    RAISE EXCEPTION 'Participante indisponível.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.consultoria_participantes_encontro SET
    confirmed = p_confirmed,
    confirmed_at = CASE WHEN p_confirmed THEN now() ELSE NULL END,
    confirmed_by = CASE WHEN p_confirmed THEN auth.uid() ELSE NULL END,
    note = p_note,
    updated_at = now()
  WHERE id = p_participant_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.solicitar_antecipacao_consultoria(
  p_visit_id uuid,
  p_reason text,
  p_preferred_dates jsonb DEFAULT '[]'::jsonb
)
RETURNS public.consultoria_solicitacoes_antecipacao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_visit public.visitas_consultoria; v_client public.clientes_consultoria; v_store uuid; v_blockers jsonb := '[]'::jsonb; v_row public.consultoria_solicitacoes_antecipacao;
BEGIN
  SELECT * INTO v_visit FROM public.visitas_consultoria WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Encontro não encontrado.'; END IF;
  SELECT * INTO v_client FROM public.clientes_consultoria WHERE id = v_visit.client_id;
  v_store := v_client.primary_store_id;
  IF NOT public.pode_acessar_jornada_consultoria(v_store, v_client.id) THEN RAISE EXCEPTION 'Sem permissão.' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.visitas_consultoria v WHERE v.client_id = v_client.id AND v.status IN ('agendada','em_andamento') AND v.visit_number < v_visit.visit_number) AND NOT v_visit.anticipation_override THEN
    v_blockers := v_blockers || jsonb_build_array('Somente o próximo encontro pode ser antecipado');
  END IF;
  IF EXISTS (SELECT 1 FROM public.consultoria_itens_entrega i WHERE i.visit_id = p_visit_id AND i.required AND i.item_type <> 'evidence' AND i.status <> 'completed') AND NOT v_visit.anticipation_override THEN
    v_blockers := v_blockers || jsonb_build_array('Entrega obrigatória pendente');
  END IF;
  IF EXISTS (SELECT 1 FROM public.consultoria_participantes_encontro p WHERE p.visit_id = p_visit_id AND p.required AND NOT p.confirmed) AND NOT v_visit.anticipation_override THEN
    v_blockers := v_blockers || jsonb_build_array('Participantes obrigatórios sem confirmação');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.consultoria_itens_entrega i
    WHERE i.visit_id = p_visit_id AND i.required AND i.item_type = 'evidence'
      AND (i.evidence_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.evidencias_visita e WHERE e.id = i.evidence_id AND e.status = 'aprovada'
      ))
  ) AND NOT v_visit.anticipation_override THEN
    v_blockers := v_blockers || jsonb_build_array('Evidência obrigatória pendente');
  END IF;
  IF v_visit.lesson_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.consultoria_progresso_aula pr WHERE pr.visit_id = p_visit_id AND pr.user_id = auth.uid() AND pr.percentage >= 90
  ) AND NOT v_visit.anticipation_override THEN
    v_blockers := v_blockers || jsonb_build_array('Aula obrigatória pendente');
  END IF;
  IF jsonb_array_length(v_blockers) > 0 THEN RAISE EXCEPTION 'Pré-requisitos pendentes: %', v_blockers::text; END IF;

  INSERT INTO public.consultoria_solicitacoes_antecipacao(client_id, store_id, visit_id, requested_by, reason, preferred_dates, eligibility_snapshot)
  VALUES (v_client.id, v_store, p_visit_id, auth.uid(), p_reason, COALESCE(p_preferred_dates, '[]'::jsonb), jsonb_build_object('blockers', v_blockers))
  RETURNING * INTO v_row;
  INSERT INTO public.consultoria_historico_antecipacao(request_id, new_status, changed_by, note)
  VALUES (v_row.id, v_row.status, auth.uid(), p_reason);
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.revisar_antecipacao_consultoria(
  p_request_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS public.consultoria_solicitacoes_antecipacao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.consultoria_solicitacoes_antecipacao; v_old text;
BEGIN
  IF p_status NOT IN ('approved','date_adjustment_requested','rejected') THEN RAISE EXCEPTION 'Status de revisão inválido.'; END IF;
  IF NOT public.eh_area_interna_mx(auth.uid()) THEN RAISE EXCEPTION 'Somente perfis internos revisam antecipações.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_row FROM public.consultoria_solicitacoes_antecipacao WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  v_old := v_row.status;
  UPDATE public.consultoria_solicitacoes_antecipacao SET
    status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END, updated_at = now()
  WHERE id = p_request_id RETURNING * INTO v_row;
  INSERT INTO public.consultoria_historico_antecipacao(request_id, old_status, new_status, changed_by, note)
  VALUES (p_request_id, v_old, p_status, auth.uid(), p_note);
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_antecipacao_consultoria(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS public.consultoria_solicitacoes_antecipacao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.consultoria_solicitacoes_antecipacao; v_old text;
BEGIN
  SELECT * INTO v_row FROM public.consultoria_solicitacoes_antecipacao WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR (v_row.requested_by <> auth.uid() AND NOT public.eh_area_interna_mx(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar.' USING ERRCODE = '42501';
  END IF;
  IF v_row.status NOT IN ('draft','under_review','date_adjustment_requested') THEN RAISE EXCEPTION 'Solicitação não pode mais ser cancelada.'; END IF;
  v_old := v_row.status;
  UPDATE public.consultoria_solicitacoes_antecipacao SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE id = p_request_id RETURNING * INTO v_row;
  INSERT INTO public.consultoria_historico_antecipacao(request_id, old_status, new_status, changed_by, note)
  VALUES (p_request_id, v_old, 'cancelled', auth.uid(), p_note);
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_evidencia_consultoria(
  p_visit_id uuid,
  p_type text,
  p_name text DEFAULT NULL,
  p_storage_path text DEFAULT NULL,
  p_external_url text DEFAULT NULL,
  p_text_content text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_previous_id uuid DEFAULT NULL
)
RETURNS public.evidencias_visita
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.visitas_consultoria;
  v_client public.clientes_consultoria;
  v_store uuid;
  v_row public.evidencias_visita;
BEGIN
  SELECT * INTO v_visit FROM public.visitas_consultoria WHERE id = p_visit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Encontro não encontrado.'; END IF;
  SELECT * INTO v_client FROM public.clientes_consultoria WHERE id = v_visit.client_id;
  v_store := v_client.primary_store_id;
  IF NOT public.pode_acessar_jornada_consultoria(v_store, v_client.id) THEN
    RAISE EXCEPTION 'Sem permissão para registrar evidência.' USING ERRCODE = '42501';
  END IF;
  IF p_type NOT IN ('foto','anexo','ata','print','documento','observacao','link','texto','planilha','pdf') THEN
    RAISE EXCEPTION 'Tipo de evidência inválido.';
  END IF;
  IF p_previous_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.evidencias_visita WHERE id = p_previous_id AND visita_id = p_visit_id) THEN
    RAISE EXCEPTION 'Evidência anterior inválida.';
  END IF;
  IF p_storage_path IS NULL AND p_external_url IS NULL AND p_text_content IS NULL THEN
    RAISE EXCEPTION 'Informe arquivo, link ou texto para a evidência.';
  END IF;

  INSERT INTO public.evidencias_visita(
    visita_id, tipo, nome_arquivo, caminho_storage, url_externa, texto_conteudo,
    observacao, enviado_por, status, versao_anterior_id, updated_at
  ) VALUES (
    p_visit_id, p_type, p_name, p_storage_path, p_external_url, p_text_content,
    p_note, auth.uid(), 'enviada', p_previous_id, now()
  ) RETURNING * INTO v_row;

  UPDATE public.consultoria_itens_entrega
  SET evidence_id = v_row.id,
      status = 'in_progress',
      completed_at = NULL,
      completed_by = NULL,
      updated_at = now()
  WHERE visit_id = p_visit_id
    AND item_type = 'evidence'
    AND required = true;

  IF p_previous_id IS NOT NULL THEN
    UPDATE public.evidencias_visita
    SET status = 'substituida', substituida_por = auth.uid(), substituida_at = now(), updated_at = now()
    WHERE id = p_previous_id AND visita_id = p_visit_id;
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.revisar_evidencia_consultoria(p_evidence_id uuid, p_status text, p_feedback text DEFAULT NULL)
RETURNS public.evidencias_visita
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.evidencias_visita;
BEGIN
  IF p_status NOT IN ('em_analise','aprovada','devolvida') THEN RAISE EXCEPTION 'Status de evidência inválido.'; END IF;
  IF NOT public.eh_area_interna_mx(auth.uid()) THEN RAISE EXCEPTION 'Somente perfis internos revisam evidências.' USING ERRCODE = '42501'; END IF;
  UPDATE public.evidencias_visita SET status = p_status, devolutiva = p_feedback, analisada_por = auth.uid(), analisada_at = now(), updated_at = now()
  WHERE id = p_evidence_id RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evidência não encontrada.'; END IF;

  UPDATE public.consultoria_itens_entrega
  SET status = CASE p_status
        WHEN 'aprovada' THEN 'completed'
        WHEN 'devolvida' THEN 'reopened'
        ELSE 'in_progress'
      END,
      completed_at = CASE WHEN p_status = 'aprovada' THEN now() ELSE NULL END,
      completed_by = CASE WHEN p_status = 'aprovada' THEN auth.uid() ELSE NULL END,
      note = CASE WHEN p_status = 'devolvida' THEN p_feedback ELSE note END,
      updated_at = now()
  WHERE evidence_id = p_evidence_id;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_jornada_consultoria_visita(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_acessar_jornada_consultoria(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_consultoria_jornada_loja(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.salvar_progresso_aula_consultoria(uuid, uuid, uuid, uuid, integer, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.atualizar_item_entrega_consultoria(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirmar_participante_consultoria(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.solicitar_antecipacao_consultoria(uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revisar_antecipacao_consultoria(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_antecipacao_consultoria(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrar_evidencia_consultoria(uuid, text, text, text, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revisar_evidencia_consultoria(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_jornada_consultoria_visita(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_acessar_jornada_consultoria(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consultoria_jornada_loja(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_progresso_aula_consultoria(uuid, uuid, uuid, uuid, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_item_entrega_consultoria(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_participante_consultoria(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_antecipacao_consultoria(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_antecipacao_consultoria(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_antecipacao_consultoria(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_evidencia_consultoria(uuid, text, text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_evidencia_consultoria(uuid, text, text) TO authenticated;

DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'consultoria_progresso_aula','consultoria_itens_entrega','consultoria_participantes_encontro',
    'consultoria_solicitacoes_antecipacao','consultoria_historico_antecipacao'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=v_table) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$$;

COMMIT;
