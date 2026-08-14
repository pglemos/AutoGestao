import { toast } from '@/lib/toast'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { DEFAULT_CONSULTING_MODULES } from '@/hooks/useConsultingModules'
import type { ConsultingClientModule } from '@/lib/schemas/consulting-client.schema'

type Props = {
  modules: ConsultingClientModule[]
  loading?: boolean
  canManage?: boolean
  onToggle: (moduleKey: ConsultingClientModule['module_key'], enabled: boolean) => Promise<{ error: string | null }>
}

export function ConsultingModulesPanel({ modules, loading = false, canManage = false, onToggle }: Props) {
  const moduleMap = new Map(modules.map((module) => [module.module_key, module]))
  const mergedModules = DEFAULT_CONSULTING_MODULES.map((defaultModule) => ({
    ...defaultModule,
    enabled: false,
    ...(moduleMap.get(defaultModule.module_key) || {}),
  }))

  const handleToggle = async (moduleKey: ConsultingClientModule['module_key'], enabled: boolean) => {
    const { error } = await onToggle(moduleKey, enabled)
    if (error) {
      toast.error(error)
      return
    }
    toast.success(enabled ? 'Modulo habilitado.' : 'Modulo desabilitado.')
  }

  return (
    <Card className="p-mx-lg border-none bg-white">
      <div className="flex items-start justify-between gap-mx-md mb-mx-md">
        <div>
          <Typography variant="h3">MODULOS INTERNOS</Typography>
          <Typography variant="caption" tone="muted">
            Recursos de consultoria habilitados para este cliente.
          </Typography>
        </div>
        <Badge variant="outline" className="rounded-mx-full px-3 py-1">
          {loading ? 'CARREGANDO' : `${mergedModules.filter((item) => item.enabled).length}/${mergedModules.length} ATIVOS`}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-mx-sm">
        {mergedModules.map((module) => (
          <div key={module.module_key} className="p-mx-md rounded-xl bg-surface-alt border border-border space-y-mx-sm">
            <div className="flex items-start justify-between gap-mx-sm">
              <div>
                <Typography variant="p" className="">{module.label}</Typography>
                <Typography variant="tiny" tone="muted">{module.module_key}</Typography>
              </div>
              <Badge variant={module.enabled ? 'success' : 'outline'} className="rounded-mx-full px-3 py-1">
                {module.enabled ? 'ATIVO' : 'INATIVO'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-mx-sm">
              {module.premium ? (
                <Badge variant="warning" className="rounded-mx-full px-3 py-1 border-none">PREMIUM</Badge>
              ) : (
                <Typography variant="tiny" tone="muted">Base PMR</Typography>
              )}
              {canManage && (
                <Button
                  type="button"
                  variant={module.enabled ? 'ghost' : 'outline'}
                  size="sm"
                  onClick={() => handleToggle(module.module_key, !module.enabled)}
                  disabled={loading}
                >
                  {module.enabled ? 'DESABILITAR' : 'HABILITAR'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
