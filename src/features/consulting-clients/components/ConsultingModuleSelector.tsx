export function ConsultingModuleSelector({ modules, value, onChange }: {
  modules: Array<{ module_key: string; label: string; enabled: boolean; premium?: boolean }>
  value: string[]
  onChange: (value: string[]) => void
}) {
  return (
    <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-semibold text-foreground">Módulos habilitados</legend>
      {modules.map(module => {
        const checked = value.includes(module.module_key)
        return (
          <label key={module.module_key} className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={checked} onChange={() => onChange(checked ? value.filter(item => item !== module.module_key) : [...value, module.module_key])} />
            <span>{module.label}{module.premium ? ' · Premium' : ''}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
