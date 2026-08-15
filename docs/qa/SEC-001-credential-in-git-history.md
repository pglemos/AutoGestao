# SEC-001 — Credencial em histórico git (ação pendente do usuário)

**Status:** RISCO REGISTRADO — requer rotação de senha pelo usuário
**Data:** 2026-08-15
**Reportado por:** DS1 (achado de segurança)

## Descrição (sem reproduzir o valor)

Os seguintes arquivos foram commitados historicamente no repositório e contêm
credencial de acesso:

- `scratch/reset_passwords.cjs` — script com senha(s) em texto puro (7
  ocorrências de password/senha; valor NÃO reproduzido aqui de propósito).
- `parametros_pmr.png` — imagem com parâmetros PMR que pode expor credenciais.

Estes arquivos foram vistos no histórico git (`git log --all -- scratch/`):
commits como `782109e8`, `6f760650`, `2f091861` tocaram esses caminhos.

## Risco

Qualquer pessoa com acesso ao repositório (mesmo histórico) pode extrair a
senha. **Não é um bug de runtime** — é higiene de segredo no git.

## Ação recomendada (usuário)

1. **Rotacionar a senha exposta** imediatamente (trocar no Supabase/provedor).
2. Remover os arquivos do histórico (opcional): `git filter-repo` ou
   `git filter-branch` + force-push (requer coordenação com todos os clones).
3. `scratch/` já está no `.gitignore` — futuras extrações não serão commitadas.

## Ação tomada pelo agente

- **NÃO** foi commitado nenhum segredo.
- `scratch/reset_passwords.cjs` e `parametros_pmr.png` **não** estão staged nem
  no working tree visível (tracked histórico).
- Registro deste risco feito aqui para o usuário decidir a rotação.
