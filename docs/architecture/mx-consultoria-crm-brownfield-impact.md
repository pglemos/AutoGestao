# Impacto Brownfield - CRM de Consultoria MX

Data: 2026-04-13
Workflow: `brownfield-fullstack`
Base: `docs/prd/mx-consultoria-crm-analysis.md`

## Estado atual do sistema

O sistema atual e um app React/Vite com Supabase, estruturado em torno de operacao comercial diaria de lojas automotivas.

Stack identificada:

- React 19, Vite 6, TypeScript 5.8.
- Supabase Auth, Postgres, RLS, Edge Functions.
- React Router para rotas protegidas.
- Componentes Radix/shadcn-like em `src/components/ui`.
- Hooks de dominio em `src/hooks`.
- Tipos canonicos em `src/types/database.ts`.
- Relatorios automatizados em `supabase/functions`.

Dominios ja existentes:

- `stores`, `memberships`, `users`.
- `daily_checkins`.
- `goals` e `regras_metas_loja`.
- Ranking e funil.
- Feedback estruturado.
- PDI e revisoes.
- Treinamentos e progresso.
- Notificacoes.
- Auditoria/reprocessamento.
- Relatorios matinal, semanal e mensal.

Rotas relevantes ja existentes:

- `/painel`
- `/lojas`
- `/loja`
- `/checkin`
- `/funil`
- `/ranking`
- `/feedback`
- `/pdi`
- `/treinamentos`
- `/relatorio-matinal`
- `/auditoria`

## Conflito com a documentacao atual

O arquivo `PRD_MX_PERFORMANCE_90D.md` declara explicitamente que o produto atual nao deve seguir modelo CRM e nao inclui financeiro, DRE, estoque ou pos-venda.

O novo pedido exige:

- CRM interno da MX Consultoria.
- Agenda da consultoria.
- Integracao Google Agenda/Meet.
- Financeiro/DRE.
- Estoque.
- Execucao de visitas com checklist, evidencias e relatorios.
- Anexos e documentos por cliente.
- Continuidade de atendimento entre consultores.

Conclusao: a mudanca nao deve ser aplicada como incremento solto no PRD atual. Precisa de PRD/arquitetura propria como major enhancement.

## Gaps tecnicos

### CRM de consultoria

Nao foi identificada entidade canonica para `cliente_da_consultoria`. A tabela `stores` representa lojas operacionais do sistema de performance, mas nao cobre contrato, produto de consultoria, consultores, cronograma, anexos e historico de visitas.

Necessario criar:

- `consulting_clients`
- `unidades_cliente_consultoria`, se um cliente tiver varias unidades
- `atribuicoes_consultoria`
- `contatos_cliente_consultoria`
- `consulting_client_documents`

### Agenda e Google Calendar

Nao foi identificada integracao nativa com Google Agenda/Meet. A agenda atual do produto e operacional, focada em check-in D-0/D-1, nao em calendario de consultoria.

Necessario criar:

- `consulting_calendar_events`
- campos para `google_event_id`, calendario de origem, Meet URL, status de sincronizacao e ultimo erro
- servico de sincronizacao Google Calendar
- rotina de deduplicacao/repair
- logs de sincronizacao

### Visitas PMR

Nao ha motor nativo para visitas 1-7 com checklist, evidencia, anexos e modelo de relatorio.

Necessario criar:

- `pmr_visit_templates`
- `pmr_visit_template_steps`
- `consulting_visits`
- `consulting_visit_steps`
- `consulting_visit_evidence`
- exportacao/geracao de relatorio de visita

### Financeiro/DRE

Nao foi identificado modulo DRE canonico no fluxo principal.

Necessario criar:

- `consulting_financial_periods`
- `consulting_financial_lines`
- `consulting_financial_imports`
- validadores de formula/erro de planilha
- dashboard financeiro por cliente

### Estoque

Nao ha estoque canonico do fluxo principal.

Necessario criar:

- `snapshots_estoque_consultoria`
- `itens_estoque_consultoria`
- classificacao: venda, repasse, uso pessoal, preparacao, vendido
- aging por veiculo
- alertas para 90+ dias

### Leads e auditoria de atendimento

O sistema ja possui funil agregado via check-ins, mas nao possui auditoria por midia/lead conforme os arquivos importados.

Necessario criar:

- `consulting_lead_imports`
- `consulting_lead_channel_metrics`
- campos de SLA, finalizacao, sucesso/insucesso
- alertas de atendimento fora do CRM ou lead sem contato

### Anexos/documentos

Nao ha modelo de documentos por visita/cliente. Esse ponto e obrigatorio para os diagnosticos, PMRs, PDIs, formularios e relatorios.

Necessario definir:

- uso de Supabase Storage ou outro storage aprovado
- tabela de metadados para anexos
- vinculo com cliente, visita, checklist, PDI ou importacao
- RLS por papel e por cliente

## Modelo de dados recomendado

Nucleo:

- `consulting_clients`
- `unidades_cliente_consultoria`
- `contatos_cliente_consultoria`
- `consulting_products`
- `atribuicoes_consultoria`

Agenda:

- `consulting_calendar_events`
- `consulting_calendar_sync_logs`

Visitas:

- `pmr_visit_templates`
- `pmr_visit_template_steps`
- `consulting_visits`
- `consulting_visit_steps`
- `consulting_visit_evidence`

Financeiro:

- `consulting_financial_periods`
- `consulting_financial_lines`
- `consulting_financial_imports`

Estoque:

- `snapshots_estoque_consultoria`
- `itens_estoque_consultoria`

Leads:

- `consulting_lead_imports`
- `consulting_lead_channel_metrics`

Treinamento/PDI:

- Reaproveitar `trainings`, `training_progress`, `pdis` quando fizer sentido.
- Adicionar tabelas de ponte para vincular treinamento/PDI ao cliente de consultoria, se o escopo exigir acompanhamento por cliente.

Documentos:

- `consulting_documents`
- `consulting_document_links`

## Rotas recomendadas

Admin/MX:

- `/consultoria`
- `/consultoria/clientes`
- `/consultoria/clientes/:clientId`
- `/consultoria/agenda`
- `/consultoria/visitas/:visitId`
- `/consultoria/importacoes`
- `/consultoria/financeiro`
- `/consultoria/estoque`
- `/consultoria/bi`

Cliente/loja, se houver portal:

- `/cliente/prestacao-contas`
- `/cliente/documentos`
- `/cliente/pdi`

## Servicos recomendados

Frontend/hooks:

- `useConsultingClients`
- `useConsultingAgenda`
- `useConsultingVisits`
- `useConsultingFinancials`
- `useConsultingInventory`
- `useConsultingLeadMetrics`
- `useConsultingDocuments`

Backend/Supabase:

- migracoes SQL com RLS antes das telas
- Edge Function para Google Calendar, se a sincronizacao precisar de segredo OAuth
- Edge Function ou script CLI para importacao inicial dos arquivos
- logs de importacao e rollback/invalidacao

## Ordem tecnica segura

1. Criar PRD do modulo.
2. Criar migracoes Supabase e RLS do nucleo de consultoria.
3. Criar importador somente leitura para agenda, CRM e objetivo de visita.
4. Criar telas admin da MX para clientes e agenda.
5. Criar execucao de visita com checklist e evidencia.
6. Adicionar documentos/anexos.
7. Adicionar financeiro/DRE e importacao validada.
8. Adicionar estoque e lead audit.
9. Adicionar Google Calendar/Meet.
10. Adicionar BI e testes ponta a ponta.

## Riscos de integracao

- Misturar `stores` operacional com cliente da consultoria pode quebrar permissoes e relatorios existentes.
- Implementar financeiro/estoque em rotas legadas aumenta divida tecnica.
- Google Calendar exige modelo de autorizacao, tokens, deduplicacao e recuperacao de erro.
- Importar planilhas diretamente para tabelas finais sem staging pode gravar dados errados.
- RLS precisa ser definida antes de expor dados financeiros e documentos de clientes.

## Decisao arquitetural recomendada

Criar um bounded context novo de `consultoria`, integrado ao sistema atual apenas nos pontos necessarios. Reaproveitar UI, auth, usuarios, treinamentos e PDI quando o modelo encaixar, mas nao forcar o novo CRM dentro de tabelas legadas ou dentro de `stores` sem extensao planejada.
