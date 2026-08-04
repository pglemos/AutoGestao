from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match in {path}, found {count}: {old[:80]!r}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


# Route authorization and regression expectation.
replace_once(
    "src/lib/auth/routeAccess.ts",
    "const MANAGER_AND_INTERNAL_ROLES = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'gerente'] as const satisfies readonly UserRole[]",
    "const MANAGER_AND_INTERNAL_ROLES = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'gerente', 'dono'] as const satisfies readonly UserRole[]",
)
replace_once(
    "src/lib/auth/routeAccess.test.ts",
    "expect(canAccessPath(route, 'dono')).toBe(route !== '/gerente/rotina-equipe')",
    "expect(canAccessPath(route, 'dono')).toBe(true)",
)

# App routes: owner receives the real manager routine when responsible.
replace_once(
    "src/App.tsx",
    "const OwnerRotinaDoDia = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.RotinaDoDia })))\n",
    "",
)
replace_once(
    "src/App.tsx",
    "const RotinaGerente = lazy(() => import('@/pages/RotinaGerente'))\n",
    "const RotinaGerente = lazy(() => import('@/pages/RotinaGerente'))\nconst OwnerRoutineRoute = lazy(() => import('@/features/owner/OwnerRoutineRoute'))\n",
)
replace_once(
    "src/App.tsx",
    "<RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ManagerTeamRoutine />} dono={<ForbiddenRoute />} admin={<ManagerTeamRoutine />} />",
    "<RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ManagerTeamRoutine />} dono={<ManagerTeamRoutine />} admin={<ManagerTeamRoutine />} />",
)
replace_once(
    "src/App.tsx",
    "<RoleSwitch vendedor={<ForbiddenRoute />} gerente={<RotinaGerente />} dono={<OwnerRotinaDoDia />} admin={<RotinaGerente />} />",
    "<RoleSwitch vendedor={<ForbiddenRoute />} gerente={<RotinaGerente />} dono={<OwnerRoutineRoute />} admin={<RotinaGerente />} />",
)

# Owner navigation receives the management section with contextual badge.
replace_once(
    "src/components/Layout.tsx",
    "import { useFeedbacks } from '@/hooks/useFeedbacks'\n",
    "import { useFeedbacks } from '@/hooks/useFeedbacks'\nimport { useStoreManagementContext } from '@/hooks/useStoreManagementContext'\n",
)
replace_once(
    "src/components/Layout.tsx",
    "import { OwnerProvider } from '@/components/owner/OwnerContext'\n",
    "import { OwnerProvider } from '@/components/owner/OwnerContext'\nimport { buildOwnerCommercialNavigation } from '@/features/owner/ownerCommercialNavigation'\n",
)
replace_once(
    "src/components/Layout.tsx",
    "const mapOwnerNavigationItem = (\n",
    "const ownerCommercialItemIcons: Record<string, React.ReactNode> = {\n  'Visão Comercial': <TrendingUp size={16} />,\n  'Rotina da Equipe': <CalendarCheck size={16} />,\n  'Fechamento Diário': <CheckSquare size={16} />,\n  'Meta da Loja': <Target size={16} />,\n  Vendas: <BarChart3 size={16} />,\n  'Mentor Gerencial': <BrainCircuit size={16} />,\n  Desenvolvimento: <BookOpen size={16} />,\n  Ranking: <Trophy size={16} />,\n  'Universidade MX': <GraduationCap size={16} />,\n}\n\nconst mapOwnerNavigationItem = (\n",
)
replace_once(
    "src/components/Layout.tsx",
    "    membership,\n    isSimulating,\n",
    "    membership,\n    storeId,\n    isSimulating,\n",
)
replace_once(
    "src/components/Layout.tsx",
    "  const [ownerLastUpdated, setOwnerLastUpdated] = React.useState(() => new Date())\n\n",
    "  const [ownerLastUpdated, setOwnerLastUpdated] = React.useState(() => new Date())\n  const ownerManagement = useStoreManagementContext({\n    storeId,\n    declaredManagerEmail: membership?.store?.manager_email,\n    enabled: role === 'dono',\n  })\n\n",
)
replace_once(
    "src/components/Layout.tsx",
    """  const categories = React.useMemo(() => {
    const baseCategories = role ? (navConfig[role] || []) : []
    return baseCategories
      .map((category) => {
        const items = category.items
          .map((item) => {
            if (item.path === STORE_DASHBOARD_PATH) return { ...item, path: storeDashboardPath }
            if (item.path === STORE_TEAM_PATH) return { ...item, path: storeTeamPath }
            if (item.path === STORE_CONSULTOR_IA_PATH) {
              if (!storeDashboardPath.startsWith('/lojas/')) return null
              return { ...item, path: storeConsultorIaPath }
            }
            return item
          })
          .filter((item): item is SubItem => item !== null && canAccessPath(item.path, role))
        return { ...category, items }
      })
      .filter((category) => category.items.length > 0)
  }, [role, storeConsultorIaPath, storeDashboardPath, storeTeamPath])
""",
    """  const categories = React.useMemo(() => {
    const baseCategories = role ? [...(navConfig[role] || [])] : []
    if (role === 'dono') {
      const commercial = buildOwnerCommercialNavigation(ownerManagement)
      baseCategories.push({
        category: commercial.label,
        icon: <TrendingUp size={22} />,
        items: commercial.items.map((item, index) => ({
          label: item.label,
          path: item.path,
          icon: ownerCommercialItemIcons[item.label] ?? <Grid size={16} />,
          badge: index === 0 ? commercial.badge : undefined,
          badgeTone: index === 0 ? commercial.badgeTone : undefined,
        })),
      })
    }

    return baseCategories
      .map((category) => {
        const items = category.items
          .map((item) => {
            if (item.path === STORE_DASHBOARD_PATH) return { ...item, path: storeDashboardPath }
            if (item.path === STORE_TEAM_PATH) return { ...item, path: storeTeamPath }
            if (item.path === STORE_CONSULTOR_IA_PATH) {
              if (!storeDashboardPath.startsWith('/lojas/')) return null
              return { ...item, path: storeConsultorIaPath }
            }
            return item
          })
          .filter((item): item is SubItem => item !== null && canAccessPath(item.path, role))
        return { ...category, items }
      })
      .filter((category) => category.items.length > 0)
  }, [ownerManagement, role, storeConsultorIaPath, storeDashboardPath, storeTeamPath])
""",
)

# Dashboard owner uses the same operational sections when entering manager routes.
replace_once(
    "src/features/dashboard-loja/DashboardLoja.container.tsx",
    "  const isFocusedRolePerformance = (isOwner || role === 'gerente') && activeTab === 'performance'\n  const isManagerSection = role === 'gerente' && activeTab !== 'performance'\n",
    "  const isFocusedRolePerformance = (isOwner || role === 'gerente') && activeTab === 'performance'\n  const isManagerOperationalView = (role === 'gerente' || role === 'dono') && location.pathname.startsWith('/gerente/')\n  const isManagerSection = isManagerOperationalView && activeTab !== 'performance'\n",
)
replace_once(
    "src/features/dashboard-loja/DashboardLoja.container.tsx",
    "        role === 'gerente'\n          ? <ManagerTeamPerformance",
    "        isManagerOperationalView\n          ? <ManagerTeamPerformance",
)
replace_once(
    "src/features/dashboard-loja/DashboardLoja.container.tsx",
    "          showManagerHeader={role === 'gerente'}",
    "          showManagerHeader={isManagerOperationalView}",
)

# Owner cockpit explains who is responsible for management.
replace_once(
    "src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx",
    "import { OwnerHome } from './owner-cockpit/OwnerHome'\n",
    "import { OwnerHome } from './owner-cockpit/OwnerHome'\nimport { OwnerManagementNotice } from '@/features/owner/OwnerManagementNotice'\n",
)
replace_once(
    "src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx",
    """      <OwnerPageHeading
        icon={Home}
        title={greetingTitle}
        subtitle="Aqui está o panorama da sua loja hoje."
        actions={null}
      />

""",
    """      <OwnerPageHeading
        icon={Home}
        title={greetingTitle}
        subtitle="Aqui está o panorama da sua loja hoje."
        actions={null}
      />

      <OwnerManagementNotice
        storeId={data.operationalStore?.id}
        managerEmail={data.operationalStore?.manager_email}
      />

""",
)

# Create store form exposes owner-managed vs pending manager.
replace_once(
    "src/components/organisms/CreateStoreModal.tsx",
    "import { Card } from '@/components/molecules/Card'\n",
    "import { Card } from '@/components/molecules/Card'\nimport type { StoreManagementFormMode } from '@/lib/store-management-form'\n",
)
replace_once(
    "src/components/organisms/CreateStoreModal.tsx",
    "export interface NewStoreDraft {\n  name: string\n  manager_email: string\n}",
    "export interface NewStoreDraft {\n  name: string\n  manager_email: string\n  management_mode: StoreManagementFormMode\n}",
)
replace_once(
    "src/components/organisms/CreateStoreModal.tsx",
    """                  <div className="space-y-mx-xs">
                    <div className="flex justify-between items-center ml-2">
                      <Typography
                        as="label"
                        htmlFor="manager-email"
                        variant="caption"
                        className=""
                      >
                        E-mail do Gestor
                      </Typography>
                      <Badge variant="outline" className="text-mx-micro">
                        Opcional
                      </Badge>
                    </div>
""",
    """                  <fieldset className="space-y-mx-sm rounded-2xl border border-gray-200 bg-gray-50 p-mx-md">
                    <Typography as="legend" variant="caption">Estrutura da gestão comercial</Typography>
                    <label className="flex cursor-pointer items-start gap-mx-sm rounded-xl bg-white p-mx-sm">
                      <input
                        type="radio"
                        name="store-management-mode"
                        value="owner_managed"
                        checked={newStore.management_mode === 'owner_managed'}
                        onChange={() => setNewStore(previous => ({ ...previous, management_mode: 'owner_managed', manager_email: '' }))}
                        className="mt-1 accent-brand-primary"
                      />
                      <span>
                        <span className="block text-sm font-bold text-gray-800">Dono acumula a gestão</span>
                        <span className="mt-1 block text-xs font-semibold text-gray-500">O dono terá acesso às rotinas gerenciais enquanto não existir gerente ativo.</span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-mx-sm rounded-xl bg-white p-mx-sm">
                      <input
                        type="radio"
                        name="store-management-mode"
                        value="manager_pending"
                        checked={newStore.management_mode === 'manager_pending'}
                        onChange={() => setNewStore(previous => ({ ...previous, management_mode: 'manager_pending' }))}
                        className="mt-1 accent-brand-primary"
                      />
                      <span>
                        <span className="block text-sm font-bold text-gray-800">Gerente será cadastrado</span>
                        <span className="mt-1 block text-xs font-semibold text-gray-500">Até o vínculo do gerente ser ativado, o dono continua responsável.</span>
                      </span>
                    </label>
                  </fieldset>

                  <div className="space-y-mx-xs">
                    <div className="flex justify-between items-center ml-2">
                      <Typography
                        as="label"
                        htmlFor="manager-email"
                        variant="caption"
                        className=""
                      >
                        E-mail do Gestor
                      </Typography>
                      <Badge variant="outline" className="text-mx-micro">
                        {newStore.management_mode === 'manager_pending' ? 'Obrigatório' : 'Não utilizado'}
                      </Badge>
                    </div>
""",
)
replace_once(
    "src/components/organisms/CreateStoreModal.tsx",
    """                        type="email"
                        placeholder="gestor@unidade.com.br"
                        value={newStore.manager_email}
""",
    """                        type="email"
                        placeholder="gestor@unidade.com.br"
                        value={newStore.manager_email}
                        disabled={newStore.management_mode === 'owner_managed'}
""",
)

# Store creation orchestration validates the selected management mode.
replace_once(
    "src/features/lojas/hooks/useLojasPage.ts",
    "import { DESTRUCTIVE_ACTION_LABELS } from '@/lib/ui/actionLabels'\n",
    "import { DESTRUCTIVE_ACTION_LABELS } from '@/lib/ui/actionLabels'\nimport { normalizeStoreManagementForm } from '@/lib/store-management-form'\n",
)
replace_once(
    "src/features/lojas/hooks/useLojasPage.ts",
    "  const [newStore, setNewStore] = useState({ name: '', manager_email: '' })",
    "  const [newStore, setNewStore] = useState({ name: '', manager_email: '', management_mode: 'owner_managed' as const })",
)
replace_once(
    "src/features/lojas/hooks/useLojasPage.ts",
    """      setCreating(true)
      const { error } = await createStore(newStore.name, newStore.manager_email)
      setCreating(false)
""",
    """      const management = normalizeStoreManagementForm({
        mode: newStore.management_mode,
        managerEmail: newStore.manager_email,
      })
      if (!management.ok) {
        toast.error(management.error)
        return
      }
      setCreating(true)
      const { error } = await createStore(newStore.name, management.managerEmail || undefined)
      setCreating(false)
""",
)
replace_once(
    "src/features/lojas/hooks/useLojasPage.ts",
    "setNewStore({ name: '', manager_email: '' })",
    "setNewStore({ name: '', manager_email: '', management_mode: 'owner_managed' })",
)
replace_once(
    "src/features/lojas/hooks/useLojasPage.ts",
    "[createStore, handleRefresh, newStore.manager_email, newStore.name]",
    "[createStore, handleRefresh, newStore.management_mode, newStore.manager_email, newStore.name]",
)

replace_once(
    "src/features/dashboard-loja/hooks/useStoreActions.ts",
    "import { slugify } from '@/lib/utils'\n",
    "import { slugify } from '@/lib/utils'\nimport { normalizeStoreManagementForm } from '@/lib/store-management-form'\n",
)
replace_once(
    "src/features/dashboard-loja/hooks/useStoreActions.ts",
    "  const [newStore, setNewStore] = useState({ name: '', manager_email: '' })",
    "  const [newStore, setNewStore] = useState({ name: '', manager_email: '', management_mode: 'owner_managed' as const })",
)
replace_once(
    "src/features/dashboard-loja/hooks/useStoreActions.ts",
    """    setCreatingStore(true)
    try {
      const { error } = await createStore(newStore.name, newStore.manager_email || undefined)
""",
    """    const management = normalizeStoreManagementForm({
      mode: newStore.management_mode,
      managerEmail: newStore.manager_email,
    })
    if (!management.ok) { toast.error(management.error); return }
    setCreatingStore(true)
    try {
      const { error } = await createStore(newStore.name, management.managerEmail || undefined)
""",
)
replace_once(
    "src/features/dashboard-loja/hooks/useStoreActions.ts",
    "setNewStore({ name: '', manager_email: '' })",
    "setNewStore({ name: '', manager_email: '', management_mode: 'owner_managed' })",
)

replace_once(
    "src/features/configuracoes/components/tabs/LojasRedeTab.tsx",
    "import { requestToastConfirmation } from '@/lib/ui/confirmAction'\n",
    "import { requestToastConfirmation } from '@/lib/ui/confirmAction'\nimport { normalizeStoreManagementForm } from '@/lib/store-management-form'\n",
)
replace_once(
    "src/features/configuracoes/components/tabs/LojasRedeTab.tsx",
    "const [newStore, setNewStore] = useState<NewStoreDraft>({ name: '', manager_email: '' })",
    "const [newStore, setNewStore] = useState<NewStoreDraft>({ name: '', manager_email: '', management_mode: 'owner_managed' })",
)
replace_once(
    "src/features/configuracoes/components/tabs/LojasRedeTab.tsx",
    "setNewStore({ name: '', manager_email: '' })",
    "setNewStore({ name: '', manager_email: '', management_mode: 'owner_managed' })",
)
replace_once(
    "src/features/configuracoes/components/tabs/LojasRedeTab.tsx",
    """        setCreatingStore(true)
        const { error } = await createStore(newStore.name, newStore.manager_email || undefined)
""",
    """        const management = normalizeStoreManagementForm({
            mode: newStore.management_mode,
            managerEmail: newStore.manager_email,
        })
        if (!management.ok) {
            toast.error(management.error)
            return
        }
        setCreatingStore(true)
        const { error } = await createStore(newStore.name, management.managerEmail || undefined)
""",
)

# Store editing shows detected status and saves only normalized intent email.
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    "import { toast } from '@/lib/toast'\n",
    "import { toast } from '@/lib/toast'\nimport { useStoreManagementContext } from '@/hooks/useStoreManagementContext'\nimport { normalizeStoreManagementForm, type StoreManagementFormMode } from '@/lib/store-management-form'\n",
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    "  const [form, setForm] = useState<StoreUpdateFields>({",
    "  const [managementMode, setManagementMode] = useState<StoreManagementFormMode>('owner_managed')\n  const [form, setForm] = useState<StoreUpdateFields>({",
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    """    setForm({
      name: store.name,
""",
    """    setManagementMode(store.manager_email ? 'manager_pending' : 'owner_managed')
    setForm({
      name: store.name,
""",
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    "  const registrationLink = store ? getPreRegistrationLink(store.name) : ''\n",
    """  const registrationLink = store ? getPreRegistrationLink(store.name) : ''
  const management = useStoreManagementContext({
    storeId: store?.id,
    declaredManagerEmail: store?.manager_email,
    enabled: open && Boolean(store),
  })
""",
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    """  const submitStoreUpdate = async () => {
    if (!store) return

    await onSubmit(store.id, {
      name: form.name,
      manager_email: form.manager_email || null,
""",
    """  const submitStoreUpdate = async () => {
    if (!store) return
    const normalizedManagement = normalizeStoreManagementForm({
      mode: managementMode,
      managerEmail: form.manager_email,
    })
    if (!normalizedManagement.ok) {
      toast.error(normalizedManagement.error)
      return
    }

    await onSubmit(store.id, {
      name: form.name,
      manager_email: normalizedManagement.managerEmail,
""",
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    """        <div className="space-y-mx-xs">
          <div className="flex items-center justify-between">
            <Typography as="label" htmlFor="edit-store-manager-email" variant="caption" className="">
              E-mail do Gestor
            </Typography>
            <Badge variant="outline" className="text-mx-micro">Opcional</Badge>
          </div>
""",
    """        <fieldset className="space-y-mx-sm rounded-2xl border border-gray-200 bg-gray-50 p-mx-md">
          <div className="flex items-center justify-between gap-mx-sm">
            <Typography as="legend" variant="caption">Estrutura da gestão comercial</Typography>
            {management.hasActiveManager && <Badge variant="success">Gerente ativo detectado</Badge>}
          </div>
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
""",
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    """              type="email"
              value={form.manager_email || ''}
""",
    """              type="email"
              value={form.manager_email || ''}
              disabled={managementMode === 'owner_managed'}
""",
)

print("Owner manager context patch applied successfully.")
