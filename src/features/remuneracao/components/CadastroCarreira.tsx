import { useState } from 'react'
import { toast } from '@/lib/toast'
import { useTeam } from '@/hooks/useTeam'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'
import { useVendedoresNivelCarreira, type NivelCarreira } from '../hooks/useRemuneracao'

const NIVEL_LABEL: Record<NivelCarreira, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  lider: 'Líder',
}

export function CadastroCarreira({ lojaId }: { lojaId: string }) {
  const { sellers, loading: sellersLoading } = useTeam(lojaId)
  const { niveis, loading: niveisLoading, error, salvarNivel } = useVendedoresNivelCarreira(lojaId)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  const vendedores = sellers.filter(seller => seller.role === 'vendedor')

  const handleChange = async (sellerUserId: string, nivel: NivelCarreira) => {
    setSavingIds(prev => new Set([...prev, sellerUserId]))
    try {
      const { error } = await salvarNivel(sellerUserId, nivel)
      if (error) toast.error(error)
      else toast.success('Nível de carreira atualizado.')
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(sellerUserId)
        return next
      })
    }
  }

  const loading = sellersLoading || niveisLoading

  return (
    <div className="space-y-mx-lg">
      <div>
        <Typography variant="caption" tone="muted" className="font-bold uppercase tracking-wide">
          Nível de carreira
        </Typography>
        <Typography variant="tiny" tone="muted" className="mt-1">
          Mérito atribuído por dono/gerente (tempo de casa, comportamento, volume). Libera o bônus de carreira do plano.
        </Typography>
      </div>

      {error && <p className="text-sm font-bold text-status-error">Erro ao carregar: {error}</p>}

      {loading ? (
        <p className="text-sm font-bold text-text-tertiary">Carregando vendedores…</p>
      ) : vendedores.length === 0 ? (
        <EmptyState title="Nenhum vendedor nesta loja" description="Cadastre vendedores em Equipe & Usuários primeiro." />
      ) : (
        <div className="overflow-x-auto rounded-mx-xl border border-border-default">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-secondary">
              <tr className="text-left uppercase tracking-wide text-xs font-bold">
                <th className="px-mx-md py-mx-sm">Vendedor</th>
                <th className="px-mx-md py-mx-sm">Nível</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map(vendedor => (
                <tr key={vendedor.id} className="border-t border-border-default">
                  <td className="px-mx-md py-mx-sm font-bold">{vendedor.name}</td>
                  <td className="px-mx-md py-mx-sm">
                    <select
                      value={niveis[vendedor.id] || ''}
                      disabled={savingIds.has(vendedor.id)}
                      onChange={e => handleChange(vendedor.id, e.target.value as NivelCarreira)}
                      className="h-mx-12 px-mx-sm bg-white border border-border-default rounded-mx-xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Não definido</option>
                      {(Object.keys(NIVEL_LABEL) as NivelCarreira[]).map(nivel => (
                        <option key={nivel} value={nivel}>{NIVEL_LABEL[nivel]}</option>
                      ))}
                    </select>
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
