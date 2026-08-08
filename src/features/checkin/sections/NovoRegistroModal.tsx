import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, HelpCircle, ShieldCheck, ShoppingCart, UserCheck, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/currency-mask'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { FormField } from '@/components/molecules/FormField'
import { Typography } from '@/components/atoms/Typography'
import { useClientes } from '@/features/crm/hooks/useClientes'
import { useOportunidades } from '@/features/crm/hooks/useOportunidades'
import { useAgendamentos } from '@/features/crm/hooks/useAgendamentos'
import { CRM_ETAPA_LABEL, type Cliente, type CrmCanal, type CrmEtapaFunil } from '@/lib/schemas/crm.schema'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { addDaysDateOnly } from '../lib/crm-derived-totals'
import { mapResponsaveisTratativaOptions, type ResponsavelTratativa } from '../lib/responsaveis-tratativa'
import { resolveGarantiaPositionDefaults } from '../lib/garantia-position-defaults'
import {
  buildExistingClientFormPatch,
  findMostRecentClientAppointment,
  findRecentClientAppointment,
  type ExistingAppointmentRecord,
} from '../lib/existing-client-lookup'

/**
 * Modal unico "Novo Registro" — porta 1:1 de components/fechamento/
 * NovoRegistroModal.jsx (Base44). 4 tipos (Agendamento/Venda/Garantia/
 * Qualificado), cada um com formulario proprio, todos gravando na base
 * unica cliente+oportunidade+agendamento (schema real, nao entities SDK).
 */

type RegistroTipo = 'agendamento' | 'venda' | 'garantia' | 'qualificado'

const CANAIS_UI = ['Showroom', 'Internet', 'Carteira'] as const
const CANAL_UI_TO_DB: Record<string, CrmCanal> = { Showroom: 'showroom', Internet: 'internet', Carteira: 'carteira' }
const MODALIDADES = ['Visita na loja', 'Atendimento externo', 'Videochamada'] as const
const SITUACOES_OPORTUNIDADE = ['Nova', 'Validação', 'Construção', 'Compromisso', 'Decisão', 'Recuperação'] as const
const SITUACOES_OPORTUNIDADE_AJUDA: Record<string, string> = {
  Nova: 'Significado: oportunidade identificada. Quando usar: primeiro registro antes de validar a necessidade. Mentor Comercial: inicia a cadência. Próxima ação: fazer o primeiro contato. Agendamento: não cria automaticamente. Temperatura/prioridade: neutra. Rotina: entra como prospecção pendente. Métricas: conta como oportunidade aberta.',
  Validação: 'Significado: interesse e necessidade confirmados. Quando usar: após conversa qualificada. Mentor Comercial: avança para qualificação. Próxima ação: confirmar necessidade, orçamento e prazo. Agendamento: não cria automaticamente. Temperatura/prioridade: aumenta a prioridade. Rotina: entra como contato de validação. Métricas: conta na taxa de qualificação.',
  Construção: 'Significado: proposta e condições em estruturação. Quando usar: depois de validar o cenário. Mentor Comercial: orienta apresentação/proposta. Próxima ação: montar e apresentar a solução. Agendamento: só cria se houver data escolhida. Temperatura/prioridade: quente. Rotina: entra como proposta em andamento. Métricas: conta no funil ativo.',
  Compromisso: 'Significado: cliente sinalizou intenção clara de fechar. Quando usar: existe compromisso comercial concreto. Mentor Comercial: prioriza conversão. Próxima ação: confirmar condições e próximo encontro. Agendamento: crie quando houver horário combinado. Temperatura/prioridade: muito quente. Rotina: aparece como compromisso. Métricas: conta na etapa de negociação.',
  Decisão: 'Significado: cliente está decidindo a compra. Quando usar: proposta apresentada e aguardando decisão. Mentor Comercial: recomenda follow-up de fechamento. Próxima ação: remover objeção e combinar prazo de retorno. Agendamento: crie se o retorno tiver horário. Temperatura/prioridade: alta, com risco de perda. Rotina: aparece como retorno prioritário. Métricas: conta na conversão do funil.',
  Recuperação: 'Significado: oportunidade esfriada em retrabalho. Quando usar: contato perdido, sem resposta ou objeção não resolvida. Mentor Comercial: inicia recuperação. Próxima ação: definir nova abordagem e data de contato. Agendamento: não cria automaticamente. Temperatura/prioridade: reduzida até nova interação. Rotina: aparece como pendência de recuperação. Métricas: conta em recuperação, sem inflar oportunidades novas.',
}
const PASSO_TO_ETAPA: Record<string, CrmEtapaFunil> = {
  Nova: 'prospeccao', Validação: 'qualificacao', Construção: 'apresentacao', Compromisso: 'negociacao', Decisão: 'fechamento', Recuperação: 'prospeccao',
}
const MOTIVOS_GARANTIA = ['Mecânica', 'Documentação', 'Acessório', 'Acabamento', 'Promessa comercial', 'Outro'] as const
const DESCRICOES_GARANTIA_POR_MOTIVO: Record<string, readonly string[]> = {
  'Mecânica': ['Barulho no motor', 'Problema elétrico', 'Vazamento de óleo', 'Freios', 'Suspensão', 'Ar-condicionado', 'Outro'],
  'Documentação': ['Pendência de transferência', 'Nota fiscal', 'IPVA/Licenciamento', 'Contrato/Financiamento', 'Outro'],
  'Acessório': ['Item não instalado', 'Item com defeito', 'Item faltante', 'Outro'],
  'Acabamento': ['Risco/Amassado', 'Pintura', 'Estofado', 'Peça solta', 'Outro'],
  'Promessa comercial': ['Item prometido não entregue', 'Condição comercial não cumprida', 'Bônus/Brinde pendente', 'Outro'],
  'Outro': ['Outro'],
}
const URGENCIAS = ['Imediato', '30 dias', '60 dias', '90 dias', 'Sem prazo'] as const
const FINANCIAMENTO_OPTS = ['Aprovado', 'Recusado', 'Não se aplica'] as const
const FINANCIAMENTO_UI_TO_DB: Record<string, 'aprovado' | 'reprovado' | 'nao_aplica'> = {
  Aprovado: 'aprovado', Recusado: 'reprovado', 'Não se aplica': 'nao_aplica',
}

function normalizePhone(raw: string): string {
  return (raw || '').replace(/\D/g, '')
}

function formatPhone(raw: string): string {
  const d = (raw || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

// Máscara compartilhada: o dígito digitado é real, não centavo
// (`69900` → `R$ 69.900,00`). Ver src/lib/currency-mask.ts.
const formatCurrency = formatCurrencyInput
const currencyToNumber = parseCurrencyInput

function getSaoPauloDateOnly(baseDate = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(baseDate)
}

type FormState = Record<string, string>

interface TipoDef {
  id: RegistroTipo
  icon: typeof CalendarCheck
  label: string
  desc: string
  cor: string
  iconCor: string
}

const TIPOS: TipoDef[] = [
  { id: 'agendamento', icon: CalendarCheck, label: 'Agendamento', desc: 'Compromisso comercial futuro', cor: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700', iconCor: 'text-blue-500' },
  { id: 'venda', icon: ShoppingCart, label: 'Venda', desc: 'Negócio fechado', cor: 'border-green-200 bg-green-50 hover:bg-green-100 text-green-700', iconCor: 'text-green-500' },
  { id: 'garantia', icon: ShieldCheck, label: 'Garantia', desc: 'Pós-venda ou garantia de veículo', cor: 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700', iconCor: 'text-amber-500' },
  { id: 'qualificado', icon: UserCheck, label: 'Qualificado', desc: 'Nova oportunidade trabalhável', cor: 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700', iconCor: 'text-purple-500' },
]

function TipoSelector({ onSelect }: { onSelect: (t: RegistroTipo) => void }) {
  return (
    <div>
      <p className="mb-4 text-[13px] text-slate-500">Qual tipo de registro você quer adicionar?</p>
      <div className="grid grid-cols-2 gap-3">
        {TIPOS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} type="button" onClick={() => onSelect(t.id)} className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${t.cor}`}>
              <Icon className={`h-7 w-7 ${t.iconCor}`} />
              <span className="text-[13px] font-bold">{t.label}</span>
              <span className="text-[11px] opacity-70">{t.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ClienteEncontradoBadge({ jaVendido }: { jaVendido?: boolean }) {
  return <p className="mt-0.5 text-[10px] font-semibold text-green-600">✓ Cliente encontrado na Carteira{jaVendido ? ' (já vendido)' : ''}.</p>
}

function formatAppointmentDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data não informada'
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function ClienteFichaResumo({ form, ultimoAgendamento }: { form: FormState; ultimoAgendamento: ExistingAppointmentRecord | null }) {
  return (
    <section aria-label="Ficha do cliente carregada" className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Ficha carregada da Carteira</p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
        <p><strong className="text-slate-700">Veículo:</strong> {form.veiculo_texto || 'Não informado'}</p>
        <p><strong className="text-slate-700">Negociação:</strong> {CRM_ETAPA_LABEL[form.negociacao as CrmEtapaFunil] || 'Não informada'}</p>
        <p><strong className="text-slate-700">Financiamento:</strong> {form.financiamento || 'Não informado'}</p>
        <p><strong className="text-slate-700">Troca:</strong> {form.possui_troca || 'Não informado'}</p>
        <p className="col-span-2"><strong className="text-slate-700">Observações:</strong> {form.observacao || 'Sem observações'}</p>
        <p className="col-span-2"><strong className="text-slate-700">Último agendamento:</strong> {ultimoAgendamento ? formatAppointmentDate(ultimoAgendamento.data_hora) : 'Sem agendamento registrado'}</p>
      </div>
    </section>
  )
}

// MX-22.4 (AC-5/AC-6; Spec §9.2 "Não usar tooltip genérico"): o ícone de
// ajuda do Qualificado usava `title` nativo — só hover, inacessível em
// touch (dispositivo real do vendedor), e um bloco único concatenado de
// todos os status. Este popover é acionável por clique/toque e mostra a
// ajuda de cada status individualmente, preservando SITUACOES_OPORTUNIDADE_AJUDA
// literalmente (nenhum texto reescrito).
export function QualificadoStatusHelp() {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Ajuda sobre os passos da oportunidade"
        className="grid h-4 w-4 place-items-center rounded-full text-slate-600 transition-colors hover:text-slate-600"
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Ajuda: passos da oportunidade"
          className="absolute left-0 top-5 z-50 max-h-64 w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg"
        >
          {SITUACOES_OPORTUNIDADE.map(s => (
            <div key={s} className="mb-2 last:mb-0">
              <p className="text-[11px] font-bold text-slate-700">{s}</p>
              <p className="text-[11px] text-slate-500">{SITUACOES_OPORTUNIDADE_AJUDA[s]}</p>
            </div>
          ))}
        </div>
      )}
    </span>
  )
}

export interface FormProps {
  form: FormState
  setF: (key: string, value: string) => void
  clienteEncontrado: boolean
  clienteJaVendido: boolean
  onPhoneBlur: () => void
  responsaveis: ResponsavelTratativa[]
}

function FormAgendamento({ form, setF, clienteEncontrado, clienteJaVendido, onPhoneBlur }: FormProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="WhatsApp / Telefone *" value={form.whatsapp || ''} onChange={e => setF('whatsapp', formatPhone(e.target.value))} onBlur={onPhoneBlur} placeholder="(11) 98765-4321" maxLength={15} />
      <div>
        <FormField label="Nome do Cliente *" value={form.nome || ''} onChange={e => setF('nome', e.target.value.toUpperCase())} placeholder="Ex: JOÃO SANTOS" disabled={clienteEncontrado} />
        {clienteEncontrado && <ClienteEncontradoBadge jaVendido={clienteJaVendido} />}
      </div>
      <Select label="Canal MX *" value={form.canal || ''} onChange={e => setF('canal', e.target.value)}>
        <option value="">Selecione</option>
        {CANAIS_UI.map(c => <option key={c} value={c}>{c}</option>)}
      </Select>
      <FormField label="Origem Detalhada" value={form.origem_detalhada || ''} onChange={e => setF('origem_detalhada', e.target.value)} placeholder="Ex: Indicação, Redes Sociais…" />
      <FormField label="Data e Hora do Agendamento *" type="datetime-local" value={form.data_hora_agendamento || ''} onChange={e => setF('data_hora_agendamento', e.target.value)} />
      <Select label="Modalidade *" value={form.modalidade || ''} onChange={e => setF('modalidade', e.target.value)}>
        <option value="">Selecione</option>
        {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
      </Select>
      <FormField label="Veículo de Interesse *" value={form.veiculo_texto || ''} onChange={e => setF('veiculo_texto', e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT" />
      <FormField label="Valor Negociado" value={form.valor_negociado || ''} onChange={e => setF('valor_negociado', formatCurrency(e.target.value))} placeholder="R$ 68.900,00" />
      <Select label="Financiamento *" value={form.financiamento || ''} onChange={e => setF('financiamento', e.target.value)}>
        <option value="">Selecione</option>
        {FINANCIAMENTO_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
      </Select>
      <Select label="Interesse em Troca" value={form.possui_troca || 'Não'} onChange={e => setF('possui_troca', e.target.value)}>
        <option value="Sim">Sim</option>
        <option value="Não">Não</option>
      </Select>
      <div className="sm:col-span-2">
        <FormField label="Observação" value={form.observacao || ''} onChange={e => setF('observacao', e.target.value)} placeholder="Observações gerais" />
      </div>
    </div>
  )
}

function FormVenda({ form, setF, clienteEncontrado, clienteJaVendido, onPhoneBlur }: FormProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="WhatsApp / Telefone *" value={form.whatsapp || ''} onChange={e => setF('whatsapp', formatPhone(e.target.value))} onBlur={onPhoneBlur} placeholder="(11) 98765-4321" maxLength={15} />
      <div>
        <FormField label="Nome do Cliente *" value={form.nome || ''} onChange={e => setF('nome', e.target.value.toUpperCase())} placeholder="Ex: JOÃO SANTOS" disabled={clienteEncontrado} />
        {clienteEncontrado && <ClienteEncontradoBadge jaVendido={clienteJaVendido} />}
      </div>
      <Select label="Canal MX *" value={form.canal || ''} onChange={e => setF('canal', e.target.value)}>
        <option value="">Selecione</option>
        {CANAIS_UI.map(c => <option key={c} value={c}>{c}</option>)}
      </Select>
      <FormField label="Origem Detalhada" value={form.origem_detalhada || ''} onChange={e => setF('origem_detalhada', e.target.value)} placeholder="Ex: Indicação, Tráfego Pago…" />
      <FormField label="Placa do Veículo *" value={form.placa_veiculo || ''} onChange={e => setF('placa_veiculo', e.target.value.toUpperCase())} placeholder="Ex: ABC-1234" maxLength={8} />
      <FormField label="Veículo Vendido *" value={form.veiculo_texto || ''} onChange={e => setF('veiculo_texto', e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT 2024" />
      <FormField label="Data da Venda *" type="date" value={form.data_venda || ''} onChange={e => setF('data_venda', e.target.value)} />
      <FormField label="Valor da Venda *" value={form.valor_venda || ''} onChange={e => setF('valor_venda', formatCurrency(e.target.value))} placeholder="R$ 68.900,00" />
      <Select label="Financiamento *" value={form.financiamento || ''} onChange={e => setF('financiamento', e.target.value)}>
        <option value="">Selecione</option>
        {FINANCIAMENTO_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
      </Select>
      <Select label="Possui Troca" value={form.possui_troca || 'Não'} onChange={e => setF('possui_troca', e.target.value)}>
        <option value="Sim">Sim</option>
        <option value="Não">Não</option>
      </Select>
      <FormField label="Data e Hora da Entrega Prevista" type="datetime-local" value={form.data_hora_entrega || ''} onChange={e => setF('data_hora_entrega', e.target.value)} />
      {form.data_hora_entrega && (
        <FormField label="Observação da Entrega" value={form.observacao_entrega || ''} onChange={e => setF('observacao_entrega', e.target.value)} placeholder="Detalhes da entrega" />
      )}
      <div className="sm:col-span-2">
        <FormField label="Observação Geral" value={form.observacao || ''} onChange={e => setF('observacao', e.target.value)} placeholder="Observações sobre a venda" />
      </div>
    </div>
  )
}

export function FormGarantia({ form, setF, clienteEncontrado, clienteJaVendido, onPhoneBlur, responsaveis }: FormProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="WhatsApp / Telefone *" value={form.whatsapp || ''} onChange={e => setF('whatsapp', formatPhone(e.target.value))} onBlur={onPhoneBlur} placeholder="(11) 98765-4321" maxLength={15} />
      <div>
        <FormField label="Nome do Cliente *" value={form.nome || ''} onChange={e => setF('nome', e.target.value.toUpperCase())} placeholder="Ex: JOÃO SANTOS" disabled={clienteEncontrado} />
        {clienteEncontrado && <ClienteEncontradoBadge jaVendido={clienteJaVendido} />}
      </div>
      <FormField label="Veículo (texto)" value={form.veiculo_texto || ''} onChange={e => setF('veiculo_texto', e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT 2024" />
      <FormField label="Data da Garantia *" type="date" value={form.data_garantia || ''} onChange={e => setF('data_garantia', e.target.value)} />
      <Select
        label="Motivo da Garantia *"
        value={form.motivo_garantia || ''}
        onChange={e => {
          setF('motivo_garantia', e.target.value)
          setF('descricao_garantia', '')
          setF('descricao_garantia_outro', '')
        }}
      >
        <option value="">Selecione o motivo</option>
        {MOTIVOS_GARANTIA.map(m => <option key={m} value={m}>{m}</option>)}
      </Select>
      <Select
        label="Descrição da Garantia *"
        value={form.descricao_garantia || ''}
        onChange={e => setF('descricao_garantia', e.target.value)}
        disabled={!form.motivo_garantia}
      >
        <option value="">{form.motivo_garantia ? 'Selecione a descrição' : 'Selecione o motivo primeiro'}</option>
        {(DESCRICOES_GARANTIA_POR_MOTIVO[form.motivo_garantia || ''] || []).map(d => <option key={d} value={d}>{d}</option>)}
      </Select>
      {form.descricao_garantia === 'Outro' && (
        <FormField label="Descreva a Garantia *" value={form.descricao_garantia_outro || ''} onChange={e => setF('descricao_garantia_outro', e.target.value)} placeholder="Descreva o problema relatado" />
      )}
      <FormField label="Data para Posicionar Cliente *" type="date" value={form.data_posicionamento || ''} onChange={e => setF('data_posicionamento', e.target.value)} />
      <FormField label="Hora para Posicionar" type="time" value={form.hora_posicionamento || ''} onChange={e => setF('hora_posicionamento', e.target.value)} />
      <Select
        label="Responsável pela Tratativa"
        value={form.responsavel || ''}
        onChange={e => {
          setF('responsavel', e.target.value)
          setF('responsavel_id', e.target.value)
        }}
      >
        <option value="">Selecione o responsável</option>
        {responsaveis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </Select>
      <FormField label="Observação" value={form.observacao || ''} onChange={e => setF('observacao', e.target.value)} placeholder="Observações adicionais" />
    </div>
  )
}

function FormQualificado({ form, setF, clienteEncontrado, clienteJaVendido, onPhoneBlur }: FormProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="WhatsApp / Telefone *" value={form.whatsapp || ''} onChange={e => setF('whatsapp', formatPhone(e.target.value))} onBlur={onPhoneBlur} placeholder="(11) 98765-4321" maxLength={15} />
      <div>
        <FormField label="Nome do Cliente *" value={form.nome || ''} onChange={e => setF('nome', e.target.value.toUpperCase())} placeholder="Ex: JOÃO SANTOS" disabled={clienteEncontrado} />
        {clienteEncontrado && <ClienteEncontradoBadge jaVendido={clienteJaVendido} />}
      </div>
      <Select label="Canal MX *" value={form.canal || ''} onChange={e => setF('canal', e.target.value)}>
        <option value="">Selecione</option>
        {CANAIS_UI.map(c => <option key={c} value={c}>{c}</option>)}
      </Select>
      <FormField label="Veículo de Interesse *" value={form.veiculo_texto || ''} onChange={e => setF('veiculo_texto', e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT" />
      <FormField label="Orçamento" value={form.orcamento || ''} onChange={e => setF('orcamento', formatCurrency(e.target.value))} placeholder="R$ 68.900,00" />
      <Select label="Financiamento *" value={form.financiamento || ''} onChange={e => setF('financiamento', e.target.value)}>
        <option value="">Selecione</option>
        {FINANCIAMENTO_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
      </Select>
      <Select label="Possui Troca" value={form.possui_troca || 'Não'} onChange={e => setF('possui_troca', e.target.value)}>
        <option value="Sim">Sim</option>
        <option value="Não">Não</option>
      </Select>
      {form.possui_troca === 'Sim' && (
        <>
          <FormField label="Veículo para Troca *" value={form.veiculo_troca || ''} onChange={e => setF('veiculo_troca', e.target.value.toUpperCase())} placeholder="Ex: GOL 1.0 2018" />
          <FormField label="Valor Esperado na Troca" value={form.valor_esperado_troca || ''} onChange={e => setF('valor_esperado_troca', formatCurrency(e.target.value))} placeholder="R$ 25.000,00" />
        </>
      )}
      <Select label="Urgência de Compra" value={form.urgencia || ''} onChange={e => setF('urgencia', e.target.value)}>
        <option value="">Selecione</option>
        {URGENCIAS.map(u => <option key={u} value={u}>{u}</option>)}
      </Select>
      <Select label="Preferência de Modalidade" value={form.modalidade || 'Não informado'} onChange={e => setF('modalidade', e.target.value)}>
        {[...MODALIDADES, 'Não informado'].map(m => <option key={m} value={m}>{m}</option>)}
      </Select>
      <div className="space-y-1">
        <div className="ml-2 flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Passo Atual da Oportunidade *</span>
          <QualificadoStatusHelp />
        </div>
        <Select value={form.passo_atual || ''} onChange={e => setF('passo_atual', e.target.value)}>
          <option value="">Selecione</option>
          {SITUACOES_OPORTUNIDADE.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <FormField label="Observação" value={form.observacao || ''} onChange={e => setF('observacao', e.target.value)} placeholder="Observações adicionais" />
      </div>
    </div>
  )
}

function canSaveForm(tipo: RegistroTipo, form: FormState, clienteEncontrado: boolean): boolean {
  const temNome = clienteEncontrado || form.nome?.trim()
  const temFone = form.whatsapp?.trim()
  if (!temFone || !temNome) return false

  if (tipo === 'agendamento') {
    return Boolean(form.canal && form.data_hora_agendamento && form.modalidade && form.veiculo_texto?.trim() && form.financiamento)
  }
  if (tipo === 'venda') {
    return Boolean(form.canal && form.placa_veiculo?.trim() && form.veiculo_texto?.trim() && form.data_venda && form.valor_venda && form.financiamento)
  }
  if (tipo === 'garantia') {
    const descricaoOk = form.descricao_garantia === 'Outro' ? Boolean(form.descricao_garantia_outro?.trim()) : Boolean(form.descricao_garantia?.trim())
    const responsavelOk = Boolean(form.responsavel)
    return Boolean(form.data_garantia && form.motivo_garantia && descricaoOk && responsavelOk)
  }
  if (tipo === 'qualificado') {
    return Boolean(form.canal && form.veiculo_texto?.trim() && form.financiamento && form.passo_atual
      && (form.possui_troca !== 'Sim' || form.veiculo_troca?.trim()))
  }
  return false
}

interface NovoRegistroModalProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void
  defaultDate?: string
}

export function NovoRegistroModal({ open, onClose, onSaved, defaultDate }: NovoRegistroModalProps) {
  const navigate = useNavigate()
  const { storeId, activeStoreId } = useAuth()
  const effectiveStoreId = activeStoreId || storeId || null
  const { buscarClienteExistentePorTelefone, buscarClienteDetalhadoPorTelefone, createCliente, updateCliente } = useClientes()
  const { oportunidades = [], createOportunidade, registrarVendaDireta } = useOportunidades()
  const { agendamentos = [], createAgendamento } = useAgendamentos()

  const [tipo, setTipo] = useState<RegistroTipo | null>(null)
  const [form, setFormState] = useState<FormState>({})
  const [clienteEncontradoId, setClienteEncontradoId] = useState<string | null>(null)
  const [clienteFicha, setClienteFicha] = useState<Cliente | null>(null)
  const [ultimoAgendamento, setUltimoAgendamento] = useState<ExistingAppointmentRecord | null>(null)
  const [clienteJaVendido, setClienteJaVendido] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [responsaveis, setResponsaveis] = useState<ResponsavelTratativa[]>([])

  useEffect(() => {
    if (!open || !effectiveStoreId) {
      setResponsaveis([])
      return
    }
    let cancelled = false
    // MX-22.4 (AC-1; Spec §9.1): a RLS de vinculos_loja_select/usuarios_select
    // (tem_papel_loja/pode_ver_usuario) só libera ver outra pessoa pra área
    // interna MX ou dono/gerente da loja — um vendedor comum, o único
    // persona real que abre este formulário, recebia de volta só a própria
    // linha. A RPC listar_responsaveis_tratativa_loja (SECURITY DEFINER,
    // mesmo padrão de contar_vendedores_ativos_loja) resolve isso.
    void supabase
      .rpc('listar_responsaveis_tratativa_loja', { p_store_id: effectiveStoreId })
      .then(({ data }) => {
        if (cancelled) return
        setResponsaveis(mapResponsaveisTratativaOptions(data as Array<{ id: string; name: string; role: string }> | null))
      })
    return () => { cancelled = true }
  }, [effectiveStoreId, open])

  if (!open) return null

  const hoje = defaultDate || getSaoPauloDateOnly()
  const amanha = addDaysDateOnly(hoje, 1)

  const setF = (key: string, val: string) => {
    setFormState(f => ({ ...f, [key]: val }))
    if (key === 'whatsapp') {
      setClienteEncontradoId(null)
      setClienteFicha(null)
      setUltimoAgendamento(null)
      setClienteJaVendido(false)
    }
  }

  const handleWhatsAppBlur = async () => {
    const tel = normalizePhone(form.whatsapp || '')
    if (tel.length < 10) return
    setBuscando(true)
    try {
      const cliente = await buscarClienteDetalhadoPorTelefone?.(form.whatsapp || '')
      const id = cliente?.id ?? await buscarClienteExistentePorTelefone(form.whatsapp || '')
      const oportunidade = cliente
        ? oportunidades
          .filter(item => item.cliente_id === cliente.id)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
        : null
      const ultimo = cliente ? findMostRecentClientAppointment(agendamentos, cliente.id) : null
      setClienteEncontradoId(id)
      setClienteFicha(cliente)
      setUltimoAgendamento(ultimo)
      setClienteJaVendido(oportunidade?.etapa === 'ganho')
      if (cliente) setFormState(current => ({ ...current, ...buildExistingClientFormPatch({ cliente, oportunidade }) }))
    } finally {
      setBuscando(false)
    }
  }

  const handleSelectTipo = (t: RegistroTipo) => {
    setTipo(t)
    const garantiaDefaults = resolveGarantiaPositionDefaults(hoje)
    const defaults: FormState = {
      data_venda: hoje,
      data_garantia: hoje,
      data_posicionamento: garantiaDefaults.dataPosicionamento,
      hora_posicionamento: garantiaDefaults.horaPosicionamento,
    }
    if (t === 'agendamento') defaults.data_hora_agendamento = `${amanha}T09:00`
    setFormState(defaults)
    setClienteEncontradoId(null)
    setClienteFicha(null)
    setUltimoAgendamento(null)
    setClienteJaVendido(false)
  }

  const handleVoltar = () => { setTipo(null); setClienteEncontradoId(null); setClienteFicha(null); setUltimoAgendamento(null) }
  const handleClose = () => { setTipo(null); setFormState({}); setClienteEncontradoId(null); setClienteFicha(null); setUltimoAgendamento(null); onClose() }

  async function resolverCliente(): Promise<{ id: string; error: string | null }> {
    if (clienteEncontradoId) return { id: clienteEncontradoId, error: null }
    if (!form.nome?.trim()) return { id: '', error: 'Informe o nome do cliente.' }
    const canalDb = form.canal ? CANAL_UI_TO_DB[form.canal] : null
    const { error, id } = await createCliente({
      nome: form.nome.trim(),
      telefone: form.whatsapp,
      canal_origem: canalDb,
      status: 'oportunidade',
      observacoes: form.observacao?.trim() || null,
      data_competencia: hoje,
      origem_modulo: defaultDate ? 'regularizacao' : 'terminal_mx',
    })
    if (error || !id) return { id: '', error: error || 'Não foi possível cadastrar o cliente.' }
    return { id, error: null }
  }

  const handleSave = async () => {
    if (!tipo) return
    setSaving(true)
    try {
      const canalDb = form.canal ? CANAL_UI_TO_DB[form.canal] : null
      const financiamentoDb = form.financiamento ? FINANCIAMENTO_UI_TO_DB[form.financiamento] : 'nao_aplica'

      if (tipo === 'venda') {
        const { error: vendaError } = await registrarVendaDireta({
          nome: form.nome?.trim() || '',
          telefone: form.whatsapp || '',
          veiculo: form.veiculo_texto || '',
          placa: form.placa_veiculo || '',
          valor_venda: currencyToNumber(form.valor_venda || ''),
          data_competencia: form.data_venda || hoje,
          canal: canalDb,
          financiamento: financiamentoDb,
          carro_avaliado: form.possui_troca === 'Sim',
          data_entrega_prevista: form.data_hora_entrega || null,
          observacao: form.observacao || null,
          observacao_entrega: form.observacao_entrega || null,
        })
        if (vendaError) { toast.error(vendaError); return }
        toast.success('Venda salva com sucesso.')
        onSaved?.()
        handleClose()
        return
      }

      const { id: clienteId, error: clienteError } = await resolverCliente()
      if (clienteError) { toast.error(clienteError); setSaving(false); return }

      if (tipo === 'agendamento') {
        const agendamentoRecente = findRecentClientAppointment(agendamentos, clienteId, hoje)
        if (agendamentoRecente) {
          const mensagem = 'Cliente já teve agendamento nos últimos 90 dias. Abrir Carteira'
          toast.info(mensagem)
          navigate(`/carteira-clientes?cliente_id=${encodeURIComponent(clienteId)}`)
          return
        }
        const { error: opError, id: opId } = await createOportunidade({
          cliente_id: clienteId,
          veiculo_interesse: form.veiculo_texto,
          valor_negociado: currencyToNumber(form.valor_negociado || ''),
          etapa: 'negociacao',
          canal: canalDb,
          financiamento: financiamentoDb,
          carro_avaliado: form.possui_troca === 'Sim',
          data_competencia: hoje,
          origem_modulo: defaultDate ? 'regularizacao' : 'terminal_mx',
        })
        if (opError) { toast.error(opError); setSaving(false); return }
        const tipoAgendamento = form.modalidade === 'Visita na loja' ? 'visita' : 'negociacao'
        const { error: agError } = await createAgendamento({
          cliente_id: clienteId,
          oportunidade_id: opId,
          data_hora: form.data_hora_agendamento,
          canal: canalDb,
          tipo: tipoAgendamento,
          status: 'confirmado',
          observacoes: [form.modalidade, form.origem_detalhada, form.observacao].filter(Boolean).join(' — ') || null,
        })
        if (agError) { toast.error(agError); setSaving(false); return }
      }

      if (tipo === 'garantia') {
        const dataPos = form.data_posicionamento || amanha
        const horaPos = form.hora_posicionamento || '09:00'
        const descricaoFinal = form.descricao_garantia === 'Outro' ? form.descricao_garantia_outro : form.descricao_garantia
        const responsavel = responsaveis.find(option => option.id === form.responsavel)
        const responsavelFinal = responsavel ? `${responsavel.name} [${responsavel.id}]` : ''
        const observacoes = [
          `Motivo: ${form.motivo_garantia}`,
          form.veiculo_texto ? `Veículo: ${form.veiculo_texto}` : null,
          descricaoFinal,
          responsavelFinal ? `Responsável: ${responsavelFinal}` : null,
          form.observacao || null,
        ].filter(Boolean).join(' — ')
        const { error: agError } = await createAgendamento({
          cliente_id: clienteId,
          data_hora: `${dataPos}T${horaPos}`,
          tipo: 'garantia',
          status: 'aguardando',
          observacoes,
        })
        if (agError) { toast.error(agError); setSaving(false); return }
      }

      if (tipo === 'qualificado') {
        const etapa = form.passo_atual ? PASSO_TO_ETAPA[form.passo_atual] : 'prospeccao'
        const observacoes = [
          form.observacao || null,
          form.urgencia ? `Urgência: ${form.urgencia}` : null,
          form.modalidade && form.modalidade !== 'Não informado' ? `Modalidade preferida: ${form.modalidade}` : null,
          form.possui_troca === 'Sim' ? `Troca: ${form.veiculo_troca || '—'}${form.valor_esperado_troca ? ` (${form.valor_esperado_troca})` : ''}` : null,
        ].filter(Boolean).join(' — ')
        const { error: opError } = await createOportunidade({
          cliente_id: clienteId,
          veiculo_interesse: form.veiculo_texto,
          valor_negociado: currencyToNumber(form.orcamento || ''),
          etapa,
          canal: canalDb,
          financiamento: financiamentoDb,
          carro_avaliado: form.possui_troca === 'Sim',
          data_competencia: hoje,
          origem_modulo: defaultDate ? 'regularizacao' : 'terminal_mx',
        })
        if (opError) { toast.error(opError); setSaving(false); return }
        if (observacoes) await updateCliente(clienteId, { observacoes })
      }

      toast.success(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} salvo com sucesso.`)
      onSaved?.()
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  const TITULO: Record<RegistroTipo, string> = { agendamento: 'Novo Agendamento', venda: 'Nova Venda', garantia: 'Nova Garantia', qualificado: 'Novo Qualificado' }
  const ok = tipo ? canSaveForm(tipo, form, !!clienteEncontradoId) : false
  const formProps: FormProps = { form, setF, clienteEncontrado: !!clienteEncontradoId, clienteJaVendido, onPhoneBlur: handleWhatsAppBlur, responsaveis }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-[3px] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Novo registro">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-mx-2xl">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tipo && (
              <button type="button" onClick={handleVoltar} className="rounded-lg p-1 transition-colors hover:bg-slate-100" aria-label="Voltar">
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>
            )}
            <Typography variant="h3" className="text-[17px] text-[#0F172A]">{tipo ? TITULO[tipo] : 'Novo Registro'}</Typography>
          </div>
          <button type="button" onClick={handleClose} aria-label="Fechar" className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <p className="mb-4 text-[12px] text-slate-600">
          {tipo ? 'Dados salvos na base única de clientes/oportunidades.' : 'Escolha o tipo de registro para o fechamento de hoje.'}
        </p>

        {!tipo && <TipoSelector onSelect={handleSelectTipo} />}
        {tipo === 'agendamento' && <FormAgendamento {...formProps} />}
        {tipo === 'venda' && <FormVenda {...formProps} />}
        {tipo === 'garantia' && <FormGarantia {...formProps} />}
        {tipo === 'qualificado' && <FormQualificado {...formProps} />}

        {clienteFicha && <ClienteFichaResumo form={form} ultimoAgendamento={ultimoAgendamento} />}

        {buscando && <p className="mt-1 text-[11px] text-slate-600">Buscando cliente…</p>}

        {tipo && (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={handleClose} disabled={saving} className="rounded-xl border border-[#E5E7EB] px-5 py-2.5 text-[13px] font-semibold text-[#64748B] transition-colors hover:bg-slate-50">
              Cancelar
            </button>
            <Button type="button" onClick={handleSave} disabled={!ok || saving} className="rounded-xl bg-[#6D28D9] px-6 py-2.5 text-[13px] font-bold text-white hover:bg-purple-700 disabled:opacity-50">
              {saving ? 'Salvando…' : `Salvar ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NovoRegistroModal
