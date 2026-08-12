import React, { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Lock, ShieldCheck, RefreshCw, Eye, EyeOff, LogOut, Zap, KeyRound, Sparkles } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { toast } from '@/lib/toast'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy'
import { useFocusTrap } from '@/hooks/useFocusTrap'

export function ForcePasswordChange() {
  const trapRef = useRef<HTMLDivElement>(null)
  useFocusTrap(trapRef, true)
  const { changePassword, signOut, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })

  const passwordStrength = useMemo(() => {
    if (!formData.password) return 0
    if (formData.password.length < 6) return 1
    return formData.password.length < 10 ? 2 : 4
  }, [formData.password])

  const strengthColor = [
    'bg-white/10',
    'bg-status-error',
    'bg-status-warning',
    'bg-mx-blue-500',
    'bg-status-success'
  ][passwordStrength]

  const strengthLabel = [
    '',
    'MÍNIMO 6 CARACTERES',
    'VÁLIDA',
    '',
    'VÁLIDA'
  ][passwordStrength]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isStrongPassword(formData.password)) {
      return toast.error(PASSWORD_POLICY_MESSAGE)
    }
    
    if (formData.password !== formData.confirmPassword) {
      return toast.error('As senhas não coincidem')
    }

    setLoading(true)
    const { error } = await changePassword(formData.password)
    setLoading(false)

    if (!error) {
      toast.success('Segurança atualizada com sucesso!')
    } else {
      toast.error(error)
    }
  }

  return (
    <div ref={trapRef} className="fixed inset-0 z-[999] flex items-center justify-center p-mx-md overflow-hidden" role="dialog" aria-modal="true" aria-label="Alteração obrigatória de senha">
      {/* Premium Glassmorphism Background */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-gray-50/80 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        className="w-full max-w-lg relative z-10"
      >
        <div className="relative group">
          {/* Subtle Border Glow */}
          <div className="absolute -inset-mx-xs bg-gradient-to-r from-brand-primary/20 to-brand-primary/10 rounded-mx-4xl blur-mx-xl opacity-50 transition duration-1000" />
          
          <div className="relative bg-white/90 backdrop-blur-2xl border border-border rounded-mx-4xl shadow-sm overflow-hidden">
            {/* Header Accent */}
            <div className="h-mx-tiny w-full bg-gradient-to-r from-brand-primary via-brand-primary to-brand-primary/50" />
            
            <form onSubmit={handleSubmit} className="p-mx-xl sm:p-mx-2xl space-y-mx-lg">
              <header className="text-center space-y-mx-md">
                <div className="relative inline-block">
                  <div className="w-mx-20 h-mx-20 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-status-success-text shadow-sm mx-auto relative z-10">
                    <ShieldCheck size={40} strokeWidth={1.5} />
                  </div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-mx-xs border border-dashed border-brand-primary/20 rounded-mx-full"
                  />
                </div>
                
                <div className="space-y-mx-tiny">
                  <Typography variant="h2" className="text-3xl tracking-tighter">
                    Segurança <span className="text-status-success-text">MX</span>
                  </Typography>
                  <Typography variant="p" tone="muted" className="font-bold tracking-tight leading-relaxed">
                    Olá, <span className="text-mx-black font-bold">{profile?.name?.split(' ')[0]}</span>. <br/>
                    Proteja sua conta com uma nova senha de acesso.
                  </Typography>
                </div>
              </header>

              <div className="space-y-mx-md">
                {/* Password Input */}
                <div className="space-y-mx-xs">
                  <div className="flex items-center justify-between px-mx-xs">
                    <Typography variant="tiny" tone="muted" className="">Nova Credencial</Typography>
                    {formData.password && (
                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-mx-xs">
                        <div className={cn("h-mx-tiny w-12 rounded-mx-full overflow-hidden bg-gray-50")}>
                          <motion.div 
                            className={cn("h-full transition-all duration-500", strengthColor)} 
                            style={{ width: `${(passwordStrength / 4) * 100}%` }}
                          />
                        </div>
                        <Typography variant="tiny" className={cn("font-bold tracking-mx-tight", strengthColor.replace('bg-', 'text-'))}>
                          {strengthLabel}
                        </Typography>
                      </motion.div>
                    )}
                  </div>
                  <div className="relative group/input">
                    <KeyRound size={20} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-status-success-text transition-colors z-10" />
                    <Input 
                      required 
                      minLength={6}
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="NOVA SENHA" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="!h-mx-16 !pl-mx-14 !pr-mx-14 bg-gray-50 border-border rounded-2xl font-bold tracking-mx-wide focus:border-brand-primary transition-all placeholder:text-muted-foreground/30"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground hover:text-mx-black transition-colors z-10"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-mx-xs">
                  <Typography variant="tiny" tone="muted" className="px-mx-xs">Confirmação</Typography>
                  <div className="relative group/input">
                    <Lock size={20} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-status-success-text transition-colors z-10" />
                    <Input 
                      required 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="REPETIR SENHA" 
                      value={formData.confirmPassword} 
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      className="!h-mx-16 !pl-mx-14 bg-gray-50 border-border rounded-2xl font-bold tracking-mx-wide focus:border-brand-primary transition-all placeholder:text-muted-foreground/30"
                    />
                  </div>
                </div>
              </div>

              {/* Security Hint */}
              <div className="p-mx-md rounded-2xl bg-gray-50 border border-border flex gap-mx-md items-start">
                <div className="p-mx-xs rounded-xl bg-brand-primary/10 text-status-success-text">
                  <Sparkles size={16} />
                </div>
                <Typography variant="tiny" tone="muted" className="leading-relaxed tracking-tight">
                  Sua nova senha será validada pela malha de segurança <span className="text-mx-black">MX PERFORMANCE</span>. 
                  Use uma senha com pelo menos 6 caracteres.
                </Typography>
              </div>

              <div className="space-y-mx-md">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-mx-16 hover:bg-brand-primary-hover text-white flex items-center justify-center transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" />
                  ) : (
                    <>
                      SALVAR E ACESSAR <Zap size={18} className="ml-mx-xs fill-white" />
                    </>
                  )}
                </Button>
                
                <button 
                  type="button"
                  onClick={() => signOut()}
                  className="w-full flex items-center justify-center gap-mx-xs text-muted-foreground hover:text-status-error font-bold uppercase tracking-mx-widest text-mx-nano py-mx-xs transition-colors"
                >
                  <LogOut size={14} /> SAIR DA CONTA
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
