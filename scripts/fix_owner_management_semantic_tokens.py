from pathlib import Path
import subprocess


def replace_once(filename: str, old: str, new: str) -> None:
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {filename}, found {count}: {old}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# Remove legacy semantic aliases now that these files belong to management routes.
replace_once(
    "src/features/configuracoes/components/tabs/LojasRedeTab.tsx",
    "text-status-error hover:bg-status-error-surface",
    "text-[hsl(var(--mx-color-danger))] hover:bg-[hsl(var(--mx-color-danger-subtle))]",
)
replace_once(
    "src/features/configuracoes/components/tabs/LojasRedeTab.tsx",
    "'text-status-success'",
    "'text-[hsl(var(--mx-color-success))]'",
)
replace_once(
    "src/features/configuracoes/components/tabs/LojasRedeTab.tsx",
    "'text-status-error'",
    "'text-[hsl(var(--mx-color-danger))]'",
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    "text-status-error",
    "text-[hsl(var(--mx-color-danger))]",
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    "border-status-warning/20 bg-status-warning-surface p-mx-md text-status-warning",
    "border-[hsl(var(--mx-color-warning))]/30 bg-[hsl(var(--mx-color-warning-subtle))] p-mx-md text-[hsl(var(--mx-color-text-primary))]",
)

# Typography does not support rendering a legend directly. Keep semantic fieldsets
# and place the canonical Typography primitive inside a native legend.
replace_once(
    "src/components/organisms/CreateStoreModal.tsx",
    '<Typography as="legend" variant="caption">Estrutura da gestão comercial</Typography>',
    '<legend><Typography as="span" variant="caption">Estrutura da gestão comercial</Typography></legend>',
)
replace_once(
    "src/features/admin/components/StoreEditModal.tsx",
    '<Typography as="legend" variant="caption">Estrutura da gestão comercial</Typography>',
    '<legend><Typography as="span" variant="caption">Estrutura da gestão comercial</Typography></legend>',
)

# Widen state inference so the radio control can select both valid modes.
replace_once(
    "src/features/lojas/hooks/useLojasPage.ts",
    "import { normalizeStoreManagementForm } from '@/lib/store-management-form'",
    "import { normalizeStoreManagementForm, type StoreManagementFormMode } from '@/lib/store-management-form'",
)
replace_once(
    "src/features/lojas/hooks/useLojasPage.ts",
    "const [newStore, setNewStore] = useState({ name: '', manager_email: '', management_mode: 'owner_managed' as const })",
    "const [newStore, setNewStore] = useState<{ name: string; manager_email: string; management_mode: StoreManagementFormMode }>({ name: '', manager_email: '', management_mode: 'owner_managed' })",
)
replace_once(
    "src/features/dashboard-loja/hooks/useStoreActions.ts",
    "import { normalizeStoreManagementForm } from '@/lib/store-management-form'",
    "import { normalizeStoreManagementForm, type StoreManagementFormMode } from '@/lib/store-management-form'",
)
replace_once(
    "src/features/dashboard-loja/hooks/useStoreActions.ts",
    "const [newStore, setNewStore] = useState({ name: '', manager_email: '', management_mode: 'owner_managed' as const })",
    "const [newStore, setNewStore] = useState<{ name: string; manager_email: string; management_mode: StoreManagementFormMode }>({ name: '', manager_email: '', management_mode: 'owner_managed' })",
)

# Regenerate the canonical route/data matrix after changing route ownership.
report = subprocess.check_output(
    ["node", "scripts/audit_route_data_inventory.mjs"],
    text=True,
)
Path("docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md").write_text(report, encoding="utf-8")

print("Owner management verification fixes applied.")
