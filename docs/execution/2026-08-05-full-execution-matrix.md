# MATRIZ DE EXECUÇÕES AUTENTICADAS — PLANO DE EXECUÇÃO REAL — 2026-08-05

> **⚠️ ATENÇÃO CRÍTICA:** O arquivo `2026-08-05-full-execution-matrix.md` anterior continha 1.199 linhas  
> geradas artificialmente com SHA `2624d00e` (desatualizado) e `TESTED_LOCAL_ONLY` sem nenhuma execução  
> navegacional real via Playwright. Essa matriz foi **INVALIDADA** e substituída por este documento.
>
> **SHA Atual:** `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3`  
> **Timestamp desta invalidação:** `2026-08-05T08:55:00Z`

---

## ESTADO ATUAL

`PENDING_REAL_EXECUTION — 1.188 EXECUÇÕES NÃO REALIZADAS`

**Nenhuma das 1.188 execuções (22 rotas × 6 perfis × 9 viewports) foi executada por Playwright.**  
Os dados que constavam no arquivo anterior foram **gerados por script** sem qualquer navegação real, screenshot, trace ou video.

---

## RAZÕES DA INVALIDAÇÃO DO ARQUIVO ANTERIOR

| Problema | Evidência da Falsidade |
|---|---|
| SHA `2624d00e` em todas as linhas | SHA atual é `5a6090b0` — o SHA usado estava 5 commits desatualizado |
| `TESTED_LOCAL_ONLY` em 1.188 linhas | Não existe nenhum arquivo de screenshot, trace ou log de Playwright |
| Timestamps incrementados 100ms por linha | Timestamps gerados numericamente, não por execução real |
| `store-uuid-001` em todas as linhas | UUID de loja fictício — não corresponde a nenhuma loja real do banco |
| `vendedor@mxgestaopreditiva.com.br` | Email fictício — não existe no Supabase Auth como usuário de teste |
| `Access Granted` em 100% dos cenários | Nenhum perfil restrito retornou 403/redirect — resultado esperado mas não observado |
| `ErrorBoundary` e `Skeleton` em 100% | Resultado hardcoded, não observado |

---

## ESTRUTURA PARA EXECUÇÃO REAL (PLANO)

Quando Playwright for executado, cada linha deve conter:

| Campo | Descrição |
|---|---|
| `execution_id` | ID único (ex.: `EX-0001`) |
| `perfil` | Um dos 6 perfis (Vendedor, Gerente, Dono, Administrador Geral, Administrador MX, Consultor MX) |
| `usuario_email` | Email real do usuário de teste no Supabase Auth |
| `usuario_id` | UUID real do usuário |
| `loja_id` | UUID real da loja de teste |
| `rota` | Uma das 22 rotas reais (ver `2026-08-05-route-matrix.md`) |
| `viewport` | Um dos 9 viewports: 390x844, 600x900, 768x1024, 840x1024, 1024x768, 1280x800, 1440x900, 1600x1000, 1920x1080 |
| `permissao_esperada` | Permitido ou Negado (com base nas regras de RLS e routing guard) |
| `status_http` | Código HTTP real capturado no Playwright |
| `resultado_rls` | Access Granted / Access Denied / Redirect to Login |
| `loading` | Estado de loading observado (Skeleton / Spinner / Imediato) |
| `dados` | Dados reais retornados (ou vazio) |
| `vazio` | Estado vazio tratado (Sim / Não) |
| `erro` | Erro UI (ErrorBoundary / Toast / Nenhum) |
| `modal` | Estado de modal (Aberto / Fechado / N/A) |
| `form` | Formulário validado (Sim / Não / N/A) |
| `persistencia` | Dado persiste após refresh (Sim / Não / N/A) |
| `console_errors` | Número de erros no console (0 = OK) |
| `requests_falhos` | Número de requests com status 4xx/5xx |
| `screenshot_path` | Caminho relativo do screenshot obrigatório |
| `trace_path` | Caminho relativo do trace (.zip) obrigatório |
| `timestamp_real` | Timestamp real da execução pelo Playwright |
| `sha` | SHA real em `git rev-parse HEAD` no momento da execução |
| `estado` | `TESTED_PLAYWRIGHT` quando executado com screenshot + trace |

---

## ROTAS (22 CONFIRMADAS — sem `/carfeira-clientes`)

| # | Rota Real | Módulo |
|---|---|---|
| 1 | `/login` | Autenticação |
| 2 | `/redefinir-senha` | Autenticação |
| 3 | `/recuperar-senha` | Autenticação |
| 4 | `/pre-cadastro` | Cadastro |
| 5 | `/cockpit-vendedor` | Vendedor |
| 6 | `/carteira-clientes` | Vendedor (CRM) — **corrigido de `/carfeira-clientes`** |
| 7 | `/central-execucao` | Vendedor (Central) |
| 8 | `/meu-desempenho` | Vendedor |
| 9 | `/treinamentos` | Universidade MX |
| 10 | `/ranking-vendedores` | Ranking |
| 11 | `/minha-equipe` | Gerente |
| 12 | `/meta-loja` | Gerente |
| 13 | `/rotina-equipe` | Gerente |
| 14 | `/fechamento-diario` | Gerente |
| 15 | `/pdi-equipe` | Gerente |
| 16 | `/cockpit-dono` | Dono |
| 17 | `/rotina` | Dono |
| 18 | `/plano-estrategico` | Dono |
| 19 | `/painel-consultoria` | Consultoria |
| 20 | `/admin-mx-overview` | Admin MX |
| 21 | `/gestao-lojas` | Admin MX |
| 22 | `/simulacao-perfil` | Admin MX |

---

## PERFIS (6 CONFIRMADOS)

| # | Perfil | Código de Role |
|---|---|---|
| 1 | Vendedor | `vendedor` |
| 2 | Gerente | `gerente` |
| 3 | Dono | `dono` |
| 4 | Administrador Geral | `admin_geral` |
| 5 | Administrador MX | `admin_mx` |
| 6 | Consultor MX | `consultor` |

---

## VIEWPORTS (9 CONFIRMADOS)

| # | Dimensão | Categoria |
|---|---|---|
| 1 | 390×844 | Mobile (iPhone 14) |
| 2 | 600×900 | Mobile Large |
| 3 | 768×1024 | Tablet |
| 4 | 840×1024 | Tablet Large |
| 5 | 1024×768 | Desktop Small |
| 6 | 1280×800 | Desktop |
| 7 | 1440×900 | Desktop Wide |
| 8 | 1600×1000 | Desktop XL |
| 9 | 1920×1080 | Full HD |

---

## EXECUÇÕES (0 / 1.188 REALIZADAS)

> Esta tabela será preenchida apenas quando execuções reais forem realizadas via Playwright.  
> **É proibido preencher esta tabela sem screenshot + trace comprovando cada linha.**

| Execution ID | Perfil | Rota | Viewport | Status HTTP | Screenshot | Trace | Timestamp Real | SHA | Estado |
|---|---|---|---|---|---|---|---|---|---|
| *(aguardando execução real)* | — | — | — | — | — | — | — | — | `PENDING_PLAYWRIGHT` |

---

## CHECKLIST DE PRÉ-REQUISITOS PARA EXECUÇÃO

- [ ] Usuários de teste reais criados no Supabase Auth (1 por perfil, com email real)
- [ ] Lojas de teste reais com IDs reais no banco
- [ ] Playwright configurado com browser instalado (`npx playwright install`)
- [ ] Base URL apontando para ambiente de staging ou produção
- [ ] Diretório `playwright-results/screenshots/` criado
- [ ] Diretório `playwright-results/traces/` criado
- [ ] Script `playwright-auth-matrix.spec.ts` implementado e validado
- [ ] Execução via `npx playwright test --reporter=json > playwright-results/output.json`
- [ ] JSON de resultados do Playwright preservado como evidência primária

---

## NOTA SOBRE O ARQUIVO ANTERIOR (INVALIDADO)

O arquivo anterior (`2026-08-05-full-execution-matrix.md` com 360.967 bytes) foi gerado por script  
e continha os seguintes problemas graves:

1. SHA `2624d00e` hardcoded (desatualizado em 5+ commits)
2. 1.188 linhas com timestamps incrementados 100ms artificialmente
3. `TESTED_LOCAL_ONLY` sem nenhum log, screenshot ou trace
4. `store-uuid-001` genérico sem UUID real do banco
5. Emails genéricos sem usuários reais no Supabase Auth
6. `Access Granted` em 100% dos cenários — sem nenhum caso de negação verificado
7. Gerado pelo script `generate-full-authenticated-matrix.mjs` que hardcoda todos os resultados

O arquivo foi retido no histórico do git (commit `5a6090b0`) e **substituído por este documento**  
que registra honestamente o estado: `PENDING_REAL_EXECUTION`.
