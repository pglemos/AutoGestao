import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { motion } from 'motion/react'
import { Lock, Mail, RefreshCw, ArrowRight, ShieldCheck, TrendingUp, Zap, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { FormField } from '@/components/molecules/FormField'
import MxLogo from '@/assets/mx-logo.png'
import { supabase } from '@/lib/supabase'
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy'
import { resolvePostLoginRedirect } from '@/lib/auth/postLoginRedirect'
import { PasswordRecoveryRequestError, requestPasswordRecovery } from '@/lib/auth/passwordRecovery'
import { readSignoutReason, AUTH_SIGNOUT_REASON_STORAGE_KEY } from '@/hooks/auth/authHelpers'

const RECOVERY_EXPIRED_MESSAGE = 'Link de redefinição inválido ou expirado. Solicite um novo acesso.'

const SIGNOUT_REASON_MESSAGES: Record<string, string> = {
    inactive: 'Sua conta está desativada. Fale com o administrador da sua loja para reativar o acesso.',
    'no-profile': 'Não encontramos um perfil operacional para esta conta. Fale com o administrador da sua loja ou com o suporte MX.',
    'no-store': 'Sua conta não está vinculada a nenhuma loja ativa no momento. Fale com o administrador da sua loja.',
}

function clearSignoutReason() {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(AUTH_SIGNOUT_REASON_STORAGE_KEY)
}

/**
 * Lê e consome a razão do último signout forçado (guard de perfil/loja).
 * readSignoutReason() já descarta razões com mais de 60s — achado real
 * (matheus.silva_ma@yahoo.com, 2026-07-24): sem esse limite, uma razão
 * gravada em um signout antigo podia ser exibida como causa de uma falha
 * totalmente diferente e posterior, mesmo com a conta já ativa há tempo.
 */
function consumeSignoutReasonMessage(): string | null {
    const reason = readSignoutReason()
    if (!reason) return null
    return SIGNOUT_REASON_MESSAGES[reason] || null
}

type LoginMode = 'login' | 'forgot' | 'recovery'

function getInitialMode(): LoginMode {
    if (typeof window === 'undefined') return 'login'
    if (window.location.pathname === '/forgot-password') return 'forgot'
    if (window.location.pathname === '/reset-password') return 'recovery'
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'forgot') return 'forgot'
    if (params.get('recovery') === '1') return 'recovery'
    if (params.has('code')) return 'recovery'
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')) return 'recovery'
    return 'login'
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function getInitialEmail() {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('email') || ''
}

function getRecoverySessionFromHash(): { accessToken: string; refreshToken: string } | null {
    if (typeof window === 'undefined' || !window.location.hash) return null
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return null
    return { accessToken, refreshToken }
}

function getRecoveryCodeFromUrl(): string | null {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('code')
}

function clearRecoveryTokensFromUrl() {
    if (typeof window === 'undefined') return
    window.history.replaceState(null, '', '/login?recovery=1')
}

export default function Login() {
    const { signIn, profile, role, supabaseUser, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [mode, setMode] = useState<LoginMode>(() => getInitialMode())

    // supabaseUser entra na condição pra evitar uma race real (achada na
    // auditoria de 2026-07-24): handleRecoverySubmit chama signOut() e, no
    // mesmo tick, muda mode pra 'login'. `profile` some via uma cadeia de
    // efeitos mais longa que `supabaseUser` (que zera direto no listener de
    // onAuthStateChange), então por um instante `profile` ainda podia estar
    // com o valor antigo quando `mode` virava 'login' — navegando pra uma
    // rota protegida e voltando, destruindo a mensagem de sucesso antes do
    // usuário ver. Exigir os dois fecha a janela da race.
    useEffect(() => {
        if (profile && supabaseUser && mode !== 'recovery') {
            navigate(resolvePostLoginRedirect(location.state, role), { replace: true })
        }
    }, [profile, supabaseUser, role, mode, navigate, location.state])

    const [email, setEmail] = useState(getInitialEmail)
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const passwordRef = React.useRef<HTMLInputElement>(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [isHydrated, setIsHydrated] = useState(false)

    const LOCKOUT_STORAGE_KEY = 'mx_login_lockout'
    const ATTEMPTS_STORAGE_KEY = 'mx_login_attempts'

    const readLockout = useCallback(() => {
        try {
            const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY)
            if (!raw) return { until: 0, attempts: 0 }
            const parsed = JSON.parse(raw) as { until: number; attempts: number }
            if (parsed.until && Date.now() < parsed.until) return parsed
            localStorage.removeItem(LOCKOUT_STORAGE_KEY)
            return { until: 0, attempts: parsed.attempts || 0 }
        } catch {
            localStorage.removeItem(LOCKOUT_STORAGE_KEY)
            return { until: 0, attempts: 0 }
        }
    }, [])

    const [lockoutState, setLockoutState] = useState(readLockout)
    const [countdown, setCountdown] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const persistLockout = useCallback((until: number, attempts: number) => {
        localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify({ until, attempts }))
    }, [])

    const clearLockoutStorage = useCallback(() => {
        localStorage.removeItem(LOCKOUT_STORAGE_KEY)
        localStorage.removeItem(ATTEMPTS_STORAGE_KEY)
    }, [])

    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (lockoutState.until && Date.now() < lockoutState.until) {
            const tick = () => {
                const remaining = Math.ceil((lockoutState.until - Date.now()) / 1000)
                if (remaining <= 0) {
                    clearInterval(timerRef.current!)
                    timerRef.current = null
                    setCountdown(0)
                    setLockoutState(prev => ({ ...prev, until: 0 }))
                    localStorage.removeItem(LOCKOUT_STORAGE_KEY)
                } else {
                    setCountdown(remaining)
                }
            }
            tick()
            timerRef.current = setInterval(tick, 1000)
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [lockoutState.until])

    useEffect(() => {
        localStorage.removeItem('mx_last_email')
        setIsHydrated(true)
    }, [])

    // Sessão derrubada em segundo plano (guard de perfil/loja rodando fora do
    // submit — ex.: restauração de sessão ao recarregar a página). Sem isso o
    // usuário só via a tela de login de novo, sem nenhuma explicação.
    useEffect(() => {
        if (mode !== 'login') return
        const message = consumeSignoutReasonMessage()
        if (message) setError(message)
    }, [mode])

    useEffect(() => {
        if (mode !== 'recovery') return

        let mounted = true
        const ensureRecoverySession = async () => {
            const recoverySession = getRecoverySessionFromHash()
            if (recoverySession) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: recoverySession.accessToken,
                    refresh_token: recoverySession.refreshToken,
                })
                if (sessionError && mounted) {
                    setError(RECOVERY_EXPIRED_MESSAGE)
                    return
                }
                if (mounted) setError('')
                clearSignoutReason()
                clearRecoveryTokensFromUrl()
                return
            }

            const recoveryCode = getRecoveryCodeFromUrl()
            if (recoveryCode) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(recoveryCode)
                if (exchangeError && mounted) {
                    setError(RECOVERY_EXPIRED_MESSAGE)
                    return
                }
                if (mounted) setError('')
                clearSignoutReason()
                clearRecoveryTokensFromUrl()
                return
            }

            const { data } = await supabase.auth.getSession()
            if (mounted && !data.session) {
                setError(consumeSignoutReasonMessage() || RECOVERY_EXPIRED_MESSAGE)
            } else if (mounted && data.session) {
                setError('')
                clearSignoutReason()
            }
        }

        const timeoutId = window.setTimeout(ensureRecoverySession, getRecoverySessionFromHash() ? 0 : 1200)

        return () => {
            mounted = false
            window.clearTimeout(timeoutId)
        }
    }, [mode])

    const resetFeedback = () => {
        setError('')
        setSuccess('')
        setFieldErrors({})
    }

    const switchMode = (nextMode: LoginMode) => {
        resetFeedback()
        setMode(nextMode)
        if (nextMode !== 'recovery' && typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/login')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (loading) return

        clearSignoutReason()

        if (lockoutState.until && Date.now() < lockoutState.until) {
            const secs = Math.ceil((lockoutState.until - Date.now()) / 1000)
            setError(`Muitas tentativas. Aguarde ${secs}s.`)
            return
        }

        const newFieldErrors: Record<string, string> = {}
        if (!email.trim()) newFieldErrors.email = 'E-mail e obrigatorio'
        if (!password.trim()) newFieldErrors.password = 'Senha e obrigatoria'
        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors)
            return
        }

        setError('')
        setFieldErrors({})
        setLoading(true)

        try {
            const { error: err } = await signIn(email, password)
            if (err) {
                const current = readLockout()
                const attempts = (current.attempts || 0) + 1
                if (attempts >= 5) {
                    const lockDuration = Math.min(30 * Math.pow(2, Math.floor(attempts / 5) - 1), 300)
                    const until = Date.now() + lockDuration * 1000
                    setLockoutState({ until, attempts })
                    persistLockout(until, attempts)
                    setError(`Muitas tentativas. Aguarde ${lockDuration}s.`)
                } else {
                    persistLockout(0, attempts)
                    setLockoutState(prev => ({ ...prev, attempts }))
                    setError(err)
                }
                setLoading(false)
                return
            }
            clearLockoutStorage()
            setLockoutState({ until: 0, attempts: 0 })
        } catch {
            setError('Não foi possível concluir o login agora. Verifique sua conexão e tente novamente.')
            setLoading(false)
        }
    }

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (loading) return

        const newFieldErrors: Record<string, string> = {}
        if (!email.trim()) newFieldErrors.email = 'E-mail e obrigatorio'
        else if (!isValidEmail(email)) newFieldErrors.email = 'Informe um e-mail valido'
        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors)
            return
        }

        setLoading(true)
        resetFeedback()
        try {
            await requestPasswordRecovery(email)
        } catch (resetError) {
            setLoading(false)
            if (resetError instanceof PasswordRecoveryRequestError && (resetError.status === 429 || resetError.code === 'rate_limited')) {
                setSuccess('Já existe um link recente para este e-mail. Aguarde alguns instantes antes de solicitar novamente.')
                return
            }
            setError('Não foi possível enviar o link agora. Tente novamente em alguns minutos.')
            return
        }

        setLoading(false)
        setSuccess('Se o e-mail estiver autorizado, enviaremos um link para redefinir a senha.')
    }

    const handleRecoverySubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (loading) return

        const newFieldErrors: Record<string, string> = {}
        if (!newPassword.trim()) newFieldErrors.newPassword = 'Nova senha e obrigatoria'
        else if (!isStrongPassword(newPassword)) newFieldErrors.newPassword = PASSWORD_POLICY_MESSAGE
        if (!confirmPassword.trim()) newFieldErrors.confirmPassword = 'Confirme a nova senha'
        else if (newPassword !== confirmPassword) newFieldErrors.confirmPassword = 'As senhas nao coincidem'
        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors)
            return
        }

        setLoading(true)
        resetFeedback()

        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session?.user.id) {
            setLoading(false)
            setError(consumeSignoutReasonMessage() || RECOVERY_EXPIRED_MESSAGE)
            return
        }

        clearSignoutReason()

        const { data: challengeData, error: challengeError } = await supabase.rpc('begin_password_change')
        const challengeResult = challengeData as { ok?: boolean; error?: string } | null
        if (challengeError || !challengeResult?.ok) {
            clearSignoutReason()
            setLoading(false)
            setError(challengeError?.message || challengeResult?.error || 'Não foi possível iniciar a troca de senha.')
            return
        }

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
        if (updateError) {
            clearSignoutReason()
            setLoading(false)
            setError(updateError.message)
            return
        }

        const { data: profileData, error: profileError } = await supabase.rpc('complete_password_change')
        const profileResult = profileData as { ok?: boolean; error?: string } | null

        if (profileError || !profileResult?.ok) {
            clearSignoutReason()
            setLoading(false)
            setError(profileError?.message || profileResult?.error || 'Não foi possível concluir a troca de senha.')
            return
        }

        setNewPassword('')
        setConfirmPassword('')
        setPassword('')

        clearSignoutReason()
        await supabase.auth.signOut()
        setLoading(false)
        setMode('login')
        window.history.replaceState(null, '', '/login')
        setSuccess('Senha redefinida com sucesso. Entre com a nova senha.')
    }

    if (authLoading && !profile) {
        return (
            // lint-page-roots-ignore: estado de sincronização centrado, antes
            // de o shell existir.
            <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-mx-md text-center">
                <RefreshCw className="w-mx-xl h-mx-xl animate-spin text-status-success-text mb-6" />
                <Typography variant="caption" tone="white" className="animate-pulse">Sincronizando...</Typography>
            </main>
        )
    }

    return (
        <main className="min-h-screen flex selection:bg-brand-primary/20">
            {/* Left Panel — Brand */}
            <div className="hidden lg:flex bg-gray-900 relative overflow-hidden flex-col items-center justify-center p-mx-2xl" style={{ width: '52%' }}>
                {/* Gradient mesh */}
                <div className="absolute inset-0" aria-hidden="true">
                    <div className="absolute bg-brand-primary/10 rounded-full" style={{ top: '-20%', left: '-10%', width: '70%', height: '70%', filter: 'blur(140px)' }} />
                    <div className="absolute bg-brand-primary/40 rounded-full" style={{ bottom: '-15%', right: '-10%', width: '60%', height: '60%', filter: 'blur(120px)' }} />
                    <div className="absolute bg-brand-primary/6 rounded-full" style={{ top: '40%', right: '20%', width: '30%', height: '30%', filter: 'blur(80px)' }} />
                </div>
                {/* Grid pattern */}
                <div className="absolute inset-0 bg-mx-matrix opacity-30" />

                <div className="relative z-[var(--mx-z-sticky)] max-w-md text-center">
                    <motion.img
                        src={MxLogo}
                        alt="MX Performance"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 150, damping: 20 }}
                        className="object-contain mx-auto mb-12"
                        style={{ width: '10rem', height: '10rem', filter: 'drop-shadow(0 0 60px rgba(34,197,94,0.35))' }}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h1 className="text-display font-bold text-white mb-4">
                            MX <span className="text-status-success-text">PERFORMANCE</span>
                        </h1>
                        <p className="text-white/60 text-label font-bold mb-16" style={{ letterSpacing: '0.3em' }}>
                            Sistema de Gestão de Elite
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col"
                        style={{ gap: '1.25rem' }}
                    >
                        {[
                            { icon: TrendingUp, text: 'Performance em tempo real de toda rede' },
                            { icon: Zap, text: 'Rituais de gestão padronizados' },
                            { icon: ShieldCheck, text: 'Controle preditivo de resultados' },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-mx-sm group">
                                <div className="w-mx-10 h-mx-10 rounded-xl bg-brand-primary/10 border border-brand-primary/15 flex items-center justify-center shrink-0 group-hover:bg-brand-primary/20 transition-colors">
                                    <Icon size={18} className="text-status-success-text" />
                                </div>
                                <span className="text-white/60 text-sm font-medium group-hover:text-white/80 transition-colors">{text}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="absolute text-center" style={{ bottom: '2rem', left: 0, right: 0 }}>
                    <span className="text-white/50 text-caption font-bold" style={{ letterSpacing: '0.25em' }}>MX Performance v4.0</span>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 min-w-0 bg-white flex flex-col items-center justify-center p-mx-lg md:p-mx-2xl relative">
                {/* Mobile logo */}
                <div className="lg:hidden mb-12 text-center">
                    <img src={MxLogo} alt="MX Performance" className="w-mx-20 h-mx-20 object-contain mx-auto mb-6" />
                    <h2 className="text-h3 font-bold text-foreground">
                        MX <span className="text-brand-primary-active">PERFORMANCE</span>
                    </h2>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-10">
                        <h2 className="text-h3 font-bold text-foreground mb-2">
                            {mode === 'login' && 'Acessar sistema'}
                            {mode === 'forgot' && 'Recuperar acesso'}
                            {mode === 'recovery' && 'Definir nova senha'}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {mode === 'login' && 'Entre com suas credenciais para continuar'}
                            {mode === 'forgot' && 'Informe seu e-mail para receber o link seguro'}
                            {mode === 'recovery' && 'Crie uma nova senha para finalizar a recuperação'}
                        </p>
                    </div>

                    <form
                        key={`${isHydrated ? 'hydrated' : 'initial'}-${mode}`}
                        onSubmit={mode === 'login' ? handleSubmit : mode === 'forgot' ? handleForgotSubmit : handleRecoverySubmit}
                        noValidate
                        className="flex flex-col"
                        style={{ gap: '1.25rem' }}
                    >
                        {mode !== 'recovery' && (
                            <FormField
                                id="login-email"
                                label="E-mail"
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' })) }}
                                placeholder="seu@email.com.br"
                                required
                                autoComplete="email"
                                icon={<Mail size={18} />}
                                error={fieldErrors.email}
                            />
                        )}

                        {mode === 'login' && (
                            <FormField
                                id="login-password"
                                label="Senha"
                                type={showPassword ? 'text' : 'password'}
                                ref={passwordRef}
                                value={password}
                                onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' })) }}
                                placeholder="Digite sua senha"
                                required
                                autoComplete="current-password"
                                icon={<Lock size={18} />}
                                error={fieldErrors.password}
                                rightAdornment={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                        aria-pressed={showPassword}
                                        className="w-mx-lg h-mx-lg p-mx-tiny rounded-xl text-muted-foreground hover:text-status-success-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                }
                            />
                        )}

                        {mode === 'recovery' && (
                            <>
                                <FormField
                                    id="recovery-password"
                                    label="Nova senha"
                                    type={showPassword ? 'text' : 'password'}
                                    minLength={6}
                                    value={newPassword}
                                    onChange={e => { setNewPassword(e.target.value); if (fieldErrors.newPassword) setFieldErrors(prev => ({ ...prev, newPassword: '' })) }}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    autoComplete="new-password"
                                    icon={<KeyRound size={18} />}
                                    error={fieldErrors.newPassword}
                                    rightAdornment={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                            aria-pressed={showPassword}
                                            className="w-mx-lg h-mx-lg p-mx-tiny rounded-xl text-muted-foreground hover:text-status-success-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    }
                                />
                                <FormField
                                    id="recovery-password-confirm"
                                    label="Confirmar senha"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' })) }}
                                    placeholder="Repita a nova senha"
                                    required
                                    autoComplete="new-password"
                                    icon={<Lock size={18} />}
                                    error={fieldErrors.confirmPassword}
                                />
                            </>
                        )}

                        {error && (
                            // role="alert": a falha de login é o único retorno da
                            // ação e aparece sem mudar de rota nem mover o foco.
                            // Sem o papel, quem usa leitor de tela envia o
                            // formulário e não recebe resposta nenhuma.
                            <div role="alert" className="flex items-center px-4 py-3 bg-status-error-surface border border-status-error/20 rounded-xl" style={{ gap: '0.75rem' }}>
                                <AlertCircle size={16} className="text-status-error-text shrink-0" />
                                <span className="text-status-error-text text-sm font-medium">
                                    {countdown > 0 ? `Muitas tentativas. Aguarde ${countdown}s.` : error}
                                </span>
                            </div>
                        )}

                        {success && (
                            <div role="status" className="flex items-center px-4 py-3 bg-status-success/10 border border-status-success/20 rounded-xl" style={{ gap: '0.75rem' }}>
                                <CheckCircle2 size={16} className="text-status-success-text shrink-0" />
                                <span className="text-status-success-text text-sm font-medium">{success}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 hover:bg-brand-primary text-white rounded-xl font-bold text-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 active:scale-[0.98] mt-2"
                            style={{ height: '3.25rem', gap: '0.5rem' }}
                        >
                            {loading ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : mode === 'forgot' ? (
                                <>ENVIAR LINK<Mail size={18} /></>
                            ) : mode === 'recovery' ? (
                                <>SALVAR SENHA<KeyRound size={18} /></>
                            ) : (
                                <>ENTRAR<ArrowRight size={18} /></>
                            )}
                        </button>

                        {mode === 'login' && (
                            <button
                                type="button"
                                onClick={() => switchMode('forgot')}
                                className="h-mx-11 rounded-xl border border-border bg-white text-muted-foreground hover:text-status-success-text hover:border-brand-primary/30 hover:bg-surface-alt font-bold text-sm transition-colors flex items-center justify-center"
                                style={{ gap: '0.5rem' }}
                            >
                                <KeyRound size={16} />
                                Esqueci minha senha
                            </button>
                        )}

                        {mode !== 'login' && (
                            <button
                                type="button"
                                onClick={() => switchMode('login')}
                                className="h-mx-11 rounded-xl border border-border bg-white text-muted-foreground hover:text-status-success-text hover:border-brand-primary/30 hover:bg-surface-alt font-bold text-label transition-colors flex items-center justify-center"
                                style={{ gap: '0.5rem' }}
                            >
                                <ArrowLeft size={16} />
                                Voltar ao login
                            </button>
                        )}
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <span className="text-muted-foreground text-xs font-medium">Acesso restrito a usuários autorizados</span>
                    </div>
                </motion.div>
            </div>
        </main>
    )
}
