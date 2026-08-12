import { useState } from 'react'
import { Plus, Trophy } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { EmptyState } from '@/components/atoms/EmptyState'
import { useLojasDoUsuario } from '@/hooks/useLojasDoUsuario'
import { useBancoTalentos, perfilEntries } from '../hooks/useComportamental'

interface FormState {
  cargo: string
  descricao: string
  amostra_n: string
  loja_id: string
  baseado_em_score: boolean
}

const EMPTY: FormState = { cargo: '', descricao: '', amostra_n: '', loja_id: '', baseado_em_score: true }

export function BancoTalentos() {
  const { lojas } = useLojasDoUsuario()
  const { talentos, loading, adicionarTalento } = useBancoTalentos()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.descricao.trim()) { toast.error('Descreva o perfil vencedor.'); return }
    setSaving(true)
    const { error } = await adicionarTalento({
      cargo: form.cargo.trim() || null,
      descricao: form.descricao.trim(),
      amostra_n: Number(form.amostra_n) || 0,
      loja_id: form.loja_id || null,
      baseado_em_score: form.baseado_em_score,
      perfil_agregado: {},
    })
    setSaving(false)
    if (error) toast.error(error)
    else { toast.success('Perfil vencedor registrado.'); setForm(EMPTY) }
  }

  return (
    <div className="space-y-mx-lg">
      <div className="rounded-2xl border border-status-warning bg-status-warning-surface p-mx-sm">
        <p className="text-xs font-bold text-status-warning">
          O banco de talentos guarda <strong>padrões agregados</strong> de alta performance — nunca expõe o resultado individual de um colaborador.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-gray-50 p-mx-md">
        <Typography variant="caption" tone="muted" className="">Registrar perfil vencedor</Typography>
        <div className="mt-mx-sm grid gap-mx-sm md:grid-cols-3">
          <Field label="Cargo (opcional)"><Input value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Ex.: Vendedor" /></Field>
          <Field label="Amostra (nº)"><Input inputMode="numeric" value={form.amostra_n} onChange={e => setForm(p => ({ ...p, amostra_n: e.target.value }))} placeholder="0" /></Field>
          <Field label="Loja (opcional)">
            <select
              aria-label="Loja"
              value={form.loja_id}
              onChange={e => setForm(p => ({ ...p, loja_id: e.target.value }))}
              className="w-full h-mx-14 px-mx-sm bg-white border border-border rounded-2xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="">Todas</option>
              {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <div className="md:col-span-3"><Field label="Descrição do perfil"><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Traços comportamentais associados aos colaboradores de alta performance" /></Field></div>
        </div>
        <label className="mt-mx-sm flex items-center gap-mx-sm text-xs font-bold text-muted-foreground">
          <input type="checkbox" checked={form.baseado_em_score} onChange={e => setForm(p => ({ ...p, baseado_em_score: e.target.checked }))} className="h-4 w-4 accent-brand-primary" />
          Baseado no cruzamento com o score de performance
        </label>
        <div className="mt-mx-md flex justify-end">
          <Button type="submit" disabled={saving}><Plus size={16} className="mr-2" />{saving ? 'Salvando…' : 'Registrar'}</Button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm font-bold text-muted-foreground">Carregando banco de talentos…</p>
      ) : talentos.length === 0 ? (
        <EmptyState icon={<Trophy size={28} />} title="Banco de talentos vazio" description="Registre perfis vencedores para orientar futuras contratações." />
      ) : (
        <div className="grid gap-mx-md md:grid-cols-2">
          {talentos.map(t => {
            const entries = perfilEntries(t.perfil_agregado)
            return (
              <div key={t.id} className="rounded-2xl border border-border p-mx-md">
                <div className="flex items-center gap-mx-sm">
                  <Trophy size={16} className="text-status-warning" />
                  <span className="font-bold uppercase text-sm">{t.cargo || 'Perfil geral'}</span>
                  <span className="ml-auto text-xs font-bold text-muted-foreground">n={t.amostra_n}</span>
                </div>
                {t.descricao && <p className="mt-mx-sm text-sm font-medium text-muted-foreground">{t.descricao}</p>}
                {entries.length > 0 && (
                  <div className="mt-mx-sm flex flex-wrap gap-mx-xs">
                    {entries.map(([dim, val]) => (
                      <span key={dim} className="rounded-mx-full bg-gray-50 px-mx-sm py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{dim}: {val}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-mx-xs">
      <span className="block px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
