import { base44 } from '@/api/base44Client';
import { resolveClientOwnerMaster } from '@/lib/ownerMasterResolver';

// Status permitidos para os checks
export const CHECK_STATUS = {
  VALID: 'VALID',
  INVALID: 'INVALID',
  WARNING: 'WARNING',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  TECHNICAL_ERROR: 'TECHNICAL_ERROR',
};

// Status de Store aceitos como pré-ativação (não exigem ATIVA antes de ativar)
const STORE_PRE_ACTIVATION_STATUSES = ['EM_CONFIGURACAO', 'ATIVA'];

// Status de contrato aceitos como programa configurado
const PROGRAM_VALID_STATUSES = ['RASCUNHO', 'ATIVO', 'RENOVADO'];

/**
 * Fonte única de prontidão para ativação de cliente.
 * Usada por: modal Validar e Ativar, cards da Visão 360, status do onboarding, botão Ativar.
 *
 * @param {string} clientAccountId
 * @returns {Promise<object>} resultado estruturado com criticalChecks, nonBlockingChecks, canActivate, blockingReasons
 */
export async function evaluateClientActivationReadiness(clientAccountId) {
  if (!clientAccountId) {
    return {
      clientAccountId: null,
      evaluatedAt: new Date().toISOString(),
      criticalChecks: [],
      nonBlockingChecks: [],
      canActivate: false,
      blockingReasons: ['ID do cliente não informado'],
    };
  }

  try {
    const [client, stores, contracts, encounters, users, cycles, monthlyValues, roleGrants] = await Promise.all([
      base44.entities.ClientAccount.get(clientAccountId).catch(() => null),
      base44.entities.Store.filter({ client_account_id: clientAccountId }).catch(() => []),
      base44.entities.ClientContract.filter({ client_account_id: clientAccountId }).catch(() => []),
      base44.entities.JourneyEncounter.filter({ client_account_id: clientAccountId }).catch(() => []),
      base44.entities.UserProfile.filter({ client_account_id: clientAccountId }).catch(() => []),
      base44.entities.StrategicPlanCycle.filter({ client_account_id: clientAccountId }).catch(() => []),
      base44.entities.StrategicTargetMonthlyValue.filter({ client_account_id: clientAccountId }).catch(() => []),
      base44.entities.RoleGrant.filter({ client_account_id: clientAccountId }).catch(() => []),
    ]);

    if (!client) {
      return {
        clientAccountId,
        evaluatedAt: new Date().toISOString(),
        criticalChecks: [],
        nonBlockingChecks: [],
        canActivate: false,
        blockingReasons: ['Cliente não encontrado'],
      };
    }

    const criticalChecks = [];
    const nonBlockingChecks = [];

    // === CHECK 1: Matriz cadastrada e validada ===
    const matriz = stores.find(s => s.store_type === 'MATRIZ' && s.is_primary);
    if (!matriz) {
      criticalChecks.push({
        code: 'HEADQUARTERS',
        label: 'Matriz cadastrada e validada no cadastro inicial',
        status: CHECK_STATUS.INVALID,
        reason: 'Nenhuma loja marcada como Matriz e Principal foi encontrada.',
        sourceEntity: 'Store',
        sourceId: null,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=lojas',
      });
    } else {
      const missingFields = [];
      if (!matriz.legal_entity_id) missingFields.push('legal_entity_id');
      if (!matriz.cnpj) missingFields.push('cnpj');
      if (!matriz.address_city) missingFields.push('cidade');
      if (!matriz.address_state) missingFields.push('UF');
      if (!matriz.timezone) missingFields.push('timezone');

      if (missingFields.length > 0) {
        criticalChecks.push({
          code: 'HEADQUARTERS',
          label: 'Matriz cadastrada e validada no cadastro inicial',
          status: CHECK_STATUS.INVALID,
          reason: 'Matriz existe mas está com campos ausentes: ' + missingFields.join(', ') + '.',
          sourceEntity: 'Store',
          sourceId: matriz.id,
          correctionRoute: '/clientes/' + clientAccountId + '?tab=lojas',
        });
      } else if (matriz.status === 'ARQUIVADA' || matriz.status === 'INATIVA') {
        criticalChecks.push({
          code: 'HEADQUARTERS',
          label: 'Matriz cadastrada e validada no cadastro inicial',
          status: CHECK_STATUS.INVALID,
          reason: 'Matriz está arquivada ou inativa.',
          sourceEntity: 'Store',
          sourceId: matriz.id,
          correctionRoute: '/clientes/' + clientAccountId + '?tab=lojas',
        });
      } else {
        // Status EM_CONFIGURACAO ou ATIVA — ambas válidas para pré-ativação
        criticalChecks.push({
          code: 'HEADQUARTERS',
          label: 'Matriz cadastrada e validada no cadastro inicial',
          status: CHECK_STATUS.VALID,
          reason: 'Matriz válida com CNPJ, endereço e fuso horário definidos.',
          sourceEntity: 'Store',
          sourceId: matriz.id,
        });
      }
    }

    // === CHECK 2: Programa contratado configurado ===
    const validContract = contracts.find(c => PROGRAM_VALID_STATUSES.includes(c.status));
    const journeyWithProduct = encounters.find(e => e.product_id);
    const productIdSource = validContract?.product_id || journeyWithProduct?.product_id;
    const productVersionSource = validContract?.product_version || journeyWithProduct?.product_version;

    if (validContract && productIdSource) {
      criticalChecks.push({
        code: 'PROGRAM',
        label: 'Programa contratado configurado',
        status: CHECK_STATUS.VALID,
        reason: `Contrato vinculado: ${validContract.product_name || 'produto'} (v${productVersionSource || '?'}).`,
        sourceEntity: 'ClientContract',
        sourceId: validContract.id,
      });
    } else if (!validContract && journeyWithProduct && productIdSource) {
      // Jornada existe com produto mas sem contrato — inconsistência de vínculo
      criticalChecks.push({
        code: 'PROGRAM',
        label: 'Programa contratado configurado',
        status: CHECK_STATUS.VALID,
        reason: `Jornada gerada com produto ${productIdSource} (v${productVersionSource}). Contrato será reparado automaticamente.`,
        sourceEntity: 'JourneyEncounter',
        sourceId: journeyWithProduct.id,
        autoRepair: 'repairProgramAssignmentFromJourney',
      });
    } else {
      criticalChecks.push({
        code: 'PROGRAM',
        label: 'Programa contratado configurado',
        status: CHECK_STATUS.INVALID,
        reason: 'Nenhum programa contratado encontrado. Selecione o produto na Etapa 3 do onboarding.',
        sourceEntity: 'ClientContract',
        sourceId: null,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=jornada',
      });
    }

    // === CHECK 3: Jornada gerada ===
    if (encounters.length > 0) {
      criticalChecks.push({
        code: 'JOURNEY',
        label: 'Jornada gerada',
        status: CHECK_STATUS.VALID,
        reason: `${encounters.length} encontro(s) na jornada.`,
        sourceEntity: 'JourneyEncounter',
        sourceId: encounters[0]?.id,
      });
    } else {
      criticalChecks.push({
        code: 'JOURNEY',
        label: 'Jornada gerada',
        status: CHECK_STATUS.INVALID,
        reason: 'Nenhum encontro encontrado. Gere a jornada na Etapa 4 do onboarding.',
        sourceEntity: 'JourneyEncounter',
        sourceId: null,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=jornada',
      });
    }

    // === CHECK 4: Consultores atribuídos ===
    const encountersWithConsultant = encounters.filter(e => e.responsible_consultant_id);
    if (encounters.length > 0 && encountersWithConsultant.length === encounters.length) {
      criticalChecks.push({
        code: 'CONSULTANTS',
        label: 'Consultores atribuídos',
        status: CHECK_STATUS.VALID,
        reason: `${encountersWithConsultant.length} encontro(s) com consultor responsável.`,
        sourceEntity: 'JourneyEncounter',
        sourceId: null,
      });
    } else if (encountersWithConsultant.length > 0) {
      criticalChecks.push({
        code: 'CONSULTANTS',
        label: 'Consultores atribuídos',
        status: CHECK_STATUS.WARNING,
        reason: `${encountersWithConsultant.length} de ${encounters.length} encontros com consultor responsável.`,
        sourceEntity: 'JourneyEncounter',
        sourceId: null,
      });
    } else {
      criticalChecks.push({
        code: 'CONSULTANTS',
        label: 'Consultores atribuídos',
        status: CHECK_STATUS.INVALID,
        reason: 'Nenhum encontro com consultor responsável atribuído.',
        sourceEntity: 'JourneyEncounter',
        sourceId: null,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=jornada',
      });
    }

    // === CHECK 5: Dono Master cadastrado ===
    // Fonte única: resolveClientOwnerMaster — busca o usuário no filtro por client_account_id
    // E diretamente por ID (cobre usuário reutilizado cujo client_account_id não foi atualizado)
    const ownerMaster = await resolveClientOwnerMaster(clientAccountId);

    if (ownerMaster.status === 'VALID') {
      criticalChecks.push({
        code: 'OWNER_MASTER',
        label: 'Dono Master válido',
        status: CHECK_STATUS.VALID,
        reason: ownerMaster.isInvitePending
          ? `${ownerMaster.user.name} — Convite ainda não aceito.`
          : `${ownerMaster.user.name} — usuário ativo, perfil Dono e escopo global da empresa.`,
        sourceEntity: 'RoleGrant',
        sourceId: ownerMaster.ownerRoleGrant?.id,
      });
    } else if (ownerMaster.status === 'DUPLICATE_MASTER') {
      criticalChecks.push({
        code: 'OWNER_MASTER',
        label: 'Dono Master cadastrado',
        status: CHECK_STATUS.INVALID,
        reason: `Foram encontrados ${ownerMaster.grants.length} usuários marcados como Dono Master. Regularize a designação antes de ativar.`,
        sourceEntity: 'RoleGrant',
        sourceId: null,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=pessoas',
        autoRepair: 'repairClientOwnerMasterReference',
      });
    } else if (ownerMaster.status === 'WRONG_CLIENT' || ownerMaster.status === 'USER_NOT_FOUND') {
      criticalChecks.push({
        code: 'OWNER_MASTER',
        label: 'Vínculo do Dono Master inconsistente',
        status: CHECK_STATUS.INVALID,
        reason: 'A designação Master foi encontrada, mas sua referência não corresponde ao usuário ativo exibido em Pessoas e Acessos.',
        sourceEntity: 'RoleGrant',
        sourceId: ownerMaster.grant?.id,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=pessoas',
        autoRepair: 'repairClientOwnerMasterReference',
      });
    } else if (ownerMaster.status === 'USER_INACTIVE') {
      criticalChecks.push({
        code: 'OWNER_MASTER',
        label: 'Dono Master cadastrado',
        status: CHECK_STATUS.INVALID,
        reason: `${ownerMaster.user.name} possui designação Master, mas seu status de usuário é ${ownerMaster.user.status}.`,
        sourceEntity: 'RoleGrant',
        sourceId: ownerMaster.grant?.id,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=pessoas',
      });
    } else if (ownerMaster.status === 'OWNER_ROLE_MISSING') {
      criticalChecks.push({
        code: 'OWNER_MASTER',
        label: 'Dono Master cadastrado',
        status: CHECK_STATUS.INVALID,
        reason: 'Existem usuários com acesso de Dono, mas nenhum foi definido como Dono Master.',
        sourceEntity: 'RoleGrant',
        sourceId: null,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=pessoas',
      });
    } else {
      criticalChecks.push({
        code: 'OWNER_MASTER',
        label: 'Dono Master cadastrado',
        status: CHECK_STATUS.INVALID,
        reason: 'Nenhum Dono Master configurado para esta empresa.',
        sourceEntity: 'RoleGrant',
        sourceId: null,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=pessoas',
      });
    }

    // === CHECK 6: Responsável comercial definido ===
    if (client.commercial_owner_mx_id) {
      criticalChecks.push({
        code: 'COMMERCIAL_OWNER',
        label: 'Responsável comercial definido',
        status: CHECK_STATUS.VALID,
        reason: client.commercial_owner_mx || 'Definido.',
        sourceEntity: 'ClientAccount',
        sourceId: client.id,
      });
    } else {
      criticalChecks.push({
        code: 'COMMERCIAL_OWNER',
        label: 'Responsável comercial definido',
        status: CHECK_STATUS.INVALID,
        reason: 'Nenhum responsável comercial definido.',
        sourceEntity: 'ClientAccount',
        sourceId: client.id,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=configuracoes',
      });
    }

    // === CHECK 7: Responsável pela implantação definido ===
    if (client.implementation_owner_mx_id) {
      criticalChecks.push({
        code: 'IMPLEMENTATION_OWNER',
        label: 'Responsável pela implantação definido',
        status: CHECK_STATUS.VALID,
        reason: client.implementation_owner_mx || 'Definido.',
        sourceEntity: 'ClientAccount',
        sourceId: client.id,
      });
    } else {
      criticalChecks.push({
        code: 'IMPLEMENTATION_OWNER',
        label: 'Responsável pela implantação definido',
        status: CHECK_STATUS.INVALID,
        reason: 'Nenhum responsável pela implantação definido.',
        sourceEntity: 'ClientAccount',
        sourceId: client.id,
        correctionRoute: '/clientes/' + clientAccountId + '?tab=configuracoes',
      });
    }

    // === NON-BLOCKING CHECKS ===

    // Plano Estratégico e metas
    const publishedCycle = cycles.find(c => c.status === 'PUBLICADO');
    if (cycles.length === 0) {
      nonBlockingChecks.push({
        code: 'STRATEGIC_PLAN',
        label: 'Plano Estratégico e metas',
        status: CHECK_STATUS.WARNING,
        reason: 'Plano Estratégico ainda não criado. Ele poderá ser configurado após a ativação.',
        sourceEntity: 'StrategicPlanCycle',
      });
    } else if (!publishedCycle) {
      nonBlockingChecks.push({
        code: 'STRATEGIC_PLAN',
        label: 'Plano Estratégico e metas',
        status: CHECK_STATUS.WARNING,
        reason: 'Plano Estratégico criado, mas ainda sem versão publicada.',
        sourceEntity: 'StrategicPlanCycle',
      });
    } else {
      // Cycle is published — all non-archived monthly values in this cycle are published
      const cycleMonthlyValues = monthlyValues.filter(m => m.strategic_plan_cycle_id === publishedCycle.id);
      const activeMonthlyValues = cycleMonthlyValues.filter(m => m.status !== 'ARQUIVADO');
      if (activeMonthlyValues.length > 0) {
        nonBlockingChecks.push({
          code: 'STRATEGIC_PLAN',
          label: 'Plano Estratégico e metas',
          status: CHECK_STATUS.VALID,
          reason: `Metas cadastradas e publicadas: ${activeMonthlyValues.length} valores mensais (v${publishedCycle.version_number}).`,
          sourceEntity: 'StrategicPlanCycle',
          sourceId: publishedCycle.id,
        });
      } else {
        nonBlockingChecks.push({
          code: 'STRATEGIC_PLAN',
          label: 'Plano Estratégico e metas',
          status: CHECK_STATUS.WARNING,
          reason: 'Plano Estratégico publicado, mas sem metas cadastradas.',
          sourceEntity: 'StrategicPlanCycle',
          sourceId: publishedCycle.id,
        });
      }
    }

    // Encontros com modalidade A_DEFINIR
    const undefinedModalityEncounters = encounters.filter(e => e.modality === 'A_DEFINIR' && e.status !== 'CONCLUIDO');
    if (undefinedModalityEncounters.length > 0) {
      nonBlockingChecks.push({
        code: 'UNDEFINED_MODALITY',
        label: 'Encontros futuros com modalidade a definir',
        status: CHECK_STATUS.WARNING,
        reason: `${undefinedModalityEncounters.length} encontro(s) com modalidade "A definir".`,
        sourceEntity: 'JourneyEncounter',
      });
    }

    // Calendar e WhatsApp
    nonBlockingChecks.push({
      code: 'INTEGRATIONS',
      label: 'Calendar e WhatsApp não conectados',
      status: CHECK_STATUS.NOT_APPLICABLE,
      reason: 'Modo simulado ativo. Integrações podem ser configuradas após a ativação.',
      sourceEntity: null,
    });

    const blockingReasons = criticalChecks
      .filter(c => c.status === CHECK_STATUS.INVALID)
      .map(c => `${c.label}: ${c.reason}`);

    return {
      clientAccountId,
      evaluatedAt: new Date().toISOString(),
      criticalChecks,
      nonBlockingChecks,
      canActivate: criticalChecks.every(c => c.status === CHECK_STATUS.VALID || c.status === CHECK_STATUS.WARNING),
      blockingReasons,
      // Dados para o card do programa
      _programInfo: {
        productId: productIdSource,
        productVersion: productVersionSource,
        contractId: validContract?.id || null,
        journeyEncountersCount: encounters.length,
        responsibleConsultantName: encountersWithConsultant[0]?.responsible_consultant_name || null,
      },
    };
  } catch (error) {
    return {
      clientAccountId,
      evaluatedAt: new Date().toISOString(),
      criticalChecks: [],
      nonBlockingChecks: [],
      canActivate: false,
      blockingReasons: ['Erro técnico na avaliação: ' + (error.message || String(error))],
    };
  }
}