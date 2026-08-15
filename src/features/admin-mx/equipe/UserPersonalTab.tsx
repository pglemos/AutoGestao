import { Input } from '@/components/atoms/Input'
import { MxField, MxSelect, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { DECLARED_FUNCTIONS, type UserPersonalDraft } from './userEdit'

export function UserPersonalTab(props: {
  form: UserPersonalDraft
  update: (field: keyof UserPersonalDraft, value: string | boolean) => void
}) {
  const { form, update } = props

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MxField label="Nome completo *">
          <Input value={form.full_name} onChange={event => update('full_name', event.target.value)} />
        </MxField>
        <MxField label="Nome de preferência">
          <Input value={form.preferred_name} onChange={event => update('preferred_name', event.target.value)} />
        </MxField>
        <MxField label="Data de nascimento *">
          <Input type="date" value={form.birth_date} onChange={event => update('birth_date', event.target.value)} />
        </MxField>
        <MxField label="E-mail *">
          <Input type="email" value={form.email} onChange={event => update('email', event.target.value)} />
        </MxField>
        <MxField label="Telefone/WhatsApp *">
          <Input value={form.phone} onChange={event => update('phone', event.target.value)} placeholder="(00) 00000-0000" />
        </MxField>
        <MxField label="Função declarada">
          <MxSelect aria-label="Função declarada" value={form.declared_function} onChange={event => update('declared_function', event.target.value)}>
            <option value="">Selecionar...</option>
            {DECLARED_FUNCTIONS.map(fn => <option key={fn} value={fn}>{fn}</option>)}
          </MxSelect>
          <p className="mt-1 text-xs text-muted-foreground">A função declarada não concede papel automaticamente.</p>
        </MxField>
        <MxField label="Data de entrada na empresa">
          <Input type="date" value={form.entry_date} onChange={event => update('entry_date', event.target.value)} />
        </MxField>
        <MxField label="Foto (URL)">
          <Input value={form.photo} onChange={event => update('photo', event.target.value)} placeholder="https://..." />
        </MxField>
      </div>
      <MxField label="Observações internas">
        <MxTextarea rows={2} value={form.notes} onChange={event => update('notes', event.target.value)} />
      </MxField>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={form.relationship_consent}
          onChange={event => update('relationship_consent', event.target.checked)}
          className="rounded border-border"
        />
        <span className="text-sm text-foreground">Preferência de relacionamento autorizada (LGPD)</span>
      </label>
    </div>
  )
}
