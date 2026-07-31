import { useState } from 'react'
import { toast } from '@/lib/toast'
import { Briefcase, Clock, DollarSign, GraduationCap, Save, Target, UserCircle } from 'lucide-react'
import { PageHeading } from '@/components/molecules/PageHeading'
import { Card } from '@/components/molecules/Card'
import { FormField } from '@/components/molecules/FormField'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Skeleton } from '@/components/atoms/Skeleton'
import { useMeuPerfilVendedor, type PerfilVendedor } from './hooks/useMeuPerfilVendedor'
import { PageTemplate } from '@/components/templates/PageTemplate'

const formatBRL = (value: number) =>
    `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Section({ title, icon: Icon, children }: { title: string; icon: typeof UserCircle; children: React.ReactNode }) {
    return (
        <Card className="p-mx-lg">
            <div className="mb-mx-lg flex items-center gap-mx-sm">
                <div className="flex h-mx-10 w-mx-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10">
                    <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                </div>
                <Typography variant="h3" className="text-base font-semibold">{title}</Typography>
            </div>
            {children}
        </Card>
    )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div className="w-full space-y-mx-xs">
            <span className="ml-2 block">
                <Typography variant="caption" tone="muted">{label}</Typography>
            </span>
            <div className="flex min-h-[48px] items-center rounded-xl border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-500">
                {value}
            </div>
        </div>
    )
}

function LabeledTextarea({ label, value, onChange, rows, maxLength, placeholder }: {
    label: string
    value: string
    onChange: (value: string) => void
    rows: number
    maxLength: number
    placeholder: string
}) {
    return (
        <div className="w-full space-y-mx-xs">
            <span className="ml-2 block">
                <Typography variant="caption" tone="muted">{label}</Typography>
            </span>
            <Textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} maxLength={maxLength} placeholder={placeholder} className="min-h-0" />
        </div>
    )
}

export default function MeuPerfilVendedorContainer() {
    const { perfil, setPerfil, loading, saving, salvar, officialPerformance } = useMeuPerfilVendedor()
    const [erroSalvar, setErroSalvar] = useState<string | null>(null)

    const atualizar = (patch: Partial<PerfilVendedor>) => setPerfil(prev => ({ ...prev, ...patch }))

    const handleSave = async () => {
        setErroSalvar(null)
        const { error } = await salvar(perfil)
        if (error) {
            setErroSalvar(error)
            toast.error('Erro ao salvar perfil', { description: error })
            return
        }
        toast.success('Perfil salvo', { description: 'Suas informações foram atualizadas.' })
    }

    const mesesDecorridos = Math.max(new Date().getMonth() + 1, 1)
    const mediaMensal = officialPerformance ? (officialPerformance.vendas_realizadas / mesesDecorridos).toFixed(1) : '0'
    const tempoDeCasa = perfil.entry_date
        ? `${Math.max(0, Math.floor((Date.now() - new Date(perfil.entry_date).getTime()) / 31557600000))} ano(s)`
        : 'Não informado'

    if (loading) {
        return (
            <PageTemplate as="div" width="dashboard" className="flex flex-col gap-mx-xl" aria-busy="true">
                <Skeleton className="h-16 w-full max-w-md" />
                <div className="grid grid-cols-1 gap-mx-lg lg:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            </PageTemplate>
        )
    }

    return (
        <PageTemplate as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-mx-lg">
            <PageHeading
                title="Meu Perfil"
                subtitle="Gerencie suas informações pessoais e profissionais"
                actions={
                    <Button variant="brand" onClick={handleSave} disabled={saving} loading={saving} icon={<Save className="h-4 w-4" />}>
                        {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                }
            />

            {erroSalvar && (
                <div role="alert" className="rounded-xl border border-status-error/30 bg-status-error/5 px-mx-md py-mx-sm text-sm font-semibold text-status-error">
                    {erroSalvar}
                </div>
            )}

            <div className="grid grid-cols-1 gap-mx-lg lg:grid-cols-2">
                <Section title="Informações Pessoais" icon={UserCircle}>
                    <div className="grid gap-mx-md">
                        <FormField label="Nome Completo" value={perfil.full_name} onChange={e => atualizar({ full_name: e.target.value })} />
                        <FormField label="Telefone" value={perfil.phone} onChange={e => atualizar({ phone: e.target.value })} placeholder="(00) 00000-0000" />
                    </div>
                </Section>

                <Section title="Informações Profissionais" icon={Briefcase}>
                    <div className="grid gap-mx-md">
                        <ReadOnlyField label="Concessionária" value={perfil.dealership_name || 'Não vinculada'} />
                        <div className="grid grid-cols-2 gap-mx-md">
                            <ReadOnlyField label="Cargo" value={perfil.role || 'Vendedor'} />
                            <FormField
                                label="Anos de Experiência"
                                type="number"
                                min={0}
                                value={perfil.experience_years}
                                onChange={e => atualizar({ experience_years: parseInt(e.target.value, 10) || 0 })}
                            />
                        </div>
                    </div>
                </Section>

                <Section title="Horário de Trabalho" icon={Clock}>
                    <div className="grid grid-cols-2 gap-mx-md">
                        <FormField
                            label="Início do Expediente"
                            type="time"
                            list="work-start-options"
                            value={perfil.work_start}
                            onChange={e => atualizar({ work_start: e.target.value })}
                        />
                        <datalist id="work-start-options">
                            {perfil.work_schedule_options.map(option => (
                                <option key={option.id} value={option.work_start}>{option.label}</option>
                            ))}
                        </datalist>
                        <FormField
                            label="Fim do Expediente"
                            type="time"
                            list="work-end-options"
                            value={perfil.work_end}
                            onChange={e => atualizar({ work_end: e.target.value })}
                        />
                        <datalist id="work-end-options">
                            {perfil.work_schedule_options.map(option => (
                                <option key={option.id} value={option.work_end}>{option.label}</option>
                            ))}
                        </datalist>
                    </div>
                </Section>

                <Section title="Objetivos e Metas" icon={Target}>
                    <div className="grid grid-cols-2 gap-mx-md">
                        <ReadOnlyField label="Meta Mensal (unidades)" value={`${officialPerformance?.meta ?? 0}`} />
                        <ReadOnlyField label="Média Mensal no Ano" value={mediaMensal} />
                    </div>
                </Section>

                <Section title="Formação" icon={GraduationCap}>
                    <div className="grid gap-mx-md">
                        <LabeledTextarea
                            label="Formação Acadêmica"
                            value={perfil.academic_education}
                            onChange={value => atualizar({ academic_education: value })}
                            rows={3}
                            maxLength={2000}
                            placeholder="Graduação, instituição e ano."
                        />
                        <LabeledTextarea
                            label="Cursos e Certificações"
                            value={perfil.courses_certifications}
                            onChange={value => atualizar({ courses_certifications: value })}
                            rows={3}
                            maxLength={3000}
                            placeholder="Cursos, certificações e datas relevantes."
                        />
                    </div>
                </Section>

                <Section title="Histórico Profissional e Carreira" icon={Briefcase}>
                    <div className="grid gap-mx-md">
                        <div className="grid grid-cols-2 gap-mx-md">
                            <ReadOnlyField label="Data de Entrada" value={perfil.entry_date || 'Não informado'} />
                            <ReadOnlyField label="Tempo de Casa" value={tempoDeCasa} />
                        </div>
                        <LabeledTextarea
                            label="Empresas e Experiências Anteriores"
                            value={perfil.previous_experience}
                            onChange={value => atualizar({ previous_experience: value })}
                            rows={4}
                            maxLength={4000}
                            placeholder="Empresa, cargo, período e principais resultados."
                        />
                        <LabeledTextarea
                            label="Plano de Carreira"
                            value={perfil.career_plan}
                            onChange={value => atualizar({ career_plan: value })}
                            rows={3}
                            maxLength={3000}
                            placeholder="Objetivos, próximos passos e interesses profissionais."
                        />
                    </div>
                </Section>

                <Section title="Performance e Desenvolvimento" icon={Target}>
                    <div className="grid grid-cols-2 gap-mx-md sm:grid-cols-3">
                        <ReadOnlyField label="Vendas Oficiais no Ano" value={`${officialPerformance?.vendas_realizadas ?? 0}`} />
                        <ReadOnlyField label="Média Mensal Oficial" value={mediaMensal} />
                        <ReadOnlyField label="Histórico de PDI" value={`${perfil.pdi_history_count} registro(s)`} />
                        <ReadOnlyField label="Disciplina" value={`${Math.round(officialPerformance?.disciplina ?? 0)}%`} />
                        <ReadOnlyField label="Regularizações Pendentes" value={`${officialPerformance?.regularizacoes_pendentes ?? 0}`} />
                        <ReadOnlyField label="Regularizações Aprovadas" value={`${officialPerformance?.regularizacoes_aprovadas ?? 0}`} />
                    </div>
                </Section>

                <Section title="Remuneração" icon={DollarSign}>
                    <div className="grid gap-mx-md">
                        {/* Somente leitura — a remuneração é definida pelo plano/cargo atribuído
                            pelo dono; o vendedor não edita comissão ou meta de remuneração aqui. */}
                        <div className="grid grid-cols-2 gap-mx-md">
                            <ReadOnlyField label="Comissão por Unidade" value={formatBRL(perfil.commission_per_unit)} />
                            <ReadOnlyField label="Meta de Remuneração" value={formatBRL(perfil.salary_goal)} />
                        </div>
                        <Select
                            label="Interesse em Oportunidades"
                            value={perfil.job_interest}
                            onChange={e => atualizar({ job_interest: e.target.value as PerfilVendedor['job_interest'] })}
                        >
                            <option value="Não">Não</option>
                            <option value="Confidencial">Confidencial</option>
                            <option value="Disponível para o mercado">Disponível para o mercado</option>
                        </Select>
                    </div>
                </Section>
            </div>
            </PageTemplate>
    )
}
