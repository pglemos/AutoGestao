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
