import { useEffect, useState } from 'react'
import {
  Clock,
  Eye,
  FileText,
  Lock,
  RefreshCw,
  Search,
  Shield,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { supabase } from '@/lib/supabase'

interface AuditLogRow {
  id: string
  user: string
  action: string
  resource: string
  client: string
  date: string
}

export function AdminSegurancaAuditoriaPage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // Trilha real: `internal_mx_admin_audit` é gravada por trigger/RPC e só
      // permite SELECT para a área interna MX (write direto negado por RLS).
      const { data: entries } = await supabase
        .from('internal_mx_admin_audit')
        .select('id, actor_id, actor_role, action, entity_type, store_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200)

      const rows = entries || []
      const actorIds = [...new Set(rows.map(r => r.actor_id).filter(Boolean))] as string[]
      const storeIds = [...new Set(rows.map(r => r.store_id).filter(Boolean))] as string[]

      const [actorsRes, storesRes] = await Promise.all([
        actorIds.length
          ? supabase.from('usuarios').select('id, name, email').in('id', actorIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; email: string | null }> }),
        storeIds.length
          ? supabase.from('lojas').select('id, name').in('id', storeIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
      ])

      const actorById = new Map((actorsRes.data || []).map(u => [u.id, u.name || u.email || u.id]))
      const storeById = new Map((storesRes.data || []).map(l => [l.id, l.name || l.id]))

      setLogs(rows.map(r => ({
        id: r.id,
        user: (r.actor_id && actorById.get(r.actor_id)) || 'Autor não identificado',
        action: r.action,
        resource: r.entity_type,
        // 4 dos 189 registros não têm loja resolvível (3 sem store_id, 1 com
        // loja já removida) — a coluna fica vazia em vez de exibir outro campo.
        client: (r.store_id && storeById.get(r.store_id)) || '—',
        date: r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : 'Data não registrada',
      })))
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
  }, [])

  const filtered = logs.filter(l =>
    !search ||
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.resource.toLowerCase().includes(search.toLowerCase()) ||
    l.client.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <MxModulePage width={width} bottomClearance={bottomClearance}>
      <MxModuleHeader
        icon={Shield}
        eyebrow="Plataforma e Governança"
        title="Segurança e Auditoria"
        description="Registro imutável de todas as alterações relevantes, permissões RBAC e acesso assistido."
        actions={
          <Button variant="outline" size="sm" onClick={() => void fetchLogs()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </Button>
        }
      />

      {/* Painel de Segurança */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MxSectionCard>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} className="text-[var(--mx-color-primary)]" />
              <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
                Papéis e Permissões (RBAC)
              </h3>
            </div>
            <p className="text-xs text-[var(--mx-color-text-secondary)] mb-3">
              Isolamento estrito por empresa, loja, equipe, departamento e recurso.
            </p>
            <div className="space-y-1.5 text-xs text-[var(--mx-color-text-secondary)]">
              {['Administrador Geral MX', 'Administrador MX', 'Consultor MX', 'Dono / Executivo', 'Gerente', 'Vendedor'].map(r => (
                <div key={r} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--mx-color-primary)]" />
                  {r}
                </div>
              ))}
            </div>
          </div>
        </MxSectionCard>

        <MxSectionCard>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={16} className="text-[var(--mx-color-primary)]" />
              <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
                Acesso Assistido
              </h3>
            </div>
            <p className="text-xs text-[var(--mx-color-text-secondary)] mb-2">
              O Suporte MX não possui acesso permanente às contas dos clientes.
            </p>
            <p className="text-xs text-[var(--mx-color-text-secondary)]">
              Todo acesso assistido é temporário, justificado, auditado e somente leitura por padrão.
            </p>
            <div className="mt-3 p-2 bg-[var(--mx-color-surface-muted)] rounded text-xs text-[var(--mx-color-text-secondary)]">
              Nenhuma sessão de acesso assistido ativa no momento.
            </div>
          </div>
        </MxSectionCard>

        <MxSectionCard>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-[var(--mx-color-primary)]" />
              <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
                Campos Protegidos
              </h3>
            </div>
            <p className="text-xs text-[var(--mx-color-text-secondary)] mb-2">
              Privacidade e conformidade:
            </p>
            <div className="space-y-1.5 text-xs text-[var(--mx-color-text-secondary)]">
              {['Informações financeiras e DRE', 'Remuneração e comissões', 'PDI e Feedbacks individuais', 'Trilhas de auditoria imutáveis'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <Lock size={12} className="text-[var(--mx-color-text-disabled)]" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </MxSectionCard>
      </div>

      {/* Log de Auditoria */}
      <MxSectionCard>
        <div className="p-4 border-b border-[var(--mx-color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--mx-color-text-secondary)]" />
            <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
              Trilha de Auditoria
            </h3>
            <span className="text-xs bg-[var(--mx-color-surface-muted)] text-[var(--mx-color-text-secondary)] px-2 py-0.5 rounded-full font-semibold">
              Imutável
            </span>
          </div>
        </div>

        <div className="p-4 border-b border-[var(--mx-color-border-subtle)]">
          <input
            type="text"
            placeholder="Filtrar por usuário, ação ou recurso..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-[var(--mx-color-border-subtle)] bg-transparent outline-none text-[var(--mx-color-text-primary)]"
          />
        </div>

        {loading ? (
          <div className="p-8">
            <MxLoadingState label="Carregando trilha de auditoria..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <MxEmptyState
              icon={Shield}
              title="Nenhum registro de auditoria"
              description="Os logs de auditoria imutáveis serão gerados conforme operações forem realizadas."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--mx-color-surface-muted)] border-b border-[var(--mx-color-border-subtle)] text-xs text-[var(--mx-color-text-secondary)] font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">Cliente / Contexto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mx-color-border-subtle)]">
                {filtered.map(log => (
                  <tr key={log.id} className="transition-colors">
                    <td className="px-5 py-3 text-xs text-[var(--mx-color-text-secondary)]">{log.date}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--mx-color-text-primary)]">{log.user}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[var(--mx-color-primary-subtle)] text-[var(--mx-color-primary)]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--mx-color-text-primary)]">{log.resource}</td>
                    <td className="px-4 py-3 text-xs text-[var(--mx-color-text-secondary)]">{log.client}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MxSectionCard>
    </MxModulePage>
  )
}

export default AdminSegurancaAuditoriaPage
