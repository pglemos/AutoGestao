import type { ReactNode } from 'react'
import { Building2 } from 'lucide-react'
import { OwnerProvider, useOwner } from '@/components/owner/OwnerContext'
import ConsultantRequestModal from '@/components/owner/ConsultantRequestModal'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

function InternalStoreSelector({ title }: { title: string }) {
  const { currentUnits, unitId, setUnitId, loading } = useOwner() as {
    currentUnits: Array<{ id: string; name: string }>
    unitId: string
    setUnitId: (value: string) => void
    loading: boolean
  }

  return (
    <header className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Administração global MX</p>
        <h1 className="mt-1 text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Selecione uma loja ativa para criar, editar e acompanhar os registros.</p>
      </div>
      <label className="flex min-w-[280px] items-center gap-2 text-sm font-medium text-muted-foreground">
        <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Loja ativa</span>
        <select
          aria-label={`Selecionar loja ativa para ${title}`}
          value={unitId || ''}
          onChange={(event) => setUnitId(event.target.value)}
          disabled={loading || currentUnits.length === 0}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Selecione uma loja</option>
          {currentUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select>
      </label>
    </header>
  )
}

export function InternalMxOwnerBridge({ title, children }: { title: string; children: ReactNode }) {
  return (
    <OwnerProvider>
      <InternalMxRealtimeBridge>
        <div className="min-h-full p-4 lg:p-6">
          <InternalStoreSelector title={title} />
          {children}
        </div>
      </InternalMxRealtimeBridge>
      <ConsultantRequestModal />
    </OwnerProvider>
  )
}

function InternalMxRealtimeBridge({ children }: { children: ReactNode }) {
  useEffect(() => {
    const channel = supabase
      .channel('internal-mx-global-planning')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planos_acao' }, () => window.dispatchEvent(new Event('mx:planning-reload')))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regras_metas_loja' }, () => window.dispatchEvent(new Event('mx:planning-reload')))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes_consultoria' }, () => window.dispatchEvent(new Event('mx:planning-reload')))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitas_consultoria' }, () => window.dispatchEvent(new Event('mx:planning-reload')))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_consultoria' }, () => window.dispatchEvent(new Event('mx:planning-reload')))
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return <>{children}</>
}
