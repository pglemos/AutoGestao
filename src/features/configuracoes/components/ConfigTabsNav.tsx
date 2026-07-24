import { useMemo, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'
import { SECTION_LABELS } from '@/features/configuracoes/tabRegistry'
import type { ConfigTabDefinition, ConfigTabKey } from '@/features/configuracoes/types'
import type { UserRole } from '@/types/database'

interface ConfigTabsNavProps {
    tabs: ConfigTabDefinition[]
    activeTab: ConfigTabKey
    role: UserRole | null
    onSelect: (tab: ConfigTabKey) => void
}

export function ConfigTabsNav({ tabs, activeTab, role, onSelect }: ConfigTabsNavProps) {
    const manager = useMxSurfaceVisualMode() === 'manager'
    const [searchTerm, setSearchTerm] = useState('')
    const filteredTabs = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        if (!term) return tabs
        return tabs.filter(tab => `${SECTION_LABELS[tab.section]} ${tab.label} ${tab.description}`.toLowerCase().includes(term))
    }, [searchTerm, tabs])
    const sections = filteredTabs.reduce<Record<ConfigTabDefinition['section'], ConfigTabDefinition[]>>((acc, tab) => {
        acc[tab.section] = acc[tab.section] || []
        acc[tab.section].push(tab)
        return acc
    }, { pessoal: [], gestao: [], mx: [], sistema: [] })

    if (manager) {
        return (
            <nav
                data-mx-config-tabs="manager"
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                aria-label="Abas de configurações"
            >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <label className="relative block w-full lg:max-w-xs">
                        <span className="sr-only">Buscar configuração</span>
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar configuração"
                            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm font-normal text-gray-700 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                        />
                    </label>

                    <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 no-scrollbar">
                        {filteredTabs.map(tab => {
                            const Icon = tab.icon
                            const selected = tab.key === activeTab
                            const readOnly = Boolean(role && tab.readOnlyRoles?.includes(role))

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => onSelect(tab.key)}
                                    className={cn(
                                        'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
                                        selected
                                            ? 'bg-white text-emerald-700 shadow-sm'
                                            : 'text-gray-500 hover:bg-white/70 hover:text-gray-700',
                                    )}
                                    aria-current={selected ? 'page' : undefined}
                                    title={tab.description}
                                >
                                    <Icon size={14} className="shrink-0" />
                                    <span>{tab.label}</span>
                                    {readOnly ? <Eye size={12} className="text-gray-400" aria-label="Somente consulta" /> : null}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {filteredTabs.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                        <Typography variant="p" className="text-sm text-gray-500">Nenhuma configuração encontrada para a busca.</Typography>
                    </div>
                ) : null}
            </nav>
        )
    }

    return (
        <nav className="space-y-mx-md" aria-label="Abas de configurações">
            <label className="relative block">
                <span className="sr-only">Buscar configuração</span>
                <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar configuração"
                    className="h-mx-11 w-full rounded-mx-xl border border-border-default bg-white pl-mx-xl pr-mx-sm text-sm font-bold text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
                />
            </label>
            {(Object.keys(sections) as ConfigTabDefinition['section'][]).map(section => {
                const sectionTabs = sections[section]
                if (!sectionTabs.length) return null

                return (
                    <section key={section} className="space-y-mx-xs">
                        <Typography variant="tiny" className="px-mx-sm font-black uppercase tracking-widest text-text-secondary">
                            {SECTION_LABELS[section]}
                        </Typography>
                        <div className="space-y-mx-xs">
                            {sectionTabs.map(tab => {
                                const Icon = tab.icon
                                const selected = tab.key === activeTab
                                const readOnly = Boolean(role && tab.readOnlyRoles?.includes(role))

                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => onSelect(tab.key)}
                                        className={cn(
                                            'w-full min-h-mx-14 rounded-mx-xl border px-mx-sm py-mx-sm text-left transition-all',
                                            'flex items-center gap-mx-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15',
                                            selected
                                                ? 'border-brand-secondary bg-brand-secondary text-white shadow-mx-md'
                                                : readOnly
                                                  ? 'border-border-default border-dashed bg-surface-alt hover:border-brand-primary/30'
                                                  : 'border-border-default bg-white hover:border-brand-primary/30 hover:bg-surface-alt'
                                        )}
                                        aria-current={selected ? 'page' : undefined}
                                    >
                                        <span className={cn(
                                            'flex h-mx-10 w-mx-10 shrink-0 items-center justify-center rounded-mx-lg border',
                                            selected
                                                ? 'border-white/15 bg-white/10 text-white'
                                                : 'border-border-subtle bg-surface-alt text-brand-primary'
                                        )}>
                                            <Icon size={18} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className={cn('block truncate text-xs font-black uppercase tracking-widest', selected ? 'text-white' : 'text-text-primary')}>
                                                {tab.label}
                                            </span>
                                            <span className={cn('mt-1 block truncate text-mx-micro font-bold uppercase tracking-mx-wide', selected ? 'text-white' : 'text-text-secondary')}>
                                                {tab.description}
                                            </span>
                                        </span>
                                        {readOnly && (
                                            <Badge variant="outline" className={cn('shrink-0 text-mx-micro font-black uppercase', selected && 'border-white/30 text-white')}>
                                                <Eye size={11} className="mr-1" />
                                                Consulta
                                            </Badge>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                )
            })}
            {filteredTabs.length === 0 && (
                <div className="rounded-mx-xl border border-dashed border-border-default bg-white p-mx-md text-center">
                    <Typography variant="p" tone="muted">Nenhuma configuração encontrada para a busca.</Typography>
                </div>
            )}
        </nav>
    )
}
