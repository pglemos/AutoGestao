-- Saldo presencial da jornada e criação automática da matriz.
--
-- Duas automações da especificação: "atualizar saldo presencial ao alterar
-- modalidade" e "criar Matriz automaticamente quando um novo Cliente MX for
-- iniciado, permitindo posterior edição".
--
-- O limite presencial só é aplicado quando o produto o define. Os produtos
-- legados (`pmr_7`, `pmr_9`) têm min/max nulos, então nenhum cliente atual é
-- afetado — o bloqueio passa a valer conforme os clientes forem migrando para
-- o catálogo novo, que tem faixa (PMR Híbrido 2–9, PMR Online 0).

/**
 * Saldo presencial do cliente: quanto o produto permite, quanto já foi
 * marcado como presencial e quanto ainda cabe.
 */
CREATE OR REPLACE FUNCTION public.saldo_presencial_cliente(p_client_id uuid)
RETURNS TABLE (contratadas integer, minimas integer, usadas integer, disponiveis integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.max_presenciais,
    p.min_presenciais,
    count(v.id) FILTER (WHERE lower(coalesce(v.modality, '')) = 'presencial')::integer,
    CASE
      WHEN p.max_presenciais IS NULL THEN NULL
      ELSE p.max_presenciais - count(v.id) FILTER (WHERE lower(coalesce(v.modality, '')) = 'presencial')::integer
    END
  FROM public.clientes_consultoria c
  JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
  LEFT JOIN public.visitas_consultoria v ON v.client_id = c.id
  WHERE c.id = p_client_id
  GROUP BY p.max_presenciais, p.min_presenciais;
$$;

REVOKE ALL ON FUNCTION public.saldo_presencial_cliente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saldo_presencial_cliente(uuid) TO authenticated;

/**
 * Impede marcar mais encontros presenciais do que o produto contratado permite.
 * Só age quando o produto declara `max_presenciais`; produto sem faixa
 * definida continua livre, para não travar os contratos legados.
 */
CREATE OR REPLACE FUNCTION public.validar_saldo_presencial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_usadas integer;
BEGIN
  IF lower(coalesce(NEW.modality, '')) <> 'presencial' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND lower(coalesce(OLD.modality, '')) = 'presencial' THEN
    RETURN NEW;  -- já contava como presencial; não muda o saldo
  END IF;

  SELECT p.max_presenciais INTO v_max
    FROM public.clientes_consultoria c
    JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
   WHERE c.id = NEW.client_id;

  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_usadas
    FROM public.visitas_consultoria v
   WHERE v.client_id = NEW.client_id
     AND lower(coalesce(v.modality, '')) = 'presencial'
     AND v.id <> NEW.id;

  IF v_usadas >= v_max THEN
    RAISE EXCEPTION 'Saldo presencial esgotado: o produto permite % encontro(s) presencial(is) e já há % marcado(s).', v_max, v_usadas
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_saldo_presencial ON public.visitas_consultoria;
CREATE TRIGGER trg_validar_saldo_presencial
  BEFORE INSERT OR UPDATE OF modality ON public.visitas_consultoria
  FOR EACH ROW EXECUTE FUNCTION public.validar_saldo_presencial();

/**
 * Cria a unidade matriz assim que um cliente nasce sem nenhuma unidade.
 * A matriz é editável depois — o objetivo é que nenhum cliente exista sem
 * estrutura, não impor o nome definitivo.
 */
CREATE OR REPLACE FUNCTION public.criar_matriz_padrao_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.unidades_cliente_consultoria u WHERE u.client_id = NEW.id
  ) THEN
    INSERT INTO public.unidades_cliente_consultoria (client_id, name, is_primary)
    VALUES (NEW.id, NEW.name, true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_criar_matriz_padrao_cliente ON public.clientes_consultoria;
CREATE TRIGGER trg_criar_matriz_padrao_cliente
  AFTER INSERT ON public.clientes_consultoria
  FOR EACH ROW EXECUTE FUNCTION public.criar_matriz_padrao_cliente();

COMMENT ON FUNCTION public.saldo_presencial_cliente(uuid) IS
  'Contratadas, mínimas, usadas e disponíveis de encontros presenciais do cliente.';
COMMENT ON FUNCTION public.validar_saldo_presencial() IS
  'Impede ultrapassar o máximo presencial do produto; inativo para produto sem faixa.';
COMMENT ON FUNCTION public.criar_matriz_padrao_cliente() IS
  'Garante que todo cliente nasça com uma unidade matriz editável.';
