# AUDIT — Base44 Admin source inventory (2026-08-23)

Read-only inventory of the Base44 Admin dump and related prompt acceptance criteria.

- Dump root: `docs/base44-import/_source`
- Prompt skim: `~/Downloads/PROMPT DE CORREÇÃO/PROMPT DE CORREÇÃO BASE44.md`
- Partial port in repo: `src/features/admin-mx/` (not part of dump; listed for gap context)
- No secrets included.

---

## 1. Dump overview

| Metric | Count |
| --- | ---: |
| Total files under `_source` | 125 |
| JS/TS/JSX files | 61 |
| `base44/entities/*.jsonc` | 61 |
| Pages present under `src/pages/` | **1** (`PlanosAcaoGlobal.jsx`) |
| Page modules imported by `App.jsx` | 32 |
| Missing page modules | **31** |

Top-level: `base44/`, `src/`, `tailwind.config.js`.

---

## 2. Routes (`src/App.jsx`)

### Auth (outside AppLayout)

| Path | Page import | In dump? |
| --- | --- | --- |
| `/login` | `Login` | ❌ |
| `/register` | `Register` | ❌ |
| `/forgot-password` | `ForgotPassword` | ❌ |
| `/reset-password` | `ResetPassword` | ❌ |

### Protected + AppLayout

| Path | Page import | In dump? |
| --- | --- | --- |
| `/` | `Home` | ❌ |
| `/clientes` | `ClientesMX` | ❌ |
| `/clientes/novo` | `NovoCliente` | ❌ |
| `/clientes/:id` | `ClienteDetalhe` | ❌ |
| `/consultoria` | `Consultoria` | ❌ |
| `/equipe` | `EquipeMX` | ❌ |
| `/universidade` | `Universidade` | ❌ |
| `/produtos` | `ProdutosConsultoria` | ❌ |
| `/consultoria-mx` | `ConsultoriaMX` | ❌ |
| `/indicadores` | `PlanoEstrategicoGlobal` | ❌ |
| `/scores` | `ScoresAlertas` | ❌ |
| `/planos-acao` | `PlanosAcaoGlobal` | ✅ |
| `/benchmark` | `Benchmark` | ❌ |
| `/dados` | `DadosConciliacao` | ❌ |
| `/notificacoes` | `Notificacoes` | ❌ |
| `/suporte` | `Suporte` | ❌ |
| `/seguranca` | `SegurancaAuditoria` | ❌ |
| `/observabilidade` | `Observabilidade` | ❌ |
| `/configuracoes` | `Configuracoes` | ❌ |
| `/mapa-funcional` | `MapaFuncional` | ❌ |
| `/roteiro-testes` | `RoteiroTestes` | ❌ |
| `/clientes/:clientId/plano-estrategico` | `PlanoEstrategico` | ❌ |
| `/clientes/:clientId/plano-estrategico/:year` | `PlanoEstrategicoEditor` | ❌ |
| `/clientes/:clientId/plano-estrategico/:year/preview` | `PlanoEstrategicoPreview` | ❌ |
| `/clientes/:clientId/plano-estrategico/:year/visualizacao-dono` | `VisualizacaoDono` | ❌ |
| `/clientes/:clientId/plano-acao` | `PlanoAcao` | ❌ |
| `/clientes/:clientId/consultoria` | `ConsultoriaEntregas` | ❌ |

Notes:

- `Indicadores` is imported in `App.jsx` but `/indicadores` renders `PlanoEstrategicoGlobal`.
- Catch-all `*` → `PageNotFound` (`src/lib/PageNotFound` — **missing** from dump).
- Auth wiring imports `AuthContext` — **missing** from dump.

---

## 3. TopBar `routeLabels` (`src/components/layout/TopBar.jsx`)

Sidebar chrome title map (not full nav; `Sidebar.jsx` itself is **missing**):

| Path root | Label |
| --- | --- |
| `/` | Início |
| `/clientes` | Clientes MX |
| `/consultoria` | Consultoria |
| `/equipe` | Equipe MX |
| `/universidade` | Universidade MX |
| `/produtos` | Produtos de Consultoria |
| `/indicadores` | Indicadores e Parâmetros |
| `/scores` | Scores e Alertas |
| `/planos-acao` | Planos de Ação e Playbooks |
| `/benchmark` | Benchmark e Mercado |
| `/dados` | Dados e Conciliação |
| `/notificacoes` | Notificações, Agenda e Integrações |
| `/suporte` | Suporte e Incidentes |
| `/seguranca` | Segurança e Auditoria |
| `/observabilidade` | Observabilidade |
| `/configuracoes` | Configurações da Plataforma |

Fallback title: **Módulo Administrador**.

Not labeled in `routeLabels` (still routed): `/consultoria-mx`, `/mapa-funcional`, `/roteiro-testes`, nested client paths (`plano-estrategico`, `visualizacao-dono`, `plano-acao`, `consultoria`), auth routes.

---

## 4. Components that EXIST in dump

### Root `src/components/`

- `AuthLayout.jsx`
- `GoogleIcon.jsx`
- `ProtectedRoute.jsx`
- `ScrollToTop.jsx`
- `UserNotRegisteredError.jsx`

### `layout/` (3)

- `AppLayout.jsx` — imports **missing** `./Sidebar`
- `PrototypeBanner.jsx`
- `TopBar.jsx`

### `strategic/storeActions/` (2)

- `ExportStoreTargetsModal.jsx`
- `StoreActionsMenu.jsx`

### `onboarding/` (2)

- `ConfigEditorModal.jsx`
- `ModulesMatrix.jsx`

### `actionplans/` (4 + 1 text)

- `DepartmentCards.jsx`
- `NewActionChoiceModal.jsx`
- `TemplateFilters.jsx`
- `TemplateWizard.jsx`
- `TemplateWizard-comercial-options.txt`

**Referenced by `PlanosAcaoGlobal.jsx` but missing from dump:**
`TemplateTable`, `ApplyTemplateModal`, `SuggestToClientModal`, `TemplateDetailDrawer`, `SuggestionsTab`, `ApplicationsTab`, `HistoryTab`.

### `consultingMx/` (1)

- `EncounterEditor.jsx`

---

## 5. Supporting libs present (relevant)

Under `src/lib/` (partial list): `ownerViewModel.js`, `ownerMasterResolver.js`, `currentStrategicPlan.js`, `strategicCalc.js`, `strategicPlanOps.js`, `actionPlanOps.js`, `actionPlanConstants.js`, `consultingMxConstants.js`, `capabilityCatalog.js`, `indicatorCatalog.js`, `indicatorFormat.js`, `indicatorOrder.js`, plus utils (CNPJ, hours, capacity, etc.).

Also: `src/api/base44Client.js`, hooks `use-mobile.jsx` / `use-size.jsx`, `src/main.jsx`, `src/index.css`, `src/utils/index.ts`.

---

## 6. Entities present (`base44/entities/`)

61 JSONC schemas including (among others): `ClientAccount`, `Store`, `StrategicPlanCycle`, `StrategicTarget`, `IndicatorDefinition`, `IndicatorActualSnapshot`, `ActionPlan*`, `Consulting*`, `Encounter*`, `User`, `UserProfile`, `RoleGrant`, `StoreAssignment`, `EnrollmentRequest`, `SupportRequest`, `AuditLog`, etc.

Useful for parity of Admin/Dono data model even when UI pages are missing.

---

## 7. Partial pages outside dump (repo port)

`src/features/admin-mx/` already has many Admin surfaces (not Base44 source): dashboard, clientes (+ Pessoas/Dono Master modals), indicadores/plano editor, planos-acao, consultoria-mx, equipe, produtos, scores, suporte, segurança, dados, etc. Treat as **implementation target**, not dump evidence.

---

## 8. Prompt acceptance bullets (Admin / Dono)

Source: `PROMPT DE CORREÇÃO BASE44.md` (skim around L38849 / L41178 / L41919).

### 8.1 Visão do Dono — competência, Realizado, calculáveis e cards

Header ~L38779: **VISÃO DO DONO, COMPETÊNCIA, REALIZADO, CALCULÁVEIS E CARDS**.

**Critérios de aceite (~L40095):**

1. Competência padrão Julho/2026
2. MX BH mostra Resultado Atual
3. MX CONTAGEM mostra Resultado Atual
4. Matriz **não** recebe fallback do consolidado
5. Todas as Unidades calcula Vendas Total
6. Calculáveis com base são exibidos
7. % da Meta calculado
8. Resumo e Visão Geral com mesmos valores
9. Cards acompanham Meta / Resultado / Ano Anterior
10. Cards e tabela no mesmo período
11. Consolidado indica completude parcial
12. Troca de unidade sem reload completo
13. Admin e Dono mesma fonte de dados
14–16. Sem tela branca, erro não tratado ou duplicidade

**Regras-chave:**

- Estado vazio legítimo ≠ erro; não copiar consolidado para unidade vazia; não inventar zero/%
- Contexto único: `client_account_id`, cycle/version, year/month, `scope_type`, store/indicator selecionados
- Preservar layout oficial da Visão do Dono e IDs de escopo/indicador

**Não declarar concluído se:** abre em agosto sem resultado; Vendas Total vazia no Dono; Admin≠Dono; cards misturam Meta/Resultado ou anual vs acumulado; Matriz recebe “Todas as Unidades”.

### 8.2 Admin — metas publicadas / pendentes / versão exibida

Header ~L41106: **METAS PUBLICADAS, PENDENTES E VERSÃO EXIBIDA** (Clientes MX — resumo do Plano).

**Regras:**

- Fonte única do resumo alimenta: card Visão Geral, modal Validar e Ativar, card do Plano, Entrega Consultoria, lista Clientes MX, observabilidade
- Não misturar versão publicada com rascunho nas contagens do card principal
- Contar **indicadores únicos** (não × unidades / meses)
- Definir: Indicadores com meta / Metas publicadas / Metas pendentes
- Completude por unidade: `PER_UNIT_REQUIRED|OPTIONAL`, `COMPANY_ONLY`, `SHARED_COMPANY_VALUE`

**Testes de aceite (~L41674):**

1. Cliente atual → 46 / 46 / 0 / Publicado
2. Reload mantém valores (sem cache velho)
3. Multiunidade → 46, não 138
4. Modal Validar e Ativar → 46 indicadores
5. Plano só rascunho → publicadas 0, Status Rascunho
(+ testes 7–10 publicação/revisão/consistência/render)

### 8.3 Pessoas e acessos — Dono Master

Header ~L41841: **PESSOAS E ACESSOS — DONO MASTER, PAPÉIS E ATIVAÇÃO DO CLIENTE**.

**Separar:** Função declarada ≠ Perfil de acesso ≠ Visão padrão ≠ Dono Master.

**Dono Master:** exatamente um vigente; escopo global (Matriz + Filiais); novas filiais no escopo; pode ter outros papéis; visão padrão não define Master.

**Não validar checklist por `default_view = DONO`.**

**Testes de aceite (~L42899):**

1. Link Corrigir abre Pessoas + formulário + retorno ao checklist
2. Contato principal pré-preenche; Dono+Master; todas Lojas; sem duplicar contato
3. Salvar → User/RoleGrant/Master/escopo/convite/card
4. Revalidação → ✓ Dono Master configurado
5. Convite pendente não bloqueia ativação (aviso)
6. Múltiplos Donos; só um Master
7. Segundo Master exige transferência
8. Múltiplos papéis numa identidade
9. `default_view` Gerente ainda Master
10–12. Desativação / edição / ativação do cliente

---

## 9. Key gaps in dump

1. **31/32 page files missing** — only `PlanosAcaoGlobal.jsx` present; routes alone cannot run UI.
2. **`Sidebar.jsx` missing** — `AppLayout` incomplete; nav labels only partially recoverable via `TopBar.routeLabels`.
3. **Action-plan page incomplete** — page exists but imports 7 missing actionplans components.
4. **Auth/runtime stubs missing** — `AuthContext`, `PageNotFound`, all login pages.
5. **No `VisualizacaoDono` / strategic plan editors in dump** — Dono/Admin acceptance must be implemented from prompt + libs (`ownerViewModel`, `strategic*`) + `admin-mx` port, not from page source.
6. Entities + libs are relatively rich vs UI; dump is better as **schema/ops reference** than pixel-parity page archive.

---

## 10. Knowledge labels (for later search)

- `base44-source-inventory-2026-08-23`
- `base44-dump-routes-topbar`
- `base44-prompt-aceite-dono-metas-pessoas`
