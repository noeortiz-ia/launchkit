import React, { useState } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { Rocket, ExternalLink, Mail, ArrowRight } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const LoginPage: React.FC = () => {
    const { signIn } = useAuthActions();
    const { t } = useLanguage();
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
            alert(t("Error al enviar el correo. Por favor intenta de nuevo.", "Error sending email. Please try again."));
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
                    <h1 className="text-2xl font-bold text-white mb-2">{t('Bienvenido', 'Welcome')}</h1>
                    <p className="text-[#a3a3a3] text-sm">{t('Ingresa tu correo para recibir un enlace de acceso.', 'Enter your email to receive an access link.')}</p>
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
                            {submitting ? t('Enviando...', 'Sending...') : (
                                <>{t('Enviar enlace mágico', 'Send magic link')} <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-6 mb-6 animate-fadeIn">
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Mail className="w-6 h-6 text-green-500" />
                        </div>
                        <h3 className="text-white font-medium mb-1">{t('¡Enlace enviado!', 'Link sent!')}</h3>
                        <p className="text-[#a3a3a3] text-sm mb-4">
                            {t('Revisa tu bandeja de entrada en', 'Check your inbox at')} <strong>{email}</strong> {t('y sigue el enlace para acceder.', 'and follow the link to access.')}
                        </p>
                        <button 
                            onClick={() => { setStep('input'); setSubmitting(false); }}
                            className="text-xs text-blue-500 hover:text-blue-400"
                        >
                            {t('Usar otro correo', 'Use another email')}
                        </button>
                    </div>
                )}

                <div className="pt-4 border-t border-[#262626]">
                    <p className="text-[#525252] text-xs uppercase tracking-wider font-semibold">
                        LaunchKit Beta
                    </p>
                </div>
            </div>
            
            <footer className="mt-8 text-center text-xs text-[#525252]">
                <p>© 2026 LaunchKit. {t('Todos los derechos reservados.', 'All rights reserved.')}</p>
            </footer>
        </div>
    );
};

export default LoginPage;
