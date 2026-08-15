# Base44 Admin Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convergir as funcionalidades, ações e fluxos do Módulo Administrador Base44 para o MXGESTAOPREDITIVA nas áreas Clientes MX, Equipe MX, Produtos de Consultoria, Indicadores, Planos de Ação e Consultoria MX, preservando o Supabase canônico, o design system atual, as rotas existentes e os módulos Dono/Gerente/Vendedor.

**Architecture:** O Base44 será tratado como especificação funcional executável e referência de interação, nunca como nova fonte de dados. As instâncias operacionais continuam nas tabelas canônicas atuais (`clientes_consultoria`, `lojas`, `usuarios`, `visitas_consultoria`, `planos_acao`, `catalogo_indicadores_planejamento` etc.). Somente domínios de governança inexistentes serão adicionados como tabelas normalizadas e versionadas, com RLS, auditoria e chaves idempotentes.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, React Router 7, TanStack Query 5, Supabase JS 2, PostgreSQL 17, Bun test, Playwright, Vercel.

## Global Constraints

- Instrução mais recente do histórico Base44 vence dentro do mesmo assunto.
- Não duplicar `ClientAccount` sobre `clientes_consultoria`, `Store` sobre `lojas`, `UserProfile` sobre `usuarios`, `ActionPlan` sobre `planos_acao`, nem `IndicatorDefinition` sobre `catalogo_indicadores_planejamento`.
- Preservar IDs canônicos, vínculos, histórico, jornadas, contratos e usuários existentes.
- Preservar as rotas e experiências atuais de Dono, Gerente e Vendedor.
- Preservar o design system canônico `MxModule*`; não importar o shell Base44.
- Zero cliques mortos: ação funcional, simulação explicitamente marcada, ou controle desabilitado com motivo.
- Mutações críticas devem ser idempotentes, auditadas e protegidas contra duplo disparo.
- Mudanças de schema devem ser aditivas e passar pelos advisors de segurança/performance.
- Migrações de dados devem ser reexecutáveis e nunca apagar histórico para “corrigir” duplicidade.

---

## Mapa de autoridade funcional

1. Histórico Base44 mais recente do assunto, incluindo v1.7.x Clientes, v1.8 Núcleo de Entrega, Consultoria MX v1.0, Indicadores por versão do produto e correções finais de Planos de Ação.
2. `CONSULTORIA-CRONOGRAMADEVISITAS` para nomes, ordem e duração dos encontros.
3. Backlog Administrador v1.0 para gates, MVP vertical e critérios de aceite.
4. Supabase atual para fonte única e modelo operacional existente.
5. `src/base44-reference` e ZIP `mx-admin-flow` para referência de comportamento/UI, sem substituir componentes canônicos atuais.

## Mapeamento de domínio

| Base44 | MXGESTAOPREDITIVA canônico | Estratégia |
|---|---|---|
| ClientAccount / LegalEntity | `clientes_consultoria` + `lojas`/unidades | Reutilizar e complementar campos/serviços |
| Store | `lojas` + `unidades_cliente_consultoria` onde aplicável | Uma única visão de loja, sem duplicação operacional |
| UserProfile / MxConsultant | `usuarios` + extensão de perfil consultivo | Identidade em `usuarios`, atributos consultivos em extensão 1:1 |
| ConsultingProduct | `programas_visita_consultoria` | Programa é catálogo canônico; versão em tabela complementar |
| EncounterTemplate | `etapas_modelo_visita_consultoria` | Reutilizar número/nome/duração/checklist |
| JourneyEncounter | `visitas_consultoria` | Instância real permanece canônica |
| IndicatorDefinition | `catalogo_indicadores_planejamento` | Catálogo mestre canônico |
| StrategicIndicatorPackage* | inexistente | Criar pacote/versionamento ligado ao catálogo e versão do produto |
| ActionPlan | `planos_acao` | Instância real permanece canônica |
| ActionPlanTemplate* | inexistente | Criar biblioteca/versionamento de Planos Padrão |
| ActionItem | `itens_plano_acao` + checklist canônico | Reutilizar para instância; snapshot de template na aplicação |
| ConsultingMethodologyVersion e conteúdos | inexistente como domínio separado | Criar camada metodológica ligada ao produto/encontro existentes |
| AuditLog | `internal_mx_admin_audit` + históricos específicos | Reutilizar auditoria existente |

---

### Task 1: Contratos canônicos e testes de paridade

**Files:**
- Create: `src/features/admin-convergence/types.ts`
- Create: `src/features/admin-convergence/domainMap.ts`
- Create: `src/features/admin-convergence/domainMap.test.ts`
- Create: `docs/audit/base44-admin-functional-parity-2026-08-15.md`

**Produces:** mapa tipado das seis áreas, status `existing | partial | missing`, rota canônica e tabelas fonte.

- [ ] Escrever testes que falhem quando um dos seis módulos não possuir rota, fonte canônica e política de migração.
- [ ] Implementar o mapa mínimo para os seis módulos.
- [ ] Registrar no relatório cada funcionalidade Base44 encontrada e seu destino no sistema atual.
- [ ] Rodar `bun test src/features/admin-convergence/domainMap.test.ts`.

### Task 2: Fundação de governança no Supabase

**Files:**
- Create: `supabase/migrations/20260815110000_base44_admin_governance_foundation.sql`
- Regenerate: `src/types/database.generated.ts`
- Test: `src/features/admin-convergence/governance-schema.test.ts`

**Produces:** tabelas normalizadas apenas para lacunas reais: `consultores_mx_perfil`, `consultores_mx_produtos`, `consultores_mx_encontros`, `versoes_programa_consultoria`, `pacotes_indicadores_estrategicos`, `versoes_pacote_indicadores_estrategicos`, `itens_pacote_indicadores_estrategicos`, `modelos_planos_acao`, `versoes_modelos_planos_acao`, `itens_modelo_plano_acao`, `aplicacoes_modelo_plano_acao`, `versoes_metodologia_consultoria`, `conteudos_metodologia_encontro`, `guias_consultor_encontro`, `entregas_modelo_encontro`, `evidencias_modelo_encontro`, `conteudos_referencia_encontro`, `modelos_relatorio_encontro`.

**Constraints:** FK para tabelas canônicas; `created_at/updated_at`; RLS; sem SECURITY DEFINER desnecessário; unique keys de versão/idempotência.

- [ ] Escrever testes/introspecção esperada antes da migration.
- [ ] Criar migration aditiva e idempotente.
- [ ] Rodar advisors de segurança e performance após aplicação em ambiente de validação.
- [ ] Gerar tipos e validar diff.

### Task 3: `/clientes` como Clientes MX e Visão 360 canônica

**Files:** `src/App.tsx`, `src/design-system/internal-mx/internalMxNavigation.tsx`, `src/pages/ConsultoriaClientes.tsx`, `src/pages/ConsultoriaClienteDetalhe.tsx`, `src/features/admin-clients/*`.

- [ ] Adicionar rota administrativa canônica `/clientes` e detalhe `/clientes/:clientId`, preservando aliases atuais de consultoria.
- [ ] Unificar consulta de matriz/filiais com estrutura canônica.
- [ ] Implementar serviço único de prontidão e ativação sem considerar metas como bloqueio crítico.
- [ ] Implementar ações da Carteira e atalhos da Visão 360 sem cliques mortos.
- [ ] Garantir CNPJ, edição de identificação e sincronização da matriz sem trocar IDs.
- [ ] Cobrir Dono Master, responsáveis MX, módulos e jornada nos testes.

### Task 4: `/equipe` como Equipe MX

- [ ] Identidade vem de `usuarios`; perfil consultivo é extensão 1:1.
- [ ] Produtos habilitados vêm do catálogo/versões vigentes.
- [ ] Especialidades vêm de encontros canônicos, não lista hard-coded.
- [ ] Capacidade Online e Presencial permanecem independentes.
- [ ] Seletores de consultor filtram habilitação, vigência, status e capacidade.

### Task 5: `/produtos` como Produtos de Consultoria

- [ ] Não conflitar com Produtos Digitais; Produtos Digitais recebe rota explícita própria.
- [ ] Versão publicada é imutável; edição gera rascunho novo.
- [ ] Encontros usam número como chave dentro do produto.
- [ ] Duração da planilha é padrão; snapshot do cliente não muda silenciosamente.
- [ ] Aba Indicadores Padrão usa pacote versionado.

### Task 6: `/indicadores` e pacotes por produto

- [ ] `catalogo_indicadores_planejamento` permanece mestre.
- [ ] Dependências calculáveis entram automaticamente no pacote e ficam visíveis.
- [ ] Publicação cria snapshot imutável.
- [ ] Planos Estratégicos novos recebem snapshot; clientes existentes não mudam silenciosamente.
- [ ] Multiunidade preserva Matriz, Filiais e Consolidado com motor canônico.

### Task 7: `/planos-acao` biblioteca + plano do cliente

- [ ] Criar template e versão com pesos em basis points totalizando 10000.
- [ ] Aplicação cria exatamente um plano e itens snapshot com `application_request_id` único.
- [ ] Duplo clique retorna a aplicação existente, nunca duplica.
- [ ] Kanban Admin e Dono compartilham o mesmo motor de transição/ordenação/progresso.
- [ ] Conclusão exige checklist completo; data efetiva é separada da prevista.
- [ ] Reconciliação marca duplicados, nunca apaga histórico.

### Task 8: `/consultoria-mx` metodologia e conteúdo padrão

- [ ] Estrutura do encontro continua em Produtos de Consultoria e aparece somente leitura aqui.
- [ ] Conteúdo metodológico é versionado por produto/versionamento metodológico.
- [ ] Publicar valida pendências e congela snapshot.
- [ ] Novas jornadas recebem metodologia publicada; jornadas ativas só migram por decisão explícita.
- [ ] Operação `/consultoria` continua usando `visitas_consultoria` e instâncias reais.

### Task 9: Rotas, navegação e zero cliques mortos

- [ ] Rotas administrativas: `/clientes`, `/equipe`, `/produtos`, `/indicadores`, `/planos-acao`, `/consultoria-mx`.
- [ ] Preservar aliases antigos sem ambiguidade.
- [ ] Atualizar manifests, layout metadata e inventário de dados.
- [ ] Toda ação ativa deve navegar, abrir overlay, mutar, filtrar, exportar ou simular explicitamente.

### Task 10: QA, Vercel Preview e promoção

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run audit:management-design-system`
- [ ] `npm run audit:routes-data`
- [ ] Playwright em 1440x900, 1024x768 e 390x844 para as seis rotas.
- [ ] Validar loja única e multiunidade com dados reais.
- [ ] Validar idempotência de Plano de Ação com duplo disparo.
- [ ] Validar advisors Supabase.
- [ ] Deploy Preview Vercel e checar build/runtime errors.
- [ ] Só então abrir PR para `main`; produção não recebe alterações parcialmente validadas.

## Gates de conclusão

1. As seis rotas administrativas existem e usam dados canônicos.
2. Nenhum domínio operacional foi duplicado em nova tabela concorrente.
3. Todas as ações Base44 relevantes têm destino funcional ou estado explicitamente bloqueado.
4. Planos Padrão são versionados e aplicados idempotentemente.
5. Indicadores padrão são versionados por produto sem alterar clientes silenciosamente.
6. Consultoria MX governa metodologia e `/consultoria` executa instâncias, sem misturar os dois domínios.
7. Clientes MX preserva Matriz/Filiais, Dono Master, jornada e readiness em fonte única.
8. Equipe MX usa uma identidade por pessoa e qualificação/capacidade como extensões.
9. Testes, lint, build, auditorias e Vercel Preview passam.
10. Nenhum erro novo de runtime aparece após o Preview.
