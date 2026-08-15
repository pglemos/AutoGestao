import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Pencil, ExternalLink, Link2Off, Plus, Trash2 } from 'lucide-react'
import { useStoreBranches } from './useStoreBranches'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { DataGrid, type Column } from '@/components/organisms/DataGrid'
import { CreateStoreModal } from '@/components/organisms/CreateStoreModal'
import { StoreEditModal } from '@/features/admin/components/StoreEditModal'
import { HardDeleteStoreModal } from '@/features/lojas/modals/HardDeleteStoreModal'
import {
  MxEmptyState,
  MxErrorState,
  MxField,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'
import { slugify } from '@/lib/utils'
import type { Store } from '@/types/database'

/**
 * "Filiais da matriz" — tela dedicada, aberta em aba nova pelo botão
 * "Gerenciar filiais" da administração da loja.
 *
 * Existe porque `/lojas` lista a rede MX inteira: quando o Admin MX quer tratar
 * o grupo de uma matriz específica, precisava filtrar 49 unidades na mão e não
 * tinha onde declarar o vínculo. Aqui o escopo é sempre a matriz da URL.
 */
export function StoreBranches() {
  const page = useStoreBranches()

  const columns = useMemo<Column<Store>[]>(
    () => [
      {
        key: 'name',
        header: 'Filial',
        render: (store) => (
          <div className="flex min-w-0 items-center gap-mx-sm">
            <span
              className="grid h-mx-10 w-mx-10 shrink-0 place-items-center rounded-xl bg-status-success-surface text-status-success-text"
              aria-hidden="true"
            >
              <Building2 size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <Typography variant="p" className="font-semibold">
                {store.name}
              </Typography>
              <Typography variant="tiny" tone="muted" className="mt-mx-tiny block">
                {store.cnpj ? `CNPJ ${store.cnpj}` : 'Sem CNPJ cadastrado'}
              </Typography>
            </div>
          </div>
        ),
      },
      {
        key: 'manager_email',
        header: 'Gestor',
        desktopOnly: true,
        render: (store) => (
          <Typography variant="p" tone={store.manager_email ? 'default' : 'muted'}>
            {store.manager_email || 'Sem gestor declarado'}
          </Typography>
        ),
      },
      {
        key: 'active',
        header: 'Status',
        align: 'center',
        desktopOnly: true,
        render: (store) => (
          <Badge variant={store.active ? 'success' : 'secondary'}>
            {store.active ? 'Ativa' : 'Inativa'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Ações',
        align: 'right',
        render: (store) => (
          <div className="flex flex-wrap items-center justify-end gap-mx-xs">
            <Button
              variant="ghost"
              size="sm"
              asChild
              aria-label={`Abrir dashboard de ${store.name}`}
            >
              <Link to={`/lojas/${slugify(store.name)}`}>
                <ExternalLink size={15} />
                Abrir
              </Link>
            </Button>
            {page.canManage ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => page.setEditingStore(store)}
                  aria-label={`Editar cadastro de ${store.name}`}
                >
                  <Pencil size={15} />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => page.handleUnlinkBranch(store)}
                  aria-label={`Desvincular ${store.name} da matriz`}
                >
                  <Link2Off size={15} />
                  Desvincular
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    page.setHardDeleteStore(store)
                    page.setHardDeleteConfirmation('')
                  }}
                  aria-label={`Excluir ${store.name} definitivamente`}
                >
                  <Trash2 size={15} />
                  Excluir
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [page],
  )

  if (page.loading) {
    return (
      <MxModulePage width="wide" bottomClearance="navigation">
        <MxLoadingState label="Carregando filiais da matriz" />
      </MxModulePage>
    )
  }

  if (!page.matriz) {
    return (
      <MxModulePage width="wide" bottomClearance="navigation">
        <MxErrorState
          title="Matriz não encontrada"
          description={
            page.error ||
            `Nenhuma loja corresponde a "${page.storeSlug}". Verifique o endereço ou volte para a lista de lojas.`
          }
        />
      </MxModulePage>
    )
  }

  const matriz = page.matriz

  return (
    <MxModulePage width="wide" bottomClearance="navigation" accessMode={page.canManage ? 'manage' : 'read-only'}>
      <MxModuleHeader
        eyebrow="Administração da rede"
        title={`Filiais de ${matriz.name}`}
        description="Cada filial é uma loja completa vinculada a esta matriz. A hierarquia tem um nível: uma filial não pode ter filiais próprias."
        actions={
          page.canManage ? (
            <Button onClick={() => page.setIsCreateModalOpen(true)}>
              <Plus size={16} />
              Nova filial
            </Button>
          ) : null
        }
      />

      {matriz.parent_loja_id ? (
        <MxStatusBanner tone="warning" role="alert">
          Esta unidade é filial de outra loja. Filiais não têm filiais próprias — gerencie o grupo
          pela matriz.
        </MxStatusBanner>
      ) : null}

      {!page.canManage ? (
        <MxStatusBanner tone="info">
          Somente administradores MX alteram o vínculo entre matriz e filial. Esta visão é de leitura.
        </MxStatusBanner>
      ) : null}

      {page.canManage && !matriz.parent_loja_id ? (
        <MxSectionCard className="p-mx-md">
          <MxSectionHeader
            title="Vincular loja existente"
            description="Use quando a unidade já está cadastrada na rede e só falta declarar que ela pertence a esta matriz."
          />
          <div className="mt-mx-sm flex flex-col gap-mx-sm md:flex-row md:items-end">
            <MxField label="Loja" className="flex-1">
              <MxSelect
                value={page.linkingStoreId}
                onChange={(event) => page.setLinkingStoreId(event.target.value)}
                aria-label="Loja a vincular como filial"
              >
                <option value="">Selecione uma loja sem vínculo…</option>
                {page.linkableStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                    {store.active ? '' : ' (inativa)'}
                  </option>
                ))}
              </MxSelect>
            </MxField>
            <Button
              onClick={() => void page.handleLinkExistingStore()}
              loading={page.linking}
              disabled={!page.linkingStoreId}
            >
              Vincular como filial
            </Button>
          </div>
          {page.linkableStores.length === 0 ? (
            <Typography variant="p" tone="muted" className="mt-mx-sm block">
              Nenhuma loja disponível: as demais unidades já são filiais ou já são matriz de outro
              grupo.
            </Typography>
          ) : null}
        </MxSectionCard>
      ) : null}

      <MxSectionCard className="pb-mx-20">
        <MxSectionHeader
          title={`${page.branches.length} ${page.branches.length === 1 ? 'filial vinculada' : 'filiais vinculadas'}`}
          description="Excluir é definitivo e apaga as dependências operacionais. Desvincular só remove o vínculo com a matriz."
        />
        {page.branches.length === 0 ? (
          <MxEmptyState
            title="Nenhuma filial vinculada"
            description="Crie uma filial nova ou vincule uma loja já cadastrada na rede."
            icon={Building2}
          />
        ) : (
          <DataGrid
            columns={columns}
            data={page.branches}
            emptyMessage="Nenhuma filial vinculada a esta matriz."
            emptyDescription="Crie uma filial nova ou vincule uma loja já cadastrada."
          />
        )}
      </MxSectionCard>

      <CreateStoreModal
        open={page.isCreateModalOpen}
        newStore={page.newStore}
        setNewStore={page.setNewStore}
        creating={page.creating}
        onSubmit={page.handleCreateBranch}
        onClose={() => page.setIsCreateModalOpen(false)}
      />

      <StoreEditModal
        open={Boolean(page.editingStore)}
        store={page.editingStore}
        saving={page.savingStore}
        onClose={() => page.setEditingStore(null)}
        onSubmit={page.handleStoreUpdate}
      />

      <HardDeleteStoreModal
        store={page.hardDeleteStore}
        confirmation={page.hardDeleteConfirmation}
        deleting={page.hardDeleting}
        onConfirmationChange={page.setHardDeleteConfirmation}
        onClose={page.closeHardDeleteStore}
        onConfirm={() => void page.confirmHardDeleteStore()}
      />
    </MxModulePage>
  )
}

export default StoreBranches
