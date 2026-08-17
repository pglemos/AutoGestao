# browser-validate

Valide fluxos e captura visual (desktop + mobile) usando agent-browser (Chrome) após qualquer mudança de UI.

## Quando usar

- Sempre que você **desenvolver, criar, editar ou testar** qualquer coisa de UI (`src/`, `public/`, `index.html`, `vite.config.ts`).
- Antes de concluir uma story/task que toque em interface.

## O que fazer

1. Rode a validação com o flow padrão:

   ```bash
   npm run browser:validate:flow
   ```

2. Ou valide com auditoria de acessibilidade:

   ```bash
   npm run browser:validate:a11y
   ```

3. Confira a evidência gerada em `visual-evidence/agent-browser/<label-timestamp>/`:
   - `desktop.png` (1440x900)
   - `mobile.png` (390x844)
   - `summary.json` / `summary.md`

4. Se houver falhas listadas no `summary.json`, corrija e revalide.

## Fluxo personalizado

Para validar um fluxo específico, crie um arquivo JSON e passe com `--flow`:

```bash
node scripts/agent-browser-validate.mjs --flow scripts/browser-flows/meu-fluxo.flow.json
```

Formato do flow (ver cabeçalho de `scripts/agent-browser-validate.mjs`):

```json
{
  "url": "http://localhost:3457/login",
  "waitText": "Bem-vindo",
  "assertVisible": ["h1", "[data-testid=login]"],
  "screenshots": ["desktop", "mobile"],
  "steps": [
    { "action": "click", "args": ["text=Entrar"] },
    { "action": "wait", "args": ["--text", "Dashboard"] }
  ]
}
```

## Controle via variáveis de ambiente

- `AGENT_BROWSER_AUTOVALIDATE=0` — desliga a validação automática do hook.
- `AGENT_BROWSER_SESSION` — isola o estado do browser por sessão (padrão do projeto: `mx-predictive`).
- `AGENT_BROWSER_BIN` — caminho do binário agent-browser (se não estiver no PATH).

## MCP (controle direto do Chrome pelos agentes)

- opencode: servidor `agent-browser` registrado em `.opencode/opencode.json` (tools `agent_browser_*`).
- Claude Code: servidor `agent-browser` registrado em `.mcp.json`.

Use as tools `agent_browser_open`, `agent_browser_snapshot`, `agent_browser_screenshot`, `agent_browser_set_viewport`, `agent_browser_set_device` para explorar e validar em desktop ou mobile.