-- Migration: 20260728030000_painel_rede_desconta_venda_cancelada.sql
--
-- `get_resumo_rede_periodo` alimenta o Painel Geral do módulo administrativo
-- (coluna "Vendas" por loja e o total da rede). Contava eventos
-- 'venda_realizada' brutos, sem descontar cancelamentos — o mesmo defeito já
-- corrigido no funil do vendedor e na Meta da Loja, agora afetando as 40 lojas.
--
-- Efeito medido em produção: MX CONSULTORIA aparecia com 12 vendas contra 10
-- reais.
--
-- Alteração cirúrgica: apenas o LEFT JOIN e o filtro. Assinatura, colunas,
-- SECURITY DEFINER, search_path, tratamento de erro e grants inalterados.

CREATE OR REPLACE FUNCTION public.get_resumo_rede_periodo(p_start_date date, p_end_date date, p_scope text DEFAULT 'daily'::text)
 RETURNS TABLE(store_id uuid, sales bigint, leads bigint, agd bigint, vis bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller_id uuid := auth.uid();
  v_scope public.checkin_scope := coalesce(nullif(p_scope, ''), 'daily')::public.checkin_scope;
begin
  if v_caller_id is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;

  if not public.eh_area_interna_mx() then
    raise exception 'forbidden_global_read' using errcode = 'P0001';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'invalid_date_range' using errcode = '22007';
  end if;

  if (p_end_date - p_start_date) > 366 then
    raise exception 'date_range_too_large' using errcode = '22023';
  end if;

  return query
    with sales_by_store as (
      select ec.loja_id as store_id,
             count(*)::bigint as sales
        from public.eventos_comerciais ec
        left join public.oportunidades o on o.id = ec.oportunidade_id
       where ec.tipo_evento = 'venda_realizada'
         -- O cancelamento preserva o evento 'venda_realizada' original e
         -- acrescenta um 'venda_cancelada'. Sem descontar o par aqui, o Painel
         -- Geral contava a venda revertida para TODAS as lojas da rede.
         -- Mesmo filtro de vendedor_performance_oficial.
         and o.etapa is distinct from 'cancelada'
         and coalesce(ec.data_competencia, (ec.data_evento at time zone 'America/Sao_Paulo')::date)
             between p_start_date and p_end_date
       group by ec.loja_id
    ),
    activity_by_store as (
      select l.store_id,
             coalesce(sum(coalesce(l.leads_prev_day, 0)), 0)::bigint as leads,
             coalesce(sum(coalesce(l.agd_net_today, 0) + coalesce(l.agd_cart_today, 0)), 0)::bigint as agd,
             coalesce(sum(coalesce(l.visit_prev_day, 0)), 0)::bigint as vis
        from public.lancamentos_diarios l
       where l.metric_scope = v_scope
         and l.reference_date between p_start_date and p_end_date
       group by l.store_id
    )
    select
      coalesce(s.store_id, a.store_id) as store_id,
      coalesce(s.sales, 0) as sales,
      coalesce(a.leads, 0) as leads,
      coalesce(a.agd, 0) as agd,
      coalesce(a.vis, 0) as vis
    from sales_by_store s
    full outer join activity_by_store a on a.store_id = s.store_id
    order by coalesce(s.store_id, a.store_id);
exception
  when others then
    perform public.log_rpc_error(
      'get_resumo_rede_periodo',
      sqlstate,
      sqlerrm,
      v_caller_id,
      jsonb_build_object('start', p_start_date, 'end', p_end_date, 'scope', p_scope)
    );
    raise;
end;
$function$
;
