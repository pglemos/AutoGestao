import { useState } from 'react'
import { Plus, TrendingUp } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { EmptyState } from '@/components/atoms/EmptyState'
import { useCarreira } from '../hooks/useOrganograma'

interface FormState {
  cargo: string
  nivel: string
  nome: string
  requisitos: string
  proximo_cargo: string
}

const EMPTY: FormState = { cargo: '', nivel: '', nome: '', requisitos: '', proximo_cargo: '' }

export function PlanoCarreira() {
  const { porCargo, loading, adicionarNivel } = useCarreira()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cargo.trim() || !form.nome.trim()) { toast.error('Cargo e nome do nível são obrigatórios.'); return }
    setSaving(true)
    const { error } = await adicionarNivel({
      cargo: form.cargo.trim(),
      nivel: Number(form.nivel) || 0,
      nome: form.nome.trim(),
      requisitos: form.requisitos.trim() || null,
      proximo_cargo: form.proximo_cargo.trim() || null,
    })
    setSaving(false)
    if (error) toast.error(error)
    else { toast.success('Nível de carreira salvo.'); setForm(EMPTY) }
  }

  const cargos = [...porCargo.keys()]

  return (
    <div className="space-y-mx-lg">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-gray-50 p-mx-md">
        <Typography variant="caption" tone="muted" className="">Adicionar nível de carreira</Typography>
        <div className="mt-mx-sm grid gap-mx-sm md:grid-cols-3">
          <Field label="Cargo"><Input value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Ex.: Vendedor" /></Field>
          <Field label="Nível (nº)"><Input inputMode="numeric" value={form.nivel} onChange={e => setForm(p => ({ ...p, nivel: e.target.value }))} placeholder="1" /></Field>
          <Field label="Nome do nível"><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex.: Júnior" /></Field>
          <div className="md:col-span-2"><Field label="Requisitos"><Textarea value={form.requisitos} onChange={e => setForm(p => ({ ...p, requisitos: e.target.value }))} placeholder="O que é preciso para alcançar este nível" /></Field></div>
          <Field label="Próximo cargo"><Input value={form.proximo_cargo} onChange={e => setForm(p => ({ ...p, proximo_cargo: e.target.value }))} placeholder="Ex.: Gerente" /></Field>
        </div>
        <div className="mt-mx-md flex justify-end">
          <Button type="submit" disabled={saving}><Plus size={16} className="mr-2" />{saving ? 'Salvando…' : 'Salvar nível'}</Button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm font-bold text-muted-foreground">Carregando trilhas…</p>
      ) : cargos.length === 0 ? (
        <EmptyState icon={<TrendingUp size={28} />} title="Sem trilhas de carreira" description="Defina os níveis e requisitos de cada cargo." />
      ) : (
        <div className="grid gap-mx-md md:grid-cols-2">
          {cargos.map(cargo => (
            <div key={cargo} className="rounded-2xl border border-border p-mx-md">
              <Typography variant="caption" className="">{cargo}</Typography>
              <ol className="mt-mx-sm space-y-mx-sm">
                {porCargo.get(cargo)!.map(n => (
                  <li key={n.id} className="rounded-xl bg-gray-50 p-mx-sm">
                    <div className="flex items-center gap-mx-sm">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-mx-full bg-brand-primary px-2 text-xs font-bold text-white">{n.nivel}</span>
                      <span className="font-bold uppercase text-sm">{n.nome}</span>
                      {n.proximo_cargo && <span className="ml-auto text-xs font-bold text-muted-foreground">→ {n.proximo_cargo}</span>}
                    </div>
                    {n.requisitos && <p className="mt-mx-xs text-xs font-medium text-muted-foreground">{n.requisitos}</p>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
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
