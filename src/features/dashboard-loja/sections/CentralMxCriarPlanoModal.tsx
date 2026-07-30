import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { supabase } from '@/lib/supabase'
import type { CentralMxPlanoScope } from '../hooks/useCentralMxPlanosAcaoSegmentado'
import { scopeToDb } from '../lib/scopeType'

/**
 * Modal de criação rápida de plano de ação — Sprint 3 (S3-T2).
 *
 * Aciona a RPC `criar_plano_acao` (migration 20260530170000) que valida escopo
 * e autoria. O escopo (loja/dept/vendedor) é informado pelo painel chamador,
 * junto com o scope_id correspondente.
 */

type Props = {
  open: boolean
  defaultScope: CentralMxPlanoScope
  scopeOptions: Array<{ scope: CentralMxPlanoScope; scopeId: string; label: string }>
  onClose: () => void
  onCreated: () => void
}

type FormState = {
  scopeIdx: number
  departamento: string
  indicador: string
  problema: string
  acao: string
  como: string
  prazo: string
  prioridade: 'critica' | 'alta' | 'media' | 'baixa'
  origem: 'manual' | 'alertas' | 'score' | 'consultor'
}

const INITIAL: FormState = {
  scopeIdx: 0,
  departamento: 'comercial',
  indicador: '',
  problema: '',
  acao: '',
  como: '',
  prazo: '',
  prioridade: 'media',
  origem: 'manual',
}

export function CentralMxCriarPlanoModal({
  open,
  defaultScope,
  scopeOptions,
  onClose,
  onCreated,
}: Props) {
  const defaultIdx = Math.max(
    0,
    scopeOptions.findIndex((option) => option.scope === defaultScope),
  )
  const [form, setForm] = useState<FormState>({ ...INITIAL, scopeIdx: defaultIdx })
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const target = scopeOptions[form.scopeIdx]
    if (!target) {
      toast.error('Escopo inválido.')
      return
    }
    if (
      !form.indicador.trim() ||
      !form.problema.trim() ||
      !form.acao.trim() ||
      !form.departamento.trim()
    ) {
      toast.error('Preencha indicador, problema, ação e departamento.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.rpc('criar_plano_acao_v2', {
        p_scope_type: scopeToDb(target.scope),
        p_scope_id: target.scopeId,
        p_objetivo: '',
        p_departamento: form.departamento.trim(),
        p_indicador: form.indicador.trim(),
        p_problema: form.problema.trim(),
        p_acao: form.acao.trim(),
        p_como: form.como.trim() || null,
        p_responsavel_id: null,
        p_prazo: form.prazo || null,
        p_prioridade: form.prioridade,
        p_origem: form.origem,
        p_origem_ref_id: null,
        p_origem_ref_table: null,
      })
      if (error) throw error
      toast.success('Plano de ação criado.')
      onCreated()
      setForm({ ...INITIAL, scopeIdx: defaultIdx })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar o plano.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="criar-plano-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-mx-md"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div
        role="presentation"
        className="w-full max-w-2xl rounded-mx-2xl bg-white p-mx-xl shadow-mx-xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-mx-sm">
          <Typography variant="h3" id="criar-plano-title" className="">
            Novo plano de ação
          </Typography>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-mx-md p-mx-tiny text-text-tertiary hover:bg-surface-alt"
          >
            <X size={18} />
          </button>
        </div>

        <form className="mt-mx-md space-y-mx-md" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-mx-sm md:grid-cols-2">
            <div>
              <label
                htmlFor="plano-scope"
                className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
              >
                Escopo
              </label>
              <select
                id="plano-scope"
                value={form.scopeIdx}
                onChange={(event) => update('scopeIdx', Number(event.target.value))}
                className="w-full h-mx-14 rounded-mx-md border border-border-default bg-white px-5 text-sm font-black uppercase shadow-inner outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5"
              >
                {scopeOptions.map((option, index) => (
                  <option key={`${option.scope}-${option.scopeId}-${index}`} value={index}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="plano-departamento"
                className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
              >
                Departamento
              </label>
              <select
                id="plano-departamento"
                value={form.departamento}
                onChange={(event) => update('departamento', event.target.value)}
                className="w-full h-mx-14 rounded-mx-md border border-border-default bg-white px-5 text-sm font-black uppercase shadow-inner outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5"
              >
                <option value="comercial">Comercial</option>
                <option value="marketing">Marketing</option>
                <option value="produto">Produto</option>
                <option value="financeiro">Financeiro</option>
                <option value="rh">RH</option>
                <option value="operacional">Operacional</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="plano-indicador"
              className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
            >
              Indicador
            </label>
            <Input
              id="plano-indicador"
              value={form.indicador}
              onChange={(event) => update('indicador', event.target.value)}
              placeholder="ex.: sales_goal_attainment"
              required
            />
          </div>

          <div>
            <label
              htmlFor="plano-problema"
              className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
            >
              Problema
            </label>
            <Input
              id="plano-problema"
              value={form.problema}
              onChange={(event) => update('problema', event.target.value)}
              placeholder="O que está acontecendo?"
              required
            />
          </div>

          <div>
            <label
              htmlFor="plano-acao"
              className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
            >
              Ação
            </label>
            <Input
              id="plano-acao"
              value={form.acao}
              onChange={(event) => update('acao', event.target.value)}
              placeholder="O que vamos fazer?"
              required
            />
          </div>

          <div>
            <label
              htmlFor="plano-como"
              className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
            >
              Como (opcional)
            </label>
            <Input
              id="plano-como"
              value={form.como}
              onChange={(event) => update('como', event.target.value)}
              placeholder="Como será executado?"
            />
          </div>

          <div className="grid grid-cols-1 gap-mx-sm md:grid-cols-3">
            <div>
              <label
                htmlFor="plano-prazo"
                className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
              >
                Prazo
              </label>
              <Input
                id="plano-prazo"
                type="date"
                value={form.prazo}
                onChange={(event) => update('prazo', event.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="plano-prioridade"
                className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
              >
                Prioridade
              </label>
              <select
                id="plano-prioridade"
                value={form.prioridade}
                onChange={(event) => update('prioridade', event.target.value as FormState['prioridade'])}
                className="w-full h-mx-14 rounded-mx-md border border-border-default bg-white px-5 text-sm font-black uppercase shadow-inner outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="plano-origem"
                className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
              >
                Origem
              </label>
              <select
                id="plano-origem"
                value={form.origem}
                onChange={(event) => update('origem', event.target.value as FormState['origem'])}
                className="w-full h-mx-14 rounded-mx-md border border-border-default bg-white px-5 text-sm font-black uppercase shadow-inner outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5"
              >
                <option value="manual">Manual</option>
                <option value="alertas">Alerta</option>
                <option value="score">Score</option>
                <option value="consultor">Consultor</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-mx-xs pt-mx-sm border-t border-border-default">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
              Criar plano
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
