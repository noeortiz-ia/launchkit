import React, { useState } from 'react';
import { Project, LaunchKitType, ContentStatus } from '../types';
import { generateLaunchKitContent, refineLaunchKitContent } from '../services/geminiService';
import { Mail, Rocket, FolderOpen, X, Wand2, Check, CheckCircle } from 'lucide-react';
import { useAISettings } from './AISettingsContext';
import { useLanguage } from './LanguageContext';

interface LaunchKitModalProps {
  type: LaunchKitType;
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (p: Project) => void;
}

const LaunchKitModal: React.FC<LaunchKitModalProps> = ({ type, isOpen, onClose, project, onUpdateProject }) => {
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { apiKey, textModel, imageModel, openSettings } = useAISettings();
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const getTitle = () => {
    switch(type) {
        case 'emails': return t('Emails de Lanzamiento', 'Launch Emails');
        case 'productHunt': return t('Kit Product Hunt', 'Product Hunt Kit');
        case 'directories': return t('Directorios', 'Directories');
    }
  };

  const getIcon = () => {
    const iconProps = { className: "w-6 h-6" };
    switch(type) {
        case 'emails': return <Mail {...iconProps} />;
        case 'productHunt': return <Rocket {...iconProps} />;
        case 'directories': return <FolderOpen {...iconProps} />;
    }
  };
  
  // Larger icon for empty state
  const getLargeIcon = () => {
    const iconProps = { className: "w-16 h-16 opacity-50 mb-4" };
    switch(type) {
        case 'emails': return <Mail {...iconProps} />;
        case 'productHunt': return <Rocket {...iconProps} />;
        case 'directories': return <FolderOpen {...iconProps} />;
    }
  };

  const currentData = project.launchKit[type] || { status: ContentStatus.PENDING, content: {} };
  const content = (currentData.content || {}) as Record<string, any>;
  const keys = Object.keys(content);

  const handleGenerate = async () => {
      if (!apiKey) {
          alert(t("Por favor, configura tu API Key de OpenRouter antes de generar.", "Please configure your OpenRouter API Key before generating."));
          openSettings();
          return;
      }
      setLoading(true);
      try {
          const generatedContent = await generateLaunchKitContent(type, project, { apiKey, textModel, imageModel }, language);
          const updatedProject = {
              ...project,
              launchKit: {
                  ...project.launchKit,
                  [type]: {
                      status: ContentStatus.GENERATED,
                      content: generatedContent
                  }
              }
          };
          onUpdateProject(updatedProject);
      } catch (e) {
          console.error(e);
          alert(t("Error generando contenido.", "Error generating content."));
      } finally {
          setLoading(false);
      }
  };

  const handleRefine = async () => {
      if (!refineInput.trim()) return;
      if (!apiKey) {
          alert(t("Por favor, configura tu API Key de OpenRouter primero.", "Please configure your OpenRouter API Key first."));
          openSettings();
          return;
      }
      setRefining(true);
      try {
          const refinedContent = await refineLaunchKitContent(type, content, refineInput, { apiKey, textModel, imageModel }, language);
          const updatedProject = {
              ...project,
              launchKit: {
                  ...project.launchKit,
                  [type]: {
                      ...project.launchKit[type],
                      content: refinedContent
                  }
              }
          };
          onUpdateProject(updatedProject);
          setRefineInput('');
      } catch (e) {
          console.error(e);
          alert(t("Error refinando contenido.", "Error refining content."));
      } finally {
          setRefining(false);
      }
  };

  const handleCopy = (text: string, key: string) => {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
  };

  const markAsUsed = () => {
      const updatedProject = {
          ...project,
          launchKit: {
              ...project.launchKit,
              [type]: {
                  ...project.launchKit[type],
                  status: ContentStatus.USED
              }
          }
      };
      onUpdateProject(updatedProject);
      onClose();
  };

  const formatKeyName = (key: string) => {
      return key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
         {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h2 className="text-textMain font-bold text-lg">{getTitle()}</h2>
          </div>
          <button onClick={onClose} className="text-textSec hover:text-textMain p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">
            {currentData.status === ContentStatus.PENDING ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    {getLargeIcon()}
                    <p className="text-textSec mb-6 max-w-sm">
                        {t('Genera los textos esenciales para esta categoría. LaunchKit creará varias opciones listas para usar.', 'Generate the essential texts for this category. LaunchKit will create several ready-to-use options.')}
                    </p>
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-textMain hover:opacity-90 text-background px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2"
                    >
                        {loading ? t('Generando...', 'Generating...') : <><Wand2 className="w-4 h-4" /> {t('Generar Textos', 'Generate Texts')}</>}
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {keys.map((key) => (
                        <div key={key} className="bg-background border border-border rounded-lg overflow-hidden">
                            <div className="bg-surface/50 border-b border-border px-4 py-3 flex justify-between items-center">
                                <span className="text-xs font-bold text-textSec uppercase tracking-wider">{formatKeyName(key)}</span>
                                <button 
                                    onClick={() => handleCopy(content[key], key)}
                                    className="text-xs text-accent hover:text-white transition-colors font-medium flex items-center gap-1"
                                >
                                    {copiedKey === key ? <><Check className="w-3 h-3" /> {t('¡Copiado!', 'Copied!')}</> : t('Copiar', 'Copy')}
                                </button>
                            </div>
                            <div className="p-5 text-sm text-textMain whitespace-pre-wrap leading-relaxed">
                                {typeof content[key] === 'string' ? content[key] : JSON.stringify(content[key], null, 2)}
                            </div>
                        </div>
                    ))}
                    
                    {/* Refine Section */}
                    <div className="pt-6 border-t border-border">
                        <label className="text-xs font-bold text-textSec uppercase mb-3 block">{t('Refinar Resultados', 'Refine Results')}</label>
                        <div className="flex gap-3 items-start">
                            <textarea
                                className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-sm text-textMain focus:outline-none focus:border-accent resize-none h-24"
                                placeholder={t("Ej: Haz el tono más divertido, o acorta los textos...", "E.g.: Make the tone funnier, or shorten the texts...")}
                                value={refineInput}
                                onChange={e => setRefineInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleRefine();
                                  }
                                }}
                            />
                            <button 
                                onClick={handleRefine}
                                disabled={refining || !refineInput.trim()}
                                className="h-24 bg-surfaceHover border border-border text-textMain px-5 rounded-lg text-sm font-medium hover:bg-border transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {refining ? '...' : t('Refinar', 'Refine')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        {currentData.status !== ContentStatus.PENDING && (
            <div className="p-4 border-t border-border bg-surface flex justify-end gap-3 sticky bottom-0 z-10">
                 {currentData.status !== ContentStatus.USED ? (
                    <button 
                        onClick={markAsUsed}
                        className="bg-success/10 text-success border border-success/30 px-4 py-2 rounded-lg font-bold text-sm hover:bg-success/20 transition-colors flex items-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" /> {t('Marcar como Usado', 'Mark as Used')}
                    </button>
                ) : (
                    <span className="text-success font-medium text-sm flex items-center px-4 gap-2">
                        <CheckCircle className="w-4 h-4" /> {t('Completado', 'Completed')}
                    </span>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default LaunchKitModal;