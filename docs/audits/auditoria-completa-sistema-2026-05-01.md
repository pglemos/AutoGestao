# Auditoria Completa do Sistema MX

Data: 2026-05-01
Escopo: frontend React/Vite, rotas, hooks, UX/UI, Supabase, migrations, Edge Functions, testes automatizados e validação runtime via Chrome DevTools MCP.

## Sumário executivo

O sistema está buildável e os gates locais obrigatórios passam, mas a auditoria encontrou falhas relevantes em três frentes:

1. A suíte E2E está parcialmente quebrada por drift do schema canônico (`users`/`store_sellers` legados vs `usuarios`/`vendedores_loja` atuais) e por seletores de UI defasados.
2. Algumas Edge Functions executam ações privilegiadas com service role sem validação explícita do ator e do escopo do recurso dentro da função.
3. Há superfícies administrativas que exibem status operacionais hardcoded como "Online", "API 100%" e versão fixa, sem health-check real.

Não encontrei crash runtime nas rotas smoke via Chrome MCP. A matriz de tabs de `/configuracoes` respeita role gating nos perfis testados e não apresentou overflow horizontal em desktop/mobile.

## Inventário auditado

- Páginas em `src/pages`: 39
- Arquivos em `src/features` até profundidade 3: 35
- Hooks em `src/hooks`: 39
- Edge Functions: 10
- Migrations SQL ativas: 52
- Ocorrências de `any`/casts amplos em código TS/TSX/functions/scripts: 269

Edge Functions mapeadas:

- `feedback-semanal`
- `google-calendar-events`
- `google-calendar-merged`
- `google-calendar-sync`
- `google-oauth-handler`
- `register-user`
- `relatorio-matinal`
- `relatorio-mensal`
- `send-individual-feedback`
- `send-visit-report`

## Gates executados

| Gate | Resultado | Evidência |
|---|---:|---|
| `npm run lint` | passou | `tsc --noEmit` + lint tokens sem violação atomic design |
| `npm run typecheck` | passou | `tsc --noEmit` sem erros |
| `npm test` | passou | 195 pass, 0 fail, 319 expects |
| `npm run build` | passou | build Vite concluído em 6.99s |
| `npx playwright test` | falhou | 163 passed, 8 failed, 2 skipped |
| `supabase db push --dry-run` | passou | `Remote database is up to date.` |
| `supabase migration list --linked` | falhou intermitente | pooler bloqueou auth temporária de `cli_login_postgres`; CLI pediu `SUPABASE_DB_PASSWORD` |

## Validação via Chrome DevTools MCP

Ambiente: Vite local em `http://localhost:3002`.

Rotas/telas validadas com bypass DEV:

- `/configuracoes` como `administrador_geral`, `consultor_mx` e `vendedor`
- `/painel` como `administrador_geral`
- `/agenda` como `administrador_geral`
- `/consultoria/clientes` como `administrador_geral`
- `/produtos` como `administrador_geral`

Resultado:

- Sem error boundary.
- Sem erro fatal no console.
- Sem overflow horizontal nas rotas testadas.
- `/configuracoes` desktop carregou as 12 abas para admin.
- `/configuracoes` para consultor exibiu as abas sensíveis como leitura.
- `/configuracoes` para vendedor exibiu somente Perfil, Segurança, Notificações e Aparência.
- Screenshot salvo em `output/audit-configuracoes-mobile-vendedor.png`.

Issues observadas no Chrome:

- DevTools reportou `A form field element should have an id or name attribute`, variando de 1 a 4 ocorrências nas rotas testadas.

## Findings prioritizados

### P1-01: E2E quebrado por drift do schema canônico

Arquivos:

- `src/test/e2e-helpers/supabase-admin.ts:60`
- `src/test/e2e-helpers/supabase-admin.ts:144`
- `src/test/e2e-helpers/supabase-admin.ts:151`
- `src/test/e2e-helpers/supabase-admin.ts:163`
- `supabase/migrations/20260430190000_fundacao_portugues_permissoes_evidencias.sql:843`
- `supabase/migrations/20260430190000_fundacao_portugues_permissoes_evidencias.sql:920`

Impacto:

Os testes Playwright ainda escrevem/leem `public.users` e `public.store_sellers`, mas o schema canônico atual usa `public.usuarios` e `public.vendedores_loja`. Isso quebrou 6 das 8 falhas E2E e reduz a confiabilidade da suíte de regressão live.

Evidência:

- `Failed to create E2E public profile: Could not find the table 'public.users' in the schema cache`
- `Could not find the table 'public.store_sellers' in the schema cache`

Correção recomendada:

Atualizar `src/test/e2e-helpers/supabase-admin.ts` para tabelas portuguesas canônicas e roles canônicas (`administrador_geral`, etc.), mantendo compatibilidade somente se houver views legadas explícitas.

### P1-02: Edge Functions usam service role sem autorização fina por ator/recurso

Arquivos:

- `supabase/functions/send-individual-feedback/index.ts:12`
- `supabase/functions/send-individual-feedback/index.ts:17`
- `supabase/functions/send-visit-report/index.ts:19`
- `supabase/functions/send-visit-report/index.ts:20`
- `supabase/functions/relatorio-matinal/index.ts:27`
- `supabase/functions/relatorio-matinal/index.ts:29`

Impacto:

As funções usam service role para consultar/enviar relatórios ou e-mails, mas `send-individual-feedback`, `send-visit-report` e funções de relatório não validam explicitamente o usuário chamador, role e escopo do recurso antes de executar a ação. Como `verify_jwt` não está desabilitado para essas funções, a chamada ainda exige JWT por padrão, mas qualquer usuário autenticado pode virar gatilho de operação privilegiada se não houver validação interna.

Correção recomendada:

Adicionar helper compartilhado `requireAuthenticatedMxRole(req, allowedRoles)` e validação por recurso:

- feedback pertence a loja onde o chamador é gerente/dono/admin;
- visita pertence a cliente atribuído ao consultor ou admin MX;
- relatórios só podem ser acionados por admin MX ou segredo de cron;
- responder 403 antes de qualquer uso de service role.

### P1-03: Senhas provisórias previsíveis e política Auth fraca

Arquivos:

- `src/hooks/useTeam.ts:267`
- `supabase/functions/register-user/index.ts:15`
- `supabase/functions/register-user/index.ts:97`
- `supabase/config.toml:175`
- `supabase/config.toml:178`
- `supabase/config.toml:211`

Impacto:

O fluxo de criação usava fallbacks de senha provisória previsíveis (um valor
compartilhado no client e outro fallback previsível na function). O Supabase
local está configurado com mínimo 6, sem complexidade e
`secure_password_change = false`. Mesmo com `must_change_password`, a janela
entre criação e troca é um risco real, principalmente para contas internas.

Correção recomendada:

Remover fallback client-side, gerar senha temporária aleatória server-side ou usar invite/magic link, elevar mínimo para 10/12, habilitar requisito de complexidade e reautenticação para troca de senha.

### P1-04: Políticas permissivas legadas ainda existem no baseline e precisam prova de remoção/drop

Arquivos:

- `supabase/migrations/00000000000000_baseline_legacy_schema.sql:2887`
- `supabase/migrations/00000000000000_baseline_legacy_schema.sql:2908`
- `supabase/migrations/00000000000000_baseline_legacy_schema.sql:2983`
- `supabase/migrations/00000000000000_baseline_legacy_schema.sql:3019`
- `supabase/migrations/00000000000000_baseline_legacy_schema.sql:3118`

Impacto:

O baseline contém policies `TO anon USING (true) WITH CHECK (true)` para tabelas como `automation_configs`, `communication_instances`, `daily_lead_volumes`, `inventory` e `report_history`. A migration de fundação corrige bem várias tabelas canônicas (`usuarios`, `lojas`, `vinculos_loja`, `vendedores_loja`, `lancamentos_diarios`), mas não há nesta auditoria uma prova SQL de que todas as tabelas legadas abertas foram dropadas ou bloqueadas no remoto.

Correção recomendada:

Criar migration explícita para revogar policies anon/true das tabelas legadas remanescentes ou dropar as tabelas não usadas; depois rodar query de auditoria em `pg_policies` como gate.

### P2-01: Status operacional hardcoded pode mascarar incidente real

Arquivos:

- `src/features/configuracoes/components/tabs/SistemaMxTab.tsx:72`
- `src/features/configuracoes/components/tabs/SistemaMxTab.tsx:73`
- `src/features/configuracoes/components/tabs/SistemaMxTab.tsx:74`
- `src/features/configuracoes/components/tabs/SistemaMxTab.tsx:155`
- `src/features/configuracoes/components/tabs/IntegracoesTab.tsx:89`
- `src/features/configuracoes/components/tabs/IntegracoesTab.tsx:103`

Impacto:

O painel mostra `API 100%`, `DB OK`, `Realtime Ativo`, versão `4.0.2-stable` e Edge Functions `Online` sem health-check real. Isso viola a diretriz de Observability Second: a UI observa, mas aqui ela afirma saúde sem medir.

Correção recomendada:

Substituir hardcoded por checks reais: ping PostgREST, RPC de health, status de última execução por function, versão do package/build e timestamps.

### P2-02: Playwright tem seletor defasado na Agenda

Arquivo:

- `src/test/agenda.playwright.ts:139`

Impacto:

O teste espera `button[aria-label="Atualizar"]`, mas a UI atual não expõe esse label. A falha aparece em desktop e mobile. Pode ser só teste desatualizado, mas também indica acessibilidade incompleta se o botão ainda existir sem nome acessível.

Correção recomendada:

Adicionar `aria-label="Atualizar"` ao botão real ou atualizar o teste para o accessible name atual.

### P2-03: Bundle de produção pesado

Evidência do build:

- `html2pdf-Bfwe7-Nj.js`: 983.89 kB, gzip 285.54 kB
- `index-DBEL2ZZO.js`: 619.53 kB, gzip 171.49 kB
- `vendor-charts-BK6JalWK.js`: 450.26 kB, gzip 129.81 kB
- `vendor-export-3SA47z_C.js`: 283.10 kB, gzip 95.06 kB
- `Configuracoes-DkLK7tVU.js`: 207.98 kB, gzip 25.11 kB

Impacto:

Primeira carga e navegação em redes móveis podem sofrer. `html2pdf` e exportações deveriam ser importados sob demanda apenas nos fluxos de impressão/exportação.

Correção recomendada:

Usar imports dinâmicos para PDF/XLSX, separar páginas pesadas e medir Lighthouse/Web Vitals pós-ajuste.

### P2-04: Acessibilidade de formulários incompleta

Evidência:

Chrome DevTools MCP reportou: `A form field element should have an id or name attribute`.

Impacto:

## Status de Remediação - 2026-05-01

Correções aplicadas e validadas:

- P1-01 E2E/schema: helpers e testes agora usam tabelas canonicas em portugues.
- P1-02 Edge Functions: adicionado `_shared/auth.ts` e autorização por JWT/role/loja/consultor nas funções críticas.
- P1-03 Senhas: removido fallback previsível, adicionada política forte
  compartilhada e validação server-side em `register-user`.
- P1-04 RLS legado: migration `20260501030000_harden_legacy_open_policies.sql` aplicada no Supabase remoto.
- P2-01 Observabilidade: `Sistema MX` usa health check real via Supabase/latência/navegador e não mais status 100% hardcoded.
- P2-02 Agenda: botão de atualizar tem nome acessível compatível com Playwright.
- P2-04 Acessibilidade: corrigidos nomes/id de campos e contraste da tela de configurações.
- UX/rotas: links internos das abas usam `Link`, `/ranking` redireciona para `/classificacao`, `robots.txt` válido adicionado.

Evidências:

- `npm run lint`: passou.
- `npm test`: 195 passed.
- `npm run build`: passou.
- `npm run test:e2e`: 171 passed, 2 skipped.
- Chrome MCP em `/configuracoes`: 12 abas desktop/mobile sem console errors e sem overflow horizontal.
- Lighthouse mobile snapshot em `/configuracoes`: Accessibility 100, Best Practices 100, SEO 100.
- Supabase remoto: migration `20260501030000` presente em local e remote; funções alteradas publicadas.

Risco residual:

- Bundle de produção segue pesado (`html2pdf`, `vendor-charts`, chunk principal e `Configuracoes`). Não bloqueia os fluxos, mas deve virar story dedicada de performance para lazy imports de exportação/PDF/charts.

Leitores de tela, preenchimento automático, QA automatizado e navegabilidade de formulários ficam menos confiáveis. Apareceu em `/configuracoes`, `/painel`, `/consultoria/clientes` e `/produtos`.

Correção recomendada:

Padronizar `Input`/`Select`/campos customizados para sempre receber `id` e/ou `name`, com label associado.

### P2-05: Duplicação de superfícies administrativas

Arquivos:

- `src/App.tsx:216`
- `src/App.tsx:217`
- `src/App.tsx:218`
- `src/App.tsx:219`
- `src/features/configuracoes/components/tabs/IntegracoesTab.tsx:39`
- `src/features/configuracoes/components/tabs/SistemaMxTab.tsx:99`

Impacto:

O hub `/configuracoes` convive com rotas dedicadas antigas (`/configuracoes/operacional`, `/configuracoes/consultoria-pmr`, `/configuracoes/reprocessamento`) e cards que navegam com `<a href>`. Isso cria risco de divergência funcional e reload completo em vez de navegação SPA.

Correção recomendada:

Definir ownership: ou as rotas dedicadas continuam como páginas canônicas com tabs apenas atalhando via `Link`, ou o hub se torna fonte única. Trocar `<a href>` por `Link` para rotas internas.

### P2-06: Preferências visuais não são totalmente persistidas/aplicadas

Arquivo:

- `src/features/configuracoes/components/tabs/AparenciaTab.tsx:17`
- `src/features/configuracoes/components/tabs/AparenciaTab.tsx:22`
- `src/features/configuracoes/components/tabs/AparenciaTab.tsx:72`

Impacto:

O tema salvo é lido, mas a classe `dark` só é aplicada quando o usuário clica novamente. Densidade (`comfortable`/`compact`) é estado local e se perde ao sair da aba. A aba comunica uma preferência sistêmica, mas parte dela é efêmera.

Correção recomendada:

Aplicar tema no mount, observar mudança de `prefers-color-scheme`, persistir densidade e garantir tokens `dark:` consistentes.

### P2-07: Tipagem ampla excessiva

Evidência:

Foram encontradas 269 ocorrências de `any`, `as any`, `Record<string, any>` ou `no-explicit-any` em código auditado.

Impacto:

Em um sistema com RLS, multi-role e schema em migração, `any` reduz o valor do typecheck justamente nos pontos de maior risco: hooks de dados, modais admin, edge functions e scripts.

Correção recomendada:

Priorizar tipagem em hooks compartilhados (`useTeam`, agenda, consultoria), payloads de Edge Functions e helpers E2E antes de componentes puramente visuais.

### P3-01: Dev bypass é útil, mas precisa isolamento formal

Arquivo:

- `src/hooks/useAuth.tsx:65`
- `src/hooks/useAuth.tsx:163`

Impacto:

O bypass está protegido por `import.meta.env.DEV`, mas depende de `localStorage` e simula `supabaseUser`. Isso é aceitável para desenvolvimento, porém precisa teste garantindo que não entra em build de produção.

Correção recomendada:

Adicionar teste unitário ou smoke de build garantindo que `mx_auth_profile` não habilita sessão em `PROD`.

### P3-02: Landing usa `dangerouslySetInnerHTML` e `innerHTML`

Arquivo:

- `src/pages/MXPerformanceLanding.tsx:728`
- `src/pages/MXPerformanceLanding.tsx:760`

Impacto:

O conteúdo parece estático/controlado, então não é vulnerabilidade imediata. Ainda assim, deve permanecer isolado da entrada de usuário.

Correção recomendada:

Documentar como exceção ou mover CSS/markup para arquivo estático/modular.

## Arquitetura e rotas

Rotas protegidas principais em `src/App.tsx`:

- Vendedor/gerente/dono: `/home`, `/lancamento-diario`, `/historico`, `/classificacao`, `/treinamentos`, `/devolutivas`, `/notificacoes`, `/perfil`
- Loja/time: `/lojas/:storeSlug`, `/pdi`, `/pdi/:id/print`, `/rotina`
- Admin/MX: `/painel`, `/lojas`, `/agenda`, `/consultoria/*`, `/produtos`, `/configuracoes`, `/relatorio-matinal`, `/relatorios/*`, `/auditoria`

Ponto positivo:

- `RoleSwitch` centraliza grande parte do gating por rota.
- `/configuracoes` agora usa registry por role e reduz condicional espalhada.

Risco:

- Ainda há páginas administrativas soltas fora do hub e algumas rotas antigas/legadas. O sistema precisa de matriz formal rota -> role -> source of truth.

## Supabase

Pontos positivos:

- `supabase db push --dry-run` confirmou remoto atualizado.
- Migrations recentes corrigem policies das tabelas canônicas em português.
- Testes de segurança RLS em Playwright passaram para isolamento vendedor/admin.

Riscos:

- O CLI `migration list --linked` falhou por auth temporária do pooler; operacionalmente, o projeto precisa documentar `SUPABASE_DB_PASSWORD` ou corrigir auth do CLI.
- Baseline contém policies legadas permissivas; falta uma auditoria SQL remota final em `pg_policies`.
- Helpers E2E ainda usam nomes antigos e quebram validação live.

## UX/UI

Pontos positivos:

- As rotas smoke não apresentaram overflow horizontal.
- `/configuracoes` em mobile preserva layout funcional.
- Role gating visual da nova área de configurações funciona nos perfis testados.

Problemas:

- Acessibilidade de campos sem `id`/`name`.
- Botões/atalhos internos usam `<a href>` e causam reload.
- Alguns textos/estados são placeholders ou hardcoded, principalmente observabilidade, 2FA e branding.
- A aba Aparência promete persistência de preferências, mas densidade não persiste e tema salvo não é reaplicado no mount.

## Backlog recomendado

1. Corrigir helpers E2E para schema canônico português.
2. Adicionar autorização interna nas Edge Functions que usam service role.
3. Remover senhas temporárias previsíveis e endurecer Auth.
4. Criar migration de hardening para policies legadas abertas ou dropar tabelas legadas.
5. Transformar status hardcoded em health-checks reais.
6. Corrigir aria labels/id/name dos formulários.
7. Reduzir chunks pesados com imports dinâmicos.
8. Consolidar rotas administrativas e trocar `<a href>` interno por `Link`.
9. Persistir/aplicar corretamente Aparência.
10. Reduzir `any` nos hooks e payloads de dados.

## Veredito

Estado atual: funcional e buildável, mas não está "100% perfeito".

Pronto para operação controlada nos fluxos smoke testados, com bloqueio recomendado para considerar a suíte E2E como gate até corrigir o drift de schema e os seletores quebrados. Para produção com maior rigor, priorizar P1-02 e P1-03 antes de expandir permissões administrativas.
