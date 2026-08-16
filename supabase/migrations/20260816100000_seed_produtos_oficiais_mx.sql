-- Seed dos produtos oficiais da MX a partir de CONSULTORIA-CRONOGRAMADEVISITAS.xlsx
-- Cria 4 produtos publicados + versão metodológica publicada v1.0 + conteúdo de cada encontro.
-- Idempotente: usa ON CONFLICT e delete-only-if-seed.

insert into programas_visita_consultoria (program_key, name, descricao, modalidade, status, versao, total_visits, min_presenciais, max_presenciais, active, published_at)
values
  ('pmr_online', 'PMR Online — Programa de Maximização de Resultados', 'Programa 100% online com 12 encontros e acompanhamentos mensais.', 'online', 'publicado', 1, 12, 0, 0, true, now()),
  ('pmr_hibrido', 'PMR Híbrido — Programa de Maximização de Resultados', 'Programa híbrido com 12 encontros (diagnóstico e revisão presenciais).', 'hibrido', 'publicado', 1, 12, 2, 9, true, now()),
  ('pmr_plus', 'PMR Plus — Programa de Maximização de Resultados', 'Programa avançado com foco financeiro, processos e gestão (9 encontros).', 'presencial', 'publicado', 1, 9, 2, 9, true, now()),
  ('ppa', 'PPA — Programa de Performance Acelerada', 'Programa de performance acelerada: modelo de negócio, receitas e custos (9 encontros).', 'presencial', 'publicado', 1, 9, 2, 9, true, now())
on conflict (program_key) do update set
  name = excluded.name, descricao = excluded.descricao, modalidade = excluded.modalidade,
  total_visits = excluded.total_visits, min_presenciais = excluded.min_presenciais, max_presenciais = excluded.max_presenciais;

-- Versões metodológicas publicadas v1.0 (uma por produto; recria se não existir)

insert into versoes_metodologia_produto (program_key, product_name, product_version_number, methodology_version_number, status, effective_from, change_summary, encounters_configured, encounters_pending, published_at)
select 'pmr_online', 'PMR Online — Programa de Maximização de Resultados', 1, '1.0', 'publicado', current_date, 'Seed oficial do cronograma MX (Excel CONSULTORIA-CRONOGRAMADEVISITAS)', 12, 0, now()
where not exists (
  select 1 from versoes_metodologia_produto v where v.program_key = 'pmr_online' and v.status = 'publicado'
);

-- Conteúdo dos encontros de pmr_online (não duplica: por versão+encontro)
insert into conteudo_encontro (methodology_version_id, visit_number, objective, reason, expected_result, required_participant_roles, prerequisites, owner_visibility, can_be_anticipated, status)
select v.id, e.n, e.motivo, e.formato, e.evidencia, e.alvo, e.checklist, true, false, 'publicado'
from (values
  (1, 'Diagnóstico', 'Online', '1 e 2. Formulários preenchidos; 3. Dados enviados', 'Todos', '1. Entrevista Vendedores, Gerentes e Sócios; 2. Análise de Processos; 3. Levantamento de dados'),
  (2, 'Planejamento Estratégico, Metodologia de Vendas por Multicanal, Treinamento Método Vendedor Completo, Gestor Automotivo 4.0, Área do Dono', 'Online', '1. Validação do Planejamento no Sistema; 2. Foto da reunião com a equipe; 3. Vendedores cadastrados no sistema; 4. Cadastro no sistema; 5. Gerente cadastrado no sistema; 6. Realização das aulas;', 'Proprietário', '1. Apresentação do Planejamento; 2. Implementação da Metodologia Multicanal; 3. Treinamento Método Vendedor Profissional; 4. Cadastro Plano de Remuneração 5. Apresentar treinamento gerencial; 6. Contratação e treinamento de novos vendedores;'),
  (3, 'Fechamento Diário Vendedor e Gerente', 'Online', '1. Disciplina na primeira semana superior a 70%; 2 e 3. Metas cadastradas ', 'Vendedor e Gerente', '1. Implementar "Fechamento Diário" 2. Implementar "Metas" no módulo vendedor 3. Implementar "Metas" no módulo gerente'),
  (4, 'Rotina do Gerente e Rotina do Vendedor', 'Online', '1. Menu "Rotina do Dia" sem pendências;', 'Vendedor e Gerente', '1. Cadastro de cliente qualificado no sistema 2. Como utilizar o "Plano de Ataque" na "Rotina do Dia" 3. Com utilizar a "Atualização" na "Rotina do Dia"  4. Como utilizar a "Prospecção" na "Rotina do Dia" 5. Como utilizar "Entrega de Carro" e "Garantia" na "Rotina do Dia"'),
  (5, 'Cultura de Resultados', 'Online', '1. Campanha criada; 2. Foto de uma reunião mensal;', 'Proprietário', '1. Como e quando criar campanhas; 2. Tipos de Campanhas; 3. Ações de aumento de competitividade; 4. Reuniões (Diárias, Semanais e mensais); 5. Como lidar com baixa performance'),
  (6, 'Marketing: Diagnóstico', 'Online', '1 e 2. Entrevistas coletadas; 3. Pesquisa de qualificação respondida; 4. Dados coletados; ', 'Proprietário e Marketing', '1. Entrevista com proprietário; 2. Entrevista com Marketing; 3. Pesquisa de Qualificação; 4. Levantamento de dados (Anúncios Pagos, Conteúdo Orgânico)'),
  (7, 'Marketing: Posicionamento, Estratégia de Conteúdo e Anúncios', 'Online', '1. Entrega do Playbook de Marketing Personalizado', 'Proprietário e Marketing', '1. Apresentação do conteúdo; 2. Definição dos responsáveis pela execução; 3. Definição do prazo de início;'),
  (8, 'Feedback Estruturado e Plano de Desenvolvimento Individual', 'Online', '1. Feedback enviada para a equipe; 2. PDI da equipe cadastrado no sistema;', 'Proprietário e Gerente', '1. Implementar o Feedback Estruturado; 2. Implementar o PDI da equipe e do Gerente; 3. Avaliar performance nos treinamentos;'),
  (9, 'Revisão do TRI 1 e Planejamento TRI 2', 'Online', '1. Sistema atualizado; 2. Atualização do Plano de Ação;', 'Proprietário', '1. Acessar o sistema com o proprietário e rever todos os processos implementados até o momento; 2. Pontuar quais processos precisarão de intervenção; 3. Reavaliar o Plano de Ação construído no P.E. 4. Direcionar os processos críticos;'),
  (10, 'Acompanhamento 1', 'Online', '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;'),
  (11, 'Acompanhamento 2', 'Online', '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;'),
  (12, 'Acompanhamento 3', 'Online', '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;')
) as e(n, motivo, formato, evidencia, alvo, checklist)
cross join lateral (
  select id from versoes_metodologia_produto
  where program_key = 'pmr_online' and status = 'publicado'
  order by published_at desc nulls last limit 1
) v
where not exists (
  select 1 from conteudo_encontro c
  where c.methodology_version_id = v.id and c.visit_number = e.n
);

insert into versoes_metodologia_produto (program_key, product_name, product_version_number, methodology_version_number, status, effective_from, change_summary, encounters_configured, encounters_pending, published_at)
select 'pmr_hibrido', 'PMR Híbrido — Programa de Maximização de Resultados', 1, '1.0', 'publicado', current_date, 'Seed oficial do cronograma MX (Excel CONSULTORIA-CRONOGRAMADEVISITAS)', 12, 0, now()
where not exists (
  select 1 from versoes_metodologia_produto v where v.program_key = 'pmr_hibrido' and v.status = 'publicado'
);

-- Conteúdo dos encontros de pmr_hibrido (não duplica: por versão+encontro)
insert into conteudo_encontro (methodology_version_id, visit_number, objective, reason, expected_result, required_participant_roles, prerequisites, owner_visibility, can_be_anticipated, status)
select v.id, e.n, e.motivo, e.formato, e.evidencia, e.alvo, e.checklist, true, false, 'publicado'
from (values
  (1, 'Diagnóstico', 'Presencial', '1 e 2. Formulários preenchidos; 3. Dados enviados', 'Todos', '1. Entrevista Vendedores, Gerentes e Sócios; 2. Análise de Processos; 3. Levantamento de dados'),
  (2, 'Planejamento Estratégico, Metodologia de Vendas por Multicanal, Treinamento Método Vendedor Completo, Gestor Automotivo 4.0, Área do Dono', 'Online', '1. Validação do Planejamento no Sistema; 2. Foto da reunião com a equipe; 3. Vendedores cadastrados no sistema; 4. Cadastro no sistema; 5. Gerente cadastrado no sistema; 6. Realização das aulas;', 'Proprietário', '1. Apresentação do Planejamento; 2. Implementação da Metodologia Multicanal; 3. Treinamento Método Vendedor Profissional; 4. Cadastro Plano de Remuneração 5. Apresentar treinamento gerencial; 6. Contratação e treinamento de novos vendedores;'),
  (3, 'Fechamento Diário Vendedor e Gerente', 'Online', '1. Disciplina na primeira semana superior a 70%; 2 e 3. Metas cadastradas ', 'Vendedor e Gerente', '1. Implementar "Fechamento Diário" 2. Implementar "Metas" no módulo vendedor 3. Implementar "Metas" no módulo gerente'),
  (4, 'Rotina do Gerente e Rotina do Vendedor', 'Online', '1. Menu "Rotina do Dia" sem pendências;', 'Vendedor e Gerente', '1. Cadastro de cliente qualificado no sistema 2. Como utilizar o "Plano de Ataque" na "Rotina do Dia" 3. Com utilizar a "Atualização" na "Rotina do Dia"  4. Como utilizar a "Prospecção" na "Rotina do Dia" 5. Como utilizar "Entrega de Carro" e "Garantia" na "Rotina do Dia"'),
  (5, 'Cultura de Resultados', 'Online', '1. Campanha criada; 2. Foto de uma reunião mensal;', 'Proprietário', '1. Como e quando criar campanhas; 2. Tipos de Campanhas; 3. Ações de aumento de competitividade; 4. Reuniões (Diárias, Semanais e mensais); 5. Como lidar com baixa performance'),
  (6, 'Marketing: Diagnóstico', 'Online', '1 e 2. Entrevistas coletadas; 3. Pesquisa de qualificação respondida; 4. Dados coletados; ', 'Proprietário e Marketing', '1. Entrevista com proprietário; 2. Entrevista com Marketing; 3. Pesquisa de Qualificação; 4. Levantamento de dados (Anúncios Pagos, Conteúdo Orgânico)'),
  (7, 'Marketing: Posicionamento, Estratégia de Conteúdo e Anúncios', 'Online', '1. Entrega do Playbook de Marketing Personalizado', 'Proprietário e Marketing', '1. Apresentação do conteúdo; 2. Definição dos responsáveis pela execução; 3. Definição do prazo de início;'),
  (8, 'Feedback Estruturado e Plano de Desenvolvimento Individual', 'Online', '1. Feedback enviada para a equipe; 2. PDI da equipe cadastrado no sistema;', 'Proprietário e Gerente', '1. Implementar o Feedback Estruturado; 2. Implementar o PDI da equipe e do Gerente; 3. Avaliar performance nos treinamentos;'),
  (9, 'Revisão do TRI 1 e Planejamento TRI 2', 'Presencial', '1. Sistema atualizado; 2. Atualização do Plano de Ação;', 'Proprietário', '1. Acessar o sistema com o proprietário e rever todos os processos implementados até o momento; 2. Pontuar quais processos precisarão de intervenção; 3. Reavaliar o Plano de Ação construído no P.E. 4. Direcionar os processos críticos;'),
  (10, 'Acompanhamento 1', 'Online', '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;'),
  (11, 'Acompanhamento 2', 'Online', '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;'),
  (12, 'Acompanhamento 3', 'Online', '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;')
) as e(n, motivo, formato, evidencia, alvo, checklist)
cross join lateral (
  select id from versoes_metodologia_produto
  where program_key = 'pmr_hibrido' and status = 'publicado'
  order by published_at desc nulls last limit 1
) v
where not exists (
  select 1 from conteudo_encontro c
  where c.methodology_version_id = v.id and c.visit_number = e.n
);

insert into versoes_metodologia_produto (program_key, product_name, product_version_number, methodology_version_number, status, effective_from, change_summary, encounters_configured, encounters_pending, published_at)
select 'pmr_plus', 'PMR Plus — Programa de Maximização de Resultados', 1, '1.0', 'publicado', current_date, 'Seed oficial do cronograma MX (Excel CONSULTORIA-CRONOGRAMADEVISITAS)', 9, 0, now()
where not exists (
  select 1 from versoes_metodologia_produto v where v.program_key = 'pmr_plus' and v.status = 'publicado'
);

-- Conteúdo dos encontros de pmr_plus (não duplica: por versão+encontro)
insert into conteudo_encontro (methodology_version_id, visit_number, objective, reason, expected_result, required_participant_roles, prerequisites, owner_visibility, can_be_anticipated, status)
select v.id, e.n, e.motivo, e.formato, e.evidencia, e.alvo, e.checklist, true, false, 'publicado'
from (values
  (1, 'Diagnóstico e Planejamento Financeiro', null, '1. Planejamento Consolidado; 2. Ferramenta para orgnaização; 3. DRE implementada;', 'Proprietário', '1. Organização da origem dos dados; 2. Fluxo do processo de controle financeiro; 3. Construção da DRE;'),
  (2, 'DRE, Fluxo de Caixa e Balanço Patrimonial', null, '1. Foto da apresentação; 1.1 Material de estudo; 2. Plano de Ação e Meta financeira cadastrados no sistema', 'Proprietário', '1. Apresentação do conceito 2. Plano de Ação e Meta Financeira'),
  (3, 'Revisão dos Processos de Marketing e Vendas', null, '1. Relatório da visita; 2 e 3. Plano de Ação cadastrado no sistema;', 'Todos', '1. Reavaliação dos processos de Marketing; 2. Reavaliação dos processos de Vendas; 3. Analisar capacidade da equipe de vendas; 4. Verificar engajamento nos treinamentos; 5. Plano de Ação para melhoria dos processos;'),
  (4, 'Revisão dos Processos Administrativos e Operacionais', null, '1, 2 e 3. Relatório da visita;', 'Todos', '1. Análise da confiabilidade das informações administrativas; 2. Análise de Estoque; 3. Análise de Preparação e Pós-Venda;'),
  (5, 'Revisão dos Processos de Gestão', null, '1, 2 e 3. Relatório da visita;', 'Proprietário', '1. Análise da Cultura de Resultados; 2. Análise do clima da equipe; 3. Avaliação do PDI da equipe; 4. Avaliação dos Processos da Equipe'),
  (6, 'Consolidação da Cultura de Resultados', null, '1. Relatório da visita; 2 e 3. Plano de Ação cadastrado no sistema;', 'Todos', '1. Verificar campanhas ativas; 2. Analisar venda por vendedor; 3. Verificar engajamento da equipe;'),
  (7, 'Acompanhamento 1', null, '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;'),
  (8, 'Acompanhamento 2', null, '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;'),
  (9, 'Acompanhamento 3', null, '1. Relatório da reunião no sistema; 2. Plano de Ação Atualizado', 'Proprietário', '1. Analisar resultado do mês e direcionar o cliente; 2. Criar Plano de Ação pontual;')
) as e(n, motivo, formato, evidencia, alvo, checklist)
cross join lateral (
  select id from versoes_metodologia_produto
  where program_key = 'pmr_plus' and status = 'publicado'
  order by published_at desc nulls last limit 1
) v
where not exists (
  select 1 from conteudo_encontro c
  where c.methodology_version_id = v.id and c.visit_number = e.n
);

insert into versoes_metodologia_produto (program_key, product_name, product_version_number, methodology_version_number, status, effective_from, change_summary, encounters_configured, encounters_pending, published_at)
select 'ppa', 'PPA — Programa de Performance Acelerada', 1, '1.0', 'publicado', current_date, 'Seed oficial do cronograma MX (Excel CONSULTORIA-CRONOGRAMADEVISITAS)', 9, 0, now()
where not exists (
  select 1 from versoes_metodologia_produto v where v.program_key = 'ppa' and v.status = 'publicado'
);

-- Conteúdo dos encontros de ppa (não duplica: por versão+encontro)
insert into conteudo_encontro (methodology_version_id, visit_number, objective, reason, expected_result, required_participant_roles, prerequisites, owner_visibility, can_be_anticipated, status)
select v.id, e.n, e.motivo, e.formato, e.evidencia, e.alvo, e.checklist, true, false, 'publicado'
from (values
  (1, 'Construção do Modelo de Negócio e Planejamento', null, '1. Relatório do Modelo de Negócio; 2. Relatório do Planejamento Estratégico; 3. Plano de Ação cadastrado', 'Proprietário', '1. Análise do modelo de negócio da empresa; 2. Construção do Planejamento Estratégico; 3. Definição do Plano de Ação Prioritário;'),
  (2, 'Diagnóstico e Plano de Maximização de Receitas', null, '1. Plano de Ação para crescimento das receitas; 2. Relatório Analítico;', 'Proprietário', '1. Análise das Receitas;  2. Comparação com o potencial de receita; 3. Plano de crescimento de receita;  4. Acompanhamento do Resultado; 5. Plano de Ação de melhoria de processos;'),
  (3, 'Diagnóstico e Plano de Eficiência em Custo', null, '1. Plano de Ação para crescimento das receitas; 2. Relatório Analítico;', 'Proprietário', '1. Análise dos Custos;  2. Comparação do custo com modelo de negócio; 3. Plano de redução de custos/despesas;  4. Acompanhamento do Resultado; 5. Plano de Ação de melhoria de processos;'),
  (4, 'Acompanhamento do Modelo e Ajustes Estratégicos', null, '1. Relatório do Modelo de Negócio; 2. Relatório do Planejamento Estratégico; 3. Plano de Ação cadastrado', 'Proprietário', '1. Análise do modelo de negócio da empresa; 2. Construção do Planejamento Estratégico; 3. Definição do Plano de Ação Prioritário; 4. Acompanhamento do Resultado; 5. Plano de Ação de melhoria de processos;'),
  (5, 'Acompanhamento da Maximização de Receitas', null, '1. Plano de Ação para crescimento das receitas; 2. Relatório Analítico;', 'Proprietário', '1. Análise das Receitas;  2. Comparação com o potencial de receita; 3. Plano de crescimento de receita;  4. Acompanhamento do Resultado; 5. Plano de Ação de melhoria de processos;'),
  (6, 'Acompanhamento da Eficiência em Custo', null, '1. Plano de Ação para crescimento das receitas; 2. Relatório Analítico;', 'Proprietário', '1. Análise dos Custos;  2. Comparação do custo com modelo de negócio; 3. Plano de redução de custos/despesas;  4. Acompanhamento do Resultado; 5. Plano de Ação de melhoria de processos;'),
  (7, 'Consolidação do Modelo e Planejamento', null, '1. Relatório do Modelo de Negócio; 2. Relatório do Planejamento Estratégico; 3. Plano de Ação cadastrado', 'Proprietário', '1. Análise do modelo de negócio da empresa; 2. Construção do Planejamento Estratégico; 3. Definição do Plano de Ação Prioritário; 4. Acompanhamento do Resultado; 5. Plano de Ação de melhoria de processos;'),
  (8, 'Consolidação e Escala das Receitas', null, '1. Plano de Ação para crescimento das receitas; 2. Relatório Analítico;', 'Proprietário', '1. Análise das Receitas;  2. Comparação com o potencial de receita; 3. Plano de crescimento de receita;  4. Acompanhamento do Resultado; 5. Plano de Ação de melhoria de processos;'),
  (9, 'Consolidação da Eficiência em Custo', null, '1. Plano de Ação para crescimento das receitas; 2. Relatório Analítico;', 'Proprietário', '1. Análise dos Custos;  2. Comparação do custo com modelo de negócio; 3. Plano de redução de custos/despesas;  4. Acompanhamento do Resultado; 5. Plano de Ação de melhoria de processos;')
) as e(n, motivo, formato, evidencia, alvo, checklist)
cross join lateral (
  select id from versoes_metodologia_produto
  where program_key = 'ppa' and status = 'publicado'
  order by published_at desc nulls last limit 1
) v
where not exists (
  select 1 from conteudo_encontro c
  where c.methodology_version_id = v.id and c.visit_number = e.n
);

-- Atualiza contadores das versões semeadas
update versoes_metodologia_produto v
set encounters_configured = coalesce((
  select count(*) from conteudo_encontro c
  where c.methodology_version_id = v.id and c.status = 'publicado' and c.objective is not null
), 0)
where v.status = 'publicado' and v.program_key in ('pmr_online','pmr_hibrido','pmr_plus','ppa');
