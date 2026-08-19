// Utilitários de endereço — CEP e máscaras

export function maskCEP(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function cleanCEP(value) {
  return String(value || '').replace(/\D/g, '');
}

export function validateCEP(value) {
  return cleanCEP(value).length === 8;
}

export function formatCEP(value) {
  const d = cleanCEP(value);
  if (d.length !== 8) return value || '';
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}