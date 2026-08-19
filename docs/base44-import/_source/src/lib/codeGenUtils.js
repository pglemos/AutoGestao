// Geração automática de código interno a partir do nome do indicador

export function slugifyCode(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '_') // espaços → underscore
    .replace(/_+/g, '_') // underscores múltiplos → um
    .replace(/^_+|_+$/g, ''); // remove underscore no início/fim
}

// Garante unicidade — adiciona sufixo sequencial se necessário
export async function generateUniqueCode(name, existingCodes = [], excludeCode = '') {
  const base = slugifyCode(name);
  if (!base) return '';
  const codes = existingCodes.filter(c => c !== excludeCode);
  if (!codes.includes(base)) return base;
  let suffix = 2;
  while (codes.includes(`${base}_${suffix}`)) suffix++;
  return `${base}_${suffix}`;
}