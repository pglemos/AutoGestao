import { base44 } from '@/api/base44Client';

/**
 * Repara o vínculo contratual do programa a partir da jornada existente.
 * Quando existe jornada com product_id e product_version mas sem ClientContract,
 * cria o contrato faltante e vincula os encontros.
 *
 * Idempotente — não cria contrato duplicado se já existir.
 * Preserva journey_id, encontros e consultores.
 */
export async function repairProgramAssignmentFromJourney(clientAccountId, options = {}) {
  if (!clientAccountId) throw new Error('clientAccountId é obrigatório');

  const [client, contracts, encounters] = await Promise.all([
    base44.entities.ClientAccount.get(clientAccountId).catch(() => null),
    base44.entities.ClientContract.filter({ client_account_id: clientAccountId }).catch(() => []),
    base44.entities.JourneyEncounter.filter({ client_account_id: clientAccountId }).catch(() => []),
  ]);

  if (!client) throw new Error('Cliente não encontrado');
  if (encounters.length === 0) {
    return { repaired: false, reason: 'Nenhuma jornada encontrada para reparar vínculo.' };
  }

  // Verifica se já existe contrato válido
  const existingContract = contracts.find(c => c.status === 'ATIVO' || c.status === 'RASCUNHO');
  if (existingContract && existingContract.product_id) {
    // Contrato já existe — apenas vincula encontros se necessário
    const unlinked = encounters.filter(e => !e.contract_id && e.product_id === existingContract.product_id);
    if (unlinked.length > 0) {
      await base44.entities.JourneyEncounter.bulkUpdate(
        unlinked.map(e => ({ id: e.id, contract_id: existingContract.id }))
      ).catch(() => {});
    }
    return { repaired: false, reason: 'Contrato já existe.', contractId: existingContract.id };
  }

  // Extrai product_id e product_version da jornada
  const journeyWithProduct = encounters.find(e => e.product_id);
  if (!journeyWithProduct) {
    return { repaired: false, reason: 'Jornada não possui product_id para inferir o contrato.' };
  }

  const productId = journeyWithProduct.product_id;
  const productVersion = journeyWithProduct.product_version || '1.0';

  // Busca dados do produto
  const product = await base44.entities.ConsultingProduct.get(productId).catch(() => null);
  const productName = product?.name || 'Produto Consultivo';
  const totalEncounters = encounters.filter(e => !e.is_onboarding).length || product?.total_encounters || encounters.length;

  // Cria o contrato
  const contractData = {
    client_account_id: clientAccountId,
    product_id: productId,
    product_name: productName,
    product_version: productVersion,
    status: 'ATIVO',
    start_date: client.planned_start_date || new Date().toISOString().split('T')[0],
    total_encounters: totalEncounters,
    contracted_presential_visits: encounters.filter(e => e.consumes_in_person_visit).length,
    responsible_consultant_id: journeyWithProduct.responsible_consultant_id || '',
    responsible_consultant_name: journeyWithProduct.responsible_consultant_name || '',
  };

  const contract = await base44.entities.ClientContract.create(contractData);

  // Vincula os encontros ao novo contrato
  const unlinkedEncounters = encounters.filter(e => !e.contract_id);
  if (unlinkedEncounters.length > 0) {
    await base44.entities.JourneyEncounter.bulkUpdate(
      unlinkedEncounters.map(e => ({ id: e.id, contract_id: contract.id }))
    ).catch(() => {});
  }

  // Auditoria
  await base44.entities.AuditLog.create({
    user_name: 'Administrador MX',
    user_role: 'ADMINISTRADOR_IMPLANTACAO',
    client_account_id: clientAccountId,
    client_account_name: client.name,
    resource: 'ClientContract',
    action: 'onProgramJourneyLinkRepaired',
    resource_id: contract.id,
    value_before: 'Jornada sem vínculo contratual',
    value_after: JSON.stringify({ contract_id: contract.id, product_id: productId, linked_encounters: unlinkedEncounters.length }),
    origin: options.origin || 'Reparação automática de vínculo programa-jornada',
    environment: 'PROTOTIPO',
  }).catch(() => {});

  return {
    repaired: true,
    contractId: contract.id,
    productId,
    productName,
    productVersion,
    linkedEncounters: unlinkedEncounters.length,
  };
}