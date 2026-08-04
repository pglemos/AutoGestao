from pathlib import Path

path = Path('src/features/admin/components/StoreEditModal.tsx')
text = path.read_text(encoding='utf-8')

old_import = "import { normalizeStoreManagementForm, type StoreManagementFormMode } from '@/lib/store-management-form'"
new_import = "import { resolveStoreManagementEdit, type StoreManagementFormMode } from '@/lib/store-management-form'"
if text.count(old_import) != 1:
    raise RuntimeError('Unexpected store management import state')
text = text.replace(old_import, new_import, 1)

old_hook = """  const management = useStoreManagementContext({
    storeId: store?.id,
    declaredManagerEmail: store?.manager_email,
    enabled: open && Boolean(store),
  })

"""
new_hook = old_hook + "  const managementContextConfirmed = !management.loading && !management.queryFailed\n\n"
if text.count(old_hook) != 1:
    raise RuntimeError('Unexpected management hook state')
text = text.replace(old_hook, new_hook, 1)

old_submit = """    const normalizedManagement = normalizeStoreManagementForm({
      mode: managementMode,
      managerEmail: form.manager_email,
    })
"""
new_submit = """    const normalizedManagement = resolveStoreManagementEdit({
      contextConfirmed: managementContextConfirmed,
      hasActiveManager: management.hasActiveManager,
      currentManagerEmail: store.manager_email,
      mode: managementMode,
      managerEmail: form.manager_email,
    })
"""
if text.count(old_submit) != 1:
    raise RuntimeError('Unexpected submit normalization state')
text = text.replace(old_submit, new_submit, 1)

start_marker = '        <fieldset className="space-y-mx-sm rounded-2xl border border-gray-200 bg-gray-50 p-mx-md">\n'
end_marker = '        <div className="space-y-mx-sm">\n          <div className="flex items-center justify-between gap-mx-md">\n'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise RuntimeError('Management form block not found')

replacement = """        {management.loading ? (
          <section role="status" aria-live="polite" className="rounded-2xl border border-gray-200 bg-gray-50 p-mx-md">
            <Typography variant="caption">Verificando a estrutura da gestão comercial...</Typography>
          </section>
        ) : management.queryFailed ? (
          <section role="status" className="rounded-2xl border border-[hsl(var(--mx-color-warning))]/30 bg-[hsl(var(--mx-color-warning-subtle))] p-mx-md">
            <Typography variant="caption">Estrutura gerencial não confirmada</Typography>
            <Typography variant="tiny" tone="muted" className="mt-1 block font-bold">
              Os dados de gestão serão preservados nesta edição. Tente novamente antes de alterar o responsável comercial.
            </Typography>
          </section>
        ) : management.hasActiveManager ? (
          <section role="status" className="rounded-2xl border border-[hsl(var(--mx-color-success))]/30 bg-[hsl(var(--mx-color-success-subtle))] p-mx-md">
            <div className="flex flex-wrap items-center justify-between gap-mx-sm">
              <Typography variant="caption">Estrutura da gestão comercial</Typography>
              <Badge variant="success">Gerente ativo detectado</Badge>
            </div>
            <Typography variant="tiny" tone="muted" className="mt-2 block font-bold">
              A responsabilidade gerencial é definida pelos vínculos ativos da equipe. Para trocar ou remover o gerente, atualize o vínculo em Minha Equipe.
            </Typography>
          </section>
        ) : (
          <>
            <fieldset className="space-y-mx-sm rounded-2xl border border-gray-200 bg-gray-50 p-mx-md">
              <legend><Typography as="span" variant="caption">Estrutura da gestão comercial</Typography></legend>
              <label className="flex cursor-pointer items-start gap-mx-sm rounded-xl bg-white p-mx-sm">
                <input
                  type="radio"
                  name="edit-store-management-mode"
                  value="owner_managed"
                  checked={managementMode === 'owner_managed'}
                  onChange={() => {
                    setManagementMode('owner_managed')
                    setForm(previous => ({ ...previous, manager_email: null }))
                  }}
                  className="mt-1 accent-brand-primary"
                />
                <span>
                  <span className="block text-sm font-bold text-gray-800">Dono acumula a gestão</span>
                  <span className="mt-1 block text-xs font-semibold text-gray-500">A ausência de vínculo ativo libera ao dono as rotinas gerenciais.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-mx-sm rounded-xl bg-white p-mx-sm">
                <input
                  type="radio"
                  name="edit-store-management-mode"
                  value="manager_pending"
                  checked={managementMode === 'manager_pending'}
                  onChange={() => setManagementMode('manager_pending')}
                  className="mt-1 accent-brand-primary"
                />
                <span>
                  <span className="block text-sm font-bold text-gray-800">Gerente será cadastrado</span>
                  <span className="mt-1 block text-xs font-semibold text-gray-500">O e-mail registra a pendência; somente o vínculo ativo confirma o gerente.</span>
                </span>
              </label>
            </fieldset>

            <div className="space-y-mx-xs">
              <div className="flex items-center justify-between">
                <Typography as="label" htmlFor="edit-store-manager-email" variant="caption" className="">
                  E-mail do Gestor
                </Typography>
                <Badge variant="outline" className="text-mx-micro">{managementMode === 'manager_pending' ? 'Obrigatório' : 'Não utilizado'}</Badge>
              </div>
              <div className="relative">
                <Mail size={18} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                <Input
                  id="edit-store-manager-email"
                  type="email"
                  value={form.manager_email || ''}
                  disabled={managementMode === 'owner_managed'}
                  onChange={(event) => setForm((prev) => ({ ...prev, manager_email: event.target.value }))}
                  placeholder="gestor@unidade.com.br"
                  className="!pl-14 !h-14 font-bold"
                />
              </div>
            </div>
          </>
        )}

"""
text = text[:start] + replacement + text[end:]
path.write_text(text, encoding='utf-8')
print('Store management edit lock applied.')
