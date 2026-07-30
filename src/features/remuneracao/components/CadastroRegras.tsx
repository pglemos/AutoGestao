import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import {
  useRegrasRemuneracao,
  type RemuneracaoRegra,
  type RemuneracaoRegraTipo,
  type RemuneracaoTipoVeiculo,
} from '../hooks/useRemuneracao'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

type NivelCarreiraForm = '' | 'junior' | 'pleno' | 'lider'

type FormState = {
  cargo: string
  tipo: RemuneracaoRegraTipo
  valor: string
  percentual_meta_min: string
  unidade_meta_min: string
  cumulativo: boolean
  valor_por_unidade: boolean
  requer_bonus_individual: boolean
  tipo_veiculo: '' | RemuneracaoTipoVeiculo
  nivel_carreira: NivelCarreiraForm
}

const EMPTY: FormState = {
  cargo: 'Vendedor',
  tipo: 'comissao_por_venda',
  valor: '',
  percentual_meta_min: '',
  unidade_meta_min: '',
  cumulativo: false,
  valor_por_unidade: false,
  requer_bonus_individual: false,
  tipo_veiculo: '',
  nivel_carreira: '',
}

const TIPO_LABEL: Record<RemuneracaoRegraTipo, string> = {
  comissao_por_venda: 'Comissão por venda',
  bonus_meta: 'Bônus por meta',
  percentual_faturamento: 'Percentual sobre faturamento',
  comissao_categoria: 'Comissão por categoria',
  comissao_equipe: 'Comissão de equipe',
  bonus_carreira: 'Bônus de carreira',
}

const TIPO_VEICULO_LABEL: Record<RemuneracaoTipoVeiculo, string> = {
  carro: 'Carro',
  moto: 'Moto',
  caminhao: 'Caminhão',
}

const NIVEL_CARREIRA_LABEL: Record<'junior' | 'pleno' | 'lider', string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  lider: 'Líder',
}

export function CadastroRegras({ lojaId }: { lojaId: string }) {
  const { regras, loading, error, salvarRegra, removerRegra } = useRegrasRemuneracao(lojaId)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const num = (v: string) => Number(String(v).replace(',', '.')) || 0
  const regraUsaMetaPercentual = form.tipo === 'bonus_meta' || form.tipo === 'comissao_equipe'
  const regraUsaUnidade = form.tipo === 'bonus_meta' || form.tipo === 'comissao_equipe'
  const regraUsaConfigEquipe = form.tipo === 'comissao_equipe'
  const regraUsaCategoria = form.tipo === 'comissao_categoria'
  const regraUsaCarreira = form.tipo === 'bonus_carreira'
  const valorLabel = {
    comissao_por_venda: 'Valor por venda (R$)',
    bonus_meta: 'Bônus (R$)',
    percentual_faturamento: 'Percentual (%)',
    comissao_categoria: 'Valor por venda (R$)',
    comissao_equipe: 'Plus de equipe (R$)',
    bonus_carreira: 'Bônus de carreira (R$)',
  }[form.tipo]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cargo.trim()) { toast.error('Informe o cargo.'); return }
    if (num(form.valor) <= 0) { toast.error('Informe um valor maior que zero.'); return }
    if (regraUsaMetaPercentual && num(form.percentual_meta_min) <= 0 && num(form.unidade_meta_min) <= 0) {
      toast.error('Informe o percentual mínimo da meta ou o mínimo em carros.')
      return
    }
    if (regraUsaCategoria && !form.tipo_veiculo) {
      toast.error('Informe a categoria do veículo.')
      return
    }
    if (regraUsaCarreira && !form.nivel_carreira) {
      toast.error('Informe o nível de carreira.')
      return
    }

    setSaving(true)
    const { error } = await salvarRegra({
      loja_id: lojaId,
      cargo: form.cargo.trim(),
      tipo: form.tipo,
      valor: num(form.valor),
      percentual_meta_min: regraUsaMetaPercentual && num(form.percentual_meta_min) > 0 ? num(form.percentual_meta_min) : null,
      unidade_meta_min: regraUsaUnidade && num(form.unidade_meta_min) > 0 ? num(form.unidade_meta_min) : null,
      cumulativo: regraUsaConfigEquipe ? form.cumulativo : false,
      valor_por_unidade: regraUsaConfigEquipe ? form.valor_por_unidade : false,
      requer_bonus_individual: regraUsaConfigEquipe ? form.requer_bonus_individual : false,
      tipo_veiculo: regraUsaCategoria ? form.tipo_veiculo : null,
      nivel_carreira: regraUsaCarreira ? form.nivel_carreira : null,
      ativo: true,
    })
    setSaving(false)

    if (error) toast.error(error)
    else {
      toast.success('Regra de remuneração salva.')
      setForm(EMPTY)
    }
  }

  const handleRemove = (regra: RemuneracaoRegra) => {
    requestToastConfirmation({
      key: `rem-regra:${regra.id}`,
      title: `Remover ${TIPO_LABEL[regra.tipo]}?`,
      description: 'Esta regra deixa de compor o salário estimado do cargo.',
      label: 'Remover',
      onConfirm: async () => {
        const { error } = await removerRegra(regra.id)
        if (error) toast.error(error)
        else toast.success('Regra removida.')
      },
    })
  }

  return (
    <div className="space-y-mx-lg">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-gray-50 p-mx-md">
        <Typography variant="caption" tone="muted" className="font-bold tracking-wide">
          Regras de comissão e bônus
        </Typography>
        <div className="mt-mx-sm grid gap-mx-sm md:grid-cols-2 xl:grid-cols-[1fr_1.3fr_1fr_1fr_1fr]">
          <Field label="Cargo">
            <Input value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Ex.: Vendedor" />
          </Field>
          <Field label="Tipo">
            <select
              value={form.tipo}
              onChange={e => setForm(p => ({ ...p, tipo: e.target.value as RemuneracaoRegraTipo }))}
              className="w-full h-mx-14 px-mx-sm bg-white border border-gray-200 rounded-2xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="comissao_por_venda">Comissão por venda</option>
              <option value="bonus_meta">Bônus por meta</option>
              <option value="percentual_faturamento">Percentual sobre faturamento</option>
              <option value="comissao_categoria">Comissão por categoria</option>
              <option value="comissao_equipe">Comissão de equipe</option>
              <option value="bonus_carreira">Bônus de carreira</option>
            </select>
          </Field>
          <Field label={valorLabel}>
            <Input inputMode="decimal" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" />
          </Field>
          <Field label="Meta mínima (%)">
            <Input
              inputMode="decimal"
              value={form.percentual_meta_min}
              onChange={e => setForm(p => ({ ...p, percentual_meta_min: e.target.value }))}
              placeholder={regraUsaMetaPercentual ? '100' : 'Não se aplica'}
              disabled={!regraUsaMetaPercentual}
            />
          </Field>
          <Field label="Mínimo em carros">
            <Input
              inputMode="numeric"
              value={form.unidade_meta_min}
              onChange={e => setForm(p => ({ ...p, unidade_meta_min: e.target.value }))}
              placeholder={regraUsaUnidade ? 'Ex.: 8' : 'Não se aplica'}
              disabled={!regraUsaUnidade}
            />
          </Field>
          <Field label="Categoria">
            <select
              value={form.tipo_veiculo}
              onChange={e => setForm(p => ({ ...p, tipo_veiculo: e.target.value as FormState['tipo_veiculo'] }))}
              disabled={!regraUsaCategoria}
              className="w-full h-mx-14 px-mx-sm bg-white border border-gray-200 rounded-2xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 appearance-none cursor-pointer"
            >
              <option value="">Não se aplica</option>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
              <option value="caminhao">Caminhão</option>
            </select>
          </Field>
          <Field label="Nível de carreira">
            <select
              value={form.nivel_carreira}
              onChange={e => setForm(p => ({ ...p, nivel_carreira: e.target.value as NivelCarreiraForm }))}
              disabled={!regraUsaCarreira}
              className="w-full h-mx-14 px-mx-sm bg-white border border-gray-200 rounded-2xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 appearance-none cursor-pointer"
            >
              <option value="">Não se aplica</option>
              <option value="junior">Júnior</option>
              <option value="pleno">Pleno</option>
              <option value="lider">Líder</option>
            </select>
          </Field>
        </div>
        {regraUsaConfigEquipe && (
          <div className="mt-mx-sm flex flex-wrap gap-mx-md">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              <input type="checkbox" checked={form.cumulativo} onChange={e => setForm(p => ({ ...p, cumulativo: e.target.checked }))} />
              Cumulativo com outras faixas
            </label>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              <input type="checkbox" checked={form.valor_por_unidade} onChange={e => setForm(p => ({ ...p, valor_por_unidade: e.target.checked }))} />
              Valor multiplica pelos carros do vendedor
            </label>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              <input type="checkbox" checked={form.requer_bonus_individual} onChange={e => setForm(p => ({ ...p, requer_bonus_individual: e.target.checked }))} />
              Só paga se vendedor bateu o próprio mínimo
            </label>
          </div>
        )}
        <div className="mt-mx-md flex justify-end">
          <Button type="submit" disabled={saving} icon={<Plus size={16} />}>
            {saving ? 'Salvando…' : 'Salvar regra'}
          </Button>
        </div>
      </form>

      {error && <p className="text-sm font-bold text-status-error">Erro ao carregar: {error}</p>}

      {loading ? (
        <p className="text-sm font-bold text-gray-500">Carregando regras…</p>
      ) : regras.length === 0 ? (
        <EmptyState title="Nenhuma regra cadastrada" description="Adicione comissão por venda e bônus por meta para ativar o salário estimado." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr className="text-left uppercase tracking-wide text-xs font-bold">
                <th className="px-mx-md py-mx-sm">Cargo</th>
                <th className="px-mx-md py-mx-sm">Tipo</th>
                <th className="px-mx-md py-mx-sm">Categoria / Nível</th>
                <th className="px-mx-md py-mx-sm text-right">Valor</th>
                <th className="px-mx-md py-mx-sm text-right">Meta mínima</th>
                <th className="px-mx-md py-mx-sm">Config.</th>
                <th className="px-mx-md py-mx-sm" />
              </tr>
            </thead>
            <tbody>
              {regras.map(regra => (
                <tr key={regra.id} className="border-t border-gray-200">
                  <td className="px-mx-md py-mx-sm font-bold uppercase">{regra.cargo}</td>
                  <td className="px-mx-md py-mx-sm">{TIPO_LABEL[regra.tipo]}</td>
                  <td className="px-mx-md py-mx-sm">
                    {regra.tipo_veiculo
                      ? TIPO_VEICULO_LABEL[regra.tipo_veiculo as RemuneracaoTipoVeiculo] || regra.tipo_veiculo
                      : regra.nivel_carreira
                        ? NIVEL_CARREIRA_LABEL[regra.nivel_carreira as 'junior' | 'pleno' | 'lider'] || regra.nivel_carreira
                        : '—'}
                  </td>
                  <td className="px-mx-md py-mx-sm text-right font-bold">{BRL.format(Number(regra.valor))}</td>
                  <td className="px-mx-md py-mx-sm text-right">
                    {regra.unidade_meta_min != null
                      ? `${regra.unidade_meta_min} carro(s)`
                      : regra.tipo === 'bonus_meta' || regra.tipo === 'comissao_equipe'
                        ? `${Number(regra.percentual_meta_min || 0)}%`
                        : '—'}
                  </td>
                  <td className="px-mx-md py-mx-sm text-xs text-gray-500">
                    {[
                      regra.cumulativo && 'cumulativo',
                      regra.valor_por_unidade && 'por unidade',
                      regra.requer_bonus_individual && 'trava individual',
                    ].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-mx-md py-mx-sm text-right">
                    <Button type="button" variant="ghost" size="icon" aria-label="Remover" onClick={() => handleRemove(regra)}>
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-mx-xs">
      <span className="block px-1 text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  )
}
