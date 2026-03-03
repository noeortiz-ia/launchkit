import React, { useState } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { Rocket, ExternalLink, Mail, ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { signIn } = useAuthActions();
    const [email, setEmail] = useState("");
    const [step, setStep] = useState<'input' | 'sent'>('input');
    const [submitting, setSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await signIn("resend", { email });
            setStep('sent');
        } catch (error) {
            console.error(error);
            alert("Error al enviar el correo. Por favor intenta de nuevo.");
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans flex flex-col items-center justify-center p-4">
            
            <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl p-8 shadow-2xl relative overflow-hidden text-center">
                {/* Glow Effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 mb-2 justify-center">
                        <Rocket className="w-6 h-6 text-white" />
                        <span className="text-xl font-bold tracking-tight">LaunchKit</span>
                        <span className="bg-[#262626] text-[#a3a3a3] text-[10px] px-2 py-0.5 rounded-full border border-[#262626] font-medium uppercase tracking-wider">Beta</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Bienvenido</h1>
                    <p className="text-[#a3a3a3] text-sm">Ingresa tu correo para recibir un enlace de acceso.</p>
                </div>

                {step === 'input' ? (
                    <form onSubmit={handleLogin} className="space-y-4 mb-6">
                        <div>
                            <input 
                                type="email" 
                                placeholder="tu@email.com" 
                                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-[#525252] focus:outline-none focus:border-blue-500 transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={submitting || !email}
                            className="w-full bg-white text-black hover:bg-gray-200 transition-colors font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Enviando...' : (
                                <>Enviar enlace mágico <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-6 mb-6 animate-fadeIn">
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Mail className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="text-white font-medium mb-1">¡Enlace enviado!</h3>
                        <p className="text-[#a3a3a3] text-sm mb-4">
                            Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el enlace para acceder.
                        </p>
                        <button 
                            onClick={() => { setStep('input'); setSubmitting(false); }}
                            className="text-xs text-blue-500 hover:text-blue-400"
                        >
                            Usar otro correo
                        </button>
                    </div>
                )}

                <div className="text-center pt-4 border-t border-[#262626]">
                    <p className="text-[#525252] text-xs uppercase tracking-wider font-semibold mb-2">
                        Acceso Exclusivo
                    </p>
                    <a 
                        href="https://www.skool.com/vibe-coding-crea-apps-con-ia-5930" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-400 text-sm font-medium inline-flex items-center gap-1 transition-colors"
                    >
                        ¿No eres miembro? Únete a la academia <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
            
            <footer className="mt-8 text-center text-xs text-[#525252]">
                <p>© 2026 LaunchKit. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
};

export default LoginPage;
