export const TEMPLATE_VERSION = '1.0.0';

export const SOURCE_OPTIONS = [
  'Loja', 'Equipe MX', 'Sistema MX', 'Planilha da Loja',
  'CRM', 'ERP', 'DRE', 'Estoque', 'Financeiro', 'Outro',
];

export const INSTRUCTION_LINES = [
  'Não altere os códigos dos indicadores (coluna A).',
  'Não altere os nomes dos indicadores (coluna C).',
  'Não exclua linhas da tabela.',
  'Preencha somente as células liberadas (fundo branco).',
  'Deixe vazio quando não houver atualização para aquele mês.',
  'Digite zero (0) somente quando o resultado for realmente zero.',
  'Use "LIMPAR" para remover um valor existente.',
  'A coluna Total não será importada — é somente para conferência.',
  'Indicadores calculados (fundo cinza) serão recalculados pelo sistema.',
  'Meses futuros não podem ser importados.',
];

export const DEPT_EXCEL_COLORS = {
  COMERCIAL: 'FFDBEAFE',
  MARKETING: 'FFE9D5FF',
  PRODUTO_ESTOQUE: 'FFFEF3C7',
  FINANCEIRO: 'FFD1FAE5',
  OPERACOES: 'FFFEE2E2',
  PESSOAS_RH: 'FFFCE7F3',
};

export function getExcelNumberFormat(valueFormat) {
  switch (valueFormat) {
    case 'INTEGER': return '#,##0';
    case 'DECIMAL': return '#,##0.00';
    case 'CURRENCY_BRL': return 'R$ #,##0.00';
    case 'PERCENTAGE': return '0.0"%"';
    case 'SCORE_0_5': return '0.0';
    case 'RATIO': return '0.00';
    case 'INVENTORY_TURNOVER': return '0.00';
    default: return '#,##0.00';
  }
}

export function getFormatLabel(valueFormat) {
  const labels = {
    INTEGER: 'Inteiro',
    DECIMAL: 'Decimal',
    CURRENCY_BRL: 'Moeda',
    PERCENTAGE: 'Percentual',
    SCORE_0_5: 'Nota 0-5',
    RATIO: 'Razão',
    INVENTORY_TURNOVER: 'Giro',
  };
  return labels[valueFormat] || 'Decimal';
}

export function isPercentageFormat(valueFormat) {
  return valueFormat === 'PERCENTAGE';
}

export function sanitizeFileName(name) {
  return String(name || 'CLIENTE')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
}

export function getTemplateFileName(clientName, viewType, referenceYear, storeName) {
  const prefix = viewType === 'ACTUAL' ? 'REALIZADO' : 'ANO_ANTERIOR';
  const name = sanitizeFileName(clientName);
  const unit = storeName ? sanitizeFileName(storeName) : 'CONSOLIDADO';
  return `${prefix}_${name}_${unit}_${referenceYear}.xlsx`;
}

export const TARGET_INSTRUCTION_LINES = [
  'Preencha somente as células brancas (indicadores digitáveis).',
  'Não altere os códigos dos indicadores (coluna B).',
  'Não altere os nomes dos indicadores (coluna D).',
  'Não exclua linhas da tabela.',
  'Deixe a célula vazia quando não quiser atualizar aquele mês — o valor atual será preservado.',
  'Digite zero (0) somente quando a meta for realmente zero.',
  'Use "LIMPAR" para remover uma meta já cadastrada.',
  'Indicadores calculáveis (fundo cinza) serão recalculados pelo sistema — não os altere.',
  'A coluna Total é somente conferência — não será importada.',
  'Parâmetros devem ser ajustados no sistema em "Parâmetros do Cliente".',
  'A importação não altera Realizado nem Ano Anterior.',
];

export function getTargetTemplateFileName(clientName, referenceYear) {
  const name = sanitizeFileName(clientName);
  return `METAS_${name}_${referenceYear}_CONSOLIDADO.xlsx`;
}

export function generateTemplateHash(config) {
  const str = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return String(Math.abs(hash));
}