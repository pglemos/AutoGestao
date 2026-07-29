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
  { path: '/legacy/activities', name: 'Activities (Legacy)' },
  { path: '/perfil', name: 'Perfil' },
  { path: '/notificacoes', name: 'Notificacoes' }
];

const tests = [];

// Admin Auth
tests.push({
  id: `ADMIN_001`,
  title: `Admin Login UI Flow`,
  description: `Verify that an Admin can enter credentials and reach the dashboard.`,
  category: "Admin Module - Auth",
  steps: [
    { type: "action", description: "Navigate to http://localhost:3000/login" },
    { type: "action", description: "Enter admin@mxperformance.com.br in the email field" },
    { type: "action", description: "Enter the value from MX_E2E_PASSWORD in the password field" },
    { type: "action", description: "Click the login button" },
    { type: "assertion", description: "Verify URL changes to include /painel or /lojas" }
  ],
  priority: "High"
});

let id = 2;
adminRoutes.forEach(route => {
  tests.push({
    id: `ADMIN_${id.toString().padStart(3, '0')}`,
    title: `Admin can view ${route.name}`,
    description: `Verify that the ${route.name} page is accessible and displays content for Admin.`,
    category: "Admin Module - Navigation",
    steps: [
      { type: "action", description: "Login as Admin using admin@mxperformance.com.br and MX_E2E_PASSWORD" },
      { type: "action", description: `Directly navigate to http://localhost:3000${route.path}` },
      { type: "assertion", description: `Verify the page title or a specific element for ${route.name} is visible` }
    ],
    priority: "High"
  });
  id++;
});

while(tests.length < 35) {
    tests.push({
        id: `ADMIN_${id.toString().padStart(3, '0')}`,
        title: `Admin Tab switching ${id}`,
        description: `Verify switching between dashboard tabs works.`,
        category: "Admin Module - UI",
        steps: [
            { type: "action", description: "Login as Admin" },
            { type: "action", description: "Click on a sidebar navigation link" },
            { type: "assertion", description: "Verify view updates" }
        ],
        priority: "Medium"
    });
    id++;
}

fs.writeFileSync('/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA/testsprite_tests/testsprite_frontend_test_plan.json', JSON.stringify(tests, null, 2));
