import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import { PRODUCT_DEFAULT_CATALOG, buildInternalProductLink, defaultProductForm, toProductForm } from '../lib/digitalProductCatalog'
import { calculateDigitalProductMetrics, filterDigitalProducts } from '../lib/digitalProductFilters'
import { assertCanManageDigitalProducts, canManageDigitalProducts, normalizeDigitalProduct } from '../lib/digitalProductPolicy'
import { digitalProductSchema } from '../lib/digitalProductSchema'
import type { DigitalProductsController, ProductAudience, ProductCatalogMode, ProductForm, ProductRecord, ProductStatus } from '../types'

export function useDigitalProductsController(): DigitalProductsController {
  const { role } = useAuth()
  const canManage = canManageDigitalProducts(role)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [creatingDefaults, setCreatingDefaults] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [form, setForm] = useState<ProductForm>(defaultProductForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [catalogMode, setCatalogModeState] = useState<ProductCatalogMode>('administracao')
  const [audienceFilter, setAudienceFilter] = useState<ProductAudience | 'todos'>('todos')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'todos'>(canManage ? 'todos' : 'ativo')

  const queryProducts = useCallback(async () => {
    const response = await supabase
      .from('produtos_digitais')
      .select('id, name, description, link, category, target_roles, status, sort_order, created_at, updated_at')
      .order('created_at', { ascending: false })
    if (response.error) throw response.error
    const normalized = ((response.data || []) as ProductRecord[])
      .map(normalizeDigitalProduct)
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    setProducts(normalized)
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      await queryProducts()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar os produtos digitais.'
      setProducts([])
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [queryProducts])

  useEffect(() => { void fetchProducts() }, [fetchProducts])

  const missingDefaultProducts = useMemo(() => {
    const names = new Set(products.map((product: ProductRecord) => product.name.trim().toLocaleLowerCase('pt-BR')))
    return PRODUCT_DEFAULT_CATALOG.filter((product) => !names.has(product.name.toLocaleLowerCase('pt-BR')))
  }, [products])

  const filteredProducts = useMemo(() => filterDigitalProducts({
    products,
    role,
    canManage,
    mode: canManage ? catalogMode : 'consumo',
    filters: { searchTerm, audience: audienceFilter, status: statusFilter },
  }), [audienceFilter, canManage, catalogMode, products, role, searchTerm, statusFilter])

  const metrics = useMemo(() => calculateDigitalProductMetrics(products, role, canManage), [canManage, products, role])

  const refresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      await queryProducts()
      toast.success('Catálogo atualizado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o catálogo.')
    } finally {
      setIsRefetching(false)
    }
  }, [queryProducts])

  const guardManage = useCallback(() => {
    try {
      assertCanManageDigitalProducts(role)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Permissão negada.')
      return false
    }
  }, [role])

  const openCreateForm = useCallback(() => {
    if (!guardManage()) return
    setEditingProduct(null)
    setForm(defaultProductForm)
    setShowForm(true)
  }, [guardManage])

  const openEditForm = useCallback((product: ProductRecord) => {
    if (!guardManage()) return
    setEditingProduct(product)
    setForm(toProductForm(product))
    setShowForm(true)
  }, [guardManage])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditingProduct(null)
  }, [])

  const toggleAudience = useCallback((audience: ProductAudience) => {
    setForm((current: ProductForm) => {
      const targetRoles = current.target_roles.includes(audience)
        ? current.target_roles.filter((item: ProductAudience) => item !== audience)
        : [...current.target_roles, audience]
      return { ...current, target_roles: targetRoles }
    })
  }, [])

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!guardManage()) return
    const parsed = digitalProductSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Verifique os campos do produto.')
      return
    }
    const payload = {
      name: parsed.data.name,
      description: parsed.data.description,
      link: buildInternalProductLink(parsed.data.name),
      category: parsed.data.category,
      target_roles: parsed.data.target_roles,
      status: parsed.data.status,
      sort_order: parsed.data.sort_order,
    }
    setSaving(true)
    try {
      const response = editingProduct
        ? await supabase.from('produtos_digitais').update(payload).eq('id', editingProduct.id)
        : await supabase.from('produtos_digitais').insert(payload)
      if (response.error) throw response.error
      toast.success(editingProduct ? 'Produto atualizado.' : 'Produto criado.')
      setShowForm(false)
      setEditingProduct(null)
      setForm(defaultProductForm)
      await queryProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o produto.')
    } finally {
      setSaving(false)
    }
  }, [editingProduct, form, guardManage, queryProducts])

  const executeArchive = useCallback(async (product: ProductRecord) => {
    if (!guardManage()) return
    setSaving(true)
    try {
      const response = await supabase.from('produtos_digitais').update({ status: 'arquivado' satisfies ProductStatus }).eq('id', product.id)
      if (response.error) throw response.error
      toast.success('Produto arquivado.')
      await queryProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível arquivar o produto.')
    } finally {
      setSaving(false)
    }
  }, [guardManage, queryProducts])

  const requestArchive = useCallback((product: ProductRecord) => {
    if (!guardManage()) return
    requestToastConfirmation({
      key: `archive-product:${product.id}`,
      title: `Arquivar "${product.name}"?`,
      description: 'O produto sairá do catálogo operacional sem apagar o histórico.',
      label: 'Arquivar',
      onConfirm: () => executeArchive(product),
    })
  }, [executeArchive, guardManage])

  const createDefaultProducts = useCallback(async () => {
    if (!guardManage() || creatingDefaults) return
    if (!missingDefaultProducts.length) {
      toast.success('Produtos padrão já estão cadastrados.')
      return
    }
    setCreatingDefaults(true)
    try {
      const payload = missingDefaultProducts.map((product: (typeof PRODUCT_DEFAULT_CATALOG)[number]) => ({ ...product, link: buildInternalProductLink(product.name) }))
      const response = await supabase.from('produtos_digitais').insert(payload)
      if (response.error) throw response.error
      toast.success(`${missingDefaultProducts.length} produto(s) padrão criado(s).`)
      await queryProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar os produtos padrão.')
    } finally {
      setCreatingDefaults(false)
    }
  }, [creatingDefaults, guardManage, missingDefaultProducts, queryProducts])

  const requestCreateDefaults = useCallback(() => {
    if (!guardManage()) return
    if (!missingDefaultProducts.length) {
      toast.success('Produtos padrão já estão cadastrados.')
      return
    }
    requestToastConfirmation({
      key: 'create-default-products',
      title: `Criar ${missingDefaultProducts.length} produtos padrão?`,
      description: `Serão criados: ${missingDefaultProducts.map((product: (typeof PRODUCT_DEFAULT_CATALOG)[number]) => product.name).join(', ')}.`,
      label: 'Criar produtos padrão',
      onConfirm: createDefaultProducts,
    })
  }, [createDefaultProducts, guardManage, missingDefaultProducts])

  const setCatalogMode = useCallback((value: ProductCatalogMode) => {
    if (!canManage) return
    setCatalogModeState(value)
    if (value === 'consumo') setStatusFilter('ativo')
  }, [canManage])

  return {
    role,
    canManage,
    products,
    filteredProducts,
    metrics,
    loading,
    loadError,
    saving,
    creatingDefaults,
    isRefetching,
    showForm,
    editingProduct,
    form,
    searchTerm,
    catalogMode: canManage ? catalogMode : 'consumo',
    audienceFilter,
    statusFilter,
    missingDefaultProducts,
    setSearchTerm,
    setCatalogMode,
    setAudienceFilter,
    setStatusFilter,
    setForm,
    fetchProducts,
    refresh,
    openCreateForm,
    openEditForm,
    closeForm,
    toggleAudience,
    submit,
    requestArchive,
    requestCreateDefaults,
  }
}
