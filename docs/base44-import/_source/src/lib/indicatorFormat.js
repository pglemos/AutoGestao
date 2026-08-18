// ============================================================
// Serviço central de formatação de indicadores estratégicos
// Fonte única: formatStrategicValue() e parseStrategicInput()
// Localidade: pt-BR | Moeda: BRL
// v1.7
// ============================================================

export const VALUE_FORMATS = {
  INTEGER: 'INTEGER',
  DECIMAL: 'DECIMAL',
  CURRENCY_BRL: 'CURRENCY_BRL',
  PERCENTAGE: 'PERCENTAGE',
  SCORE_0_5: 'SCORE_0_5',
  RATIO: 'RATIO',
  INVENTORY_TURNOVER: 'INVENTORY_TURNOVER',
};

export const FORMAT_CONTEXTS = {
  INPUT: 'INPUT',
  TABLE: 'TABLE',
  CARD: 'CARD',
  CHART: 'CHART',
  TOOLTIP: 'TOOLTIP',
  EXPORT: 'EXPORT',
  AUDIT: 'AUDIT',
};

// ─── Configurações por value_format ───────────────────────────
const FORMAT_CONFIGS = {
  INTEGER: {
    type: 'integer',
    value_format: 'INTEGER',
    display_decimal_places: 0,
    input_decimal_places: 0,
    prefix: '',
    suffix: '',
    allow_negative: false,
    trim_trailing_zeros: true,
    step: '1',
  },
  DECIMAL: {
    type: 'decimal',
    value_format: 'DECIMAL',
    display_decimal_places: 2,
    input_decimal_places: 2,
    prefix: '',
    suffix: '',
    allow_negative: false,
    trim_trailing_zeros: true,
    step: '0.01',
  },
  CURRENCY_BRL: {
    type: 'currency',
    value_format: 'CURRENCY_BRL',
    display_decimal_places: 2,
    input_decimal_places: 2,
    prefix: 'R$',
    suffix: '',
    allow_negative: true,
    trim_trailing_zeros: false,
    step: '0.01',
  },
  PERCENTAGE: {
    type: 'percentage',
    value_format: 'PERCENTAGE',
    display_decimal_places: 2,
    input_decimal_places: 2,
    prefix: '',
    suffix: '%',
    allow_negative: false,
    trim_trailing_zeros: true,
    storage_scale: 'FRACTION',
    input_scale: 'PERCENTAGE_POINTS',
    step: '0.01',
  },
  SCORE_0_5: {
    type: 'score',
    value_format: 'SCORE_0_5',
    display_decimal_places: 1,
    input_decimal_places: 1,
    prefix: '',
    suffix: '',
    suffix_detail: ' de 5',
    allow_negative: false,
    minimum_value: 0,
    maximum_value: 5,
    trim_trailing_zeros: true,
    step: '0.1',
  },
  RATIO: {
    type: 'ratio',
    value_format: 'RATIO',
    display_decimal_places: 2,
    input_decimal_places: 2,
    prefix: '',
    suffix: '',
    suffix_detail: 'agend./venda',
    allow_negative: false,
    trim_trailing_zeros: false,
    step: '0.01',
  },
  INVENTORY_TURNOVER: {
    type: 'inventory_turnover',
    value_format: 'INVENTORY_TURNOVER',
    monthly_format: 'PERCENTAGE',
    annual_format: 'RATIO',
    display_decimal_places: 2,
    input_decimal_places: 2,
    prefix: '',
    suffix: '',
    allow_negative: false,
    trim_trailing_zeros: true,
    step: '0.01',
  },
};

// ─── Mapear unit string → value_format (backward compat) ─────
function getFormatConfigByUnit(unit) {
  const u = (unit || '').toLowerCase().trim();
  if (u.includes('moeda')) return FORMAT_CONFIGS.CURRENCY_BRL;
  if (u === 'nota' || u.includes('avaliação') || u.includes('avaliacao')) return FORMAT_CONFIGS.SCORE_0_5;
  if (u === 'nota decimal') return FORMAT_CONFIGS.SCORE_0_5;
  if (u.includes('percent')) return FORMAT_CONFIGS.PERCENTAGE;
  if (u === 'razão' || u === 'razao') return FORMAT_CONFIGS.INVENTORY_TURNOVER;
  if (u.includes('número decimal') || u.includes('numero decimal')) return FORMAT_CONFIGS.DECIMAL;
  if (u.includes('número inteiro') || u.includes('numero inteiro') || u === 'inteiro') return FORMAT_CONFIGS.INTEGER;
  return FORMAT_CONFIGS.INTEGER;
}

// ─── Função principal: obter config de formato ───────────────
// Aceita: indicator object (com value_format) ou unit string
export function getFormatConfig(unitOrIndicator) {
  if (unitOrIndicator && typeof unitOrIndicator === 'object' && !Array.isArray(unitOrIndicator)) {
    if (unitOrIndicator.value_format && FORMAT_CONFIGS[unitOrIndicator.value_format]) {
      const base = FORMAT_CONFIGS[unitOrIndicator.value_format];
      return {
        ...base,
        ...(unitOrIndicator.allow_negative != null ? { allow_negative: unitOrIndicator.allow_negative } : {}),
        ...(unitOrIndicator.suffix_detail != null ? { suffix_detail: unitOrIndicator.suffix_detail } : {}),
        ...(unitOrIndicator.unit_label != null ? { unit_label: unitOrIndicator.unit_label } : {}),
      };
    }
    return getFormatConfigByUnit(unitOrIndicator.unit || '');
  }
  return getFormatConfigByUnit(unitOrIndicator || '');
}

// ─── Helpers ─────────────────────────────────────────────────
function formatNumberBR(num, minDecimals, maxDecimals) {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

function trimTrailingZerosBR(formatted) {
  if (!formatted.includes(',')) return formatted;
  return formatted.replace(/,?0+$/, '').replace(/,$/, '');
}

// ─── Função central de formatação ────────────────────────────
// formatStrategicValue(value, config, context, options)
// context: 'TABLE' | 'CARD' | 'INPUT' | 'CHART' | 'TOOLTIP' | 'EXPORT' | 'AUDIT'
// options: { isAnnual: boolean }
export function formatStrategicValue(value, config, context = 'TABLE', options = {}) {
  // Estados especiais
  if (value === 'SEM_BASE' || value === 'WITHOUT_BASE') return 'Sem base';
  if (value === 'ERRO_TECNICO' || value === 'TECHNICAL_ERROR') return 'Erro técnico';

  if (value == null || value === '') return context === 'INPUT' ? '' : '—';

  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return 'Erro técnico';

  const fmt = config.value_format || config.type;
  const isAnnual = options.isAnnual || false;
  const decimals = config.display_decimal_places ?? 2;
  const trim = config.trim_trailing_zeros !== false;

  switch (fmt) {
    case 'INTEGER':
      return formatNumberBR(Math.round(num), 0, 0);

    case 'DECIMAL': {
      if ((context === 'CARD' || context === 'CHART') && trim) {
        const formatted = formatNumberBR(num, 0, decimals);
        return trimTrailingZerosBR(formatted);
      }
      return formatNumberBR(num, decimals, decimals);
    }

    case 'CURRENCY_BRL': {
      const absNum = Math.abs(num);
      const formatted = formatNumberBR(absNum, decimals, decimals);
      const sign = num < 0 ? '-' : '';
      const prefix = config.prefix ? config.prefix + ' ' : '';
      return `${sign}${prefix}${formatted}`;
    }

    case 'PERCENTAGE': {
      // Armazenado como fração (0.20), exibido como pontos percentuais (20%)
      const pctValue = num * 100;
      if ((context === 'CARD' || context === 'CHART') && trim) {
        const formatted = formatNumberBR(pctValue, 0, decimals);
        return trimTrailingZerosBR(formatted) + '%';
      }
      return formatNumberBR(pctValue, decimals, decimals) + '%';
    }

    case 'SCORE_0_5': {
      const formatted = formatNumberBR(num, 1, 1);
      if (context === 'TOOLTIP' || context === 'CARD') {
        return formatted + (config.suffix_detail || ' de 5');
      }
      return formatted;
    }

    case 'RATIO': {
      const formatted = formatNumberBR(num, decimals, decimals);
      if (context === 'TOOLTIP' || context === 'CARD') {
        return formatted + (config.suffix_detail ? ' ' + config.suffix_detail : '');
      }
      return formatted;
    }

    case 'INVENTORY_TURNOVER': {
      // Mensal = percentual, Anual = razão com 'x'
      if (isAnnual) {
        const formatted = formatNumberBR(num, decimals, decimals);
        return formatted + 'x';
      } else {
        const pctValue = num * 100;
        if ((context === 'CARD' || context === 'CHART') && trim) {
          const formatted = formatNumberBR(pctValue, 0, decimals);
          return trimTrailingZerosBR(formatted) + '%';
        }
        return formatNumberBR(pctValue, decimals, decimals) + '%';
      }
    }

    default:
      return formatNumberBR(num, 0, 2);
  }
}

// ─── Função central de parse de entrada ──────────────────────
// parseStrategicInput(str, config)
// Retorna número armazenado (fração para PERCENTAGE, número cru para outros)
export function parseStrategicInput(str, config) {
  if (!str || str.toString().trim() === '') return null;

  const fmt = config?.value_format || config?.type;
  let cleaned = str.toString().trim();

  // Remover prefixo (R$) se presente
  if (config?.prefix) {
    const prefixEsc = config.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp('^' + prefixEsc + '\\s*', 'i'), '');
  }

  // Remover sufixo (% ou x) se presente
  if (config?.suffix) {
    const suffixEsc = config.suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp('\\s*' + suffixEsc + '\\s*$', 'i'), '');
  }
  // Remover 'x' final para RATIO e INVENTORY_TURNOVER anual
  cleaned = cleaned.replace(/[xX]$/i, '').trim();

  // Detectar negativo
  const isNegative = /^[-−]/.test(cleaned);
  cleaned = cleaned.replace(/^[-−]/, '').trim();

  if (fmt === 'INTEGER') {
    cleaned = cleaned.replace(/\D/g, '');
    if (!cleaned) return null;
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) return null;
    return isNegative && config?.allow_negative ? -num : num;
  }

  // Para tipos decimais: remover separadores de milhar (.), converter vírgula decimal (,) para ponto
  cleaned = cleaned.replace(/\.(?=\d{3}([.,]|$))/g, ''); // remove thousand separators
  cleaned = cleaned.replace(',', '.'); // decimal separator
  cleaned = cleaned.replace(/%/g, '');

  const num = Number(cleaned);
  if (isNaN(num)) return null;

  // PERCENTAGE: entrada em pontos percentuais (20 → 0.20)
  if (fmt === 'PERCENTAGE') {
    return (isNegative && config?.allow_negative ? -1 : 1) * (num / 100);
  }

  // SCORE_0_5: validar range 0-5
  if (fmt === 'SCORE_0_5') {
    if (num < 0 || num > 5) return null; // caller deve mostrar validação
    return num;
  }

  // INVENTORY_TURNOVER: se entrada tem %, é pontos percentuais → fração
  if (fmt === 'INVENTORY_TURNOVER') {
    if (str.toString().includes('%')) {
      return num / 100;
    }
    return num;
  }

  // RATIO, DECIMAL, CURRENCY_BRL
  return isNegative && config?.allow_negative ? -num : num;
}

// ─── Validação de entrada ────────────────────────────────────
export function validateStrategicInput(str, config) {
  if (!str || str.toString().trim() === '') return { valid: true, value: null };
  const fmt = config?.value_format || config?.type;
  const parsed = parseStrategicInput(str, config);
  if (parsed == null) {
    if (fmt === 'SCORE_0_5') {
      const cleaned = str.toString().trim().replace(',', '.').replace(/[^\d.]/g, '');
      const num = Number(cleaned);
      if (!isNaN(num) && (num < 0 || num > 5)) {
        return { valid: false, error: 'A nota deve estar entre 0 e 5.' };
      }
    }
    return { valid: false, error: 'Valor inválido.' };
  }
  if (config?.minimum_value != null && parsed < config.minimum_value) {
    return { valid: false, error: `Valor mínimo: ${config.minimum_value}.` };
  }
  if (config?.maximum_value != null && parsed > config.maximum_value) {
    return { valid: false, error: `Valor máximo: ${config.maximum_value}.` };
  }
  return { valid: true, value: parsed };
}

// ─── Backward compat ─────────────────────────────────────────
export function formatDisplay(value, config, isAnnual = false) {
  return formatStrategicValue(value, config, 'TABLE', { isAnnual });
}

export function parseInput(str) {
  // Legacy: parse genérico sem info de formato
  if (!str || str.trim() === '') return null;
  const normalized = str.toString().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = Number(normalized);
  return isNaN(num) ? null : num;
}

// ─── Formatação para contextos específicos ───────────────────
export function formatForCard(value, config, isAnnual = false) {
  return formatStrategicValue(value, config, 'CARD', { isAnnual });
}

export function formatForTooltip(value, config, isAnnual = false) {
  return formatStrategicValue(value, config, 'TOOLTIP', { isAnnual });
}

export function formatForChart(value, config) {
  return formatStrategicValue(value, config, 'CHART');
}

export function formatForExport(value, config) {
  // Exportação: retorna número (para Excel)
  if (value == null || value === '') return null;
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return null;
  return num;
}
