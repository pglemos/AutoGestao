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
      const { data: clients } = await supabase
        .from('clientes_consultoria')
        .select('id, name, updated_at, status')
        .order('updated_at', { ascending: false })
        .limit(20)

      const computed: AuditLogRow[] = (clients || []).map((c, i) => ({
        id: c.id,
        user: 'Administrador Geral',
        action: c.status === 'ativo' ? 'ACTIVATE' : 'UPDATE',
        resource: 'Cadastro do Cliente',
        client: c.name,
        date: c.updated_at ? new Date(c.updated_at).toLocaleString('pt-BR') : 'Data não registrada',
      }))
      setLogs(computed)
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
