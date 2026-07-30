import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, Zap, ShieldAlert } from 'lucide-react'
import { motion } from 'motion/react'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent } from '@/components/molecules/Card'

export default function NotFound() {
    const navigate = useNavigate()

    return (
        <main className="min-h-screen bg-surface-alt flex items-center justify-center p-mx-sm sm:p-10 selection:bg-brand-primary selection:text-white relative overflow-hidden">

            <div className="absolute top-mx-0 right-mx-0 w-mx-hero h-mx-hero bg-brand-primary/5 rounded-mx-full blur-mx-xl -mr-mx-lg -mt-mx-lg pointer-events-none" aria-hidden="true" />
            <div className="absolute bottom-mx-0 left-mx-0 w-mx-xl h-mx-xl bg-status-error-surface rounded-mx-full blur-mx-lg -ml-mx-lg -mb-mx-lg pointer-events-none" aria-hidden="true" />

            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-2xl relative z-10"
            >
                <Card className="border-none bg-white overflow-hidden flex flex-col">
                    <header className="bg-brand-secondary p-mx-10 md:p-16 relative overflow-hidden text-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-transparent z-0 pointer-events-none" />
                        
                        <motion.div
                            initial={{ rotate: -10, scale: 0.9 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 }}
                            className="w-mx-3xl h-mx-3xl rounded-mx-3xl bg-white/10 text-white flex items-center justify-center mx-auto mb-8 shadow-mx-xl backdrop-blur-xl relative z-10 border border-white/10"
                        >
                            <ShieldAlert size={48} strokeWidth={2} />
                        </motion.div>
                        <Typography variant="h1" tone="white" className="text-7xl md:text-9xl mb-4 relative z-10 font-mono-numbers leading-none">404</Typography>
                        <Typography variant="caption" tone="white" className="max-w-xl mx-auto opacity-60 relative z-10 block">Ponto Fora da Malha</Typography>
                    </header>

                    <CardContent className="p-mx-10 md:p-16 text-center flex flex-col items-center gap-mx-10">
                        <div className="max-w-md space-y-mx-sm">
                            <Typography variant="h2" className="text-2xl tracking-tighter">Destino Inexistente</Typography>
                            <Typography variant="p" tone="muted" className="text-base leading-relaxed font-bold italic opacity-60 tracking-tight">
                                "A coordenada solicitada não foi localizada nos servidores de inteligência MX. A rota pode ter sido alterada ou o acesso expirou."
                            </Typography>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-mx-md w-full sm:w-auto">
                            <Button 
                                variant="outline" onClick={() => navigate(-1)} 
                                className="w-full sm:w-auto h-mx-14 px-10 rounded-mx-full font-black uppercase tracking-widest text-xs shadow-sm bg-white border-border-strong hover:border-brand-primary"
                            >
                                <ArrowLeft size={16} className="mr-2" /> RECUAR
                            </Button>
                            <Button 
                                onClick={() => navigate('/')} 
                                className="w-full sm:w-auto h-mx-14 px-12 rounded-mx-full shadow-mx-xl font-black uppercase tracking-widest text-xs bg-brand-primary"
                            >
                                <Zap size={16} className="mr-2 fill-current" /> CENTRAL DE COMANDO
                            </Button>
                        </div>

                        <footer className="pt-10 border-t border-border-default w-full">
                            <Typography variant="caption" tone="muted" className="text-xs opacity-20">MX PERFORMANCE • PROTOCOLO AIOX SECURITY</Typography>
                        </footer>
                    </CardContent>
                </Card>
            </motion.div>
        </main>
    )
}
