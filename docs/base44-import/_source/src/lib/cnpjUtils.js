// Utilitários de CNPJ — máscara, validação e formatação

export function cleanCNPJ(value) {
  return (value || '').replace(/\D/g, '');
}

export function maskCNPJ(value) {
  const digits = cleanCNPJ(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return digits.replace(/^(\d{2})(\d)/, '$1.$2');
  if (digits.length <= 8) return digits.replace(/^(\d{2})(\d{3})(\d)/, '$1.$2.$3');
  if (digits.length <= 12) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3/$4');
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

export function formatCNPJ(digits) {
  const clean = cleanCNPJ(digits);
  if (clean.length !== 14) return clean;
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function validateCNPJ(value) {
  const cnpj = cleanCNPJ(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDV = (slice) => {
    const size = slice.length;
    const weights = size === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < size; i++) sum += parseInt(slice[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDV(cnpj.slice(0, 12));
  const d2 = calcDV(cnpj.slice(0, 12) + d1);
  return parseInt(cnpj[12]) === d1 && parseInt(cnpj[13]) === d2;
}

export function getCNPJError(rawValue, isComplete = true) {
  const clean = cleanCNPJ(rawValue);
  if (!isComplete) return '';
  if (clean.length === 0) return 'Informe os 14 dígitos do CNPJ.';
  if (clean.length < 14) return 'Informe os 14 dígitos do CNPJ.';
  if (!validateCNPJ(clean)) return 'O CNPJ informado não é válido.';
  return '';
}