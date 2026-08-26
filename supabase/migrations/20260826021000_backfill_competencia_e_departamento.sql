-- (1) Recupera as vendas orfas: existiam no CRM e nao contavam para ninguem.
-- `data_evento` e a data real do fato, ja registrada — preencher a competencia
-- com ela reconstroi o mes da venda. Nulo significa "a venda nao existe" para
-- ranking, meta, comissao e realizado. Idempotente.
with orfas as (
  select ec.id evento_id, ec.oportunidade_id, ec.data_evento::date competencia
    from public.eventos_comerciais ec
    left join public.oportunidades o on o.id = ec.oportunidade_id
   where ec.tipo_evento = 'venda_realizada'
     and o.etapa is distinct from 'cancelada'
     and ec.data_competencia is null
     and o.data_competencia is null
     and o.sale_date is null
     and ec.data_evento is not null
), evento_atualizado as (
  update public.eventos_comerciais ec
     set data_competencia = orfas.competencia
    from orfas
   where ec.id = orfas.evento_id
  returning ec.oportunidade_id
)
update public.oportunidades o
   set data_competencia = coalesce(o.data_competencia, orfas.competencia),
       sale_date = coalesce(o.sale_date, orfas.competencia),
       updated_at = now()
  from orfas
 where o.id = orfas.oportunidade_id;

-- (2) Um vocabulario so para `departamento` dos planos padrao. Vence a
-- categoria canonica minuscula do app: e o que o wizard grava e o que a UI usa
-- para agrupar. Nenhuma funcao do banco filtra pelos literais antigos.
update public.planos_acao_templates
   set departamento = case
         when upper(translate(departamento, 'ÇÃÕÁÉÍÓÚÂÊÔ', 'CAOAEIOUAEO')) in ('COMERCIAL', 'COMMERCIAL', 'VENDAS') then 'comercial'
         when upper(departamento) = 'MARKETING' then 'marketing'
         when upper(replace(translate(departamento, 'ÇÃÕÁÉÍÓÚÂÊÔ', 'CAOAEIOUAEO'), '_', '')) in ('PRODUTO', 'PRODUTOESTOQUE', 'ESTOQUE') then 'produto'
         when upper(replace(translate(departamento, 'ÇÃÕÁÉÍÓÚÂÊÔ', 'CAOAEIOUAEO'), '_', '')) in ('RH', 'PESSOAS', 'PESSOASRH', 'EQUIPE') then 'rh'
         when upper(departamento) = 'FINANCEIRO' then 'financeiro'
         when upper(replace(translate(departamento, 'ÇÃÕÁÉÍÓÚÂÊÔ', 'CAOAEIOUAEO'), '_', '')) in ('OPERACIONAL', 'OPERACOES') then 'operacional'
         else departamento
       end,
       updated_at = now()
 where departamento is not null;
