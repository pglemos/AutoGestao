import { useEffect, useState } from 'react'
import { Archive, Pencil, Eye, FileText, GraduationCap, Link2, Plus, Search, Upload, Video } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxEmptyState, MxInput, MxLoadingState, MxSelect, MxStatusBanner, MxTextarea, MxField } from '@/components/module/MxModuleVisualPrimitives'
import { CONTENT_TYPES, FILE_CATEGORIES, VISIBILITY_LABELS, validateContentTitle } from './methodology'
import { archiveLibraryMaterial, fetchLibraryMaterials, fetchMaterialUtilizations, fetchUniversityLessons, saveLibraryMaterial, uploadLibraryFile, type LibraryMaterial } from './consultoriaMxData'
import type { ProductWithMethodology } from './consultoriaMxData'
import type { ConsultoriaMxController } from './useConsultoriaMx'

export function LibraryTab(props: {
  controller: ConsultoriaMxController
  products: ProductWithMethodology[]
}) {
  const [items, setItems] = useState<LibraryMaterial[]>([])
  const [lessons, setLessons] = useState<Array<{ id: string; titulo: string; tipo: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<LibraryMaterial | null>(null)
  const [utilizations, setUtilizations] = useState<LibraryMaterial | null>(null)

  const load = async () => {
    setLoading(true)
    const [library, university] = await Promise.all([
      fetchLibraryMaterials(),
      fetchUniversityLessons(),
    ])
    setItems(library.rows)
    setLessons(university.rows)
    setError(library.error ?? university.error)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (props.controller.openAddMaterial) {
      setShowAdd(true)
      props.controller.setOpenAddMaterial(false)
    }
  }, [props.controller])

  const filtered = items.filter(item => {
    if (search && !(item.title.toLowerCase().includes(search.toLowerCase()) || (item.description ?? '').toLowerCase().includes(search.toLowerCase()))) return false
    if (filterType && item.content_type !== filterType) return false
    if (filterStatus && item.status !== filterStatus) return false
    return true
  })

  const filteredLessons = lessons.filter(lesson => {
    if (filterType && filterType !== 'UNIVERSITY_LESSON') return false
    if (filterStatus && filterStatus !== 'publicado') return false
    if (!search) return true
    return lesson.titulo.toLowerCase().includes(search.toLowerCase())
  })

  const archive = async (item: LibraryMaterial) => {
    if (!confirm(`Arquivar "${item.title}"?`)) return
    const result = await archiveLibraryMaterial(item.id)
    if (result.error) {
      await props.controller.audit('Biblioteca', 'CONTENT_ARCHIVE', 'ARQUIVADO', item.title)
      return
    }
    await props.controller.audit('Biblioteca', 'CONTENT_ARCHIVE', 'ARQUIVADO', item.title)
    await load()
  }

  const typeIcon = (contentType: string) => {
    if (['VIDEO', 'YOUTUBE', 'VIMEO'].includes(contentType)) return Video
    if (contentType === 'UNIVERSITY_LESSON') return GraduationCap
    if (contentType === 'EXTERNAL_LINK') return Link2
    return FileText
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} materiais na biblioteca
          {filteredLessons.length ? ` · ${filteredLessons.length} aulas da Universidade MX` : ''}
        </p>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={16} />Adicionar Material</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar material..." aria-label="Buscar material" />
        </div>
        <MxSelect value={filterType} onChange={event => setFilterType(event.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          {Object.entries(CONTENT_TYPES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </MxSelect>
        <MxSelect value={filterStatus} onChange={event => setFilterStatus(event.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="publicado">Publicado</option>
          <option value="arquivado">Arquivado</option>
        </MxSelect>
      </div>

      {loading ? <MxLoadingState label="Carregando biblioteca" /> : error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : filtered.length === 0 && filteredLessons.length === 0 ? (
        <MxEmptyState title="Nenhum material encontrado" description="Adicione vídeos, aulas, arquivos e materiais à biblioteca." />
      ) : (
        <div className="space-y-5">
          {filteredLessons.length ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Aulas da Universidade MX</h3>
                <p className="text-xs text-muted-foreground">Catálogo ativo de treinamentos para vincular nos encontros.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredLessons.map(lesson => (
                  <div key={lesson.id} className="rounded-xl border border-border bg-surface-alt/40 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt"><GraduationCap size={16} className="text-muted-foreground" /></div>
                      <span className="rounded-full bg-status-info-surface px-2 py-0.5 text-xs font-medium text-status-info-text">Aula da Universidade MX</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{lesson.titulo}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{lesson.tipo || 'treinamento'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {filtered.length ? (
            <div className="space-y-3">
              {filteredLessons.length ? <h3 className="text-sm font-semibold text-foreground">Materiais da biblioteca</h3> : null}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(item => {
                  const Icon = typeIcon(item.content_type)
                  const product = props.products.find(product => product.program_key === item.program_key)
                  return (
                    <div key={item.id} className="rounded-xl border border-border bg-surface-alt/40 p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt"><Icon size={16} className="text-muted-foreground" /></div>
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: toneSurface(CONTENT_TYPES[item.content_type]?.tone), color: toneText(CONTENT_TYPES[item.content_type]?.tone) }}>
                            {CONTENT_TYPES[item.content_type]?.label ?? item.content_type}
                          </span>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <h4 className="mb-1 text-sm font-semibold text-foreground">{item.title}</h4>
                      {item.description && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
                      <div className="mb-3 space-y-0.5 text-xs text-muted-foreground">
                        {product && <div>Produto: {product.name}</div>}
                        <div>Visibilidade: {VISIBILITY_LABELS[item.visibility] ?? '—'}</div>
                        {item.file_asset_path && <div>Arquivo enviado</div>}
                      </div>
                      <div className="flex items-center gap-2 border-t border-border-subtle pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditItem(item)}><Pencil size={16} />Editar</Button>
                        {item.file_asset_path && (
                          <Button variant="ghost" size="sm" onClick={() => setUtilizations(item)}><Eye size={16} />Ver utilizações</Button>
                        )}
                        {item.status !== 'arquivado' && (
                          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void archive(item)}><Archive size={16} />Arquivar</Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : filteredLessons.length ? (
            <MxStatusBanner tone="info">Nenhum upload na biblioteca ainda — as aulas da Universidade acima podem ser vinculadas nos encontros.</MxStatusBanner>
          ) : null}
        </div>
      )}

      {showAdd && <MaterialFormModal item={null} products={props.products} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); void load() }} controller={props.controller} />}
      {editItem && <MaterialFormModal item={editItem} products={props.products} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); void load() }} controller={props.controller} />}
      {utilizations && <UtilizationsModal item={utilizations} onClose={() => setUtilizations(null)} />}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'publicado') return <span className="rounded-full bg-status-success-surface px-2 py-0.5 text-xs font-medium text-status-success-text">Publicado</span>
  if (status === 'arquivado') return <span className="rounded-full bg-status-error-surface px-2 py-0.5 text-xs font-medium text-status-error-text">Arquivado</span>
  return <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted-foreground">Rascunho</span>
}

function MaterialFormModal(props: {
  item: LibraryMaterial | null
  products: ProductWithMethodology[]
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [form, setForm] = useState({
    title: props.item?.title ?? '',
    description: props.item?.description ?? '',
    content_type: props.item?.content_type ?? 'FILE',
    category: props.item?.category ?? 'Material de apoio',
    source_url: props.item?.source_url ?? '',
    visibility: props.item?.visibility ?? 'OWNER_AND_TEAM',
    status: props.item?.status ?? 'rascunho',
    program_key: props.item?.program_key ?? '',
    file_asset_name: props.item?.file_asset_name ?? '',
    file_asset_path: props.item?.file_asset_path ?? '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string, value: string) => setForm(current => ({ ...current, [field]: value }))

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadLibraryFile(file, 'materiais')
      if (result.error || !result.sourceUrl) {
        setError(result.error ?? 'Falha ao enviar arquivo.')
        return
      }
      update('source_url', result.sourceUrl)
      update('file_asset_name', file.name)
      update('file_asset_path', result.path ?? '')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    const invalid = validateContentTitle(form.title)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await saveLibraryMaterial({
        id: props.item?.id,
        title: form.title,
        description: form.description,
        content_type: form.content_type,
        category: form.category,
        source_url: form.source_url || null,
        file_asset_name: form.file_asset_name || null,
        file_asset_path: form.file_asset_path || null,
        visibility: form.visibility,
        program_key: form.program_key || null,
        status: form.status as LibraryMaterial['status'],
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Biblioteca', props.item ? 'CONTENT_UPDATE' : 'CONTENT_CREATE', form.title)
      props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  const isUpload = ['FILE', 'VIDEO'].includes(form.content_type)
  const needsUrl = ['YOUTUBE', 'VIMEO', 'EXTERNAL_LINK'].includes(form.content_type)

  return (
    <Modal open onClose={props.onClose} title={props.item ? 'Editar Material' : 'Adicionar Material'} size="lg" footer={(
      <>
        <Button variant="outline" onClick={props.onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={() => void save()} disabled={saving || uploading}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </>
    )}>
      <div className="space-y-3">
        {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
        <MxField label="Título *"><MxInput value={form.title} onChange={event => update('title', event.target.value)} /></MxField>
        <MxField label="Descrição"><MxTextarea rows={2} value={form.description} onChange={event => update('description', event.target.value)} /></MxField>
        <div className="grid grid-cols-2 gap-3">
          <MxField label="Tipo">
            <MxSelect aria-label="Tipo do material" value={form.content_type} onChange={event => update('content_type', event.target.value)}>
              {Object.entries(CONTENT_TYPES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Categoria">
            <MxSelect aria-label="Categoria do material" value={form.category} onChange={event => update('category', event.target.value)}>
              {FILE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </MxSelect>
          </MxField>
        </div>
        <MxField label="Produto (opcional)">
          <MxSelect aria-label="Produto do material" value={form.program_key} onChange={event => update('program_key', event.target.value)}>
            <option value="">Sem produto específico</option>
            {props.products.map(product => <option key={product.program_key} value={product.program_key}>{product.name ?? product.program_key}</option>)}
          </MxSelect>
        </MxField>
        {needsUrl && <MxField label="URL"><MxInput value={form.source_url} onChange={event => update('source_url', event.target.value)} placeholder="https://..." /></MxField>}
        {isUpload && (
          <MxField label="Arquivo">
            <input type="file" onChange={event => handleFile(event.target.files?.[0])} disabled={uploading} className="text-xs" aria-label="Arquivo do material" />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Enviando...</p>}
            {form.source_url && !uploading && <p className="mt-1 text-xs text-status-success-text">Arquivo enviado ✓</p>}
          </MxField>
        )}
        <div className="grid grid-cols-2 gap-3">
          <MxField label="Visibilidade">
            <MxSelect aria-label="Visibilidade do material" value={form.visibility} onChange={event => update('visibility', event.target.value)}>
              {Object.entries(VISIBILITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Status">
            <MxSelect aria-label="Status do material" value={form.status} onChange={event => update('status', event.target.value)}>
              <option value="rascunho">Rascunho</option>
              <option value="publicado">Publicado</option>
            </MxSelect>
          </MxField>
        </div>
      </div>
    </Modal>
  )
}

function UtilizationsModal(props: { item: LibraryMaterial; onClose: () => void }) {
  const [rows, setRows] = useState<Array<{ title: string; product_name: string | null; visit_number: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const result = await fetchMaterialUtilizations(props.item.id)
      setRows(result.rows)
      setLoading(false)
    })()
  }, [props.item.id])

  return (
    <Modal open onClose={props.onClose} title={`Utilizações de "${props.item.title}"`} description={`${rows.length} outro(s) encontro(s) utilizam este arquivo`} size="md" footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}>
      {loading ? <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p> : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Este material não está vinculado a outros encontros.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium text-foreground">{row.title}</div>
              <div className="text-xs text-muted-foreground">{row.product_name ?? '—'} — {row.visit_number === 0 ? 'Onboarding' : `Encontro ${row.visit_number}`}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function toneSurface(tone?: string): string {
  switch (tone) {
    case 'danger': return 'rgb(254 226 226)'
    case 'info': return 'rgb(219 234 254)'
    case 'violet': return 'rgb(243 232 255)'
    case 'warning': return 'rgb(254 249 195)'
    default: return 'rgb(243 244 246)'
  }
}

function toneText(tone?: string): string {
  switch (tone) {
    case 'danger': return 'rgb(185 28 28)'
    case 'info': return 'rgb(29 78 216)'
    case 'violet': return 'rgb(126 34 206)'
    case 'warning': return 'rgb(161 98 7)'
    default: return 'rgb(75 85 99)'
  }
}
