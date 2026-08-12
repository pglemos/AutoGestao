import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Database,
  History,
  Layers,
  RefreshCw,
  ShieldCheck,
  Terminal as TerminalIcon,
  Upload,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { format, parseISO } from 'date-fns'
import { useStores } from '@/hooks/useTeam'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { validateLegacyCSV, type ValidationResult } from '@/lib/migration-validator'
import { DataGrid, type Column } from '@/components/organisms/DataGrid'
import {
  MxField,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'

interface ImportLog {
  type: 'info' | 'success' | 'warning' | 'error'
  msg: string
}

type ImportHistoryStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface ImportHistory {
  id: string
  created_at: string
  store_name?: string
  rows_processed?: number | null
  records_processed?: number | null
  records_failed?: number | null
  status: ImportHistoryStatus
}

type ImportHistoryRow = Omit<ImportHistory, 'store_name' | 'status'> & {
  status: string
  store: { name: string } | null
}

const statusMeta: Record<
  ImportHistoryStatus,
  { label: string; variant: 'success' | 'danger' | 'warning' | 'info' }
> = {
  completed: { label: 'Concluído', variant: 'success' },
  failed: { label: 'Falhou', variant: 'danger' },
  processing: { label: 'Processando', variant: 'info' },
  pending: { label: 'Pendente', variant: 'warning' },
}

async function calculateFileHash(file: File) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export default function Reprocessamento() {
  const { lojas } = useStores()
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [history, setHistory] = useState<ImportHistory[]>([])
  const [isRefetching, setIsRefetching] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((msg: string, type: ImportLog['type'] = 'info') => {
    setLogs((previous) => [
      ...previous,
      { type, msg: `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}` },
    ])
  }, [])

  const fetchHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('logs_reprocessamento')
      .select('id, created_at, status, rows_processed, records_processed, records_failed, store:lojas(name)')
      .eq('source_type', 'csv_import')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      toast.error('Falha ao carregar o histórico de reprocessamento.')
      return
    }

    setHistory(
      ((data || []) as unknown as ImportHistoryRow[]).map((item) => ({
        ...item,
        status: item.status as ImportHistoryStatus,
        store_name: item.store?.name,
      })),
    )
  }, [])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleRefresh = async () => {
    setIsRefetching(true)
    await fetchHistory()
    setIsRefetching(false)
    toast.success('Histórico atualizado.')
  }

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return
    setFile(event.target.files[0])
    setValidation(null)
    setLogs([])
  }

  const handleUpload = async () => {
    if (!file || !selectedStoreId) {
      toast.error('Selecione a unidade e o arquivo CSV.')
      return
    }

    setProcessing(true)
    setLogs([])
    setValidation(null)
    let openedLogId: string | null = null
    addLog(`Iniciando processamento: ${file.name}`)

    try {
      const text = await file.text()
      addLog('Validando estrutura e conteúdo do arquivo.')
      const result = validateLegacyCSV(text)
      setValidation(result)

      if (!result.isValid) {
        addLog('Estrutura de dados incompatível.', 'error')
        result.errors.forEach((error) => addLog(error, 'error'))
        toast.error('Arquivo inválido.')
        return
      }

      addLog(`${result.summary.validRows} registros válidos localizados.`, 'success')
      const fileHash = await calculateFileHash(file)
      addLog(`Hash calculado: ${fileHash.slice(0, 12)}…`)

      const { data: duplicate, error: duplicateError } = await supabase
        .from('logs_reprocessamento')
        .select('id, created_at')
        .eq('file_hash', fileHash)
        .eq('status', 'completed')
        .maybeSingle()

      if (duplicateError) throw new Error(duplicateError.message)
      if (duplicate) {
        throw new Error(`Arquivo já processado em lote concluído (${duplicate.id.split('-')[0]}).`)
      }

      const { data: log, error: logError } = await supabase
        .from('logs_reprocessamento')
        .insert({
          store_id: selectedStoreId,
          source_type: 'csv_import',
          triggered_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'pending',
          file_hash: fileHash,
          rows_processed: 0,
          records_processed: 0,
          records_failed: 0,
          warnings: [],
          errors: [],
        })
        .select()
        .single()

      if (logError) throw new Error(logError.message)
      openedLogId = log.id
      addLog(`Lote ${log.id.split('-')[0]} aberto.`, 'success')

      const chunkSize = 100
      for (let index = 0; index < result.records.length; index += chunkSize) {
        const chunk = result.records.slice(index, index + chunkSize)
        const { error: rawError } = await supabase
          .from('importacoes_brutas')
          .insert(chunk.map((rawData) => ({ log_id: log.id, raw_data: rawData })))
        if (rawError) throw new Error(rawError.message)
        addLog(`Enviado: ${Math.min(index + chunkSize, result.records.length)}/${result.records.length}`)
      }

      const { error: rpcError } = await supabase.rpc('process_import_data', { p_log_id: log.id })
      if (rpcError) throw new Error(rpcError.message)

      let attempts = 0
      let completed = false
      while (attempts < 30) {
        const { data: statusCheck } = await supabase
          .from('logs_reprocessamento')
          .select('status, records_processed, records_failed')
          .eq('id', log.id)
          .single()

        if (statusCheck?.status === 'completed') {
          addLog(`${statusCheck.records_processed} linhas processadas.`, 'success')
          completed = true
          break
        }
        if (statusCheck?.status === 'failed') throw new Error('O processamento foi interrompido com erro.')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        attempts += 1
      }

      if (!completed) throw new Error('Tempo limite aguardando a conclusão do processamento.')
      toast.success('Dados integrados.')
      await fetchHistory()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro inesperado no reprocessamento.'
      if (openedLogId) {
        await supabase
          .from('logs_reprocessamento')
          .update({
            status: 'failed',
            errors: [message],
            finished_at: new Date().toISOString(),
          })
          .eq('id', openedLogId)
        await fetchHistory()
      }
      addLog(message, 'error')
      toast.error('Falha no reprocessamento.')
    } finally {
      setProcessing(false)
    }
  }

  const columns = useMemo<Column<ImportHistory>[]>(
    () => [
      {
        key: 'created_at',
        header: 'Data e hora',
        render: (item) => (
          <div>
            <Typography variant="h4" className="text-sm">
              {format(parseISO(item.created_at), 'dd/MM/yyyy')}
            </Typography>
            <Typography variant="tiny" tone="muted">
              {format(parseISO(item.created_at), 'HH:mm:ss')}
            </Typography>
          </div>
        ),
      },
      {
        key: 'store_name',
        header: 'Unidade',
        render: (item) => (
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gray-50 text-sm font-semibold text-muted-foreground">
              {item.store_name?.charAt(0) || '—'}
            </span>
            <Typography variant="h4" className="truncate text-sm">
              {item.store_name || 'Unidade não informada'}
            </Typography>
          </div>
        ),
      },
      {
        key: 'rows_processed',
        header: 'Registros',
        align: 'center',
        render: (item) => (
          <Typography variant="mono" tone="brand" className="tabular-nums">
            {item.records_processed ?? item.rows_processed ?? 0}
          </Typography>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'right',
        render: (item) => {
          const meta = statusMeta[item.status] || statusMeta.failed
          return <Badge variant={meta.variant}>{meta.label}</Badge>
        },
      },
    ],
    [],
  )

  return (
    <MxModulePage>
      <MxModuleHeader
        title="Reprocessamento"
        description="Valide, importe e acompanhe lotes de dados com histórico auditável por unidade."
        actions={(
          <>
            <Button asChild variant="secondary">
              <Link to="/configuracoes">
                <ArrowLeft size={16} aria-hidden="true" />
                Voltar
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={() => void handleRefresh()} aria-label="Atualizar histórico">
              <RefreshCw size={16} className={cn(isRefetching && 'animate-spin')} aria-hidden="true" />
            </Button>
          </>
        )}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-5">
          <MxSectionCard>
            <MxSectionHeader
              title="Novo lote"
              description="Selecione a unidade e envie um arquivo CSV validado antes da importação."
              actions={<Database size={18} className="text-emerald-600" aria-hidden="true" />}
            />
            <div className="space-y-4 p-5">
              <MxField label="Unidade" htmlFor="reprocessing-store">
                <Select
                  id="reprocessing-store"
                  aria-label="Unidade"
                  value={selectedStoreId}
                  onChange={(event) => setSelectedStoreId(event.target.value)}
                >
                  <option value="">Selecione uma unidade</option>
                  {lojas.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </Select>
              </MxField>

              <MxField label="Arquivo CSV" htmlFor="csv-upload" hint="Use o modelo de importação compatível com a estrutura atual.">
                <input id="csv-upload" type="file" accept=".csv,text/csv" onChange={handleFileSelect} className="sr-only" />
                <label
                  htmlFor="csv-upload"
                  className={cn(
                    'flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-center transition',
                    file
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-gray-50 text-muted-foreground hover:border-emerald-200 hover:bg-emerald-50/50',
                  )}
                >
                  <Upload size={22} aria-hidden="true" />
                  <span className="max-w-full truncate text-sm font-medium">{file ? file.name : 'Selecionar arquivo'}</span>
                </label>
              </MxField>

              <Button
                onClick={() => void handleUpload()}
                disabled={processing || !file || !selectedStoreId}
                loading={processing}
                className="w-full"
              >
                {!processing && <Layers size={16} aria-hidden="true" />}
                Processar arquivo
              </Button>

              <AnimatePresence>
                {validation ? (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <MxStatusBanner tone={validation.isValid ? 'success' : 'danger'}>
                      <span className="flex items-center gap-2">
                        <ShieldCheck size={16} aria-hidden="true" />
                        {validation.summary.validRows} registros válidos e {validation.summary.sellersFound.length} vendedores identificados.
                      </span>
                    </MxStatusBanner>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </MxSectionCard>

          <MxSectionCard>
            <MxSectionHeader
              title="Eventos do processamento"
              description="Acompanhamento técnico do lote atual."
              actions={<TerminalIcon size={18} className="text-muted-foreground" aria-hidden="true" />}
            />
            <div className="max-h-72 min-h-48 overflow-y-auto bg-gray-900 p-4 font-mono text-xs leading-5 text-text-disabled" role="log" aria-live="polite">
              {logs.length === 0 ? <p className="text-muted-foreground">Nenhum processamento iniciado nesta sessão.</p> : null}
              {logs.map((log, index) => (
                <p
                  key={`${log.msg}-${index}`}
                  className={cn(
                    'mb-1',
                    log.type === 'error' && 'text-red-300',
                    log.type === 'warning' && 'text-amber-300',
                    log.type === 'success' && 'text-emerald-300',
                  )}
                >
                  {log.msg}
                </p>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </MxSectionCard>
        </div>

        <MxSectionCard className="min-w-0">
          <MxSectionHeader
            title="Histórico de lotes"
            description="Últimos 100 eventos de importação e seus resultados."
            actions={<History size={18} className="text-emerald-600" aria-hidden="true" />}
          />
          <DataGrid columns={columns} data={history} emptyMessage="Nenhum lote processado." emptyDescription="Os lotes importados aparecerão aqui." />
        </MxSectionCard>
      </div>
    </MxModulePage>
  )
}
