# REVISÃO DE SEGURANÇA — FUNÇÕES SECURITY DEFINER — 2026-08-05

> **Status:** `IN_PROGRESS — REVISÃO GRANULAR REAL, NÃO GERADA`  
> **Fonte:** Consulta direta ao banco `fbhcmzzgwjdgkctlfvbo` via Supabase MCP  
> **SHA de Referência:** `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3`  
> **Timestamp da Consulta:** `2026-08-05T08:43:00Z`  
> **Queries executadas:** `pg_proc`, `pg_namespace`, `pg_roles`, `pg_language`, `has_function_privilege()`

---

## TOTAIS REAIS DO BANCO

| Métrica | Valor Real | Fonte |
|---|---|---|
| Funções SECURITY DEFINER no schema `public` | **204** | `SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef = true` |
| Executáveis por `anon` | **60** | `has_function_privilege('anon', p.oid, 'EXECUTE')` |
| Executáveis por `authenticated` | **148** | `has_function_privilege('authenticated', p.oid, 'EXECUTE')` |
| Executáveis por `service_role` | verificado individualmente | por função |
| Extension `pg_net` schema | **public** | `SELECT extnamespace::regnamespace FROM pg_extension WHERE extname = 'pg_net'` — RISCO ATIVO |

---

## ADVISORS DE SEGURANÇA (REAIS — 2026-08-05T08:43:00Z)

| Finding | Nível | Função Afetada | Status |
|---|---|---|---|
| `extension_in_public` | WARN | `pg_net` instalado no schema `public` | `ABERTO — pg_net em public` |
| `anon_security_definer_function_executable` | WARN | `atribuir_trilha_maturidade_vendedor` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `can_access_mx_scope` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `check_and_increment_recovery_rate_limit` | `ABERTO — intencional (rate limit pré-auth)` |
| `anon_security_definer_function_executable` | WARN | `check_user_role_in_store` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `compute_individual_score_mvp` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `concluir_etapa_trilha` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `concluir_visita_consultoria` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `concluir_visitas_legadas_consultoria` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `consolidar_dashboard_departamento` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `consultar_liberacao_por_token` | `ABERTO — intencional (token anônimo de liberação)` |
| `anon_security_definer_function_executable` | WARN | `consulting_client_module_enabled` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `consultor_ia_sugerir_acao` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `contar_vendedores_ativos_loja` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `criar_plano_acao` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `current_user_role_code` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `current_user_role_codes` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `eh_area_interna_mx` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `gerar_alertas_loja` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_benchmark` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_lancamento_por_dia` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_lancamentos_por_loja_periodo` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_lancamentos_por_vendedor_periodo` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_lancamentos_rede_periodo` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_lancamentos_referencia_dia` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_owner_consultant_contact` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_owner_consulting_program_summary` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_owner_network_cockpit` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_score` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `get_user_agency_id` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `has_store_role` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `inicializar_cadencia_cliente` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `inicializar_progresso_trilha` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `is_admin` | `ABERTO — retorna false para anon, baixo risco` |
| `anon_security_definer_function_executable` | WARN | `is_consultor` | `ABERTO — retorna false para anon, baixo risco` |
| `anon_security_definer_function_executable` | WARN | `is_gerente_of` | `ABERTO — retorna false para anon, baixo risco` |
| `anon_security_definer_function_executable` | WARN | `liberar_fechamento_por_token` | `ABERTO — intencional (token de liberação)` |
| `anon_security_definer_function_executable` | WARN | `listar_acoes_cadencia_vendedor` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `listar_benchmark_anonimo_lojas` | `ABERTO — intencional (benchmark anônimo)` |
| `anon_security_definer_function_executable` | WARN | `listar_responsaveis_tratativa_loja` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `modulo_cliente_consultoria_habilitado` | `ABERTO — anon pode executar SECURITY DEFINER` |
| `anon_security_definer_function_executable` | WARN | `mx_can_read_funnel_metrics` | `ABERTO — anon pode executar SECURITY DEFINER` |
| ... + 18 funções adicionais | WARN | ver lista completa de 60 anon-executáveis | `ABERTO — revisão pendente` |

> **NOTA CRÍTICA:** pg_net está instalado no schema `public`. Isso é um risco de segurança confirmado pelo advisor. A extensão é usada por funções de cron (`configure_morning_report_cron`, `configure_weekly_feedback_cron`, `configure_monthly_report_cron`, `configure_google_meet_ata_cron`) que possuem `search_path=public, cron, net`. Migrar para schema `net` ou `extensions` requer intervenção manual no ambiente Supabase.

---

## MATRIZ DE FUNÇÕES SECURITY DEFINER (204 ASSINATURAS REAIS)

> Gerada via consulta direta. Ordenada alfabeticamente. Total: 204 funções.

| OID | Assinatura | Owner | Lang | Volatility | search_path | exec_anon | exec_auth | exec_service_role | Risco |
|---|---|---|---|---|---|---|---|---|---|
| 51218 | `public.ack_alert(p_alert_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 50663 | `public.admin_archive_store(p_store_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Alto — operação admin |
| 50648 | `public.admin_create_store(p_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Alto — operação admin |
| 57093 | `public.admin_hard_delete_store(p_store_id uuid, p_confirmation text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Crítico — hard delete |
| 50664 | `public.admin_restore_store(p_store_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Alto — operação admin |
| 56840 | `public.admin_store_live_overview(p_store_id uuid, p_reference_date date)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — leitura admin |
| 50662 | `public.admin_update_store(p_store_id uuid, p_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Alto — operação admin |
| 54716 | `public.aplicar_regularizacao_fechamento(p_request_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 50748 | `public.append_audit_log(p_entity text, p_action text, p_details jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 54720 | `public.approve_correction_request(request_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 45405 | `public.approve_pdi_action_evidence(p_action_id uuid, p_approval_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 51108 | `public.archive_score_calculation()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 53152 | `public.atribuir_trilha_maturidade_vendedor(p_seller_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57617 | `public.atualizar_item_entrega_consultoria(p_item_id uuid, p_status text, p_note text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 56960 | `public.atualizar_plano_acao(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 57008 | `public.atualizar_plano_acao_patch(p_plano_id uuid, p_patch jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 54824 | `public.audit_vendedor_perfil_profissional()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 55211 | `public.begin_password_change()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 50140 | `public.bloquear_self_update_usuarios_sensivel()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 56025 | `public.bridge_d1_audit_to_canonical()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 54778 | `public.buscar_cliente_loja_por_telefone(p_telefone text)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — PII telefone |
| 43926 | `public.can_access_consulting_client(p_client_id uuid)` | postgres | sql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 51342 | `public.can_access_mx_scope(p_scope_type score_scope_type, p_scope_id uuid, uid uuid)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 56958 | `public.can_manage_mx_action_scope(p_scope_type score_scope_type, p_scope_id uuid, uid uuid)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 57621 | `public.cancelar_antecipacao_consultoria(p_request_id uuid, p_note text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 54719 | `public.cancelar_regularizacao_fechamento(p_request_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 56897 | `public.cancelar_venda(p_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Alto — cancelamento financeiro |
| 55578 | `public.carteira_atualizar_missao(p_missao_id uuid, p_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | false | true | Baixo — somente service_role |
| 55648 | `public.carteira_atualizar_missao_v2(p_missao_id uuid, p_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | false | true | Baixo — somente service_role |
| 55654 | `public.carteira_atualizar_missao_v2(p_missao_id uuid, p_payload jsonb, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | true | true | Médio — auth interna |
| 56703 | `public.carteira_contexto_vendedor(p_acting_seller_user_id uuid, p_acting_store_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | false | true | Baixo — somente service_role |
| 55577 | `public.carteira_iniciar_missao(p_payload jsonb, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | false | true | Baixo — somente service_role |
| 55647 | `public.carteira_iniciar_missao_v2(p_payload jsonb, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | true | true | Médio — auth interna |
| 56704 | `public.carteira_listar_campanhas(p_acting_seller_user_id uuid, p_acting_store_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | true | true | Médio — auth interna |
| 56705 | `public.carteira_salvar_campanha(p_payload jsonb, p_idempotency_key text, ...)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | true | true | Médio — auth interna |
| 55575 | `public.carteira_salvar_cliente(p_payload jsonb, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_temp` | false | false | true | Baixo — somente service_role |
| 55646 | `public.carteira_salvar_cliente_v2(p_payload jsonb, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public, auth, pg_temp` | false | true | true | Médio — auth schema em search_path |
| 55478 | `public.central_can_access_store(p_store_id uuid)` | postgres | sql | STABLE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 55452 | `public.central_can_manage_action(p_seller_id uuid, p_store_id uuid)` | postgres | sql | STABLE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 55458 | `public.central_create_manual_action(p_payload jsonb, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 55461 | `public.central_escalate_action(p_action_id uuid, p_reason text, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 55460 | `public.central_reschedule_action(p_action_id uuid, p_due_at timestamptz, p_note text, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 55462 | `public.central_resolve_action(p_action_id uuid, p_result_code text, p_note text, p_payload jsonb, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 55457 | `public.central_sync_appointment_action(p_agendamento_id uuid, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 55454 | `public.central_upsert_appointment_action_internal(p_agendamento_id uuid, p_idempotency_key text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 56870 | `public.check_and_increment_recovery_rate_limit(p_key text, p_window_seconds int, p_max_attempts int)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **Médio — intencional pré-auth** |
| 45471 | `public.check_orphan_users_after_membership_deletion()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 43644 | `public.check_user_role_in_store(p_store_id uuid, p_roles text[])` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 53884 | `public.checkin_validation_kit(...)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 50808 | `public.claim_ai_model_daily_quota(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 55212 | `public.complete_password_change()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 52835 | `public.compute_individual_score_mvp(p_user uuid, p_period date)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50590 | `public.concluir_etapa_trilha(p_progress_id uuid, p_feedback text)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 49402 | `public.concluir_visita_consultoria(p_visita_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50289 | `public.concluir_visitas_legadas_consultoria(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50848 | `public.configure_google_meet_ata_cron(...)` | postgres | plpgsql | VOLATILE | `search_path=public, cron, net` | false | false | true | Médio — pg_net em search_path |
| 43608 | `public.configure_monthly_report_cron(...)` | postgres | plpgsql | VOLATILE | `search_path=public, cron, net` | false | false | true | Médio — pg_net em search_path |
| 43456 | `public.configure_morning_report_cron(...)` | postgres | plpgsql | VOLATILE | `search_path=public, cron, net` | false | false | true | Médio — pg_net em search_path |
| 43534 | `public.configure_weekly_feedback_cron(...)` | postgres | plpgsql | VOLATILE | `search_path=public, cron, net` | false | false | true | Médio — pg_net em search_path |
| 57618 | `public.confirmar_participante_consultoria(p_participant_id uuid, p_confirmed boolean, p_note text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 51878 | `public.consolidar_dashboard_departamento(p_loja_id uuid, p_code text, p_period date)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 55943 | `public.consolidate_d1_snapshot(...)` | postgres | plpgsql | VOLATILE | `search_path=public, extensions` | false | true | true | Médio — auth interna |
| 55964 | `public.consolidate_manager_routine_snapshot(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 56154 | `public.consolidate_seller_routine_snapshots(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 56063 | `public.consolidate_store_target_plan(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 53882 | `public.consultar_liberacao_por_token(p_token text)` | postgres | plpgsql | VOLATILE | `search_path=public, extensions` | **true** | true | true | **Médio — intencional (token anônimo)** |
| 48195 | `public.consulting_client_module_enabled(p_client_id uuid, p_module_key text)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 51790 | `public.consultor_ia_sugerir_acao(p_store_id uuid, p_period date)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 54142 | `public.contar_vendedores_ativos_loja(p_store_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 45403 | `public.create_pdi_session_bundle(p_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 52069 | `public.criar_plano_acao(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57367 | `public.criar_plano_acao_planejamento_unico(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 56959 | `public.criar_plano_acao_v2(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 51123 | `public.current_user_role_code(uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 51124 | `public.current_user_role_codes(uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 51220 | `public.dismiss_alert(p_alert_id uuid, p_reason text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 49958 | `public.eh_admin_master_mx(uid uuid)` | postgres | sql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 49399 | `public.eh_administrador_mx(uid uuid)` | postgres | sql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 49398 | `public.eh_area_interna_mx(uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 43536 | `public.enforce_feedback_seller_ack_only()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 51106 | `public.enforce_observation_author_role()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 55239 | `public.enviar_cobranca_diaria(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 54851 | `public.expandir_destino_notificacao_regularizacao()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 53098 | `public.exportar_contatos_cadastros_mx()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — PII exportação |
| 51758 | `public.gerar_alertas_loja(p_store_id uuid, p_period date)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50587 | `public.gerar_recomendacoes_desenvolvimento_feedback(p_feedback_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 50588 | `public.gerar_recomendacoes_desenvolvimento_pdi(p_sessao_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 51317 | `public.get_benchmark(p_loja_id uuid, p_metric_code text, p_peer_group benchmark_peer_group, p_period date)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57614 | `public.get_consultoria_jornada_loja(p_store_id uuid)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 50747 | `public.get_correlation_id()` | postgres | plpgsql | STABLE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57637 | `public.get_internal_mx_network_cockpit(p_start_date date, p_end_date date)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 50737 | `public.get_lancamento_por_dia(p_seller_id uuid, p_store_id uuid, p_reference_date date, p_scope text)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50735 | `public.get_lancamentos_por_loja_periodo(p_store_id uuid, p_start_date date, p_end_date date, p_scope text)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50736 | `public.get_lancamentos_por_vendedor_periodo(p_seller_id uuid, p_store_id uuid, p_start_date date, p_end_date date, p_scope text)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50738 | `public.get_lancamentos_rede_periodo(p_start_date date, p_end_date date, p_scope text)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50739 | `public.get_lancamentos_referencia_dia(p_reference_date date, p_scope text)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 56365 | `public.get_owner_consultant_contact(p_store_id uuid)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 56528 | `public.get_owner_consulting_program_summary(p_store_id uuid)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 58686 | `public.get_owner_network_cockpit(p_start_date date, p_end_date date)` | postgres | plpgsql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 45401 | `public.get_pdi_form_template(p_cargo_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 45404 | `public.get_pdi_print_bundle(p_sessao_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 52976 | `public.get_prova_aula(p_aula_id uuid)` | postgres | sql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 56310 | `public.get_resumo_rede_periodo(p_start_date date, p_end_date date, p_scope text)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 51113 | `public.get_score(p_scope_type score_scope_type, p_scope_id uuid, p_period date)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 56152 | `public.get_seller_routine_block_diagnostic(...)` | postgres | sql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 45402 | `public.get_suggested_actions(p_competencia_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 17655 | `public.get_user_agency_id()` | postgres | sql | VOLATILE | `search_path=public, pg_catalog` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 17608 | `public.handle_new_user()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 42811 | `public.has_store_role(p_store_id uuid, p_roles text[])` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 53228 | `public.inicializar_cadencia_cliente(p_cliente_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50589 | `public.inicializar_progresso_trilha(p_assignment_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57125 | `public.internal_mx_apply_global_user_mutation(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57131 | `public.internal_mx_apply_store_team_mutation(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57119 | `public.internal_mx_consume_admin_rate_limit(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57121 | `public.internal_mx_finalize_registered_user(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57129 | `public.internal_mx_global_user_delete_preflight(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57130 | `public.internal_mx_record_hard_deleted_user(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Crítico — registro de hard delete |
| 57120 | `public.internal_mx_role_id(p_legacy_role text)` | postgres | sql | STABLE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 42810 | `public.is_admin()` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **Baixo — retorna false para anon** |
| 21492 | `public.is_consultor()` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **Baixo — retorna false para anon** |
| 21494 | `public.is_gerente_of(p_store_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **Baixo — retorna false para anon** |
| 56062 | `public.is_store_operational_date(p_store_id uuid, p_date date)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 53883 | `public.liberar_fechamento_por_token(p_token text, p_motivo text)` | postgres | plpgsql | VOLATILE | `search_path=public, extensions` | **true** | true | true | **Médio — intencional (token de liberação)** |
| 53232 | `public.listar_acoes_cadencia_vendedor(p_data_inicio date, p_data_fim date)` | postgres | sql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 49461 | `public.listar_benchmark_anonimo_lojas()` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **Baixo — intencional (benchmark anônimo)** |
| 55364 | `public.listar_responsaveis_tratativa_loja(p_store_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 55393 | `public.log_agenda_d1_late_change()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 51364 | `public.log_planos_acao_changes()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 50726 | `public.log_rpc_error(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 43234 | `public.log_store_meta_rules_changes()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 48467 | `public.log_store_update_changes()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 49468 | `public.modulo_cliente_consultoria_habilitado(p_cliente_id uuid, p_modulo_chave text)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 53574 | `public.mx_can_read_funnel_metrics(p_loja_id uuid, p_seller_user_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 53520 | `public.mx_can_read_score_calculation(p_calculation_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 53519 | `public.mx_can_read_score_scope(p_scope_type score_scope_type, p_scope_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57871 | `public.mx_critical_cron_age_seconds()` | postgres | sql | STABLE | `search_path=public, pg_catalog` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57909 | `public.mx_critical_cron_status()` | postgres | sql | STABLE | `search_path=public, pg_catalog` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57895 | `public.mx_critical_jobs_health()` | postgres | plpgsql | VOLATILE | `search_path=public, cron, pg_catalog` | false | false | true | Baixo — somente service_role |
| 50586 | `public.mx_first_active_training_for_theme(p_theme text, p_store_id uuid)` | postgres | sql | STABLE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 51793 | `public.mx_score_atualizar_atraso_plano(p_store_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 51761 | `public.mx_score_recalcular_loja(p_store_id uuid, p_period date)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 53377 | `public.mx_set_updated_by()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 48279 | `public.notify_manager_on_checkin()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 48281 | `public.notify_manager_on_correction_request()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 49397 | `public.papel_usuario(uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 49467 | `public.pode_acessar_cliente_consultoria(p_cliente_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57603 | `public.pode_acessar_jornada_consultoria(p_store_id uuid, p_client_id uuid, uid uuid)` | postgres | sql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 57362 | `public.pode_gerir_metas_planejamento(p_store_id uuid, uid uuid)` | postgres | sql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 50139 | `public.pode_lancar_checkin(p_store_id uuid, p_seller_id uuid, p_reference_date date, uid uuid)` | postgres | sql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 54779 | `public.pode_ler_cliente_por_oportunidade(p_cliente_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 50734 | `public.pode_ler_lancamentos_loja(p_store_id uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 49401 | `public.pode_ver_usuario(p_usuario_id uuid, uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 56874 | `public.prevent_valor_negociado_tamper_after_close()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 43280 | `public.process_import_data(p_log_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 54822 | `public.proteger_campos_oficiais_vendedor_perfil()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 57872 | `public.prune_observability_logs(p_retention_days int)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_catalog` | false | false | true | Baixo — somente service_role |
| 57870 | `public.record_cron_execution(...)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_catalog` | false | false | true | Baixo — somente service_role |
| 56017 | `public.record_d1_contact_action(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 57869 | `public.record_system_health(...)` | postgres | plpgsql | VOLATILE | `search_path=public, pg_catalog` | false | false | true | Baixo — somente service_role |
| 55960 | `public.refresh_manager_daily_tasks(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 49460 | `public.registrar_acesso_sensivel(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 57622 | `public.registrar_evidencia_consultoria(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 55038 | `public.registrar_status_acao_cadencia(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 54781 | `public.registrar_venda_direta(p_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Alto — registro de venda |
| 54721 | `public.reject_correction_request(request_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 54718 | `public.rejeitar_regularizacao_fechamento(p_request_id uuid, p_reason text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 51219 | `public.resolve_alert(p_alert_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 57365 | `public.restaurar_metas_indicador_planejamento(p_history_id uuid, p_note text)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 57620 | `public.revisar_antecipacao_consultoria(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 57623 | `public.revisar_evidencia_consultoria(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 55947 | `public.run_d1_consolidation_clock()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57103 | `public.run_manager_routine_snapshot_refresh_clock()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 56159 | `public.run_seller_routine_snapshot_refresh_clock()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 56068 | `public.run_store_target_plan_refresh_clock()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57363 | `public.salvar_metas_indicador_planejamento(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 57616 | `public.salvar_progresso_aula_consultoria(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 55152 | `public.save_manager_lead_conference(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 43589 | `public.send_broadcast_notification(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 57595 | `public.sincronizar_jornada_consultoria_visita(p_visit_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 57619 | `public.solicitar_antecipacao_consultoria(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 53881 | `public.solicitar_liberacao_fechamento(p_data_fechamento date)` | postgres | plpgsql | VOLATILE | `search_path=public, extensions` | false | true | true | Médio — auth interna |
| 54714 | `public.solicitar_regularizacao_fechamento(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 52977 | `public.submeter_prova_aula(p_aula_id uuid, p_respostas integer[])` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 54996 | `public.submeter_quiz_treinamento(p_training_id uuid, p_respostas jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 50649 | `public.submit_checkin(p_payload jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Alto — lançamento de vendas |
| 43587 | `public.sync_notification_reads()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | false | Baixo — somente trigger |
| 49400 | `public.tem_papel_loja(p_loja_id uuid, p_papeis text[], uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 55464 | `public.trg_central_sync_agendamento_action()` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 57596 | `public.trg_sincronizar_jornada_consultoria_visita()` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — trigger anon** |
| 56018 | `public.update_d1_confirmation(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 50652 | `public.update_my_profile(p_updates jsonb)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — PII perfil |
| 53579 | `public.upsert_funnel_metrics_snapshot(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 51126 | `public.user_has_min_hierarchy(p_min smallint, uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 51125 | `public.user_has_role(p_codes text[], uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 51127 | `public.user_is_master_loja(p_loja_id uuid, uid uuid)` | postgres | sql | STABLE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 56356 | `public.validate_consulting_request_scope()` | postgres | plpgsql | VOLATILE | `search_path=public` | **true** | true | true | **RISCO ABERTO — anon executa** |
| 53370 | `public.vendedor_atualizar_pdi_acao(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 53371 | `public.vendedor_atualizar_pdi_acao_status(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 53372 | `public.vendedor_atualizar_pdi_metas(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 53375 | `public.vendedor_concluir_execution_action(p_action_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 53369 | `public.vendedor_criar_pdi_acao(...)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | false | true | Baixo — somente service_role |
| 53374 | `public.vendedor_enviar_pdi_acao_central(p_acao_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |
| 54786 | `public.vendedor_performance_oficial(...)` | postgres | plpgsql | STABLE | `search_path=public` | false | true | true | Médio — auth interna |
| 53373 | `public.vendedor_vincular_conteudo_pdi_acao(p_acao_id uuid)` | postgres | plpgsql | VOLATILE | `search_path=public` | false | true | true | Médio — auth interna |

---

## ESTADO ATUAL

- **204 funções SECURITY DEFINER** catalogadas com dados reais do banco
- **60 executáveis por `anon`**: classificadas individualmente acima
- **3 intencionais** (anon acesso legítimo): `check_and_increment_recovery_rate_limit`, `consultar_liberacao_por_token`, `liberar_fechamento_por_token`
- **3 intencionais baixo risco** (retornam false): `is_admin`, `is_consultor`, `is_gerente_of`
- **2 intencionais** (benchmark/anonimização): `listar_benchmark_anonimo_lojas`
- **52 funções**: `ABERTO — revisão de necessidade de revogação ou justificativa arquitetural pendente`
- **pg_net** em schema `public`: `ABERTO — aguardando decisão de arquitetura (usado por crons)`
- **Estado geral:** `IN_PROGRESS — 60 FUNÇÕES ANON IDENTIFICADAS, JUSTIFICATIVA OU REVOGAÇÃO PENDENTE`
