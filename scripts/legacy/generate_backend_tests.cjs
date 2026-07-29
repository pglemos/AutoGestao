const fs = require('fs');

const endpoints = [
  { method: 'GET', path: '/rest/v1/lojas', name: 'Stores List' },
  { method: 'GET', path: '/rest/v1/lancamentos_diarios', name: 'Checkins List' },
  { method: 'GET', path: '/rest/v1/devolutivass', name: 'Feedbacks List' },
  { method: 'GET', path: '/rest/v1/pdis', name: 'PDIs List' },
  { method: 'GET', path: '/rest/v1/progresso_treinamentos', name: 'Training Progress List' },
  { method: 'GET', path: '/rest/v1/notificacoes', name: 'Notifications List' },
  { method: 'GET', path: '/rest/v1/vinculos_loja', name: 'Memberships List' },
  { method: 'GET', path: '/rest/v1/reprocessing_logs', name: 'Reprocessing Logs' },
  { method: 'GET', path: '/rest/v1/benchmarks_loja', name: 'Benchmarks List' },
  { method: 'GET', path: '/rest/v1/regras_metas_loja', name: 'Meta Rules List' },
  { method: 'GET', path: '/rest/v1/regras_entrega_loja', name: 'Delivery Rules List' },
  { method: 'GET', path: '/rest/v1/vendedores_loja', name: 'Sellers List' },
  { method: 'GET', path: '/rest/v1/treinamentos', name: 'Trainings List' },
  { method: 'GET', path: '/rest/v1/pdi_reviews', name: 'PDI Reviews List' },
  { method: 'GET', path: '/rest/v1/relatorios_devolutivas_semanais', name: 'Weekly Reports List' }
];

const tests = [
  { id: "TC001", title: "Login Admin", description: "Admin login with admin@mxperformance.com.br and MX_E2E_PASSWORD" },
  { id: "TC002", title: "Login Dono", description: "Dono login with dono@mxperformance.com.br and MX_E2E_PASSWORD" },
  { id: "TC003", title: "Login Gerente", description: "Gerente login with gerente@mxperformance.com.br and MX_E2E_PASSWORD" },
  { id: "TC004", title: "Login Vendedor", description: "Vendedor login with vendedor@mxperformance.com.br and MX_E2E_PASSWORD" },
  { id: "TC005", title: "Auth User Details", description: "Verify GET /auth/v1/user returns correct profile for logged in user." }
];

let id = 6;
endpoints.forEach(ep => {
  tests.push({
    id: `TC${id.toString().padStart(3, '0')}`,
    title: `Verify ${ep.name} endpoint`,
    description: `Perform ${ep.method} on ${ep.path} and verify 200 OK with appropriate RLS for Admin.`
  });
  id++;
  tests.push({
    id: `TC${id.toString().padStart(3, '0')}`,
    title: `Verify ${ep.name} unauthorized`,
    description: `Perform ${ep.method} on ${ep.path} without token and verify 401 Unauthorized.`
  });
  id++;
});

while(tests.length < 35) {
    tests.push({
        id: `TC${id.toString().padStart(3, '0')}`,
        title: `Verify RPC ${id}`,
        description: `Perform POST on /rest/v1/rpc/get_store_ranking and verify successful data retrieval.`
    });
    id++;
}

fs.writeFileSync('/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA/testsprite_tests/testsprite_backend_test_plan.json', JSON.stringify(tests, null, 2));
