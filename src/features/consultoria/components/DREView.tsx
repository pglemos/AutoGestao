import React, { useMemo, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { useDRE, computeDRE } from '@/hooks/useDRE'
import { DRETable, type DRETableRow } from '@/components/organisms/DRETable'
import { DREForm, type DREFormSection } from '@/components/organisms/DREForm'
import { fmt, pct } from '@/lib/format'
import type { DREFinancial, DREComputed } from '@/features/consultoria/types'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from '@/lib/toast'

interface DREViewProps {
  clientId: string
}

type SectionKey = 'receitas' | 'deducoes' | 'outras' | 'folha' | 'fixas' | 'indicadores'

const SECTION_FIELDS: Record<SectionKey, { key: keyof DREFinancial; label: string }[]> = {
  receitas: [
    { key: 'revenue_proprios', label: 'Próprios' },
    { key: 'revenue_consignados', label: 'Consignados' },
    { key: 'revenue_repasse', label: 'Repasse' },
  ],
  deducoes: [
    { key: 'ded_preparacao', label: 'Preparação' },
    { key: 'ded_comissoes', label: 'Comissões' },
    { key: 'ded_impostos', label: 'Impostos' },
  ],
  outras: [
    { key: 'other_revenue_financiamento', label: 'Financiamento' },
    { key: 'other_revenue_outros1', label: 'Outros 1' },
    { key: 'other_revenue_outros2', label: 'Outros 2' },
    { key: 'other_revenue_outros3', label: 'Outros 3' },
  ],
  folha: [
    { key: 'payroll_salarios', label: 'Salários' },
    { key: 'payroll_inss', label: 'INSS' },
    { key: 'payroll_fgts', label: 'FGTS' },
    { key: 'payroll_seguro_social', label: 'Seguro Social' },
    { key: 'payroll_tempo_servico', label: 'Tempo Serviço' },
    { key: 'payroll_13salario', label: '13º Salário' },
    { key: 'payroll_ferias', label: 'Férias' },
    { key: 'payroll_indenizacao', label: 'Indenização' },
    { key: 'payroll_outros', label: 'Outros' },
  ],
  fixas: [
    { key: 'exp_fornecedores', label: 'Fornecedores' },
    { key: 'exp_agua', label: 'Água' },
    { key: 'exp_limpeza', label: 'Limpeza' },
    { key: 'exp_viagens', label: 'Viagens' },
    { key: 'exp_energia', label: 'Energia' },
    { key: 'exp_telefone', label: 'Telefone' },
    { key: 'exp_contabilidade', label: 'Contabilidade' },
    { key: 'exp_aluguel', label: 'Aluguel' },
    { key: 'exp_frete', label: 'Frete' },
    { key: 'exp_contribuicoes', label: 'Contribuições' },
    { key: 'exp_terceiros', label: 'Terceiros' },
    { key: 'exp_marketing', label: 'Marketing' },
    { key: 'exp_iptu', label: 'IPTU' },
    { key: 'exp_combustivel', label: 'Combustível' },
    { key: 'exp_manutencao_imovel', label: 'Manut. Imóvel' },
    { key: 'exp_seguranca', label: 'Segurança' },
    { key: 'exp_cartorio', label: 'Cartório' },
    { key: 'exp_pos_venda', label: 'Pós-Venda' },
    { key: 'exp_ir_csll', label: 'IR/CSLL' },
    { key: 'exp_sistemas', label: 'Sistemas' },
    { key: 'exp_emprestimo_pf', label: 'Empréstimo PF' },
    { key: 'exp_emprestimo_pj', label: 'Empréstimo PJ' },
    { key: 'exp_tarifas', label: 'Tarifas' },
    { key: 'exp_informatica', label: 'Informática' },
    { key: 'exp_treinamentos', label: 'Treinamentos' },
    { key: 'exp_outras', label: 'Outras' },
  ],
  indicadores: [
    { key: 'volume_vendas', label: 'Volume Vendas' },
    { key: 'volume_leads', label: 'Volume Leads' },
    { key: 'volume_agendamentos', label: 'Volume Agendamentos' },
    { key: 'capital_proprio', label: 'Capital Próprio' },
  ],
}

const ALL_SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'receitas', title: 'RECEITAS' },
  { key: 'deducoes', title: 'DEDUÇÕES' },
  { key: 'outras', title: 'OUTRAS RECEITAS' },
  { key: 'folha', title: 'FOLHA DE PAGAMENTO' },
  { key: 'fixas', title: 'DESPESAS FIXAS' },
  { key: 'indicadores', title: 'INDICADORES' },
]

const FORM_SECTIONS: DREFormSection[] = ALL_SECTIONS.map((sec) => ({
  key: sec.key,
  title: sec.title,
  fields: [
    ...SECTION_FIELDS[sec.key].map((f) => ({ key: f.key as string, label: f.label })),
    ...(sec.key === 'folha' ? [{ key: 'pro_labore', label: 'Pró-Labore' }] : []),
  ],
}))

function makeEmptyForm(): Record<string, number | string> {
  const base: Record<string, number | string> = {
    reference_date: new Date().toISOString().slice(0, 7),
    pro_labore: 0,
  }
  for (const sec of Object.values(SECTION_FIELDS)) {
    for (const f of sec) {
      base[f.key] = 0
    }
  }
  return base
}

const TABLE_ROWS: DRETableRow[] = [
  { label: 'RECEITAS', getValue: () => null, isHeader: true },
  { label: 'Margem Bruta', getValue: (c) => c.gross_margin },
  { label: '(-) Deduções', getValue: (c) => -c.total_deductions },
  { label: 'Margem Líquida', getValue: (c) => c.net_sales_margin, bold: true, color: 'green' },
  { label: '(+) Outras Receitas', getValue: (c) => c.other_revenue },
  { label: 'Lucro Bruto', getValue: (c) => c.gross_profit, bold: true, color: 'green' },
  { label: 'DESPESAS', getValue: () => null, isHeader: true },
  { label: 'Folha de Pagamento', getValue: (c) => -c.total_payroll },
  { label: 'Pró-Labore', getValue: (c) => -c.pro_labore },
  { label: 'Despesas Fixas', getValue: (c) => -c.total_fixed },
  { label: 'Despesas Totais', getValue: (c) => -c.total_expenses, bold: true, color: 'red' },
  { label: 'RESULTADO', getValue: () => null, isHeader: true },
  { label: 'Lucro Líquido', getValue: (c) => c.net_profit, bold: true },
  { label: 'INDICADORES', getValue: () => null, isHeader: true },
  { label: 'Volume Vendas', getValue: (_c, f) => f.volume_vendas || 0, format: 'number' },
  { label: 'Taxa Leads -> Agd', getValue: (c) => c.lead_to_agd_rate ?? null, format: 'percent' },
  { label: 'Taxa Agd -> Venda', getValue: (c) => c.agd_to_sale_rate ?? null, format: 'percent' },
  { label: 'Ticket Médio', getValue: (c) => c.avg_ticket },
  { label: 'Margem Bruta/Carro', getValue: (c) => c.margin_per_car },
  { label: 'Custo por Venda (CAC)', getValue: (c) => c.cac },
  { label: 'Margem Líquida/Carro', getValue: (c) => c.net_margin_per_car },
  { label: 'Custo Prep./Carro', getValue: (c) => c.prep_cost_per_car },
  { label: 'Pós-Venda/Carro', getValue: (c) => c.posvenda_per_car },
  { label: 'Lucro/Carro', getValue: (c) => c.profit_per_car },
  { label: 'Rentabilidade', getValue: (c) => c.rentability, format: 'percent' },
]

export const DREView: React.FC<DREViewProps> = ({ clientId }) => {
  const {
    financials,
    computed: computedMap,
    loading,
    saving,
    upsertFinancial,
    deleteFinancial,
  } = useDRE(clientId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [form, setForm] = useState<Record<string, number | string>>(makeEmptyForm())

  const latestComputed = useMemo(() => {
    if (financials.length === 0) return null
    return computedMap.get(financials[0].id) ?? null
  }, [financials, computedMap])

  const financialsByMonth = useMemo(() => {
    const map = new Map<string, { fin: DREFinancial; comp: DREComputed }>()
    for (const f of financials) {
      const month = f.reference_date?.slice(0, 7) || ''
      if (!map.has(month)) {
        map.set(month, { fin: f, comp: computeDRE(f) })
      }
    }
    return map
  }, [financials])

  const months = useMemo(() => {
    const now = new Date()
    const result: string[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      result.push(d.toISOString().slice(0, 7))
    }
    return result
  }, [])

  const openCreate = () => {
    setEditingId(undefined)
    setForm(makeEmptyForm())
    setModalOpen(true)
  }

  const openEdit = (fin: DREFinancial) => {
    setEditingId(fin.id)
    const base: Record<string, number | string> = {
      reference_date: fin.reference_date?.slice(0, 7) || '',
      pro_labore: fin.pro_labore || 0,
    }
    for (const sec of Object.values(SECTION_FIELDS)) {
      for (const f of sec) {
        base[f.key] = (fin[f.key] as number) || 0
      }
    }
    setForm(base)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.reference_date) {
      toast.error('Informe o mês de referência.')
      return
    }
    const payload: Partial<DREFinancial> = {
      reference_date: (form.reference_date as string) + '-01',
      pro_labore: Number(form.pro_labore) || 0,
    }
    if (editingId) payload.id = editingId
    for (const sec of Object.values(SECTION_FIELDS)) {
      for (const f of sec) {
        ;(payload as Record<string, unknown>)[f.key] = Number(form[f.key]) || 0
      }
    }
    const ok = await upsertFinancial(payload)
    if (ok) {
      toast.success(editingId ? 'DRE atualizado!' : 'Mês lançado!')
      setModalOpen(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteFinancial(id)
    if (ok) {
      toast.success('Registro excluído.')
      setModalOpen(false)
    }
  }

  const formComputed = useMemo(() => {
    const partial: Partial<DREFinancial> = {}
    for (const sec of Object.values(SECTION_FIELDS)) {
      for (const f of sec) {
        ;(partial as Record<string, unknown>)[f.key] = Number(form[f.key]) || 0
      }
    }
    partial.pro_labore = Number(form.pro_labore) || 0
    return computeDRE(partial)
  }, [form])

  if (loading) {
    return (
      <div className="p-mx-lg text-center text-gray-500">
        Carregando DRE...
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-mx-lg">
      <div className="flex items-center justify-between">
        <Typography variant="h3">DRE & EVOLUÇÃO FINANCEIRA</Typography>
        <Button size="sm" className="" onClick={openCreate}>
          <Plus size={16} className="mr-2" /> LANÇAR MÊS
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-mx-md">
        <Card className="p-mx-lg text-white border-none">
          <Typography variant="caption" tone="white" className="opacity-60 mb-2 block">LUCRO LÍQUIDO (MÊS ATUAL)</Typography>
          <div className="flex items-baseline gap-mx-xs">
            <Typography variant="h1" tone="white" className="text-4xl">
              R$ {fmt(latestComputed?.net_profit ?? 0)}
            </Typography>
            {(latestComputed?.net_profit ?? 0) >= 0 ? (
              <TrendingUp size={20} className="text-white/70" />
            ) : (
              <TrendingDown size={20} className="text-white/70" />
            )}
          </div>
        </Card>
        <Card className="p-mx-lg bg-white border-none">
          <Typography variant="caption" tone="muted" className="mb-2 block">RENTABILIDADE / CAPITAL</Typography>
          <div className="flex items-baseline gap-mx-xs">
            <Typography variant="h1" className="text-4xl">{pct((latestComputed?.rentability ?? 0) * 100)}</Typography>
            <Typography variant="tiny" tone="muted" className="">a.m.</Typography>
          </div>
        </Card>
        <Card className="p-mx-lg bg-white border-none">
          <Typography variant="caption" tone="muted" className="mb-2 block">LUCRO / CARRO</Typography>
          <div className="flex items-baseline gap-mx-xs">
            <Typography variant="h1" className="text-4xl">R$ {fmt(latestComputed?.profit_per_car ?? 0)}</Typography>
            <Typography variant="tiny" tone="muted" className="">unidade</Typography>
          </div>
        </Card>
      </div>

      <DRETable
        rows={TABLE_ROWS}
        months={months}
        data={financialsByMonth}
        onEdit={openEdit}
      />

      <DREForm
        open={modalOpen}
        onOpenChange={setModalOpen}
        sections={FORM_SECTIONS}
        values={form}
        onChange={(updated) => setForm(updated)}
        onSubmit={handleSave}
        onDelete={handleDelete}
        editingId={editingId}
        loading={saving}
        computedPreview={{
          gross_profit: formComputed.gross_profit,
          total_expenses: formComputed.total_expenses,
          net_profit: formComputed.net_profit,
          rentability: formComputed.rentability,
          cac: formComputed.cac,
        }}
      />
    </section>
  )
}
