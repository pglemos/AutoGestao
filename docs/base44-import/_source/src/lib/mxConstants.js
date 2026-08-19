export const UF_LIST = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export const DECLARED_FUNCTIONS = [
  { value: 'CONSULTOR_DE_VENDAS', label: 'Consultor de Vendas' },
  { value: 'GERENTE_DE_VENDAS', label: 'Gerente de Vendas' },
  { value: 'GERENTE_GERAL', label: 'Gerente Geral' },
  { value: 'DIRETOR', label: 'Diretor' },
  { value: 'SOCIO', label: 'Sócio' },
];

export const DECLARED_FUNCTION_LABELS = DECLARED_FUNCTIONS.reduce((acc, f) => {
  acc[f.value] = f.label;
  return acc;
}, {});

export const CAPACITY_STATUS = {
  AVAILABLE: { label: 'Disponível', color: 'bg-green-50 text-green-700' },
  ATTENTION: { label: 'Atenção', color: 'bg-yellow-50 text-yellow-700' },
  COMMITTED: { label: 'Capacidade comprometida', color: 'bg-orange-50 text-orange-700' },
  OVERLOAD: { label: 'Sobrecarga', color: 'bg-red-50 text-red-700' },
  NO_BASE: { label: 'Sem base', color: 'bg-gray-100 text-gray-500' },
};

export function getCapacityStatus(occupationPct, hasTimeParam) {
  if (!hasTimeParam) return CAPACITY_STATUS.NO_BASE;
  if (occupationPct <= 80) return CAPACITY_STATUS.AVAILABLE;
  if (occupationPct <= 95) return CAPACITY_STATUS.ATTENTION;
  if (occupationPct <= 100) return CAPACITY_STATUS.COMMITTED;
  return CAPACITY_STATUS.OVERLOAD;
}