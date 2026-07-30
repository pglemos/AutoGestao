import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Building2, Camera, Check, CheckCircle2, FileText, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, Upload, UserRound } from 'lucide-react'
import { getSupabaseFunctionHeaders, getSupabaseFunctionUrl } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { requestPasswordRecovery } from '@/lib/auth/passwordRecovery'

type PublicStore = {
  id: string
  name: string
  legal_name?: string | null
  cnpj?: string | null
  address?: string | null
  administrative_phone?: string | null
}

type FormState = {
  full_name: string
  email: string
  phone: string
  role: 'vendedor' | 'gerente' | 'dono'
  segment: string
  store_tenure: string
  market_experience: string
  company_legal_name: string
  company_cnpj: string
  company_address: string
  company_administrative_phone: string
}

type PhotoState = {
  preview: string
  base64: string
  mimeType: string
  fileName: string
}

type FormErrors = Partial<Record<keyof FormState | 'photo', string>>

const initialForm: FormState = {
  full_name: '',
  email: '',
  phone: '',
  role: 'vendedor',
  segment: 'Automotivo',
  store_tenure: '',
  market_experience: '',
  company_legal_name: '',
  company_cnpj: '',
  company_address: '',
  company_administrative_phone: '',
}

const roleOptions = [
  { value: 'vendedor', label: 'Vendedor', description: 'Atendimento, prospecção e vendas' },
  { value: 'gerente', label: 'Gerente', description: 'Rotina, metas e acompanhamento' },
  { value: 'dono', label: 'Dono / Sócio', description: 'Governança e decisão da loja' },
] as const

const tenureOptions = ['Menos de 3 meses', '3 a 6 meses', '6 meses a 1 ano', '1 a 2 anos', 'Mais de 2 anos']
const marketOptions = ['Primeira experiência', 'Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos']
const steps = [
  { id: 0, label: 'Identidade', helper: 'Nome, contato e foto opcional' },
  { id: 1, label: 'Vínculo', helper: 'Loja, função e segmento' },
  { id: 2, label: 'Experiência', helper: 'Tempo, mercado e revisão' },
] as const
const storeFetchAttempts = 3
const storeFetchRetryDelayMs = 450
const storeFetchTimeoutMs = 12_000

function getStorePreRegistrationUrl() {
  if (typeof window !== 'undefined' && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    return new URL('/api/store-pre-registration', window.location.origin).toString()
  }

  return getSupabaseFunctionUrl('store-pre-registration')
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function publicStoreFetchErrorMessage(error: Error) {
  if (error.name === 'AbortError') {
    return 'A conexão demorou mais que o esperado. Tente novamente.'
  }

  if (error.message === 'Failed to fetch' || error.message === 'Network request failed') {
    return 'Não foi possível conectar ao cadastro da loja. Tente novamente.'
  }

  return error.message || 'Não foi possível carregar esta loja.'
}

async function fetchPublicStore(functionUrl: string, storeSlug: string, attempt: number) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), storeFetchTimeoutMs)
  const url = new URL(functionUrl)
  url.searchParams.set('store_slug', storeSlug)
  url.searchParams.set('attempt', String(attempt))
  url.searchParams.set('ts', String(Date.now()))

  try {
    const response = await fetch(url.toString(), {
      cache: 'no-store',
      headers: getSupabaseFunctionHeaders(),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Loja não localizada.')
    return payload.store as PublicStore
  } finally {
    window.clearTimeout(timeout)
  }
}

export default function StorePreRegistration() {
  const { storeSlug } = useParams()
  const [store, setStore] = useState<PublicStore | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [photo, setPhoto] = useState<PhotoState | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [provisionalLogin, setProvisionalLogin] = useState<{ email: string } | null>(null)
  const [existingLogin, setExistingLogin] = useState(false)
  const [existingRecoveryStatus, setExistingRecoveryStatus] = useState<'sent' | 'unavailable' | null>(null)
  const [step, setStep] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  const functionUrl = useMemo(() => getStorePreRegistrationUrl(), [])
  const completion = useMemo(() => {
    const ownerFields = form.role === 'dono'
      ? [form.company_legal_name, form.company_cnpj, form.company_address, form.company_administrative_phone]
      : []
    const fields = [form.full_name, form.email, form.phone, form.role, form.segment, form.store_tenure, form.market_experience, ...ownerFields]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }, [form])

  const stepProgress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step])

  useEffect(() => {
    let cancelled = false

    const fetchStore = async () => {
      setLoading(true)
      setError(null)
      setStore(null)

      if (!storeSlug) {
        setError('Link da loja inválido.')
        setLoading(false)
        return
      }

      let lastError = new Error('Não foi possível carregar esta loja.')

      try {
        for (let attempt = 1; attempt <= storeFetchAttempts; attempt += 1) {
          try {
            const publicStore = await fetchPublicStore(functionUrl, storeSlug, attempt)
            if (!cancelled) setStore(publicStore)
            return
          } catch (err) {
            lastError = err instanceof Error ? err : new Error('Não foi possível carregar esta loja.')
            if (attempt < storeFetchAttempts) await wait(storeFetchRetryDelayMs * attempt)
          }
        }

        if (!cancelled) setError(publicStoreFetchErrorMessage(lastError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStore()

    return () => {
      cancelled = true
    }
  }, [functionUrl, reloadKey, storeSlug])

  const updateForm = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const getValidationErrors = (scope: 'all' | 'step' = 'all') => {
    const nextErrors: FormErrors = {}

    if (scope === 'all' || step === 0) {
      if (form.full_name.trim().split(/\s+/).length < 2) nextErrors.full_name = 'Informe nome e sobrenome.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Informe um e-mail válido.'
      if (form.phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Informe um telefone válido.'
    }

    if (scope === 'all' || step === 1) {
      if (!form.segment.trim()) nextErrors.segment = 'Informe o segmento.'
    }

    if (scope === 'all' || step === 2) {
      if (!form.store_tenure) nextErrors.store_tenure = 'Selecione o tempo na loja.'
      if (!form.market_experience) nextErrors.market_experience = 'Selecione a experiência de mercado.'
      if (form.role === 'dono') {
        if (form.company_legal_name.trim().length < 2) nextErrors.company_legal_name = 'Informe a razão social da loja.'
        if (form.company_cnpj.replace(/\D/g, '').length !== 14) nextErrors.company_cnpj = 'Informe um CNPJ válido com 14 dígitos.'
        if (form.company_address.trim().length < 6) nextErrors.company_address = 'Informe o endereço completo da loja.'
        if (form.company_administrative_phone.replace(/\D/g, '').length < 10) nextErrors.company_administrative_phone = 'Informe o telefone administrativo.'
      }
    }

    return nextErrors
  }

  const validateForm = () => {
    const nextErrors = getValidationErrors('all')
    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleNext = () => {
    const nextErrors = getValidationErrors('step')
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setStep(current => Math.min(current + 1, steps.length - 1))
  }

  const handleBack = () => {
    setFormErrors({})
    setStep(current => Math.max(current - 1, 0))
  }

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormErrors(prev => ({ ...prev, photo: 'Use JPG, PNG ou WEBP.' }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, photo: 'A foto deve ter no máximo 5MB.' }))
      return
    }

    const preview = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Não foi possível ler a foto.'))
      reader.readAsDataURL(file)
    })

    setPhoto({
      preview,
      base64: preview.split(',')[1] || '',
      mimeType: file.type,
      fileName: file.name,
    })
    setFormErrors(prev => ({ ...prev, photo: undefined }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!store) return
    if (!validateForm()) return

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: getSupabaseFunctionHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          store_id: store.id,
          ...form,
          avatar_base64: photo?.base64,
          avatar_mime_type: photo?.mimeType,
          avatar_file_name: photo?.fileName,
        }),
      })
      const payload = await response.json()
      if (response.status === 409 && payload.code === 'existing_user') {
        let recoveryStatus: 'sent' | 'unavailable' = 'unavailable'
        try {
          await requestPasswordRecovery(form.email)
          recoveryStatus = 'sent'
        } catch {
          recoveryStatus = 'unavailable'
        }
        setExistingLogin(true)
        setExistingRecoveryStatus(recoveryStatus)
        setSuccess(true)
        setProvisionalLogin({ email: form.email.trim().toLowerCase() })
        setForm(initialForm)
        setPhoto(null)
        setStep(0)
        return
      }
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Falha ao enviar cadastro.')
      setExistingLogin(false)
      setExistingRecoveryStatus(null)
      setSuccess(true)
      setProvisionalLogin({ email: payload.login_email || form.email })
      setForm(initialForm)
      setPhoto(null)
      setStep(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o pré-cadastro.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-pre-shell min-h-screen text-white overflow-hidden relative">
      <div className="mx-pre-noise" />
      <div className="mx-pre-hero-bg">
        <div className="mx-pre-hero-grid" />
        <div className="mx-pre-hero-glow" />
        <motion.div
          className="mx-pre-hero-scan"
          initial={{ y: '-15%' }}
          animate={{ y: '115%' }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <header className="mx-pre-topbar">
        <div className="mx-pre-topbar-inner">
          <div className="mx-pre-brand">
            <div className="mx-pre-brand-mark">
              <img src="/landing/logo-mx.png" alt="MX" />
            </div>
            <div className="mx-pre-brand-copy">
              <p>MX <span>Performance</span></p>
              <small>Pré-cadastro de equipe</small>
            </div>
          </div>
          <div className="mx-pre-live">
            <span />
            Link oficial
          </div>
        </div>
      </header>

      <section className="mx-pre-stage">
        <motion.aside
          className="mx-pre-intro"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="mx-pre-meta">
            <i />
            <b>{loading ? 'Sincronizando loja' : store?.name || 'Link da loja'}</b>
          </div>
          <h1>
            Seu acesso entra no <em>ambiente MX.</em>
          </h1>
          <p>
            Faça seu cadastro para ter acesso ao sistema de Consultoria. Leva apenas 1 minuto.
          </p>

          <div className="mx-pre-proof">
            {[
              { label: 'Loja', value: loading ? 'Carregando' : store?.name || 'Indisponível', icon: Building2 },
              { label: 'Validação', value: 'Admin MX', icon: ShieldCheck },
              { label: 'Login', value: 'Pendente', icon: LockKeyhole },
            ].map(item => (
              <motion.div key={item.label} whileHover={{ x: 6 }} className="mx-pre-proof-row">
                <item.icon size={18} />
                <span>{item.label}</span>
                <b>{item.value}</b>
              </motion.div>
            ))}
          </div>

          <div className="mx-pre-mobile-progress" aria-label={`Progresso ${completion}%`}>
            <div>
              <span>Dados preenchidos</span>
              <b>{completion}%</b>
            </div>
            <i><motion.span initial={false} animate={{ width: `${completion}%` }} /></i>
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 22, rotateX: -4 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.72, ease: [0.2, 0.7, 0.2, 1], delay: 0.08 }}
          className="mx-pre-console"
        >
          <div className="mx-pre-console-bar">
            <div className="mx-pre-window-dots"><i /><i /><i /></div>
            <span>store.access / {store?.name || 'mx'}</span>
            <b>{step + 1}/{steps.length}</b>
          </div>

          <div className="mx-pre-console-body">
            <div className="mx-pre-wizard-head">
              <div>
                <p>Pré-cadastro</p>
                <h2>{steps[step].label}</h2>
              </div>
              <div className="mx-pre-step-meter">
                <span>{stepProgress}%</span>
                <i><motion.b initial={false} animate={{ width: `${stepProgress}%` }} /></i>
              </div>
            </div>

            <div className="mx-pre-steps">
              {steps.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.id < step && setStep(item.id)}
                  className={cn('mx-pre-step-tab', item.id === step && 'active', item.id < step && 'done')}
                >
                  <span>{item.id < step ? <Check size={13} /> : item.id + 1}</span>
                  <b>{item.label}</b>
                  <small>{item.helper}</small>
                </button>
              ))}
            </div>

            <div>
              {loading ? (
                <div className="mx-pre-state">
                  <div className="mx-pre-loader" />
                </div>
              ) : success ? (
                <div className="mx-pre-success">
                  <div className="mx-pre-success-icon">
                    <CheckCircle2 size={42} />
                  </div>
                  <div>
                      <h2>{existingLogin ? 'Cadastro já existente' : 'Cadastro recebido'}</h2>
                      <p>
                        {existingLogin
                          ? existingRecoveryStatus === 'sent'
                            ? 'Este e-mail já possui usuário no MX. Não criamos duplicidade e encaminhamos a recuperação de senha. Verifique também spam e lixo eletrônico.'
                            : 'Este e-mail já possui usuário no MX. Não criamos duplicidade. Abra a recuperação de senha abaixo para solicitar um novo link.'
                          : 'O login foi criado como pendente. Admin MX ou MX Master precisa validar a hierarquia antes de liberar seu acesso.'}
                      </p>
                  </div>
                  {provisionalLogin && (
                    <div className="mx-pre-login-box">
                      <small>{existingLogin ? 'E-mail orientado para recuperação' : 'Login provisório após aprovação'}</small>
                      <p>{provisionalLogin.email}</p>
                    </div>
                  )}
                  {existingLogin && provisionalLogin && (
                    <a
                      href={`/login?mode=forgot&email=${encodeURIComponent(provisionalLogin.email)}`}
                      className="mx-pre-btn primary"
                    >
                      Abrir recuperação de senha
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSuccess(false); setExistingLogin(false); setExistingRecoveryStatus(null) }}
                    className="mx-pre-btn ghost"
                  >
                    Enviar outro cadastro
                  </button>
                </div>
              ) : error && !store ? (
                <div className="mx-pre-state">
                  <Building2 size={42} className="text-gray-500" />
                  <h2>Link indisponível</h2>
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => setReloadKey(current => current + 1)}
                    className="mx-pre-btn primary"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <motion.form
                  onSubmit={handleSubmit}
                  className="mx-pre-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 22 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -22 }}
                      transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
                      className="mx-pre-step-panel"
                    >
                      {step === 0 && (
                        <div className="mx-pre-identity-grid">
                          <div>
                            <span className="mx-public-label">Foto para avatar (opcional)</span>
                            <motion.div
                              whileHover={{ y: -2 }}
                              className={cn('mx-photo-stage', formErrors.photo && 'is-invalid')}
                            >
                              {photo?.preview ? (
                                <img src={photo.preview} alt="Prévia da foto enviada" />
                              ) : (
                                <div>
                                  <Camera size={34} />
                                  <span>Foto opcional</span>
                                </div>
                              )}
                            </motion.div>
                            {formErrors.photo && <FieldError>{formErrors.photo}</FieldError>}
                            <div className="mx-photo-actions">
                              <label className="mx-photo-action">
                                <Camera size={17} />
                                <span>Tirar foto</span>
                                <input aria-label="Tirar foto" type="file" accept="image/*" capture="user" onChange={handlePhotoChange} className="sr-only" />
                              </label>
                              <label className="mx-photo-action">
                                <Upload size={17} />
                                <span>Anexar</span>
                                <input aria-label="Anexar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} className="sr-only" />
                              </label>
                            </div>
                          </div>
                          <div className="mx-pre-field-stack">
                            <Field label="Nome completo" icon={UserRound} error={formErrors.full_name}>
                              <input required value={form.full_name} onChange={event => updateForm('full_name', event.target.value.toUpperCase())} placeholder="NOME COMPLETO" className="mx-public-input" />
                            </Field>
                            <Field label="E-mail" icon={Mail} error={formErrors.email}>
                              <input required type="email" value={form.email} onChange={event => updateForm('email', event.target.value)} placeholder="voce@email.com" className="mx-public-input" />
                            </Field>
                            <Field label="Telefone / WhatsApp" icon={Phone} error={formErrors.phone}>
                              <input required value={form.phone} onChange={event => updateForm('phone', event.target.value)} placeholder="(00) 00000-0000" className="mx-public-input" />
                            </Field>
                          </div>
                        </div>
                      )}

                      {step === 1 && (
                        <div className="mx-pre-field-stack">
                          <Field label="Loja" icon={Building2}>
                            <input aria-label="Loja" readOnly value={store?.name || ''} className="mx-public-input" />
                          </Field>
                          <div>
                            <label htmlFor="prereg-segment" className="mx-public-label">Segmento</label>
                            <input id="prereg-segment" required value={form.segment} onChange={event => updateForm('segment', event.target.value)} placeholder="Automotivo" className="mx-public-input" />
                            {formErrors.segment && <FieldError>{formErrors.segment}</FieldError>}
                          </div>
                          <div>
                            <span id="prereg-role-label" className="mx-public-label">Função</span>
                            <div className="mx-role-grid">
                              {roleOptions.map(option => (
                                <motion.button
                                  key={option.value}
                                  type="button"
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => updateForm('role', option.value)}
                                  className={cn('mx-role-option', form.role === option.value && 'mx-role-option-active')}
                                >
                                  <span>{option.label}</span>
                                  <small>{option.description}</small>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="mx-pre-field-stack">
                          <div className="mx-pre-two">
                            <div>
                              <label htmlFor="prereg-tenure" className="mx-public-label">Tempo na loja</label>
                              <select aria-label="Tempo na loja" id="prereg-tenure" required value={form.store_tenure} onChange={event => updateForm('store_tenure', event.target.value)} className="mx-public-input">
                                <option value="">Selecione</option>
                                {tenureOptions.map(option => <option key={option} value={option}>{option}</option>)}
                              </select>
                              {formErrors.store_tenure && <FieldError>{formErrors.store_tenure}</FieldError>}
                            </div>
                            <div>
                              <label htmlFor="prereg-market" className="mx-public-label">Experiência de mercado</label>
                              <select aria-label="Experiência de mercado" id="prereg-market" required value={form.market_experience} onChange={event => updateForm('market_experience', event.target.value)} className="mx-public-input">
                                <option value="">Selecione</option>
                                {marketOptions.map(option => <option key={option} value={option}>{option}</option>)}
                              </select>
                              {formErrors.market_experience && <FieldError>{formErrors.market_experience}</FieldError>}
                            </div>
                          </div>
                          {form.role === 'dono' && (
                            <div className="mx-pre-owner-block">
                              <div className="mx-pre-owner-head">
                                <ShieldCheck size={18} />
                                <div>
                                  <b>Dados administrativos da loja</b>
                                  <span>Obrigatório para cadastro como dono ou sócio.</span>
                                </div>
                              </div>
                              <div className="mx-pre-field-stack">
                                <Field label="Razão social" icon={FileText} error={formErrors.company_legal_name}>
                                  <input required value={form.company_legal_name} onChange={event => updateForm('company_legal_name', event.target.value.toUpperCase())} placeholder="RAZÃO SOCIAL DA LOJA" className="mx-public-input" />
                                </Field>
                                <div className="mx-pre-two">
                                  <Field label="CNPJ" icon={Building2} error={formErrors.company_cnpj}>
                                    <input required value={form.company_cnpj} onChange={event => updateForm('company_cnpj', event.target.value)} placeholder="00.000.000/0000-00" className="mx-public-input" />
                                  </Field>
                                  <Field label="Telefone administrativo" icon={Phone} error={formErrors.company_administrative_phone}>
                                    <input required value={form.company_administrative_phone} onChange={event => updateForm('company_administrative_phone', event.target.value)} placeholder="(00) 00000-0000" className="mx-public-input" />
                                  </Field>
                                </div>
                                <Field label="Endereço completo" icon={MapPin} error={formErrors.company_address}>
                                  <input required value={form.company_address} onChange={event => updateForm('company_address', event.target.value.toUpperCase())} placeholder="RUA, NÚMERO, BAIRRO, CIDADE/UF" className="mx-public-input" />
                                </Field>
                              </div>
                            </div>
                          )}
                          <ReviewSummary form={form} storeName={store?.name || ''} photo={photo} />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {error && (
                    <div className="mx-pre-error">
                      {error}
                    </div>
                  )}

                  <div className="mx-pre-actions">
                    <motion.button
                      type="button"
                      disabled={step === 0 || submitting}
                      onClick={handleBack}
                      whileTap={{ scale: 0.98 }}
                      className="mx-pre-btn ghost"
                    >
                      <ArrowLeft size={16} />
                      Voltar
                    </motion.button>

                    {step < steps.length - 1 ? (
                      <motion.button
                        type="button"
                        onClick={handleNext}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="mx-pre-btn primary"
                      >
                        Continuar
                        <ArrowRight size={16} />
                      </motion.button>
                    ) : (
                      <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="mx-pre-btn primary"
                      >
                        {submitting ? 'Enviando...' : 'Enviar pré-cadastro'}
                        <ArrowRight size={16} />
                      </motion.button>
                    )}
                  </div>
                </motion.form>
              )}
            </div>
          </div>
        </motion.section>
      </section>
    </main>
  )
}

function Field({ label, icon: Icon, children, error }: { label: string; icon: React.ElementType; children: React.ReactNode; error?: string }) {
  return (
    <motion.div whileFocus={{ y: -1 }}>
      <label className="mx-public-label">{label}</label>
      <div className="relative mt-2">
        <Icon size={17} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" />
        <div className="mx-public-field-control">{children}</div>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </motion.div>
  )
}

function FieldError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('mt-mx-tiny text-mx-tiny font-bold text-status-error', className)}>
      {children}
    </p>
  )
}

function ReviewSummary({ form, storeName, photo }: { form: FormState; storeName: string; photo: PhotoState | null }) {
  const summary = [
    ['Loja', storeName],
    ['Função', form.role],
    ['Segmento', form.segment],
    ['Tempo na loja', form.store_tenure || 'Não informado'],
    ['Mercado', form.market_experience || 'Não informado'],
  ]
  const ownerSummary = form.role === 'dono'
    ? [
        ['Razão social', form.company_legal_name || 'Não informado'],
        ['CNPJ', form.company_cnpj || 'Não informado'],
        ['Endereço', form.company_address || 'Não informado'],
        ['Telefone administrativo', form.company_administrative_phone || 'Não informado'],
      ]
    : []

  return (
    <div className="mx-pre-review">
      <div className="mx-pre-review-avatar">
        {photo?.preview ? <img src={photo.preview} alt="Avatar selecionado" /> : <UserRound size={22} />}
      </div>
      <div>
        <h3>{form.full_name || 'Nome pendente'}</h3>
        <p>{form.email || 'email pendente'} · {form.phone || 'telefone pendente'}</p>
        <dl>
          {[...summary, ...ownerSummary].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
