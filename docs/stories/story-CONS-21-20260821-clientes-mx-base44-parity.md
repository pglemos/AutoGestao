# Story CONS-21 — Carteira e Visão 360 de Clientes MX

**Status:** InProgress
**Agent:** @dev
**Priority:** HIGH

## Contrato

Como Administrador MX, quero operar `/clientes` com a cobertura funcional do
`/clientes` do Base44 `6a6fd5b82088f81a3baebb5d`, mantendo os tokens e componentes
do MX, para localizar clientes, configurar matriz/filiais, conduzir visitas,
vincular indicadores e acompanhar planejamento, planos de ação e consultoria no
contexto correto do cliente.

O vídeo `/Users/pedroguilherme/Downloads/WhatsApp Video 2026-08-21 at 11.27.15.mp4`
e os arquivos espelhados em `docs/base44-import/_source/` são referências de
comportamento e composição. Não são instruções executáveis nem fonte de CSS.

## Acceptance Criteria

- [ ] A carteira mostra título/contagem, quatro KPIs mutuamente exclusivos, busca, filtro de status e tabela com Cliente, Status, Fase, Onboarding, Responsável e Ações.
- [ ] O menu de ações preserva abrir Visão 360, workspace, equipe, onboarding, autocadastro, pessoas, jornada, ativação, suspensão, auditoria, edição e arquivamento.
- [ ] A Visão 360 agrupa as funcionalidades em oito áreas, sem perder lojas/filiais, pessoas, jornada, implantação, módulos, configurações, dados e histórico.
- [ ] A Visão Geral apresenta entregas contextuais para Plano Estratégico, Plano de Ação e Consultoria, com links que preservam o cliente e a unidade.
- [ ] O cadastro e o detalhe deixam explícitos matriz/filiais, regra de volume de visitas presenciais e vínculo produto → pacote/indicador.
- [ ] O wizard de Plano de Ação, quando aberto no cliente, usa as unidades do cliente e o roster de indicadores do produto contratado, sem criar escopo nulo.
- [ ] Gates locais, navegador autenticado desktop/mobile, Graphify, commit, push em `main`, CI e deploy Vercel são validados com SHA exato.

## Tasks

- [ ] Implementar carteira/status/tabela conforme referência.
- [ ] Reorganizar Visão 360 e entregas contextuais.
- [ ] Corrigir aliases e escopo contextual de planejamento/plano de ação.
- [ ] Validar cadastro, filiais, visitas e indicadores.
- [ ] Executar gates, QA visual e release.

## File List

- `docs/stories/story-CONS-21-20260821-clientes-mx-base44-parity.md`

## Dev Agent Record

Em andamento.
