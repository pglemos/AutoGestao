# Importação do Módulo Administrador MX (mx-admin-flow → MX Gestão Preditiva)

Fontes analisadas:
- `mx-admin-flow.zip` — app Base44 completo: 39.180 LOC, 35 páginas, 76 entidades, 33 rotas.
- `MX_PERFORMANCE_Backlog_Priorizado_Modulo_Administrador_v10.xlsx` — 143 histórias, 18 épicos, 5 ondas (Onda 0/1 = MVP, 69 itens; 62 P0).
- `CONSULTORIA-CRONOGRAMADEVISITAS.xlsx` — 5 abas de cronograma: CRM, PMR ONLINE, PMR HÍBRIDO, ENCONTRO_PMR PLUS, ENCONTRO_PPA.

## Estado atual do destino

Nenhuma das rotas pedidas existe no sistema: `/clientes`, `/equipe`, `/produtos`, `/indicadores`, `/planos-acao`, `/consultoria-mx`. É um módulo **novo** (admin interno MX), não uma evolução de tela existente.
Existe hoje `/consultoria*` (visão consultor de loja) — escopo diferente do `/consultoria-mx` do admin.

## Superfície a importar (as 6 rotas pedidas + dependências obrigatórias)

| Rota | Página origem | LOC | Componentes de apoio |
|---|---|---|---|
| `/clientes` | ClientesMX.jsx (+ ClienteDetalhe 562, NovoCliente 937) | ~1.740 | `components/client` (5), `components/onboarding` (15) |
| `/equipe` | EquipeMX.jsx | ~200 | `components/users` (5) |
| `/produtos` | ProdutosConsultoria.jsx | ~200 | `lib/productPackageOps`, `capabilityCatalog` |
| `/indicadores` | Indicadores.jsx | ~200 | `lib/indicatorCatalog`, `indicatorFormat`, `indicatorOrder` |
| `/planos-acao` | PlanosAcao + PlanosAcaoGlobal + PlanoAcao | ~600 | `components/actionplans` (18), `lib/actionPlanOps` |
| `/consultoria-mx` | ConsultoriaMX + ConsultoriaEntregas | ~450 | `components/consultingMx` (10), `lib/capacityCalc`, `consultingMxConstants` |

Dependências transversais que vêm junto (não opcionais): `AuthContext`, `ProtectedRoute`/RBAC, `layout` (4), `ui` (53 — já temos equivalentes), `strategic` (18, porque plano estratégico é referenciado por clientes e planos de ação), `lib/strategicCalc|strategicPlanOps|unitScopeOps|excel*Import|cnpjUtils|codeGenUtils`.

## Entidades (76 no Base44) — núcleo das 6 rotas

Clientes: ClientAccount, LegalEntity, Store, StoreAssignment, StoreOperatingHour, ClientContract, ClientCapabilityConfig, ClientOnboardingStageInstance, ImportBatch, EnrollmentRequest.
Equipe: User, UserProfile, RoleGrant, ManagerDelegation, MxConsultant, ConsultantProductQualification, ConsultantEncounterQualification, ConsultantWorkloadReservation.
Produtos: ConsultingProduct, ProductCapabilityReference, ProductOnboardingStageTemplate, ConsultingTimeParameter, ConsultingMethodologyVersion.
Indicadores: IndicatorDefinition, StrategicIndicatorPackage(+Version/Item), ClientStrategicIndicator, IndicatorActualSnapshot, StrategicTarget(+MonthlyValue), ClientIndicatorUnitPolicyOverride.
Planos de ação: ActionPlan, ActionItem, ActionPlanTemplate(+Version/Item), ActionPlanSuggestion.
Consultoria MX: JourneyEncounter, EncounterTemplate, EncounterReport(+Template), EncounterLesson, EncounterDeliverableTemplate, EncounterEvidenceTemplate, EncounterMethodologyContent, EncounterContentReference, EncounterActionPlanReference, ConsultantEncounterGuide.
Transversal: AuditLog, AlertInstance, FileAsset, InteractionDefinition, StrategicPlanCycle/UnitScope, StrategicParameterDefinition.

## Plano por ondas (proposto)

- **Onda A — Fundação**: rota + shell admin + RBAC (papel `admin_mx`), adaptador de dados, tokens visuais, entidades de cadastro base (ClientAccount, LegalEntity, Store, User/RoleGrant).
- **Onda B — `/clientes`**: lista, detalhe 360, wizard NovoCliente (937 LOC, o item mais pesado), onboarding stages, importação Excel.
- **Onda C — `/equipe` + `/produtos`**: consultores, qualificações, delegações; catálogo de produtos e capacidades.
- **Onda D — `/indicadores`**: catálogo, pacotes, metas mensais, snapshots, import/export Excel de metas.
- **Onda E — `/planos-acao`**: templates, versões, plano por cliente, sugestões, visão global.
- **Onda F — `/consultoria-mx`**: jornada de encontros, capacidade/agenda (usa o cronograma de visitas), entregas, relatórios.

Cada onda: schema → adapter/queries → UI portada → testes → evidência.

## Decisões tomadas (2026-08-15)

- **Dados: Supabase real, reaproveitando o que já existe.** O banco já tem 231 tabelas e cobre a maior parte do módulo — nada foi criado do zero nesta fatia.
- **Visual: design system MX** (`MxModulePage`/`MxModuleHeader`/`MxSectionCard`/`MxTableSurface`), não o visual do Base44.
- **Ordem: fatiamento horizontal** — as 6 rotas com lista primeiro.

## Mapa entidade Base44 → tabela existente

| Módulo | Base44 | Supabase MX (já existente) |
|---|---|---|
| Clientes | ClientAccount, LegalEntity, Store, ClientCapabilityConfig | `clientes_consultoria`, `unidades_cliente_consultoria`, `contatos_cliente_consultoria`, `modulos_cliente_consultoria` |
| Equipe | User, MxConsultant, RoleGrant, StoreAssignment | `usuarios`, `atribuicoes_consultoria`, `user_roles`, `perfis` |
| Produtos | ConsultingProduct, ProductOnboardingStageTemplate | `programas_visita_consultoria`, `etapas_metodologia_consultoria`, `modulos_sistema` |
| Indicadores | IndicatorDefinition, StrategicTarget, IndicatorActualSnapshot | `catalogo_metricas_consultoria`, `metas_metricas_cliente`, `resultados_metricas_cliente` |
| Planos de ação | ActionPlan, ActionItem | `planos_acao`, `itens_plano_acao`, `evidencias_planos_acao` |
| Consultoria MX | JourneyEncounter, EncounterReport, Deliverable | `visitas_consultoria`, `consultoria_itens_entrega`, `relatorios_devolutivas_semanais` |

Sem cobertura hoje (entram nas próximas ondas): versionamento de templates de plano de ação, pacotes de indicadores versionados, reservas de capacidade do consultor, qualificações por produto/encontro.

## Fatia 1 entregue

Rotas novas, todas restritas a `INTERNAL_ROLES` em `src/lib/auth/routeAccess.ts`:

| Rota | Página | Fonte de dados |
|---|---|---|
| `/clientes` | `ConsultoriaClientes` (CRM já existente) | `clientes_consultoria` |
| `/equipe` (admin) | `AdminEquipeMxPage` | `usuarios` + `atribuicoes_consultoria` |
| `/produtos` (admin) | `AdminProdutosConsultoriaPage` | `programas_visita_consultoria` + contagem de clientes |
| `/indicadores` | `AdminIndicadoresPage` | `catalogo_metricas_consultoria` + `metas_metricas_cliente` |
| `/planos-acao` | `AdminPlanosAcaoGlobalPage` | `planos_acao` |
| `/consultoria-mx` | `AdminConsultoriaMxPage` | `visitas_consultoria` + `consultoria_itens_entrega` |

`/equipe` e `/produtos` são híbridas via `RoleSwitch`: admin MX abre a tela nova, os demais perfis mantêm o comportamento anterior.

## Fatia 2 entregue — cadastro completo de cliente

`/clientes/novo` (`AdminNovoClientePage`): wizard de 7 passos igual ao `NovoCliente.jsx` do Base44 — Identificação, Estrutura e Lojas, Produto e Contrato, Jornada e Consultores, Módulos, Pessoas e Acessos, Revisão.

- Regras puras e testadas em `novo-cliente/newClientDraft.ts` (validação por passo, CNPJ com dígito verificador, slug, pendências) — 9 testes.
- Persistência em `novo-cliente/createClientProgram.ts`: grava `clientes_consultoria` + `unidades_cliente_consultoria` + `contatos_cliente_consultoria` + `modulos_cliente_consultoria` + `atribuicoes_consultoria`. Se uma coleção falhar, o cliente recém-criado é arquivado (evita cadastro pela metade).
- A lista de clientes ganhou dois caminhos: "Cadastro rápido" (modal existente) e "Novo cliente" (wizard).

## Fatia 3 entregue — contrato do cliente e CRUD de catálogo

**Migration `20260815120000_add_client_contract_fields.sql`** (ainda não aplicada em produção): adiciona a `clientes_consultoria` as colunas `structure_type` (CHECK LOJA_UNICA/REDE), `business_phase`, `implementation_owner_id` (FK `usuarios`, ON DELETE SET NULL), `contract_start_date`, `contract_end_date` (CHECK fim ≥ início) e índice parcial no responsável. Colunas na própria tabela porque a relação é 1:1 hoje; vira tabela própria quando houver histórico de renovação. O wizard agora persiste os cinco campos e valida contrato invertido e responsável obrigatório (passo 4).

**`/produtos`** — criar e editar produto de consultoria (`ConsultingProductFormModal` → upsert em `programas_visita_consultoria` por `program_key`). Chave imutável na edição.

**`/indicadores`** — criar e editar indicador do catálogo (`IndicatorFormModal` → upsert em `catalogo_metricas_consultoria` por `metric_key`), com área por datalist, tipo de valor, direção de leitura e escopo da fonte. Chave validada (`^[a-z0-9_]+$`) e imutável na edição.

## Fatia 4 entregue — fluxo completo de plano de ação

**Migration `20260815130000_action_plan_templates.sql`** (não aplicada em produção): três tabelas com RLS restrita à área interna MX (`eh_area_interna_mx()`), `REVOKE ALL FROM PUBLIC` e grants explícitos a `authenticated`.

| Tabela | Papel |
|---|---|
| `planos_acao_templates` | identidade estável do template (chave, nome, departamento, indicador, produto) |
| `planos_acao_template_versoes` | versão rascunho/publicada/arquivada; índice único parcial garante **uma** publicada por template |
| `planos_acao_template_itens` | itens congelados da versão (problema, ação, como, prioridade, prazo em dias, evidência) |

Três tabelas e não uma porque editar um template não pode mudar retroativamente o que já foi aplicado em cliente.

**Fluxo na tela** — `/planos-acao` ganhou abas (`TabNav`): *Planos da rede* (a lista já existente) e *Biblioteca de templates*:

1. **Criar/editar** — `TemplateFormModal` com itens dinâmicos; salvar sempre grava num **rascunho** (cria a versão seguinte se não houver rascunho aberto, ou substitui os itens do rascunho existente).
2. **Publicar** — `publishTemplateVersion` recusa versão sem itens, arquiva a publicada anterior e promove o rascunho.
3. **Aplicar** — `ApplyTemplateModal` materializa os itens da versão publicada como linhas de `planos_acao` da loja escolhida, com `origem = 'consultor'`, `origem_ref_table = 'planos_acao_template_versoes'` e prazo = data da aplicação + `prazo_dias`.

Lógica pura testada em `planos-acao/actionPlanTemplates.test.ts` (8 testes: validação, item pela metade por posição, prazo negativo, conversão de prazo em dias para data).

## Fatia 5 entregue — sugestões e CRUD de equipe

**Aba *Sugestões do motor* em `/planos-acao`** — lê `consultor_solucoes` (motor determinístico de regras) e promove uma sugestão a plano de ação: cria a linha em `planos_acao` com `origem_ref_table = 'consultor_solucoes'` e grava `source_plano_id` de volta na sugestão, para a mesma recomendação não virar plano duplicado no ciclo seguinte. A prioridade numérica do motor (1 = mais urgente) é traduzida para a escala `critica/alta/media/baixa`.

**`/equipe` com CRUD** — editar nome, e-mail, telefone, papel (restrito aos três papéis internos MX) e status; desativar/reativar acesso; e sincronizar a carteira de clientes do consultor. Desativar não apaga: marca `deactivated_at`/`deactivation_reason` e inativa as atribuições, preservando o histórico. A sincronização de carteira é uma função pura (`planAssignmentSync`) que decide o que reativar, desativar e criar — testável sem banco.

## Grafo do app de origem (graphify)

`graphify-out/` tem o grafo do `mx-admin-flow/src`: 1.115 nós, 3.105 arestas, 56 comunidades (extração AST, sem custo de LLM). Comunidades relevantes: Lançamento de Indicadores (109 nós), Dados Realizados e Importação (87), Cliente Base44 e Biblioteca (49), Conteúdo do Encontro (46), Cadastro de Cliente e Pessoas (38), Detalhe do Plano de Ação (31), Plano Estratégico por Produto (30), Catálogo de Indicadores (27), Motor de Cálculo Estratégico (24), Consultores e Capacidade (23). God nodes: `cn()`, `base44`, `useToast()`, `getFormatConfig()`, `formatDisplay()`.

Consulta: `graphify query "<pergunta>"` na raiz do projeto.

## Próximas fatias

1. Detalhe e criação de cliente (wizard NovoCliente, onboarding stages, importação Excel).
2. CRUD de equipe (convite, papéis, delegações) e de produtos (capacidades, etapas).
3. Edição de indicadores, pacotes e metas mensais com import/export.
4. Fluxo completo de plano de ação (templates, versões, sugestões).
5. Jornada de consultoria: agenda por capacidade (usa o cronograma de visitas), relatórios e evidências.
