# Consultor lê cliente de consultoria não atribuído a ele

> Medido em 2026-07-31 contra o projeto de produção, com sessão real obtida por
> `/auth/v1/token?grant_type=password`. Severidade: **alta** — é leitura de dado
> de cliente fora do escopo do usuário, não um problema visual.

## Reprodução

Cenário montado pelos próprios helpers E2E do repositório:

1. cria um usuário `consultor_mx`;
2. cria dois clientes de consultoria: um **atribuído** ao consultor (via visita
   agendada, que gera a atribuição) e um **não atribuído a ninguém**;
3. autentica como o consultor e consulta a API REST diretamente.

Resultado:

```text
tabela atribuicoes_consultoria: [{"client_id":"79c51ac0…","user_id":"5c1d5f93…","active":true}]
tabela consulting_assignments:  ERRO Could not find the table 'public.consulting_assignments'
login consultor: 200
clientes visíveis ao consultor: 200
  [{"name":"E2E RLS NaoAtribuido …"},{"name":"E2E RLS Atribuido …"}]
VEREDITO: FURO — cliente não atribuído visível
```

A atribuição existe e está `active = true`, e ainda assim **os dois** clientes
voltam. O consultor lê a carteira inteira.

## Causa raiz

A policy de SELECT delega a decisão a `can_access_consulting_client(id)`:

```sql
CREATE POLICY clientes_consultoria_select ON public.clientes_consultoria
  FOR SELECT TO authenticated
  USING (public.can_access_consulting_client(id));
```

E a função consulta `public.consulting_assignments`:

```sql
OR EXISTS (
  SELECT 1 FROM public.consulting_assignments ca
  WHERE ca.client_id = p_client_id AND ca.user_id = auth.uid() AND ca.active = true
)
```

**Essa tabela não existe neste banco.** O nome real é
`public.atribuicoes_consultoria` — a renomeação para português aconteceu na
migração de fundação e a função ficou apontando para o nome antigo. A prova está
na saída acima: consultar `consulting_assignments` com a service key devolve
"Could not find the table", enquanto `atribuicoes_consultoria` devolve a linha.

Vale notar o que isso diz sobre o estado do banco: a policy efetiva em produção
**não pode ser** a que está nas migrations, porque a que está nas migrations
referencia relação inexistente. É o mesmo drift já registrado em
[2026-07-31-schema-drift-clientes-consultoria.md](2026-07-31-schema-drift-clientes-consultoria.md),
agora com consequência de segurança.

## Duas camadas falharam juntas

1. **Banco:** a policy não restringe por atribuição (acima).
2. **Aplicação:** `/consultoria/clientes` servia `ConsultingClientsPage` para
   *todo* perfil. Essa tela consulta `clientes_consultoria` **sem filtro de
   atribuição**, confiando inteiramente na RLS. A tela com escopo
   (`ConsultantAssignedClientsPage`, que filtra por `atribuicoes_consultoria`)
   já existia no repositório e **não estava ligada a nenhuma rota**.

Nenhum teste pegava isso porque o único caso que verificava escopo de consultor
nunca chegava a executar: falhava antes, na criação da fixture.

## Estado

| Camada | Ação | Situação |
|---|---|---|
| Aplicação | `src/pages/ConsultoriaClientes.tsx` roteia consultor para a tela com escopo | **aplicado** |
| Banco | `supabase/migrations/20260731210000_fix_consultant_client_scope.sql` aponta a função para `atribuicoes_consultoria` | **escrita, NÃO aplicada** |

A migração não foi aplicada, e a verificação de impacto explica por quê:

```text
consultores ativos: 1  (conta real do consultor ativo)
atribuicoes ativas no banco: 115
  conta real do consultor ativo -> 0 clientes atribuídos
```

**O único consultor ativo em produção não tem nenhuma atribuição registrada.**
Aplicar a migração agora não fecharia um furo teórico: cortaria imediatamente
todo o acesso desse consultor à carteira que ele opera hoje. As 115 atribuições
ativas pertencem a outros usuários.

Ou seja, a decisão não é "corrigir ou não" — é **em que ordem**:

1. registrar as atribuições reais desse consultor em `atribuicoes_consultoria`;
2. conferir que a carteira registrada corresponde à que ele acompanha;
3. só então aplicar a migração.

Inverter essa ordem troca um problema de confidencialidade por uma interrupção
de operação.

A correção de aplicação sozinha **não fecha o furo** — ela corrige a tela, e a
API continua respondendo. O fechamento depende da migração.
