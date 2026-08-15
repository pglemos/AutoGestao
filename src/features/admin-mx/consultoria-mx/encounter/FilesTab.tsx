import { useEffect, useState } from 'react'
import { Pencil, Link2, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { FILE_CATEGORIES, VISIBILITY_LABELS, validateContentTitle } from '../methodology'
import { archiveContentReference, fetchLibraryMaterials, saveContentReference, uploadLibraryFile, type ContentReference, type LibraryMaterial } from '../consultoriaMxData'
import type { ConsultoriaMxController } from '../useConsultoriaMx'

export function FilesTab(props: {
  refs: ContentReference[]
  versionId: string
  visitNumber: number
  onSaved: () => Promise<void>
  controller: ConsultoriaMxController
}) {
  const [edit, setEdit] = useState<ContentReference | 'new' | null>(null)
  const [library, setLibrary] = useState<LibraryMaterial[]>([])
  const [showLibrary, setShowLibrary] = useState(false)

  useEffect(() => {
    if (showLibrary) {
      void fetchLibraryMaterials().then(result => setLibrary(result.rows.filter(item => item.status !== 'arquivado')))
    }
  }, [showLibrary])

  const remove = async (ref: ContentReference) => {
    if (!confirm(`Remover arquivo "${ref.title}"?`)) return
    const result = await archiveContentReference(ref.id)
    if (result.error) {
      await props.controller.audit('Arquivos', 'FILE_REMOVE', '', ref.title)
      return
    }
    await props.controller.audit('Arquivos', 'FILE_REMOVE', '', ref.title)
    await props.onSaved()
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setEdit('new')}><Plus size={16} />Adicionar Arquivo</Button>
        <Button size="sm" variant="outline" onClick={() => setShowLibrary(true)}><Link2 size={16} />Vincular da Biblioteca</Button>
      </div>
      {props.refs.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Nenhum arquivo vinculado a este encontro.</p>
      ) : (
        <div className="space-y-2">
          {props.refs.map(ref => (
            <div key={ref.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-status-warning-surface px-2 py-0.5 text-xs font-medium text-status-warning-text">{ref.category || 'Arquivo'}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">{ref.title}</div>
                  <div className="text-xs text-muted-foreground">{VISIBILITY_LABELS[ref.visibility] ?? '—'} · {ref.status === 'publicado' ? 'Publicado' : 'Rascunho'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ref.source_url && <Button asChild variant="ghost" size="sm"><a href={ref.source_url} target="_blank" rel="noreferrer">Download</a></Button>}
                <Button variant="ghost" size="sm" onClick={() => setEdit(ref)}><Pencil size={16} /></Button>
                <Button variant="ghost" size="sm" onClick={() => void remove(ref)} aria-label={`Remover ${ref.title}`}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit !== null && (
        <FileFormModal
          fileRef={edit === 'new' ? null : edit}
          versionId={props.versionId}
          visitNumber={props.visitNumber}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); void props.onSaved() }}
          controller={props.controller}
        />
      )}
      {showLibrary && (
        <LibraryPickerModal
          library={library}
          versionId={props.versionId}
          visitNumber={props.visitNumber}
          onClose={() => setShowLibrary(false)}
          onSaved={() => { setShowLibrary(false); void props.onSaved() }}
          controller={props.controller}
        />
      )}
    </div>
  )
}

function FileFormModal(props: {
  fileRef: ContentReference | null
  versionId: string
  visitNumber: number
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [form, setForm] = useState({
    title: props.fileRef?.title ?? '',
    description: props.fileRef?.description ?? '',
    category: props.fileRef?.category ?? 'Material de apoio',
    source_url: props.fileRef?.source_url ?? '',
    visibility: props.fileRef?.visibility ?? 'OWNER_AND_TEAM',
    display_order: props.fileRef?.display_order ?? 1,
    status: props.fileRef?.status ?? 'rascunho',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string, value: string | number) => setForm(current => ({ ...current, [field]: value }))

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadLibraryFile(file, 'arquivos')
      if (result.error || !result.sourceUrl) {
        setError(result.error ?? 'Falha ao enviar o arquivo.')
        return
      }
      update('source_url', result.sourceUrl)
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
      const result = await saveContentReference({
        id: props.fileRef?.id,
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        content_type: 'FILE',
        title: form.title,
        description: form.description,
        category: form.category,
        source_url: form.source_url || null,
        visibility: form.visibility,
        display_order: form.display_order,
        status: form.status,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Arquivos', props.fileRef ? 'FILE_UPDATE' : 'FILE_ADD', form.title)
      props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={props.onClose} title={props.fileRef ? 'Editar Arquivo' : 'Adicionar Arquivo'} size="lg" footer={(
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
          <MxField label="Categoria">
            <MxSelect aria-label="Categoria do arquivo" value={form.category} onChange={event => update('category', event.target.value)}>
              {FILE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Visibilidade">
            <MxSelect aria-label="Visibilidade do arquivo" value={form.visibility} onChange={event => update('visibility', event.target.value)}>
              {Object.entries(VISIBILITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </MxSelect>
          </MxField>
        </div>
        <MxField label="Arquivo">
          <input type="file" onChange={event => handleFile(event.target.files?.[0])} disabled={uploading} className="text-xs" aria-label="Arquivo a enviar" />
          {uploading && <p className="mt-1 text-xs text-muted-foreground">Enviando...</p>}
          {form.source_url && !uploading && <p className="mt-1 text-xs text-status-success-text">Enviado ✓</p>}
        </MxField>
      </div>
    </Modal>
  )
}

function LibraryPickerModal(props: {
  library: LibraryMaterial[]
  versionId: string
  visitNumber: number
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const link = async (item: LibraryMaterial) => {
    setSaving(item.id)
    try {
      const result = await saveContentReference({
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        content_type: 'FILE',
        biblioteca_material_id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        source_url: item.source_url,
        visibility: item.visibility,
        display_order: 1,
        status: 'rascunho',
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Arquivos', 'FILE_LINK', item.title)
      props.onSaved()
    } finally {
      setSaving(null)
    }
  }

  return (
    <Modal open onClose={props.onClose} title="Vincular da Biblioteca" size="lg" footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}>
      <div className="space-y-2">
        {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
        {props.library.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum arquivo na biblioteca.</p> : (
          <div className="space-y-2">
            {props.library.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.category || 'Arquivo'}</div>
                </div>
                <Button size="sm" onClick={() => void link(item)} disabled={saving === item.id}>{saving === item.id ? 'Vinculando...' : 'Vincular'}</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
