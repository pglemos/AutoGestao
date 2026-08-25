-- Parâmetros estratégicos da metodologia MX (os 13 do Base44).
--
-- Até aqui os 13 parâmetros viviam apenas como constante de código
-- (BASE44_STANDARD_PARAMETERS). Sem persistência, a MX não conseguia alterar o
-- padrão pela tela /plano-estrategico — paridade com o Base44 /indicadores,
-- aba "Parâmetros e Fórmulas".
--
-- Não dá para reaproveitar valores_parametros_consultoria: metric_key ali tem FK
-- para catalogo_metricas_consultoria e códigos de parâmetro não são indicadores.
-- Os overrides por cliente continuam em overrides_parametros_cliente (metric_key
-- livre, já aceita código de parâmetro).

create table if not exists public.parametros_estrategicos_mx (
  id uuid primary key default gen_random_uuid(),
  parameter_set_id uuid not null references public.conjuntos_parametros_consultoria(id) on delete cascade,
  code text not null check (length(trim(code)) > 0),
  name text not null check (length(trim(name)) > 0),
  unit text,
  default_value numeric not null,
  monthly_defaults numeric[],
  status text not null default 'ativo' check (status in ('ativo', 'encerrado')),
  notes text,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parametros_estrategicos_mx_set_code_key unique (parameter_set_id, code),
  constraint parametros_estrategicos_mx_monthly_len check (
    monthly_defaults is null or array_length(monthly_defaults, 1) = 12
  )
);

comment on table public.parametros_estrategicos_mx is
  'Parâmetros estratégicos da metodologia MX usados pelas fórmulas PAR("CODE"). Overrides por cliente ficam em overrides_parametros_cliente.';

alter table public.parametros_estrategicos_mx enable row level security;

drop policy if exists parametros_estrategicos_mx_select on public.parametros_estrategicos_mx;
create policy parametros_estrategicos_mx_select
  on public.parametros_estrategicos_mx
  for select to authenticated
  using (true);

drop policy if exists parametros_estrategicos_mx_write on public.parametros_estrategicos_mx;
create policy parametros_estrategicos_mx_write
  on public.parametros_estrategicos_mx
  for all to authenticated
  using (is_admin())
  with check (is_admin());

revoke all on public.parametros_estrategicos_mx from public;
grant select, insert, update, delete on public.parametros_estrategicos_mx to authenticated;

-- Semente idempotente dos 13 parâmetros no conjunto ativo.
insert into public.parametros_estrategicos_mx (parameter_set_id, code, name, unit, default_value, monthly_defaults)
select s.id, p.code, p.name, p.unit, p.default_value, p.monthly_defaults
from public.conjuntos_parametros_consultoria s
cross join (values
  ('LEADS_PER_INTERNET_SALE', 'Leads necessários por venda de Internet', 'leads', 40::numeric, null::numeric[]),
  ('TRADE_SALES_RATE', 'Percentual de vendas com troca', '%', 0.50, null),
  ('EVALUATIONS_PER_TRADE_SALE', 'Avaliações necessárias por venda com troca', 'avaliações', 3, null),
  ('FINANCED_SALES_RATE', 'Percentual de vendas financiadas', '%', 0.60, null),
  ('APPROVAL_BUFFER_MULTIPLIER', 'Margem adicional de fichas aprovadas', 'multiplicador', 1.10, null),
  ('APPROVED_TO_PAID_CONVERSION', 'Conversão de fichas aprovadas em fichas pagas', '%', 0.909091, null),
  ('LEAD_TO_APPOINTMENT_RATE', 'Conversão planejada de leads em agendamentos', '%', 0.20, null),
  ('APPOINTMENT_TO_VISIT_RATE', 'Conversão planejada de agendamentos em visitas', '%', 0.33, null),
  ('ACTIVE_STOCK_RATE', 'Percentual planejado de estoque ativo', '%', 0.65, null),
  ('STOCK_TO_SALES_RATIO', 'Relação planejada entre estoque total e vendas', 'razão', 1.65,
    array[1.70, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65]::numeric[]),
  ('OVER_90_STOCK_RATE', 'Percentual máximo de estoque acima de 90 dias', '%', 0.15, null),
  ('STOCK_MARGIN_RATE', 'Margem média planejada sobre o Ticket do Estoque', '%', 0.20, null),
  ('POST_SALE_RATE', 'Percentual planejado de pós-venda', '%', 0.20, null)
) as p(code, name, unit, default_value, monthly_defaults)
where s.active
on conflict (parameter_set_id, code) do nothing;
