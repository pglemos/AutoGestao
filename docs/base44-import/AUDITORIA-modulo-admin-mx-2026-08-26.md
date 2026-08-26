# Auditoria — Módulo Admin MX (2026-08-26)

Varredura do módulo inteiro logado como `synvollt@gmail.com` (Administrador
Geral) em produção (`https://www.mxperformance.com.br`), com verificação das
tabelas de origem no Supabase (`fbhcmzzgwjdgkctlfvbo`).

## Escopo coberto

42 rotas acessíveis ao papel interno MX mapeadas a partir do roteador; 10
varridas ao vivo. Todas carregaram sem erro de aplicação. Nenhum botão sem
handler restou no módulo depois das correções abaixo.

## Defeitos encontrados e corrigidos

### 1. `/auditoria` — trilha de auditoria fabricada (grave)

A tela promete "Registro imutável de todas as alterações relevantes", mas
`fetchLogs` lia `clientes_consultoria` e sintetizava as linhas:

- autor fixo `'Administrador Geral'`, sem relação com quem agiu;
- ação inferida do `status` do cliente (`ativo` → `ACTIVATE`, senão `UPDATE`);
- recurso fixo `'Cadastro do Cliente'`.

Ou seja: um log de auditoria inventado, atribuindo ações a uma pessoa que pode
não tê-las praticado — o pior lugar possível para dado fabricado.

A trilha real **já existia e estava populada**: `internal_mx_admin_audit`, 189
registros, com RLS `SELECT` liberado para `eh_area_interna_mx(auth.uid())` e
escrita direta negada (`internal_mx_admin_audit_no_direct_write`, `qual = false`).

**Correção:** a tela passa a ler `internal_mx_admin_audit`, resolvendo o autor
em `usuarios` (`name` → `email` → id) e o contexto em `lojas`. Verificado em
produção: autores reais (Mariane, José, SynVolt), ações reais
(`create`, `update_store_user`, `delete_store_user`), lojas reais.

4 dos 189 registros não têm loja resolvível (3 sem `store_id`, 1 apontando para
loja já removida) — a coluna fica vazia (`—`), sem substituir por outro campo.

**Segunda leva:** as outras quatro trilhas reais, que existiam com dado e sem
tela nenhuma, passaram a ser abas da mesma seção (`TabNavPill` canônico), cada
uma normalizada para a mesma linha e declarando a tabela de origem:

| Aba | Tabela | Registros | Verificado em produção |
|---|---|---|---|
| Administração MX | `internal_mx_admin_audit` | 189 | 189 linhas |
| Cadastro de loja | `logs_auditoria_loja` | 122 | 122 linhas |
| Check-in | `checkin_audit_logs` | 156 | 156 linhas |
| Fechamento D1 | `d1_audit_log` | 35 | 35 linhas |
| Correção de dados | `data_correction_audit` | 264 | 200 (teto da página) |

Duas delas não eram legíveis por quem audita: `data_correction_audit` só tinha
policy de `service_role`, e `checkin_audit_logs` liberava
`usuarios.role IN ('admin','dono','gerente')` — vocabulário que não inclui
`administrador_geral`, `administrador_mx` nem `consultor_mx`. Ambas ganharam
`SELECT` para `eh_area_interna_mx`, sem nenhuma permissão de escrita.

**Policy sem grant não lê nada.** Com a policy criada, `data_correction_audit`
continuou devolvendo 403: o `relacl` da tabela nunca teve `authenticated` —
só `postgres` e `service_role`. Foi preciso `GRANT SELECT`. A aba só voltou
com dado depois disso; a policy sozinha não bastava, e o teste que pegou isso
foi abrir a aba em produção, não a suíte.

**Grants alinhados (terceira leva).** `checkin_audit_logs`, `d1_audit_log` e
`logs_auditoria_loja` concediam `arwdm` a `authenticated` — INSERT, UPDATE e
DELETE, contidos apenas por RLS. `internal_mx_admin_audit` concede só `rm`.
Uma trilha que o próprio auditado pode reescrever não é trilha.

O alinhamento respeitou quem escreve em cada uma:

| Trilha | Antes | Depois | Por quê |
|---|---|---|---|
| `checkin_audit_logs` | `arwdm` | `rm` | Só é escrita por `aplicar_regularizacao_fechamento` (SECURITY DEFINER) |
| `logs_auditoria_loja` | `arwdm` | `rm` | Escrita passa a ser a RPC `registrar_auditoria_loja` |
| `d1_audit_log` | `arwdm` | `arm` | O fechamento D1 insere direto do cliente; perde só UPDATE/DELETE |

As policies `d1_audit_log_admin_write` e `d1_audit_log_admin_delete` foram
removidas junto: ficariam sem efeito sem o grant, e corrigir um fechamento não
é reescrever a trilha dele.

**Defeito descoberto no caminho.** O painel de fechamento do gerente inseria
direto em `logs_auditoria_loja` para registrar o comentário da decisão de
regularização — e esse INSERT **já falhava**: a tabela tem RLS ligada e nenhuma
policy de INSERT. O gerente via "Decisão aplicada, mas o comentário não pôde ser
auditado" em toda decisão, e o comentário nunca entrava na trilha. A RPC
`registrar_auditoria_loja` (SECURITY DEFINER) resolve: carimba `changed_by` com
o `auth.uid()` real e confere gerente/dono/interno da loja antes de gravar.

Provas colhidas em produção, com a sessão real do navegador:

| Tentativa | Resultado |
|---|---|
| `rpc/registrar_auditoria_loja` | `200`, id devolvido, `changed_by` = uid real |
| `INSERT` direto em `logs_auditoria_loja` | `403 permission denied` |
| `INSERT` direto em `checkin_audit_logs` | `403` |
| `UPDATE` / `DELETE` em `d1_audit_log` | `403` / `403` |
| `INSERT` em `d1_audit_log` (fechamento) | `201` — segue funcionando |

Os registros de teste foram removidos; as contagens voltaram a 122 / 35 / 156.

### 2. `/scores` — timestamp carimbado com o relógio da requisição

`generatedAlerts` gravava `created_at: new Date().toISOString()`, o que faria
todo alerta parecer criado no instante da abertura da tela. Passa a usar o
`updated_at` real do cliente. (O campo não é renderizado hoje; a correção evita
que passe a mentir quando for.)

Os alertas em si são **derivados do estado real** do cadastro (onboarding em
aberto, pronto para ativação) e não têm tabela própria: a `alerts` do banco (1
linha) é operacional, com escopo loja/vendedor, e pertence a outro domínio. Isso
está anotado em comentário no código.

### 3. `/suporte` — botão "Novo Chamado" morto

`<Button variant="primary">Novo Chamado</Button>` sem `onClick`, e sem tabela de
chamados no banco onde persistir. Removido — um botão que não faz nada é pior
que a ausência dele. A lista continua derivada do estado real do cadastro, com o
motivo anotado no código, e a data sem valor deixou de exibir "Hoje".

## Fora do produto: dois testes vermelhos no `bun test` bruto

`scripts/check-internal-mx-styles.test.mjs` e
`scripts/audit-owner-b44-graph.test.mjs` liam stdout de `spawnSync` direto, que
o bun test 1.3.5 engole — falhavam com stdout vazio embora os scripts passem sob
`node --test`. Passaram a usar o mesmo wrapper C8 já aplicado em
`src/test/lib/captureSubprocess.ts` (agora também em
`scripts/lib/captureSubprocess.mjs`).

O gate oficial (`npm test`) já estava verde antes e depois: 4452 pass / 0 fail.

## Pendências que dependem de decisão do produto

- `benchmark_snapshots` está vazia e não há job que a popule.
- 7 lojas sem meta mensal (33 vendedores afetados).
- 8 vendedores sem vínculo em `vendedores_loja`.
- As demais trilhas de auditoria reais (item 1) não têm tela.
