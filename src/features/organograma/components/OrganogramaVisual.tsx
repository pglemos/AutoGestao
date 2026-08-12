import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Users } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { EmptyState } from '@/components/atoms/EmptyState'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import { useOrganograma, type OrgNode } from '../hooks/useOrganograma'

export function OrganogramaVisual({ lojaId }: { lojaId: string }) {
  const { nos, tree, loading, error, adicionarNo, removerNo } = useOrganograma(lojaId)
  const [cargo, setCargo] = useState('')
  const [parentId, setParentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cargo.trim()) { toast.error('Informe o cargo.'); return }
    setSaving(true)
    const { error } = await adicionarNo({
      loja_id: lojaId,
      cargo: cargo.trim(),
      parent_id: parentId || null,
    })
    setSaving(false)
    if (error) toast.error(error)
    else { toast.success(`Cargo ${cargo} adicionado.`); setCargo(''); setParentId('') }
  }

  const handleRemove = (node: OrgNode) => {
    requestToastConfirmation({
      key: `org-no:${node.id}`,
      title: `Remover ${node.cargo}?`,
      description: node.children.length ? 'Os subordinados diretos ficarão sem chefia (parent nulo).' : 'O nó será removido do organograma.',
      label: 'Remover',
      onConfirm: async () => {
        const { error } = await removerNo(node.id)
        if (error) toast.error(error)
        else toast.success('Nó removido.')
      },
    })
  }

  return (
    <div className="space-y-mx-lg">
      <form onSubmit={handleAdd} className="rounded-2xl border border-border bg-gray-50 p-mx-md">
        <Typography variant="caption" tone="muted" className="">Adicionar cargo ao organograma</Typography>
        <div className="mt-mx-sm grid gap-mx-sm md:grid-cols-3">
          <label className="block space-y-mx-xs md:col-span-1">
            <span className="block px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Cargo</span>
            <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex.: Gerente" />
          </label>
          <label className="block space-y-mx-xs md:col-span-1">
            <span className="block px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Reporta a</span>
            <select aria-label="Reporta a"
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full h-mx-14 px-mx-sm bg-white border border-border rounded-2xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="">— Topo (sem chefia) —</option>
              {nos.map(n => <option key={n.id} value={n.id}>{n.cargo}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full"><Plus size={16} className="mr-2" />{saving ? 'Salvando…' : 'Adicionar'}</Button>
          </div>
        </div>
      </form>

      {error && <p className="text-sm font-bold text-status-error-text">Erro: {error}</p>}

      {loading ? (
        <p className="text-sm font-bold text-muted-foreground">Carregando organograma…</p>
      ) : tree.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="Organograma vazio" description="Adicione o primeiro cargo (topo da estrutura)." />
      ) : (
        <div className="rounded-2xl border border-border p-mx-sm">
          {tree.map(node => (
            <OrgNodeRow key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggle} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrgNodeRow({
  node, depth, expanded, onToggle, onRemove,
}: {
  node: OrgNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onRemove: (n: OrgNode) => void
}) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  return (
    <div>
      <div
        className="flex items-center gap-mx-sm rounded-xl px-mx-sm py-mx-xs hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button type="button" onClick={() => onToggle(node.id)} aria-label={isOpen ? 'Recolher' : 'Expandir'} className="text-muted-foreground">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : <span className="w-4" />}
        <span className="font-bold uppercase text-sm text-foreground">{node.cargo}</span>
        {hasChildren && <span className="text-xs font-bold text-muted-foreground">({node.children.length})</span>}
        <Button type="button" variant="ghost" size="icon" aria-label="Remover" className="ml-auto" onClick={() => onRemove(node)}>
          <Trash2 size={14} />
        </Button>
      </div>
      {hasChildren && isOpen && node.children.map(child => (
        <OrgNodeRow key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onRemove={onRemove} />
      ))}
    </div>
  )
}
