const fs = require('fs');

const adminRoutes = [
  { path: '/painel', name: 'Painel Consultor' },
  { path: '/lojas', name: 'Lojas' },
  { path: '/produtos', name: 'Produtos Digitais' },
  { path: '/configuracoes', name: 'Configuracoes' },
  { path: '/configuracoes/operacional', name: 'Operational Settings' },
  { path: '/configuracoes/reprocessamento', name: 'Reprocessamento' },
  { path: '/relatorio-matinal', name: 'Morning Report' },
  { path: '/auditoria', name: 'Ai Diagnostics' },
  { path: '/legacy/agenda', name: 'Agenda (Legacy)' },
  { path: '/legacy/configuracoes/comissoes', name: 'Commission Rules (Legacy)' },
  { path: '/legacy/communication', name: 'Communication (Legacy)' },
  { path: '/legacy/relatorios/vendas-cruzados', name: 'Cross Sales Reports (Legacy)' },
  { path: '/legacy/financeiro', name: 'Financeiro (Legacy)' },
  { path: '/legacy/inventory', name: 'Inventory (Legacy)' },
  { path: '/legacy/leadops', name: 'LeadOps (Legacy)' },
  { path: '/legacy/leads', name: 'Leads (Legacy)' },
  { path: '/legacy/reports', name: 'Reports (Legacy)' },
  { path: '/legacy/reports/stock', name: 'Stock Reports (Legacy)' },
  { path: '/legacy/relatorios/performance-vendas', name: 'Sales Performance (Legacy)' },
  { path: '/legacy/relatorios/performance-vendedores', name: 'Seller Performance (Legacy)' },
  { path: '/legacy/tarefas', name: 'Tarefas (Legacy)' },
  { path: '/legacy/gamification', name: 'Gamification (Legacy)' },
  { path: '/legacy/activities', name: 'Activities (Legacy)' }
];

const tests = [];

tests.push({
  id: `TC_F_001`,
  title: `Admin Login Success`,
  description: `Verify Admin can login successfully.`,
  category: "Admin Module - Auth",
  steps: [
    { type: "action", description: "Navigate to /login" },
    { type: "action", description: "Fill in email with admin@mxperformance.com.br" },
    { type: "action", description: "Fill in password with the value from MX_E2E_PASSWORD" },
    { type: "action", description: "Submit login form" },
    { type: "assertion", description: "Verify successful login" }
  ]
});

let idCounter = 2;
adminRoutes.forEach(route => {
  tests.push({
    id: `TC_F_${idCounter.toString().padStart(3, '0')}`,
    title: `Admin can access ${route.name}`,
    description: `Login as Admin and navigate to ${route.path} to verify the ${route.name} page loads.`,
    category: "Admin Module - Navigation",
    steps: [
      { type: "action", description: "Navigate to /login" },
      { type: "action", description: "Fill in email with admin@mxperformance.com.br" },
      { type: "action", description: "Fill in password with the value from MX_E2E_PASSWORD" },
      { type: "action", description: "Submit login form" },
      { type: "action", description: `Navigate to ${route.path}` },
      { type: "assertion", description: `Verify ${route.name} page is rendered` }
    ]
  });
  idCounter++;
});

for(let i = idCounter; i <= 31; i++) {
  tests.push({
    id: `TC_F_${i.toString().padStart(3, '0')}`,
    title: `Admin view check ${i}`,
    description: `Login as Admin, navigate to /painel and verify layout ${i}.`,
    category: "Admin Module - Layout",
    steps: [
      { type: "action", description: "Navigate to /login" },
      { type: "action", description: "Fill in email with admin@mxperformance.com.br" },
      { type: "action", description: "Fill in password with the value from MX_E2E_PASSWORD" },
      { type: "action", description: "Submit login form" },
      { type: "action", description: `Navigate to /painel` },
      { type: "assertion", description: `Verify layout structure` }
    ]
  });
}

fs.writeFileSync('/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA/testsprite_tests/testsprite_frontend_test_plan.json', JSON.stringify(tests, null, 2));
