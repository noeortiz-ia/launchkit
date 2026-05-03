import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-blue-500 selection:text-white overflow-hidden flex flex-col">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] opacity-50"></div>
            </div>

            {/* Navbar (Minimal) */}
            <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-transparent">
                <div className="flex items-center gap-3">
                    <Rocket className="w-6 h-6 text-white" />
                    <span className="text-xl font-bold tracking-tight">LaunchKit</span>
                    <span className="bg-[#262626] text-[#a3a3a3] text-[10px] px-2 py-0.5 rounded-full border border-[#262626] font-medium uppercase tracking-wider">Beta</span>
                </div>
                <button 
                    onClick={() => navigate('/login')}
                    className="text-sm font-medium text-[#a3a3a3] hover:text-white transition-colors border border-transparent hover:border-[#262626] rounded-lg px-4 py-2"
                >
                    {t('Acceder', 'Access')}
                </button>
            </nav>

            {/* Hero Section */}
            <main className="flex-grow flex flex-col items-center justify-center px-4 relative z-10 text-center">
                <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">

                    
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] text-balance">
                        {t('Tu plan de contenido,', 'Your content plan,')}
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 relative pb-2">
                            {t('generado con IA', 'generated with AI')}
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-blue-500/20 blur-2xl -z-10 translate-y-10"></div>
                        </span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-[#a3a3a3] max-w-2xl mx-auto leading-relaxed pt-4 text-balance">
                        {t('Describe tu producto y LaunchKit crea un plan de 4 semanas con ideas para X, LinkedIn, Instagram y email. Conectado a tendencias reales.', 'Describe your product and LaunchKit creates a 4-week plan with ideas for X, LinkedIn, Instagram, and email. Connected to real trends.')}
                    </p>

                    <div className="flex flex-col items-center gap-6 pt-8">
                        <button 
                            onClick={() => navigate('/login')}
                            className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center gap-2 transform hover:-translate-y-1"
                        >
                            {t('Comenzar ahora', 'Get started now')} <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-xs text-[#404040] relative z-10">
                <p>{t('LaunchKit Beta · Todos los derechos reservados', 'LaunchKit Beta · All rights reserved')}</p>
            </footer>
        </div>
    );
};

export default LandingPage;
