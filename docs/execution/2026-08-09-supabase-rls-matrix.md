# Matriz RLS atual — snapshot 2026-08-09

> **Estado:** `CATALOGADO_NO_BANCO — TESTES POR PERFIL PENDENTES`
> **SHA do checkout:** `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`
> **Fonte:** Supabase MCP execute_sql/list_edge_functions; current production project

Todas as 225 tabelas públicas retornaram RLS habilitado e ao menos uma policy na consulta atual; isso não substitui os testes de mesma loja/outra loja, papel proibido, simulação, Realtime, Storage e service_role exigidos pelo prompt.

| Schema | Tabela | RLS | Force RLS | Policies | Grants anon | Grants authenticated | service_role SELECT | Decisão de exposição | Testes por perfil | Estado |
|---|---|---:|---:|---:|---|---|---:|---|---|---|
| public | `agencies` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `agenda_d1_late_changes` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `agenda_estrategica_marketing` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `agendamentos` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `ai_model_daily_usage` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `alert_channels` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `alerts` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `arquivos_drive_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `artefatos_gerados_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `atendimentos` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `atribuicoes_consultoria` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `atribuicoes_trilha_desenvolvimento` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `aula_presencas` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `aula_provas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `aulas_ao_vivo` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `automation_configs` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `backup_is_venda_loja_20260805` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `backup_vendas_datas_20260805` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `banco_talentos` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `benchmark_snapshots` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `benchmarks` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `benchmarks_loja` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `cadencia_estado_cliente` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `cadencia_fluxos` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `carreira_niveis` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `carteira_campanhas` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `carteira_empresa` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `carteira_missao_itens` | SIM | não | 2 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `carteira_missao_mutations` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `carteira_missoes` | SIM | não | 2 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `catalogo_indicadores_planejamento` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `catalogo_metricas_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `catalogo_regras_consultivas` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `central_execucao_aberturas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `checkin_audit_logs` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `clientes` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `clientes_consultoria` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `communication_instances` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `comportamental_perfis` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `comportamental_questoes` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `comportamental_respostas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `comportamental_sessoes` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `config_drive_central` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `configuracoes_calendario_consultoria` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `conjuntos_parametros_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `consultor_solucoes` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `consultoria_historico_antecipacao` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `consultoria_itens_entrega` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `consultoria_participantes_encontro` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `consultoria_progresso_aula` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `consultoria_solicitacoes_antecipacao` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `contatos_cliente_consultoria` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `critical_cron_job` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `cron_execution_log` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `cultura_resultado_registros` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `d1_audit_log` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `d1_contact_audit` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `d1_snapshot_batches` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `d1_snapshot_items` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `daily_lead_volumes` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `data_correction_audit` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `departamento_biblioteca` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `departamento_checklist` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `departamento_fluxograma` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `departamento_kpi_snapshot` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `departamentos_mx` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `deterministic_action_resolutions` | SIM | SIM | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `devolutiva_acoes` | SIM | não | 6 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `devolutivas` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `documentos_loja` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `entradas_vendas_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `espelhos_agenda_google_usuario` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `estados_oauth_google_consultoria` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `etapas_metodologia_consultoria` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `etapas_modelo_visita_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `etapas_trilha_desenvolvimento` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `eventos_agenda_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `eventos_agenda_executiva` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `eventos_comerciais` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `evidencias_planos_acao` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `evidencias_visita` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `execution_actions` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `fechamento_liberacoes` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `feedback_action_catalog` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `financeiro_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `funnel_metrics` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `historico_metas` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `historico_planos_acao` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `historico_regras_metas_loja` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `historico_valores_indicadores_planejamento` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `importacoes_brutas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `indice_felicidade_respostas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `integration_error_log` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `internal_mx_admin_audit` | SIM | não | 2 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `internal_mx_admin_rate_limits` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `inventory` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `itens_estoque_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `itens_plano_acao` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `lancamentos_diarios` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `linhas_importacao_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `logs_acesso_sensivel` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `logs_auditoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `logs_auditoria_loja` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `logs_compartilhamento_whatsapp` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `logs_reprocessamento` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `logs_rotina_gerente` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `lojas` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `lotes_importacao_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `manager_daily_tasks` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `manager_lead_conference_items` | SIM | não | 2 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `manager_lead_conferences` | SIM | não | 2 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `manager_routine_snapshots` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `marketing_mensal_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `mentor_cadence_steps` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `mentor_cadences` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `mentor_pending_flags` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `mentor_score_snapshots` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `mentor_scripts` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `mentor_status_definitions` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `mentor_transitions` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `metas` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `metas_metricas_cliente` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `migration_backup_lancamentos_diarios_duplicates_20260503` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `migration_backup_vendedores_loja_duplicates_20260503` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `modelos_formulario_pmr` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `modulos_cliente_consultoria` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `modulos_sistema` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `notificacoes` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `notification_delivery_log` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `notification_reads` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `opcoes_agenda_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `oportunidades` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `organograma_nos` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `password_change_challenges` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `password_recovery_attempts` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pastas_drive_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_acoes_sugeridas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_avaliacoes_competencia` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_competencias` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_descritores_escala` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_frases_inspiracionais` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_metas` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_niveis_cargo` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_objetivos_pessoais` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_plano_acao` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_reviews` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdi_sessoes` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pdis` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `perfis` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `perfis_permissoes` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `permissoes_modulo` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `planejamentos_estrategicos` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `planos_acao` | SIM | não | 5 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `posicionamento_empresa` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `pre_cadastros_loja` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `produtos_digitais` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `programas_visita_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `progresso_etapa_trilha` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `progresso_treinamentos` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `prospecting_schedule` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `push_notifications_log` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `push_subscriptions` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `recomendacoes_desenvolvimento` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `regras_entrega_loja` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `regras_metas_loja` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `regularizacao_fechamento` | SIM | não | 3 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `relatorios_devolutivas_semanais` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `release_health_log` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `remuneracao_benchmark` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `remuneracao_planos` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `remuneracao_regras` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `report_history` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `respostas_formulario_pmr` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `resultados_metricas_cliente` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `reunioes_google_meet_atas` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `role_assignments_audit` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `roles` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `routine_activity_templates` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `rpc_error_log` | SIM | não | 1 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `score_calculations` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `score_history` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `score_inputs` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `score_observations` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `seller_day_eligibility` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `seller_product_categories` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `seller_routine_block_diagnostics` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `seller_routine_snapshots` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `snapshots_estoque_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `snapshots_metricas_cliente` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `solicitacoes_consultoria` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `solicitacoes_correcao_lancamento` | SIM | não | 5 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `store_calendar_exceptions` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `store_commercial_settings` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `store_target_plans` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `story_ideas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `subpastas_drive_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `sugestoes_conteudo` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `system_health_log` | SIM | não | 1 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `tokens_oauth_consultoria` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `treinamento_avaliacoes` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `treinamento_presencas` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `treinamento_quiz_gabarito` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `treinamento_quiz_questoes` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `treinamento_quiz_tentativas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `treinamento_tarefa_respostas` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `treinamento_tarefas` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `treinamentos` | SIM | não | 7 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `trilhas_desenvolvimento` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `unidades_cliente_consultoria` | SIM | não | 3 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `universidade_aulas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `universidade_certificacoes` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `universidade_conteudo_migracao` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `universidade_trilhas` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `user_roles` | SIM | não | 2 | nenhum | SELECT | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `usuarios` | SIM | não | 3 | nenhum | SELECT, INSERT, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `valores_indicadores_planejamento` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `valores_parametros_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `vehicle_model_catalog` | SIM | não | 4 | nenhum | nenhum | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `veiculos_estoque` | SIM | não | 4 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `vendedor_nivel_carreira` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `vendedor_perfil` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `vendedor_perfil_historico` | SIM | não | 1 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `vendedores_loja` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `vinculos_loja` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
| public | `visitas_consultoria` | SIM | não | 2 | nenhum | SELECT, INSERT, UPDATE, DELETE | SIM | sem API anon | não executados nesta coleta | `IN_PROGRESS` |
