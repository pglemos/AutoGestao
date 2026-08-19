import { base44 } from '@/api/base44Client';
import { cleanCNPJ } from '@/lib/cnpjUtils';
import { ensureDefaultOperatingHours } from '@/lib/storeHoursUtils';

/**
 * Gera código interno automático para a Matriz.
 * Formato: {PREFIXO_CLIENTE}_MTZ ou {PREFIXO_CLIENTE}_MTZ_001 se houver filiais.
 * Preserva códigos já existentes.
 */
export function generateInternalCode(clientName, shortName, existingStores = []) {
  // Extrai prefixo do nome resumido ou razão social
  const base = (shortName || clientName || 'MX')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);

  const prefix = base || 'MX';

  // Se já existe um código com este prefixo, preserva
  const existing = existingStores.find(s => s.internal_code && s.internal_code.startsWith(prefix + '_MTZ'));
  if (existing) return existing.internal_code;

  // Conta filiais para gerar sequencial
  const filiais = existingStores.filter(s => s.store_type === 'FILIAL');
  if (filiais.length === 0) {
    return `${prefix}_MTZ`;
  }
  return `${prefix}_MTZ_001`;
}

/**
 * Cria ou atualiza a Matriz a partir da LegalEntity primária.
 * Idempotente: não cria segunda Matriz se uma já existir.
 * Chave: client_account_id + is_primary = true.
 */
export async function upsertHeadquartersFromLegalEntity(clientAccountId, options = {}) {
  if (!clientAccountId) throw new Error('clientAccountId é obrigatório');

  const [client, legalEntities, existingStores] = await Promise.all([
    base44.entities.ClientAccount.get(clientAccountId).catch(() => null),
    base44.entities.LegalEntity.filter({ client_account_id: clientAccountId, is_primary: true }).catch(() => []),
    base44.entities.Store.filter({ client_account_id: clientAccountId }).catch(() => []),
  ]);

  if (!client) throw new Error('Cliente não encontrado');

  const primaryLE = legalEntities[0] || null;
  const leId = primaryLE?.id || client.primary_legal_entity_id || '';

  // Busca Matriz existente
  let matriz = existingStores.find(s => s.store_type === 'MATRIZ' && s.is_primary);
  // Também aceita loja sem store_type MATRIZ mas com is_primary
  if (!matriz) matriz = existingStores.find(s => s.is_primary);

  const internalCode = matriz?.internal_code || generateInternalCode(client.name, client.short_name, existingStores);

  const matrizData = {
    client_account_id: clientAccountId,
    legal_entity_id: leId,
    name: 'Matriz',
    short_name: client.short_name || 'Matriz',
    store_type: 'MATRIZ',
    is_primary: true,
    cnpj: client.cnpj || primaryLE?.cnpj || '',
    legal_name: client.name,
    address_street: primaryLE?.street || '',
    address_zip: primaryLE?.postal_code || '',
    address_city: primaryLE?.city || client.city || '',
    address_state: primaryLE?.state || client.state || '',
    timezone: 'America/Sao_Paulo',
    status: matriz?.status || 'EM_CONFIGURACAO',
    internal_code: internalCode,
    created_from: matriz?.created_from || 'UPSERT_HEADQUARTERS',
    inherited_location: matriz?.inherited_location !== false,
    inherited_cnpj: matriz?.inherited_cnpj !== false,
  };

  let result;
  if (matriz) {
    // Preserva endereço se não estiver herdando
    if (matriz.inherited_location === false) {
      delete matrizData.address_street;
      delete matrizData.address_zip;
      delete matrizData.address_city;
      delete matrizData.address_state;
    }
    result = await base44.entities.Store.update(matriz.id, matrizData);
    await base44.entities.AuditLog.create({
      user_name: 'Administrador MX',
      user_role: 'ADMINISTRADOR_IMPLANTACAO',
      client_account_id: clientAccountId,
      client_account_name: client.name,
      resource: 'Store',
      action: 'onHeadquartersValidated',
      store_id: matriz.id,
      value_before: JSON.stringify({ internal_code: matriz.internal_code, status: matriz.status }),
      value_after: JSON.stringify({ internal_code: internalCode, status: matrizData.status }),
      origin: options.origin || 'Reparação automática de Matriz',
      environment: 'PROTOTIPO',
    }).catch(() => {});
  } else {
    result = await base44.entities.Store.create(matrizData);
    await base44.entities.AuditLog.create({
      user_name: 'Administrador MX',
      user_role: 'ADMINISTRADOR_IMPLANTACAO',
      client_account_id: clientAccountId,
      client_account_name: client.name,
      resource: 'Store',
      action: 'onHeadquartersCreatedFromIdentification',
      store_id: result.id,
      value_after: 'Matriz criada automaticamente a partir da identificação',
      origin: options.origin || 'Criação automática de Matriz',
      environment: 'PROTOTIPO',
    }).catch(() => {});
  }

  // Garante horário padrão
  await ensureDefaultOperatingHours(result.id, options.origin || 'Reparação de Matriz').catch(() => {});

  return result;
}

/**
 * Repara a Matriz de um cliente específico.
 * Garante type=MATRIZ, is_primary=true, internal_code preenchido, e campos herdados.
 * Idempotente — não cria duplicatas.
 */
export async function repairHeadquarters(clientAccountId, options = {}) {
  return upsertHeadquartersFromLegalEntity(clientAccountId, { origin: options.origin || 'Reparação de Matriz — Visão 360' });
}