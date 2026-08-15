import { useEffect, useState } from 'react'
import { Pencil, GraduationCap, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { CONTENT_TYPES, VISIBILITY_LABELS, validateContentTitle } from '../methodology'
import { archiveContentReference, fetchUniversityLessons, saveContentReference, uploadLibraryFile, type ContentReference } from '../consultoriaMxData'
import type { ConsultoriaMxController } from '../useConsultoriaMx'

export function ContentTab(props: {
  refs: ContentReference[]
  versionId: string
  visitNumber: number
  onSaved: () => Promise<void>
  controller: ConsultoriaMxController
}) {
  const [edit, setEdit] = useState<ContentReference | 'new' | null>(null)
  const [showLessonPicker, setShowLessonPicker] = useState(false)

  const remove = async (ref: ContentReference) => {
    if (!confirm(`Remover "${ref.title}"?`)) return
    const result = await archiveContentReference(ref.id)
    if (result.error) {
      props.controller.audit('Aula e Vídeo', 'CONTENT_REMOVE', '', ref.title)
      return
    }
    await props.controller.audit('Aula e Vídeo', 'CONTENT_REMOVE', '', ref.title)
    await props.onSaved()
  }

  const sorted = [...props.refs].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setEdit('new')}><Plus size={16} />Adicionar Vídeo</Button>
        <Button size="sm" variant="outline" onClick={() => setShowLessonPicker(true)}><GraduationCap size={16} />Vincular Aula da Universidade MX</Button>
      </div>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Nenhum conteúdo cadastrado. Adicione vídeos ou vincule aulas.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(ref => (
            <div key={ref.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: toneSurface(CONTENT_TYPES[ref.content_type]?.tone), color: toneText(CONTENT_TYPES[ref.content_type]?.tone) }}>
                  {CONTENT_TYPES[ref.content_type]?.label ?? ref.content_type}
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{ref.title}</div>
                  <div className="text-xs text-muted-foreground">{ref.required ? 'Obrigatório' : 'Opcional'} · {VISIBILITY_LABELS[ref.visibility] ?? '—'} · {ref.status === 'publicado' ? 'Publicado' : 'Rascunho'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEdit(ref)}><Pencil size={16} />Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => void remove(ref)} aria-label={`Remover ${ref.title}`}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit !== null && (
        <ContentFormModal
          ref_={edit === 'new' ? null : edit}
          versionId={props.versionId}
          visitNumber={props.visitNumber}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); void props.onSaved() }}
          controller={props.controller}
        />
      )}
      {showLessonPicker && (
        <LessonPickerModal
          versionId={props.versionId}
          visitNumber={props.visitNumber}
          onClose={() => setShowLessonPicker(false)}
          onSaved={() => { setShowLessonPicker(false); void props.onSaved() }}
          controller={props.controller}
        />
      )}
    </div>
  )
}

function ContentFormModal(props: {
  ref_: ContentReference | null
  versionId: string
  visitNumber: number
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [form, setForm] = useState({
    title: props.ref_?.title ?? '',
    description: props.ref_?.description ?? '',
    content_type: props.ref_?.content_type ?? 'VIDEO',
    source_url: props.ref_?.source_url ?? '',
    visibility: props.ref_?.visibility ?? 'OWNER_AND_TEAM',
    required: props.ref_?.required ?? true,
    display_order: props.ref_?.display_order ?? 1,
    duration_minutes: props.ref_?.duration_minutes ?? null as number | null,
    status: props.ref_?.status ?? 'rascunho',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string, value: string | number | boolean | null) => setForm(current => ({ ...current, [field]: value }))

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadLibraryFile(file, 'aulas')
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
        id: props.ref_?.id,
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        content_type: form.content_type,
        title: form.title,
        description: form.description,
        display_order: form.display_order,
        required: form.required,
        duration_minutes: form.duration_minutes,
        source_url: form.source_url || null,
        visibility: form.visibility,
        status: form.status,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Aula e Vídeo', props.ref_ ? 'CONTENT_UPDATE' : 'CONTENT_ADD', form.title)
      props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  const isFile = form.content_type === 'VIDEO'
  const needsUrl = ['YOUTUBE', 'VIMEO', 'EXTERNAL_LINK'].includes(form.content_type)

  return (
    <Modal open onClose={props.onClose} title={props.ref_ ? 'Editar Conteúdo' : 'Adicionar Conteúdo'} size="lg" footer={(
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
            <MxSelect aria-label="Tipo de conteúdo" value={form.content_type} onChange={event => update('content_type', event.target.value)}>
              {Object.entries(CONTENT_TYPES).filter(([key]) => key !== 'FILE' && key !== 'UNIVERSITY_LESSON').map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </MxSelect>
          </MxField>
          <MxField label="Visibilidade">
            <MxSelect aria-label="Visibilidade do conteúdo" value={form.visibility} onChange={event => update('visibility', event.target.value)}>
              {Object.entries(VISIBILITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </MxSelect>
          </MxField>
        </div>
        {needsUrl && (
          <MxField label="URL"><MxInput value={form.source_url} onChange={event => update('source_url', event.target.value)} placeholder="https://..." /></MxField>
        )}
        {isFile && (
          <MxField label="Arquivo de vídeo">
            <input type="file" accept="video/*" onChange={event => handleFile(event.target.files?.[0])} disabled={uploading} className="text-xs" />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Enviando...</p>}
            {form.source_url && !uploading && <p className="mt-1 text-xs text-status-success-text">Enviado ✓</p>}
          </MxField>
        )}
        <div className="grid grid-cols-3 gap-3">
          <MxField label="Duração (min)">
            <MxInput type="number" min={0} value={form.duration_minutes ?? ''} onChange={event => update('duration_minutes', event.target.value === '' ? null : Number(event.target.value))} />
          </MxField>
          <MxField label="Ordem">
            <MxInput type="number" min={1} value={form.display_order} onChange={event => update('display_order', Number(event.target.value))} />
          </MxField>
          <MxField label="Status">
            <MxSelect aria-label="Status do conteúdo" value={form.status} onChange={event => update('status', event.target.value)}>
              <option value="rascunho">Rascunho</option>
              <option value="publicado">Publicado</option>
            </MxSelect>
          </MxField>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.required} onChange={event => update('required', event.target.checked)} className="h-4 w-4 accent-brand-primary" />
          <span className="text-sm text-foreground">Obrigatório</span>
        </label>
      </div>
    </Modal>
  )
}

function LessonPickerModal(props: {
  versionId: string
  visitNumber: number
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [lessons, setLessons] = useState<Array<{ id: string; titulo: string; tipo: string }>>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchUniversityLessons().then(result => {
      setLessons(result.rows)
      setError(result.error)
      setLoading(false)
    })
  }, [])

  const filtered = lessons.filter(lesson => !search || lesson.titulo.toLowerCase().includes(search.toLowerCase()))

  const link = async (lesson: { id: string; titulo: string }) => {
    setSaving(lesson.id)
    try {
      const result = await saveContentReference({
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        content_type: 'UNIVERSITY_LESSON',
        title: lesson.titulo,
        learning_content_id: lesson.id,
        learning_content_name: lesson.titulo,
        required: true,
        display_order: 1,
        visibility: 'OWNER_AND_TEAM',
        status: 'publicado',
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Aula e Vídeo', 'LESSON_LINK', lesson.titulo)
      props.onSaved()
    } finally {
      setSaving(null)
    }
  }

  return (
    <Modal open onClose={props.onClose} title="Vincular Aula da Universidade MX" size="lg" footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}>
      <div className="space-y-3">
        {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2">
          <Search size={14} className="text-muted-foreground" />
          <input type="text" placeholder="Buscar aula..." value={search} onChange={event => setSearch(event.target.value)} className="flex-1 bg-transparent text-sm outline-none" aria-label="Buscar aula" />
        </div>
        {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p> : filtered.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma aula publicada encontrada.</p> : (
          <div className="space-y-2">
            {filtered.map(lesson => (
              <div key={lesson.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-info-surface"><GraduationCap size={16} className="text-status-info-text" /></div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{lesson.titulo}</div>
                    <div className="text-xs text-muted-foreground">{lesson.tipo}</div>
                  </div>
                </div>
                <Button size="sm" onClick={() => void link(lesson)} disabled={saving === lesson.id}>{saving === lesson.id ? 'Vinculando...' : 'Vincular'}</Button>
              </div>
            ))}
          </div>
        )}
      </div>
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
