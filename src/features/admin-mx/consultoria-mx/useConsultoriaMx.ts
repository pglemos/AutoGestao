import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import {
  createMethodologyVersion,
  fetchProductsWithMethodology,
  publishMethodologyVersion,
  writeAuditLog,
  type MethodologyVersion,
  type ProductWithMethodology,
} from './consultoriaMxData'

export type ConsultoriaMxTab = 'visao' | 'produtos' | 'biblioteca' | 'relatorios' | 'historico'

export type ConsultoriaMxController = ReturnType<typeof useConsultoriaMxController>

export function useConsultoriaMxController() {
  const { supabaseUser, profile, role } = useAuth()
  const [rows, setRows] = useState<ProductWithMethodology[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<ConsultoriaMxTab>('visao')
  const [creating, setCreating] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [openAddMaterial, setOpenAddMaterial] = useState(false)
  const [openCreateReportTemplate, setOpenCreateReportTemplate] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    const result = await fetchProductsWithMethodology()
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const audit = useCallback(async (resource: string, action: string, valueAfter?: string, valueBefore?: string) => {
    if (!supabaseUser) return
    const userName = profile?.name || supabaseUser.user_metadata?.nome || supabaseUser.user_metadata?.full_name || supabaseUser.email || 'Usuário MX'
    await writeAuditLog({
      userId: supabaseUser.id,
      userName,
      userRole: role ?? 'administrador_mx',
      resource,
      action,
      valueAfter,
      valueBefore,
      origin: 'Consultoria MX',
    })
  }, [supabaseUser, profile, role])

  const createVersion = async (product: ProductWithMethodology, methodologyVersionNumber: string, sourceVersionId?: string | null) => {
    if (creating || !supabaseUser) return null
    setCreating(true)
    try {
      const result = await createMethodologyVersion(
        product.program_key,
        product.name ?? product.program_key,
        product.versao,
        methodologyVersionNumber,
        product.total_visits ?? 0,
        supabaseUser.id,
        sourceVersionId
      )
      if (result.error) {
        toast.error(result.error)
        return null
      }
      toast.success(`Versão ${methodologyVersionNumber} criada.`)
      await audit('Metodologia', 'METHODOLOGY_VERSION_CREATE', `${product.name} v${methodologyVersionNumber}`)
      await refetch()
      return result.version
    } finally {
      setCreating(false)
    }
  }

  const publish = async (version: MethodologyVersion, productName: string | null) => {
    if (publishing || !supabaseUser) return false
    setPublishing(version.id)
    try {
      const result = await publishMethodologyVersion(version, supabaseUser.id)
      if (result.error) {
        toast.error(result.error)
        return false
      }
      toast.success(`Metodologia v${version.methodology_version_number} publicada.`)
      await audit('Metodologia', 'METHODOLOGY_PUBLISH', `${productName} v${version.methodology_version_number}`)
      await refetch()
      return true
    } finally {
      setPublishing(null)
    }
  }

  const navigateToAddMaterial = () => {
    setTab('biblioteca')
    setOpenAddMaterial(true)
  }

  const navigateToCreateReportTemplate = () => {
    setTab('relatorios')
    setOpenCreateReportTemplate(true)
  }

  return {
    rows,
    loading,
    error,
    refetch,
    tab,
    setTab,
    creating,
    publishing,
    createVersion,
    publish,
    audit,
    openAddMaterial,
    setOpenAddMaterial,
    openCreateReportTemplate,
    setOpenCreateReportTemplate,
    navigateToAddMaterial,
    navigateToCreateReportTemplate,
    userId: supabaseUser?.id ?? null,
    userName: profile?.name ?? supabaseUser?.email ?? null,
    userRole: role ?? 'administrador_mx',
  }
}
