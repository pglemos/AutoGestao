# Smoke E2E do módulo Administrador MX

`admin-mx-smoke.mjs` percorre as seis rotas do módulo em produção (ou local),
autenticado, e confere o que só aparece clicando: a Visão 360 abrindo pela
lista, os drawers de produto/indicador/plano/consultor e as abas de cada tela.

```bash
PWD_MX='<senha do usuário de teste>' node scripts/e2e/admin-mx-smoke.mjs
E2E_BASE=http://localhost:3457 PWD_MX='...' node scripts/e2e/admin-mx-smoke.mjs
```

## Por que o clique é feito por atributo

O cabeçalho fixo intercepta o clique do Playwright depois da rolagem
automática: `getByRole('button').click()` reporta sucesso e o overlay não abre,
o que já produziu três falsos negativos ("o botão não faz nada"). O helper
`clicarNoMain` marca o elemento dentro de `<main>`, rola até o centro e clica
pelo atributo — é o caminho confiável neste layout.

## admin-mx-deep.mjs

Vai um nível abaixo do smoke: percorre **cada aba** de `/consultoria-mx`,
`/indicadores` e `/planos-acao`, abre a metodologia do produto e mede se a aba
renderizou conteúdo real, sem erro de console nem 4xx do Supabase.

```bash
PWD_MX='<senha>' node scripts/e2e/admin-mx-deep.mjs
```

Duas decisões que evitam falso negativo:

- **Estado vazio com CTA conta como saudável.** Uma aba sem registros ainda
  ("Nenhum modelo de relatório" + botão "Criar Modelo") está correta; medir só
  tamanho de texto reprovava a tela certa.
- **`esperarAbas()` antes de ler.** Em produção a primeira carga passa de 5s e
  um `waitForTimeout` fixo lia a página antes das abas montarem — o bloco de
  `/indicadores` chegou a sumir inteiro do relatório por isso.
