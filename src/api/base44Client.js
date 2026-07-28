import { supabase } from '@/lib/supabase';
import moment from 'moment';
import { resolveStoreId } from './resolveStoreId';
import { assertNotTerminalPresentation } from '@/features/carteira-clientes/lib/carteira-mappers';

// Helper to filter items in Javascript (MongoDB-like selector)
function matchQuery(row, filter) {
  if (!filter) return true;
  for (const key in filter) {
    const val = filter[key];
    const rowVal = row[key];
    if (typeof val === 'object' && val !== null) {
      if ('$gte' in val && !(rowVal >= val.$gte)) return false;
      if ('$lte' in val && !(rowVal <= val.$lte)) return false;
      if ('$gt' in val && !(rowVal > val.$gt)) return false;
      if ('$lt' in val && !(rowVal < val.$lt)) return false;
    } else {
      if (rowVal !== val) return false;
    }
  }
  return true;
}

// Helper to sort items
function sortRows(rows, order) {
  if (!order) return rows;
  const desc = order.startsWith('-');
  const key = desc ? order.slice(1) : order;
  return [...rows].sort((a, b) => {
    let valA = a[key];
    let valB = b[key];
    if (valA === undefined || valA === null) return desc ? 1 : -1;
    if (valB === undefined || valB === null) return desc ? -1 : 1;
    if (typeof valA === 'string') {
      return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    return desc ? valB - valA : valA - valB;
  });
}

function toCrmCanal(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'showroom') return 'showroom';
  if (normalized === 'internet') return 'internet';
  if (normalized === 'porta') return 'porta';
  return 'carteira';
}

function toCrmFinanciamento(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'aprovado') return 'aprovado';
  if (normalized === 'recusado') return 'recusado';
  return 'nao_aplica';
}

function toNumberValue(value) {
  if (typeof value === 'number') return value;
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const base44 = {
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      
      const { data: profile } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Perfil autenticado não encontrado.');

      return {
        id: user.id,
        email: user.email,
        full_name: profile.name || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || '',
        role: profile.role,
      };
    },
    logout: async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    }
  },

  analytics: {
    track: ({ eventName, properties }) => {
      console.log('[Analytics Track]', eventName, properties);
    }
  },

  entities: {
      UserProfile: {
        list: async () => {
          const me = await base44.auth.me();
          const { data: perf } = await supabase
            .from('vendedor_perfil')
          .select('*')
            .eq('seller_user_id', me.id)
            .maybeSingle();

          const { data: vinculos } = await supabase
            .from('vinculos_loja')
            .select('store_id')
            .eq('user_id', me.id)
            .eq('is_active', true)
            .limit(1);

          const storeId = perf?.loja_id || vinculos?.[0]?.store_id || null;
          const [{ data: planos }, { data: jornadas }] = await Promise.all([
            storeId
              ? supabase
                .from('remuneracao_planos')
                .select('id,cargo,salario_fixo,salario_variavel,beneficios,vigencia_inicio')
                .eq('loja_id', storeId)
                .order('cargo')
                .order('vigencia_inicio', { ascending: false })
              : { data: [] },
            storeId
              ? supabase
                .from('vendedor_perfil')
                .select('hora_entrada,hora_saida')
                .eq('loja_id', storeId)
                .not('hora_entrada', 'is', null)
                .not('hora_saida', 'is', null)
              : { data: [] },
          ]);

          const currentWorkStart = perf?.hora_entrada ? perf.hora_entrada.slice(0, 5) : '';
          const currentWorkEnd = perf?.hora_saida ? perf.hora_saida.slice(0, 5) : '';
          const scheduleByKey = new Map();
          [...(jornadas || []), { hora_entrada: currentWorkStart, hora_saida: currentWorkEnd }].forEach((jornada) => {
            const workStart = jornada?.hora_entrada ? jornada.hora_entrada.slice(0, 5) : '';
            const workEnd = jornada?.hora_saida ? jornada.hora_saida.slice(0, 5) : '';
            if (!workStart || !workEnd) return;
            const key = `${workStart}-${workEnd}`;
            scheduleByKey.set(key, { id: key, label: `${workStart} - ${workEnd}`, work_start: workStart, work_end: workEnd });
          });

          const availablePlans = (planos || []).map((plano) => ({
            id: plano.id,
            cargo: plano.cargo,
            label: `${plano.cargo} - R$ ${Number(plano.salario_fixo || 0).toLocaleString('pt-BR')} fixo`,
            salary_goal: Number(plano.salario_fixo || 0) + Number(plano.salario_variavel || 0) + Number(plano.beneficios || 0),
            commission_per_unit: Number(plano.salario_variavel || 0),
          }));
          const selectedPlan = availablePlans.find((plano) => plano.id === perf?.remuneracao_plano_id)
            || availablePlans.find((plano) => plano.cargo?.toLowerCase() === perf?.cargo_atual?.toLowerCase());

          return [{
            id: perf?.id || me.id,
            full_name: me.full_name,
            phone: me.phone,
            birth_date: '',
            dealership: storeId || '',
            brand: '',
            role: selectedPlan?.cargo || perf?.cargo_atual || 'Vendedor',
            remuneracao_plano_id: perf?.remuneracao_plano_id || selectedPlan?.id || '',
            available_plans: availablePlans,
            experience_years: perf?.tempo_mercado_anos || 0,
            work_schedule_id: currentWorkStart && currentWorkEnd
              ? `${currentWorkStart}-${currentWorkEnd}`
              : '',
            work_schedule_options: Array.from(scheduleByKey.values()),
            work_start: currentWorkStart,
            work_end: currentWorkEnd,
            monthly_goal: null,
            commission_per_unit: selectedPlan?.commission_per_unit ?? null,
            avg_sales_year: 0,
            salary_goal: selectedPlan?.salary_goal || perf?.pretensao_min || 0,
            education: '',
            job_interest: perf?.carreira_interesse === 'disponivel' ? 'Disponível para o mercado' : perf?.carreira_interesse === 'confidencial' ? 'Confidencial' : 'Não',
            avatar_url: me.avatar_url
          }];
        },
        filter: async (filter = {}, order, limit) => {
          const me = await base44.auth.me();
          const { created_by_id: requestedCreatorId, ...criteria } = filter;
          if (requestedCreatorId && requestedCreatorId !== me.id) return [];
          const rows = await base44.entities.UserProfile.list();
          const filtered = rows.filter((row) => matchQuery(row, criteria));
          const sorted = sortRows(filtered, order);
          return Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
        },
        update: async (id, data) => {
          const me = await base44.auth.me();
          const { data: vinculos } = await supabase
            .from('vinculos_loja')
          .select('store_id')
          .eq('user_id', me.id)
            .eq('is_active', true)
            .limit(1);
          const storeId = data.dealership || vinculos?.[0]?.store_id || null;
          const cargoAtual = data.role || 'Vendedor';
          let plano = null;
          if (storeId && data.remuneracao_plano_id) {
            const { data: selectedPlano } = await supabase
              .from('remuneracao_planos')
              .select('id,cargo')
              .eq('loja_id', storeId)
              .eq('id', data.remuneracao_plano_id)
              .maybeSingle();
            plano = selectedPlano;
          }
          if (!plano && storeId) {
            const { data: matchedPlano } = await supabase
              .from('remuneracao_planos')
              .select('id,cargo')
              .eq('loja_id', storeId)
              .ilike('cargo', cargoAtual)
              .lte('vigencia_inicio', new Date().toISOString().slice(0, 10))
              .order('vigencia_inicio', { ascending: false })
              .limit(1)
              .maybeSingle();
            plano = matchedPlano;
          }

        // Update usuarios
        if (data.full_name || data.phone || data.avatar_url) {
          await supabase.from('usuarios').update({
            name: data.full_name,
            phone: data.phone,
            avatar_url: data.avatar_url
          }).eq('id', me.id);
        }

        // Update vendedor_perfil
        const profilePayload = {
          seller_user_id: me.id,
          loja_id: storeId,
          hora_entrada: data.work_start ? `${data.work_start}:00` : null,
          hora_saida: data.work_end ? `${data.work_end}:00` : null,
          tempo_mercado_anos: data.experience_years,
          cargo_atual: plano?.cargo || cargoAtual,
          remuneracao_plano_id: plano?.id || null,
          carreira_interesse: data.job_interest === 'Disponível para o mercado' ? 'disponivel' : data.job_interest === 'Confidencial' ? 'confidencial' : 'nao',
          pretensao_min: data.salary_goal,
        };

        let { data: upserted, error: upsertError } = await supabase
          .from('vendedor_perfil')
          .upsert(profilePayload, { onConflict: 'seller_user_id' })
          .select()
          .single();

        if (upsertError?.message?.includes('remuneracao_plano_id')) {
          const { remuneracao_plano_id: _remuneracaoPlanoId, ...legacyPayload } = profilePayload;
          const retry = await supabase
            .from('vendedor_perfil')
            .upsert(legacyPayload, { onConflict: 'seller_user_id' })
            .select()
            .single();
          upserted = retry.data;
          upsertError = retry.error;
        }
        if (upsertError) throw upsertError;

        return upserted;
      },
      create: async (data) => {
        return base44.entities.UserProfile.update(null, data);
      }
    },

    DailyClose: {
      filter: async (filter, order, limit) => {
        const me = await base44.auth.me();
        const { data: rows } = await supabase
          .from('lancamentos_diarios')
          .select('*')
          .eq('seller_user_id', me.id);

        const mapped = (rows || []).map(r => ({
          id: r.id,
          date: r.reference_date || r.date,
          vendedor_id: r.seller_user_id,
          loja_id: r.store_id,
          leads_carteira: r.leads || r.leads_prev_day || 0,
          leads_internet: r.leads_net || r.leads_net_prev_day || 0,
          atendimentos_showroom: r.visit_prev_day || r.visitas || 0,
          atendimentos_carteira: r.vnd_cart_prev_day || r.vnd_cart || 0,
          atendimentos_internet: r.vnd_net_prev_day || r.vnd_net || 0,
          agendamentos_carteira: r.agd_cart_today || r.agd_cart_prev_day || 0,
          agendamentos_internet: r.agd_net_today || r.agd_net_prev_day || 0,
          status_fechamento: r.submission_status === 'on_time' || r.submission_status === 'late' ? 'Fechado' : 'Aberto',
          finalizado: r.submission_status === 'on_time' || r.submission_status === 'late',
          data_hora_finalizacao: r.submitted_at,
          observacao_geral: r.note,
          status_regularizacao: r.submission_status === 'late' ? 'Aprovado' : null
        }));

        const filtered = mapped.filter(r => matchQuery(r, filter));
        const sorted = sortRows(filtered, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      create: async (data) => {
        const me = await base44.auth.me();
        
        const storeId = await resolveStoreId(supabase, me.id);

        const shouldFinalize = data.finalizado === true;
        const payload = {
          metric_scope: 'daily',
          store_id: storeId,
          seller_user_id: me.id,
          reference_date: data.date,
          date: data.date,
          leads: data.leads_carteira || 0,
          leads_prev_day: data.leads_carteira || 0,
          leads_net_prev_day: data.leads_internet || 0,
          visit_prev_day: data.atendimentos_showroom || 0,
          visitas: data.atendimentos_showroom || 0,
          vnd_cart_prev_day: data.atendimentos_carteira || 0,
          vnd_cart: data.atendimentos_carteira || 0,
          vnd_net_prev_day: data.atendimentos_internet || 0,
          vnd_net: data.atendimentos_internet || 0,
          agd_cart_today: data.agendamentos_carteira || 0,
          agd_cart_prev_day: data.agendamentos_carteira || 0,
          agd_net_today: data.agendamentos_internet || 0,
          agd_net_prev_day: data.agendamentos_internet || 0,
          submission_status: shouldFinalize ? 'on_time' : 'draft',
          submitted_at: shouldFinalize ? (data.data_hora_finalizacao || new Date().toISOString()) : null,
          note: data.observacao_geral || ''
        };

        const { data: created, error } = await supabase
          .rpc('submit_checkin', { p_payload: payload });

        if (error) throw error;
        if (created?.ok === false) {
          throw new Error(created.error || 'Não foi possível registrar o fechamento diário.');
        }
        return created;
      },
      update: async (id, data) => {
        const me = await base44.auth.me();
        const { data: existing, error } = await supabase
          .from('lancamentos_diarios')
          .select('*')
          .eq('id', id)
          .eq('seller_user_id', me.id)
          .maybeSingle();

        if (error) throw error;
        if (!existing) throw new Error('Fechamento diário não encontrado.');

        const existingFinalizado = existing.submission_status === 'on_time' || existing.submission_status === 'late';
        return base44.entities.DailyClose.create({
          date: existing.reference_date || existing.date,
          leads_carteira: existing.leads_prev_day ?? existing.leads ?? 0,
          leads_internet: existing.leads_net_prev_day ?? existing.leads_net ?? 0,
          atendimentos_showroom: existing.visit_prev_day ?? existing.visitas ?? 0,
          atendimentos_carteira: existing.vnd_cart_prev_day ?? existing.vnd_cart ?? 0,
          atendimentos_internet: existing.vnd_net_prev_day ?? existing.vnd_net ?? 0,
          agendamentos_carteira: existing.agd_cart_today ?? existing.agd_cart_prev_day ?? existing.agd_cart ?? 0,
          agendamentos_internet: existing.agd_net_today ?? existing.agd_net_prev_day ?? existing.agd_net ?? 0,
          observacao_geral: existing.note || '',
          ...data,
          id,
          finalizado: data.finalizado === undefined ? existingFinalizado : data.finalizado,
          data_hora_finalizacao: data.data_hora_finalizacao || existing.submitted_at || undefined,
        });
      }
    },

    CarteiraCliente: {
      filter: async (filter, order, limit) => {
        const me = await base44.auth.me();
        let query = supabase
          .from('clientes')
          .select('*, oportunidades(*), agendamentos(*)');

        if (me.role === 'vendedor') {
          query = query.eq('seller_user_id', me.id);
        } else if (me.role === 'gerente') {
          const storeId = await resolveStoreId(supabase, me.id);
          if (storeId) {
            query = query.eq('loja_id', storeId);
          }
        }

        if (filter?.seller_user_id) {
          query = query.eq('seller_user_id', filter.seller_user_id);
        } else if (filter?.vendedor_id) {
          query = query.eq('seller_user_id', filter.vendedor_id);
        }

        const { data: clients } = await query;

        const mapped = (clients || []).map(r => {
          const op = r.oportunidades?.[0] || {};
          const agd = r.agendamentos?.[0] || {};

          // `cancelada` é terminal próprio e precisa ser checada antes de
          // 'ganho': a oportunidade cancelada tem closed_at de uma venda que
          // existiu, e sem este ramo caía em 'Em Negociação'.
          const isCancelada = op.etapa === 'cancelada' || r.situacao_atual === 'Venda cancelada' || r.status_comercial === 'Cancelada';
          const isGanho = !isCancelada && (op.etapa === 'ganho' || r.situacao_atual === 'Venda realizada' || r.status_comercial === 'Vendido' || r.status === 'ganho');
          const isPerdido = !isCancelada && (op.etapa === 'perdido' || r.situacao_atual === 'Venda perdida' || r.status === 'inativo');

          const situacaoMapped = isCancelada
            ? 'Venda cancelada'
            : isGanho
            ? 'Venda realizada'
            : isPerdido
            ? 'Venda perdida'
            : op.etapa || r.situacao_atual || 'prospeccao';

          const statusComercialMapped = isCancelada
            ? 'Cancelada'
            : isGanho
            ? 'Vendido'
            : isPerdido
            ? 'Perdido'
            : 'Em Negociação';

          return {
            id: r.id,
            vendedor_id: r.seller_user_id,
            loja_id: r.loja_id,
            nome: r.nome,
            telefone: r.telefone,
            whatsapp: r.telefone,
            data_nascimento: null,
            canal_comercial: r.canal_origem || 'Carteira',
            canal_entrada: r.canal_origem || 'Carteira',
            canal_venda: op.canal || r.canal_origem || 'Carteira',
            status_comercial: statusComercialMapped,
            situacao_atual: situacaoMapped,
            veiculo_interesse: op.veiculo_interesse || '',
            valor_negociado: op.valor_negociado || 0,
            sinal: op.sinal || 0,
            financiamento: op.financiamento || 'Não se aplica',
            carro_avaliado: op.carro_avaliado ? 'Sim' : 'Não',
            data_venda: op.closed_at || r.updated_at,
            valor_venda: op.valor_negociado || 0,
            veiculo_comprado: op.veiculo_interesse || '',
            ativo: r.status !== 'inativo',
            visita_agendada_em: agd.data_hora || r.proxima_acao_em,
            origem_detalhada: r.observacoes || '',
            created_date: r.created_at,
            updated_date: r.updated_at,
            
            // Base44 translated keys
            name: r.nome,
            phone: r.telefone,
            sale_status: isGanho ? 'Sim' : isPerdido ? 'Não' : 'Em Negociação',
            appointment_datetime: agd.data_hora || r.proxima_acao_em,
            vehicle_sought: op.veiculo_interesse || '',
            birth_date: null,
            dataAniversario: null,
            momento: situacaoMapped
          };
        });

        const filtered = mapped.filter(r => matchQuery(r, filter));
        const sorted = sortRows(filtered, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      create: async (data) => {
        const me = await base44.auth.me();
        
        const storeId = await resolveStoreId(supabase, me.id);

        const canalOrigem = toCrmCanal(data.canal_comercial || data.canal_entrada);

        const { data: client, error: clErr } = await supabase
          .from('clientes')
          .insert({
            nome: data.nome,
            telefone: data.telefone || data.whatsapp || '',
            canal_origem: canalOrigem,
            status: data.ativo === false ? 'inativo' : 'oportunidade',
            loja_id: storeId,
            seller_user_id: me.id,
            observacoes: data.origem_detalhada || ''
          })
          .select()
          .single();

        if (clErr) throw clErr;

        const { data: op, error: opErr } = await supabase
          .from('oportunidades')
          .insert({
            cliente_id: client.id,
            veiculo_interesse: data.veiculo_interesse || '',
            valor_negociado: toNumberValue(data.valor_negociado),
            etapa: data.status_comercial === 'Vendido' ? 'ganho' : data.status_comercial === 'Perdido' ? 'perdido' : 'prospeccao',
            loja_id: storeId,
            seller_user_id: me.id,
            sinal: toNumberValue(data.sinal),
            financiamento: toCrmFinanciamento(data.financiamento),
            carro_avaliado: data.carro_avaliado === 'Sim'
          })
          .select()
          .single();

        if (opErr) throw opErr;

        if (data.visita_agendada_em) {
          const { error: agErr } = await supabase.from('agendamentos').insert({
            cliente_id: client.id,
            oportunidade_id: op.id,
            data_hora: data.visita_agendada_em,
            loja_id: storeId,
            seller_user_id: me.id,
            tipo: 'visita',
            status: 'confirmado',
            proxima_acao: data.modalidade || 'Visita agendada',
            observacoes: data.observacoes || data.observacao || data.origem_detalhada || ''
          });
          if (agErr) throw agErr;
        }

        return { ...data, id: client.id };
      },
      update: async (id, data) => {
        const me = await base44.auth.me();
        
        // Update client
        const clPayload = {};
        if (data.nome !== undefined) clPayload.nome = data.nome;
        if (data.telefone !== undefined) clPayload.telefone = data.telefone;
        if (data.ativo !== undefined) clPayload.status = data.ativo === false ? 'inativo' : 'oportunidade';
        if (data.origem_detalhada !== undefined) clPayload.observacoes = data.origem_detalhada;
        
        if (Object.keys(clPayload).length > 0) {
          await supabase.from('clientes').update(clPayload).eq('id', id);
        }

        // Update opportunity
        const opPayload = {};
        if (data.veiculo_interesse !== undefined) opPayload.veiculo_interesse = data.veiculo_interesse;
        if (data.valor_negociado !== undefined) opPayload.valor_negociado = toNumberValue(data.valor_negociado);
        // Sem esta guarda, salvar a ficha de uma venda cancelada derivava
        // etapa='prospeccao' e reabria a venda, apagando o estado terminal.
        assertNotTerminalPresentation(data.situacao_atual, data.status_comercial);
        if (data.status_comercial !== undefined) {
          opPayload.etapa = data.status_comercial === 'Vendido' ? 'ganho' : data.status_comercial === 'Perdido' ? 'perdido' : 'prospeccao';
          if (data.status_comercial === 'Vendido') opPayload.closed_at = new Date().toISOString();
        }
        if (data.situacao_atual !== undefined) opPayload.etapa = data.situacao_atual;
        if (data.sinal !== undefined) opPayload.sinal = toNumberValue(data.sinal);
        if (data.financiamento !== undefined) opPayload.financiamento = toCrmFinanciamento(data.financiamento);
        if (data.carro_avaliado !== undefined) opPayload.carro_avaliado = data.carro_avaliado === 'Sim';

        if (Object.keys(opPayload).length > 0) {
          await supabase.from('oportunidades').update(opPayload).eq('cliente_id', id);
        }

        // Handle appointment
        if (data.visita_agendada_em) {
          const { data: op } = await supabase.from('oportunidades').select('id, loja_id').eq('cliente_id', id).maybeSingle();
          if (op) {
            await supabase.from('agendamentos').upsert({
              cliente_id: id,
              oportunidade_id: op.id,
              data_hora: data.visita_agendada_em,
              loja_id: op.loja_id,
              seller_user_id: me.id,
              tipo: 'visita',
              status: 'confirmado'
            }, { onConflict: 'cliente_id' });
          }
        }

        return { ...data, id };
      },
      get: async (id) => {
        const list = await base44.entities.CarteiraCliente.filter({ id });
        return list[0] || null;
      }
    },

    Client: {
      filter: async (filter, order, limit) => base44.entities.CarteiraCliente.filter(filter, order, limit),
      create: async (data) => base44.entities.CarteiraCliente.create(data),
      update: async (id, data) => base44.entities.CarteiraCliente.update(id, data),
      get: async (id) => base44.entities.CarteiraCliente.get(id),
      delete: async (id) => {
        await supabase.from('clientes').delete().eq('id', id);
        return { success: true };
      }
    },

    CarteiraHistorico: {
      filter: async () => [],
      create: async (data) => ({
        id: `hist_${Date.now()}`,
        created_date: new Date().toISOString(),
        ...data,
      }),
    },

    ExecutionOpportunity: {
      filter: async (filter, order, limit) => {
        const me = await base44.auth.me().catch(() => ({ id: '' }));
        if (!me?.id) return [];
        const { data: rows, error } = await supabase
          .from('agendamentos')
          .select('*, clientes(*)')
          .eq('seller_user_id', me.id)
          .eq('tipo', 'negociacao');

        if (error) {
          console.error('Error fetching execution opportunities:', error);
          return [];
        }

        const mapped = (rows || []).map(r => {
          let actStatus = 'Pendente';
          if (r.status === 'compareceu') actStatus = 'Resolvida';
          else if (r.status === 'nao_compareceu') actStatus = 'Cancelada';

          return {
            id: r.id,
            cliente_id: r.cliente_id,
            vendedor_id: r.seller_user_id,
            tipo: 'Venda Perdida',
            titulo: r.proxima_acao || 'Oportunidade de Execução',
            descricao: r.observacoes || '',
            objetivo: 'Ação Corretiva',
            data_hora_execucao: r.data_hora,
            prioridade: 5,
            status: actStatus,
            ativo: actStatus === 'Pendente'
          };
        });

        const filtered = mapped.filter(r => matchQuery(r, filter));
        const sorted = sortRows(filtered, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      create: async (data) => {
        const me = await base44.auth.me();
        const storeId = await resolveStoreId(supabase, me.id);
        if (!storeId) throw new Error('Você não possui vínculo ativo com nenhuma loja. Fale com seu gerente antes de criar atividades.');

        let dbStatus = 'confirmado';
        if (data.status === 'Resolvida') dbStatus = 'compareceu';
        else if (data.status === 'Cancelada') dbStatus = 'nao_compareceu';

        const { data: created, error } = await supabase
          .from('agendamentos')
          .insert({
            cliente_id: data.cliente_id || null,
            loja_id: storeId,
            seller_user_id: me.id,
            data_hora: data.data_hora_execucao || new Date().toISOString(),
            tipo: 'negociacao',
            status: dbStatus,
            proxima_acao: data.titulo || '',
            observacoes: data.descricao || ''
          })
          .select('*, clientes(*)')
          .single();

        if (error) throw error;

        return {
          id: created.id,
          cliente_id: created.cliente_id,
          vendedor_id: created.seller_user_id,
          tipo: data.tipo || 'Venda Perdida',
          titulo: created.proxima_acao || '',
          descricao: created.observacoes || '',
          objetivo: data.objetivo || 'Ação Corretiva',
          data_hora_execucao: created.data_hora,
          prioridade: data.prioridade || 5,
          status: data.status || 'Pendente',
          ativo: true
        };
      },
      update: async (id, data) => {
        const payload = {};
        if (data.status !== undefined) {
          if (data.status === 'Resolvida') payload.status = 'compareceu';
          else if (data.status === 'Cancelada') payload.status = 'nao_compareceu';
          else payload.status = 'confirmado';
        }
        if (data.titulo !== undefined) payload.proxima_acao = data.titulo;
        if (data.descricao !== undefined) payload.observacoes = data.descricao;
        if (data.data_hora_execucao !== undefined) payload.data_hora = data.data_hora_execucao;

        const { data: updated, error } = await supabase
          .from('agendamentos')
          .update(payload)
          .eq('id', id)
          .select('*, clientes(*)')
          .single();

        if (error) throw error;

        let actStatus = 'Pendente';
        if (updated.status === 'compareceu') actStatus = 'Resolvida';
        else if (updated.status === 'nao_compareceu') actStatus = 'Cancelada';

        return {
          id: updated.id,
          cliente_id: updated.cliente_id,
          vendedor_id: updated.seller_user_id,
          tipo: data.tipo || 'Venda Perdida',
          titulo: updated.proxima_acao || '',
          descricao: updated.observacoes || '',
          objetivo: data.objetivo || 'Ação Corretiva',
          data_hora_execucao: updated.data_hora,
          prioridade: data.prioridade || 5,
          status: actStatus,
          ativo: actStatus === 'Pendente'
        };
      }
    },

    AtividadeExecucao: {
      filter: async (filter, order, limit) => {
        const me = await base44.auth.me().catch(() => ({ id: '' }));
        if (!me?.id) return [];
        const { data: rows, error } = await supabase
          .from('agendamentos')
          .select('*, clientes(*)')
          .eq('seller_user_id', me.id);

        if (error) {
          console.error('Error fetching activities:', error);
          return [];
        }

        const mapped = (rows || []).map(r => {
          let activityType = r.tipo;
          if (activityType === 'visita') activityType = 'agendamento';
          
          let actStatus = 'Pendente';
          if (r.status === 'compareceu') actStatus = 'Resolvida';
          else if (r.status === 'nao_compareceu') actStatus = 'Cancelada';

          return {
            id: r.id,
            cliente_id: r.cliente_id,
            vendedor_id: r.seller_user_id,
            loja_id: r.loja_id,
            tipo_atividade: activityType,
            titulo: r.proxima_acao || '',
            descricao: r.observacoes || '',
            objetivo: 'Atendimento',
            data_execucao: moment(r.data_hora).format('YYYY-MM-DD'),
            data_hora_execucao: r.data_hora,
            status_atividade: actStatus,
            prioridade: 5,
            nome_cliente_snapshot: r.clientes?.nome || '',
            telefone_snapshot: r.clientes?.telefone || '',
            veiculo_snapshot: '',
            ativo: actStatus === 'Pendente'
          };
        });

        const filtered = mapped.filter(r => matchQuery(r, filter));
        const sorted = sortRows(filtered, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      create: async (data) => {
        const me = await base44.auth.me();
        const sellerId = data.vendedor_id || me.id;
        const storeId = data.loja_id || await resolveStoreId(supabase, sellerId);
        if (!storeId) throw new Error('Vendedor sem vínculo ativo com loja — não é possível registrar a atividade.');

        let dbTipo = data.tipo_atividade;
        if (dbTipo === 'agendamento') dbTipo = 'visita';

        let dbStatus = 'aguardando';
        if (data.status_atividade === 'Resolvida') dbStatus = 'compareceu';
        else if (data.status_atividade === 'Pendente') dbStatus = 'confirmado';

        const { data: created, error } = await supabase
          .from('agendamentos')
          .insert({
            cliente_id: data.cliente_id || null,
            oportunidade_id: data.oportunidade_id || null,
            loja_id: storeId,
            seller_user_id: sellerId,
            data_hora: data.data_hora_execucao || new Date().toISOString(),
            tipo: dbTipo,
            status: dbStatus,
            proxima_acao: data.titulo || '',
            observacoes: data.descricao || ''
          })
          .select('*, clientes(*)')
          .single();

        if (error) throw error;

        return {
          id: created.id,
          cliente_id: created.cliente_id,
          vendedor_id: created.seller_user_id,
          loja_id: created.loja_id,
          tipo_atividade: data.tipo_atividade,
          titulo: created.proxima_acao || '',
          descricao: created.observacoes || '',
          objetivo: data.objetivo || '',
          data_execucao: moment(created.data_hora).format('YYYY-MM-DD'),
          data_hora_execucao: created.data_hora,
          status_atividade: data.status_atividade,
          prioridade: data.prioridade || 5,
          nome_cliente_snapshot: created.clientes?.nome || '',
          telefone_snapshot: created.clientes?.telefone || '',
          veiculo_snapshot: data.veiculo_snapshot || '',
          ativo: data.ativo !== undefined ? data.ativo : true
        };
      },
      update: async (id, data) => {
        const payload = {};
        if (data.status_atividade !== undefined) {
          if (data.status_atividade === 'Resolvida') payload.status = 'compareceu';
          else if (data.status_atividade === 'Cancelada') payload.status = 'nao_compareceu';
          else payload.status = 'confirmado';
        }
        if (data.titulo !== undefined) payload.proxima_acao = data.titulo;
        if (data.descricao !== undefined) payload.observacoes = data.descricao;
        if (data.data_hora_execucao !== undefined) payload.data_hora = data.data_hora_execucao;

        const { data: updated, error } = await supabase
          .from('agendamentos')
          .update(payload)
          .eq('id', id)
          .select('*, clientes(*)')
          .single();

        if (error) throw error;

        let activityType = updated.tipo;
        if (activityType === 'visita') activityType = 'agendamento';
        
        let actStatus = 'Pendente';
        if (updated.status === 'compareceu') actStatus = 'Resolvida';
        else if (updated.status === 'nao_compareceu') actStatus = 'Cancelada';

        return {
          id: updated.id,
          cliente_id: updated.cliente_id,
          vendedor_id: updated.seller_user_id,
          loja_id: updated.loja_id,
          tipo_atividade: activityType,
          titulo: updated.proxima_acao || '',
          descricao: updated.observacoes || '',
          objetivo: data.objetivo || '',
          data_execucao: moment(updated.data_hora).format('YYYY-MM-DD'),
          data_hora_execucao: updated.data_hora,
          status_atividade: actStatus,
          prioridade: data.prioridade || 5,
          nome_cliente_snapshot: updated.clientes?.nome || '',
          telefone_snapshot: updated.clientes?.telefone || '',
          veiculo_snapshot: data.veiculo_snapshot || '',
          ativo: actStatus === 'Pendente'
        };
      }
    },

    LiberacaoFechamento: {
      filter: async (filter) => {
        const me = await base44.auth.me();
        const { data: rows } = await supabase
          .from('fechamento_liberacoes')
          .select('*')
          .eq('vendedor_id', me.id);

        const mapped = (rows || []).map(r => ({
          id: r.id,
          vendedor_id: r.vendedor_id,
          data_fechamento: r.data_fechamento,
          status_solicitacao: r.status === 'Liberado' ? 'Liberado' : 'Solicitado',
          status: r.status
        }));
        return mapped.filter(r => matchQuery(r, filter));
      },
      create: async (data) => {
        const me = await base44.auth.me();
        
        // Fetch active store for vendor
        const { data: vinculos } = await supabase
          .from('vinculos_loja')
          .select('store_id')
          .eq('user_id', me.id)
          .eq('is_active', true)
          .limit(1);
        const storeId = vinculos?.[0]?.store_id;

        const { data: created, error } = await supabase
          .from('fechamento_liberacoes')
          .insert({
            vendedor_id: me.id,
            store_id: storeId,
            data_fechamento: data.data_fechamento,
            status: 'Solicitado',
            token_expira_em: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            token_hash: Math.random().toString(36).slice(2)
          })
          .select()
          .single();

        if (error) throw error;
        return {
          id: created.id,
          vendedor_id: created.vendedor_id,
          data_fechamento: created.data_fechamento,
          status_solicitacao: 'Solicitado',
          status: 'Solicitado'
        };
      }
    },

    RegularizacaoFechamento: {
      filter: async (filter) => {
        const me = await base44.auth.me();
        const { data: rows, error } = await supabase
          .from('regularizacao_fechamento')
          .select('*')
          .eq('vendedor_id', me.id);
        if (error) { console.error('Error fetching regularizacoes:', error); return []; }
        return (rows || []).filter(r => matchQuery(r, filter));
      },
      create: async (data) => {
        const me = await base44.auth.me();
        const storeId = await resolveStoreId(supabase, me.id);
        if (!storeId) throw new Error('Você não possui vínculo ativo com nenhuma loja.');

        const { data: created, error } = await supabase
          .from('regularizacao_fechamento')
          .insert({
            loja_id: storeId,
            vendedor_id: me.id,
            vendedor_nome: data.vendedor_nome || me.full_name || '',
            data_competencia: data.data_competencia,
            data_hora_envio: data.data_hora_envio || new Date().toISOString(),
            status_solicitacao: 'Pendente',
            tipo_solicitacao: data.tipo_solicitacao || 'Regularização de Fechamento',
            contabilizar_no_sistema: data.contabilizar_no_sistema ?? false,
            regularizado_fora_do_prazo: data.regularizado_fora_do_prazo ?? true,
            enviado_para_aprovacao: data.enviado_para_aprovacao ?? true,
            pontuacao_disciplina_calculada: data.pontuacao_disciplina_calculada ?? null,
            pontuacao_disciplina_com_penalizacao: data.pontuacao_disciplina_com_penalizacao ?? null,
            leads_carteira: data.leads_carteira || 0,
            leads_internet: data.leads_internet || 0,
            atendimentos_showroom: data.atendimentos_showroom || 0,
            atendimentos_carteira: data.atendimentos_carteira || 0,
            atendimentos_internet: data.atendimentos_internet || 0,
            agendamentos_carteira: data.agendamentos_carteira || 0,
            agendamentos_internet: data.agendamentos_internet || 0,
          })
          .select()
          .single();

        if (error) throw error;
        return created;
      },
      update: async (id, data) => {
        const payload = {};
        ['leads_carteira', 'leads_internet', 'atendimentos_showroom', 'atendimentos_carteira',
         'atendimentos_internet', 'agendamentos_carteira', 'agendamentos_internet',
         'pontuacao_disciplina_calculada', 'pontuacao_disciplina_com_penalizacao',
         'data_hora_envio', 'status_solicitacao', 'motivo_recusa'].forEach(key => {
          if (data[key] !== undefined) payload[key] = data[key];
        });
        // Reenvio após recusa volta para "Pendente"
        if (data.status_solicitacao === undefined) payload.status_solicitacao = 'Pendente';

        const { data: updated, error } = await supabase
          .from('regularizacao_fechamento')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      }
    },

    D1AuditLog: {
      create: async (data) => {
        const { data: created, error } = await supabase
          .from('d1_audit_log')
          .insert({
            usuario_id: data.usuario_id,
            usuario_nome: data.usuario_nome || '',
            fechamento_id: data.fechamento_id || null,
            cliente_id: data.cliente_id || '',
            data_hora_alteracao: data.data_hora_alteracao || new Date().toISOString(),
            tipo_alteracao: data.tipo_alteracao,
            valor_anterior: data.valor_anterior || '',
            valor_novo: data.valor_novo || '',
          })
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },

    PDI: {
      list: async () => {
        const me = await base44.auth.me();
        const { data: rows } = await supabase
          .from('pdis')
          .select('*')
          .eq('seller_id', me.id)
          .order('created_at', { ascending: false });

        return (rows || []).map(r => ({
          id: r.id,
          short_term_goal: r.meta_6m || '',
          medium_term_goal: r.meta_12m || '',
          long_term_goal: r.meta_24m || '',
          tech_planejamento: r.comp_organizacao ?? null,
          tech_atendimento: r.comp_demonstracao ?? null,
          tech_agendamento: r.comp_negociacao ?? null,
          tech_fechamento: r.comp_fechamento ?? null,
          tech_carteira: r.comp_crm ?? null,
          tech_midias: r.comp_digital ?? null,
          tech_prospeccao: r.comp_prospeccao ?? null,
          tech_avaliacao: r.comp_abordagem ?? null,
          tech_financiamentos: r.comp_negociacao ?? null,
          tech_processos: r.comp_disciplina ?? null,
          behav_pontualidade: r.comp_disciplina ?? null,
          behav_urgencia: r.comp_disciplina ?? null,
          behav_iniciativa: r.comp_prospeccao ?? null,
          behav_organizacao: r.comp_organizacao ?? null,
          behav_lideranca: r.comp_produto ?? null,
          behav_relacionamento: r.comp_crm ?? null,
          behav_persistencia: r.comp_negociacao ?? null,
          behav_resiliencia: r.comp_negociacao ?? null
        }));
      }
    },

    Feedback: {
      filter: async (filter) => {
        const me = await base44.auth.me();
        const { data: rows } = await supabase
          .from('devolutivas')
          .select('*')
          .eq('seller_id', me.id);

        const mapped = (rows || []).map(r => ({
          id: r.id,
          // `devolutivas` não tem categoria Positivo/Desenvolvimento — cada registro
          // pode ter pontos positivos e de atenção ao mesmo tempo. `caso_motivo` é
          // texto livre do caso, nunca um desses dois rótulos; usar como "type"
          // fazia "Positivos" ficar sempre ~0 no card de estatística.
          hasPositives: Boolean((r.positives || '').trim()),
          hasAttentionPoints: Boolean((r.attention_points || '').trim()),
          competency: r.action || 'Atendimento',
          message: r.notes || r.attention_points || r.positives || '',
          responsible: 'Gestor Comercial',
          acknowledged: r.acknowledged || false,
          user_comment: r.seller_comment || '',
          acknowledged_date: r.acknowledged_at
        }));

        return mapped.filter(r => matchQuery(r, filter));
      },
      list: async (order, limit) => {
        const list = await base44.entities.Feedback.filter(null);
        const sorted = sortRows(list, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      update: async (id, data) => {
        const payload = {};
        if (data.acknowledged !== undefined) payload.acknowledged = data.acknowledged;
        if (data.user_comment !== undefined) {
          payload.seller_comment = data.user_comment;
          payload.seller_comment_at = new Date().toISOString();
        }
        if (data.acknowledged_date !== undefined) payload.acknowledged_at = data.acknowledged_date;

        const { data: updated, error } = await supabase
          .from('devolutivas')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      }
    },

    Training: {
      filter: async (filter, order, limit) => {
        const { data: rows } = await supabase
          .from('treinamentos')
          .select('*')
          .eq('active', true);

        const mapped = (rows || []).map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          category: (() => {
            const t = (r.type || '').toLowerCase();
            if (t === 'prospeccao') return 'Prospecção';
            if (t === 'atendimento') return 'Atendimento';
            if (t === 'agendamento') return 'WhatsApp';
            if (t === 'apresentacao') return 'Atendimento';
            if (t === 'financiamento') return 'Financiamento';
            if (t === 'carro_de_troca') return 'Negociação';
            if (t === 'fechamento') return 'Fechamento';
            if (t === 'funil') return 'Mentalidade';
            if (t === 'rotina_diaria') return 'Mentalidade';
            if (t === 'crm') return 'Carteira';
            if (t === 'institucional') return 'Mentalidade';
            return 'Atendimento';
          })(),
          level: (r.curation_notes && r.curation_notes.startsWith('N')) ? r.curation_notes : (r.target_audience || 'N1 Iniciante'),
          duration_minutes: r.duration_minutes ?? null,
          content_url: r.video_url || '',
          video_url: r.video_url || '',
          material_url: r.material_url || '',
          thumbnail_url: null,
          is_live: r.type === 'live',
          live_date: r.published_at,
          recording_url: r.video_url || ''
        }));

        const filtered = mapped.filter(r => matchQuery(r, filter));
        const sorted = sortRows(filtered, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      list: async (order, limit) => base44.entities.Training.filter(null, order, limit)
    },

    TrainingProgress: {
      list: async () => {
        const me = await base44.auth.me();
        const { data: rows } = await supabase
          .from('progresso_treinamentos')
          .select('*')
          .eq('user_id', me.id);

        return (rows || []).map(r => ({
          id: r.id,
          training_id: r.training_id,
          completed: r.status === 'completed' || r.status === 'watched' || r.status === 'concluido' || Boolean(r.completed_at)
        }));
      }
    },

    PoliticaRemuneracao: {
      filter: async () => [],
      list: async (order, limit) => {
        const list = await base44.entities.PoliticaRemuneracao.filter(null);
        return limit ? list.slice(0, limit) : list;
      },
      create: async () => { throw new Error('Use o cadastro canônico de planos de remuneração.'); },
    },

    FaixaComissao: {
      filter: async () => [],
      list: async (order, limit) => {
        const list = await base44.entities.FaixaComissao.filter(null);
        return limit ? list.slice(0, limit) : list;
      },
      create: async () => { throw new Error('Use o cadastro canônico de regras de remuneração.'); },
    },

    PremiacaoRemuneracao: {
      filter: async () => [],
      list: async (order, limit) => {
        const list = await base44.entities.PremiacaoRemuneracao.filter(null);
        return limit ? list.slice(0, limit) : list;
      },
      create: async () => { throw new Error('Use o cadastro canônico de regras de remuneração.'); },
    },

    BonificacaoRemuneracao: {
      filter: async () => [],
      list: async (order, limit) => {
        const list = await base44.entities.BonificacaoRemuneracao.filter(null);
        return limit ? list.slice(0, limit) : list;
      },
      create: async () => { throw new Error('Use o cadastro canônico de regras de remuneração.'); },
    },

    HistoricoRemuneracao: {
      filter: async () => [],
      list: async (order, limit) => {
        const list = await base44.entities.HistoricoRemuneracao.filter(null);
        const sorted = sortRows(list, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      create: async () => { throw new Error('Histórico de remuneração não aceita gravação por este adaptador.'); },
    },

    ActionPlan: {
      filter: async (filter, order, limit) => {
        const me = await base44.auth.me().catch(() => ({ id: '' }));
        if (!me?.id) return [];
        const { data: rows, error } = await supabase
          .from('planos_acao')
          .select('*')
          .eq('responsavel_id', me.id);

        if (error) {
          console.error('Error fetching action plans:', error);
          return [];
        }

        const mapped = (rows || []).map(r => ({
          id: r.id,
          pdi_id: r.scope_id,
          action: r.title,
          competency: r.details_json?.competency || 'Outra',
          description: r.description || '',
          deadline: r.prazo,
          status: r.status === 'concluido' ? 'Concluído' : r.status === 'em_andamento' ? 'Em Andamento' : 'Pendente',
          progress: r.details_json?.progress ?? null
        }));

        const filtered = mapped.filter(r => matchQuery(r, filter));
        const sorted = sortRows(filtered, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      list: async (order, limit) => {
        return base44.entities.ActionPlan.filter(null, order, limit);
      },
      create: async (data) => {
        const me = await base44.auth.me();
        
        // Fetch active store for vendor
        const { data: vinculos } = await supabase
          .from('vinculos_loja')
          .select('store_id')
          .eq('user_id', me.id)
          .eq('is_active', true)
          .limit(1);
        const storeId = vinculos?.[0]?.store_id;

        const payload = {
          scope_type: 'pdi',
          scope_id: data.pdi_id || me.id,
          responsavel_id: me.id,
          title: data.action,
          description: data.description || '',
          prazo: data.deadline || null,
          status: data.status === 'Concluído' ? 'concluido' : data.status === 'Em Andamento' ? 'em_andamento' : 'pendente',
          details_json: {
            competency: data.competency || '',
            progress: data.progress || 0
          }
        };

        const { data: created, error } = await supabase
          .from('planos_acao')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        return {
          id: created.id,
          pdi_id: created.scope_id,
          action: created.title,
          competency: created.details_json?.competency || '',
          description: created.description,
          deadline: created.prazo,
          status: data.status,
          progress: data.progress
        };
      },
      update: async (id, data) => {
        const payload = {};
        if (data.action !== undefined) payload.title = data.action;
        if (data.description !== undefined) payload.description = data.description;
        if (data.deadline !== undefined) payload.prazo = data.deadline;
        if (data.status !== undefined) {
          payload.status = data.status === 'Concluído' ? 'concluido' : data.status === 'Em Andamento' ? 'em_andamento' : 'pendente';
        }
        
        const detailsUpdate = {};
        if (data.competency !== undefined) detailsUpdate.competency = data.competency;
        if (data.progress !== undefined) detailsUpdate.progress = data.progress;
        
        if (Object.keys(detailsUpdate).length > 0) {
          const { data: current } = await supabase.from('planos_acao').select('details_json').eq('id', id).maybeSingle();
          payload.details_json = { ...(current?.details_json || {}), ...detailsUpdate };
        }

        const { data: updated, error } = await supabase
          .from('planos_acao')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return {
          id: updated.id,
          pdi_id: updated.scope_id,
          action: updated.title,
          competency: updated.details_json?.competency || '',
          description: updated.description,
          deadline: updated.prazo,
          status: data.status || (updated.status === 'concluido' ? 'Concluído' : updated.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'),
          progress: data.progress || updated.details_json?.progress || 0
        };
      }
    },

    User: {
      list: async () => {
        const { data: rows } = await supabase.from('usuarios').select('id, name, email, role, avatar_url');
        return (rows || []).map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          avatar_url: r.avatar_url
        }));
      }
    },

    RankingConfig: {
      list: async () => []
    },

    BonificacaoRanking: {
      list: async () => []
    },

    MetaVendedor: {
      list: async () => []
    },

    Appointment: {
      filter: async (filter) => {
        const me = await base44.auth.me();
        const { data: rows } = await supabase
          .from('agendamentos')
          .select('*, clientes(*)')
          .eq('seller_user_id', me.id);
        
        const mapped = (rows || []).map(r => ({
          id: r.id,
          cliente_id: r.cliente_id,
          vendedor_id: r.seller_user_id,
          loja_id: r.loja_id,
          date: moment(r.data_hora).format('YYYY-MM-DD'),
          time: moment(r.data_hora).format('HH:mm'),
          tipo: r.tipo,
          status: r.status,
          nome_cliente: r.clientes?.nome || ''
        }));
        return mapped.filter(r => matchQuery(r, filter));
      }
    },

    EventoComercial: {
      filter: async (filter, order, limit) => {
        const me = await base44.auth.me().catch(() => ({ id: '' }));
        if (!me?.id) return [];
        const { data: rows, error } = await supabase
          .from('eventos_comerciais')
          .select('*')
          .eq('seller_user_id', me.id);

        if (error) {
          console.error('Error fetching events:', error);
          return [];
        }

        const mapped = (rows || []).map(r => ({
          id: r.id,
          cliente_id: r.cliente_id,
          vendedor_id: r.seller_user_id,
          loja_id: r.loja_id,
          tipo_evento: r.tipo_evento,
          data_evento: moment(r.data_evento).format('YYYY-MM-DD'),
          data_hora_evento: r.data_evento,
          observacao: r.observacao || ''
        }));

        const filtered = mapped.filter(r => matchQuery(r, filter));
        const sorted = sortRows(filtered, order);
        return limit ? sorted.slice(0, limit) : sorted;
      },
      create: async (data) => {
        const me = await base44.auth.me();
        
        const storeId = await resolveStoreId(supabase, me.id);

        const payload = {
          cliente_id: data.cliente_id,
          oportunidade_id: data.oportunidade_id || null,
          agendamento_id: data.agendamento_id || null,
          loja_id: storeId || data.loja_id,
          seller_user_id: me.id,
          tipo_evento: data.tipo_evento,
          canal: data.canal || null,
          modalidade: data.modalidade || null,
          data_evento: data.data_hora_evento || new Date().toISOString(),
          origem_modulo: 'crm',
          observacao: data.observacao || ''
        };

        const { data: created, error } = await supabase
          .from('eventos_comerciais')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        return {
          id: created.id,
          cliente_id: created.cliente_id,
          vendedor_id: created.seller_user_id,
          loja_id: created.loja_id,
          tipo_evento: created.tipo_evento,
          data_evento: moment(created.data_evento).format('YYYY-MM-DD'),
          data_hora_evento: created.data_evento,
          observacao: created.observacao || ''
        };
      },
      update: async (id, data) => {
        const payload = {};
        if (data.observacao !== undefined) payload.observacao = data.observacao;
        if (data.tipo_evento !== undefined) payload.tipo_evento = data.tipo_evento;

        const { data: updated, error } = await supabase
          .from('eventos_comerciais')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return {
          id: updated.id,
          cliente_id: updated.cliente_id,
          vendedor_id: updated.seller_user_id,
          loja_id: updated.loja_id,
          tipo_evento: updated.tipo_evento,
          data_evento: moment(updated.data_evento).format('YYYY-MM-DD'),
          data_hora_evento: updated.data_evento,
          observacao: updated.observacao || ''
        };
      }
    },

    RoutineActivityTemplate: {
      list: async () => {
        const { data, error } = await supabase
          .from('routine_activity_templates')
          .select('*')
          .eq('ativo', true)
          .order('ordem', { ascending: true });
        if (error) {
          console.error('Error fetching routine activity templates:', error);
          return [];
        }
        return data;
      }
    },

    ProspectingSchedule: {
      list: async () => {
        const { data, error } = await supabase
          .from('prospecting_schedule')
          .select('*')
          .eq('ativo', true);
        if (error) {
          console.error('Error fetching prospecting schedule:', error);
          return [];
        }
        return data;
      }
    },

    StoryIdea: {
      list: async () => {
        const { data, error } = await supabase
          .from('story_ideas')
          .select('*')
          .eq('ativo', true);
        if (error) {
          console.error('Error fetching story ideas:', error);
          return [];
        }
        return data;
      }
    }
  }
};
