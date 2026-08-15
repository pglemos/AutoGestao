import { useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { METHODOLOGY_STATUS } from './methodology'
import type { MethodologyVersion } from './consultoriaMxData'

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function VersionStatusBadge({ status }: { status: string }) {
  const meta = METHODOLOGY_STATUS[status as keyof typeof METHODOLOGY_STATUS] ?? { label: status, tone: 'neutral' as const }
  return <MxStatusBanner tone={meta.tone}>{meta.label}</MxStatusBanner>
}

/** Comparação entre versões metodológicas de um produto. */
export function VersionsCompareModal(props: {
  versions: MethodologyVersion[]
  productName: string
  onClose: () => void
}) {
  const [leftId, setLeftId] = useState(props.versions[0]?.id)
  const [rightId, setRightId] = useState(props.versions[1]?.id)

  const left = props.versions.find(version => version.id === leftId) ?? null
  const right = props.versions.find(version => version.id === rightId) ?? null

  const rows = [
    { label: 'Versão metodológica', left: left?.methodology_version_number ?? '—', right: right?.methodology_version_number ?? '—' },
    { label: 'Status', left: left ? METHODOLOGY_STATUS[left.status as keyof typeof METHODOLOGY_STATUS]?.label ?? left.status : '—', right: right ? METHODOLOGY_STATUS[right.status as keyof typeof METHODOLOGY_STATUS]?.label ?? right.status : '—' },
    { label: 'Encontros configurados', left: String(left?.encounters_configured ?? '—'), right: String(right?.encounters_configured ?? '—') },
    { label: 'Encontros pendentes', left: String(left?.encounters_pending ?? '—'), right: String(right?.encounters_pending ?? '—') },
    { label: 'Vídeos', left: String(left?.videos_count ?? '—'), right: String(right?.videos_count ?? '—') },
    { label: 'Arquivos', left: String(left?.files_count ?? '—'), right: String(right?.files_count ?? '—') },
    { label: 'Modelos de relatório', left: String(left?.report_templates_count ?? '—'), right: String(right?.report_templates_count ?? '—') },
    { label: 'Publicada em', left: formatDateTime(left?.published_at ?? null), right: formatDateTime(right?.published_at ?? null) },
  ]

  return (
    <Modal open onClose={props.onClose} title={`Comparar versões — ${props.productName}`} size="2xl" footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}>
      <div className="space-y-4">
        {props.versions.length < 2 ? (
          <MxStatusBanner tone="warning">Este produto ainda não tem duas versões para comparar.</MxStatusBanner>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <VersionSelect label="Versão A" versions={props.versions} value={leftId} onChange={setLeftId} />
              <VersionSelect label="Versão B" versions={props.versions} value={rightId} onChange={setRightId} />
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Critério</th>
                    <th className="px-3 py-2 font-medium text-foreground">{left?.methodology_version_number ?? '—'}</th>
                    <th className="px-3 py-2 font-medium text-foreground">{right?.methodology_version_number ?? '—'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.label} className="border-b border-border-subtle last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                      <td className="px-3 py-2 text-foreground">{row.left}</td>
                      <td className="px-3 py-2 text-foreground">{row.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

/** Histórico das versões metodológicas de um produto. */
export function VersionsHistoryModal(props: {
  versions: MethodologyVersion[]
  productName: string
  onClose: () => void
}) {
  const sorted = [...props.versions].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return (
    <Modal open onClose={props.onClose} title={`Histórico — ${props.productName}`} size="2xl" footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}>
      <div className="space-y-2">
        {sorted.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma versão metodológica criada ainda.</p> : (
          sorted.map(version => (
            <div key={version.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">Metodologia v{version.methodology_version_number}</div>
                <VersionStatusBadge status={version.status} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Criada em {formatDateTime(version.created_at)}
                {version.published_at && ` · Publicada em ${formatDateTime(version.published_at)}`}
                {version.change_summary && <div className="mt-1">{version.change_summary}</div>}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>{version.encounters_configured} configurados</span>
                <span>{version.encounters_pending} pendentes</span>
                <span>{version.videos_count} vídeos</span>
                <span>{version.files_count} arquivos</span>
                <span>{version.report_templates_count} relatórios</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}

function VersionSelect(props: { label: string; versions: MethodologyVersion[]; value: string | undefined; onChange: (id: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">{props.label}</span>
      <select
        value={props.value ?? ''}
        onChange={event => props.onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        aria-label={props.label}
      >
        {props.versions.map(version => (
          <option key={version.id} value={version.id}>v{version.methodology_version_number} — {METHODOLOGY_STATUS[version.status as keyof typeof METHODOLOGY_STATUS]?.label ?? version.status}</option>
        ))}
      </select>
    </label>
  )
}
