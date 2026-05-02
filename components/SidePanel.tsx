import React, { useState, useEffect } from 'react';
import { ContentItem, ContentStatus, Project } from '../types';
import { generateCopy, refineCopy, generateImage } from '../services/geminiService';
import { X, Wand2, Check, Copy, Zap, Image as ImageIcon, Save, CheckCircle } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAISettings } from './AISettingsContext';
import { useLanguage } from './LanguageContext';

interface SidePanelProps {
  item: ContentItem | null;
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: ContentItem) => void;
  onSaveItem: (item: ContentItem) => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ item, project, isOpen, onClose, onUpdateItem, onSaveItem }) => {
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [loadingRefine, setLoadingRefine] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9');

  const { language: uiLanguage, t } = useLanguage();
  const [imageLanguage, setImageLanguage] = useState<string>(uiLanguage);

  const { apiKey, textModel, imageModel, openSettings } = useAISettings();

  // Update image language if UI language changes and we haven't touched it
  useEffect(() => {
    setImageLanguage(uiLanguage);
  }, [uiLanguage]);

  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const getPublicUrl = useMutation(api.images.getPublicUrl);

  // Determinar AR sugerido basado en tipo de contenido
  useEffect(() => {
    if (item && isOpen) {
        setRefineInput('');
        setCopied(false);
        const type = item.contentType.toLowerCase();
        if (type.includes('linkedin') || type.includes('instagram')) {
            setAspectRatio('1:1');
        } else if (type.includes('tiktok') || type.includes('reel') || type.includes('story')) {
            setAspectRatio('9:16');
        } else {
            setAspectRatio('16:9');
        }
    }
  }, [item?.id, item?.contentType, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !item || !project) return null;

  const handleGenerateCopy = async () => {
    if (!apiKey) {
      alert(t("Debes configurar la API Key primero en Ajustes (⚙️)", "You must configure the API Key first in Settings (⚙️)"));
      openSettings();
      return;
    }
    setLoadingCopy(true);
    try {
      const copy = await generateCopy(item, project, { apiKey, textModel, imageModel }, uiLanguage);
      onUpdateItem({ ...item, copy, status: ContentStatus.GENERATED });
    } catch (e) {
      console.error(e);
      alert(t('Error generando copy', 'Error generating copy'));
    } finally {
      setLoadingCopy(false);
    }
  };

  const handleRefineCopy = async () => {
    if (!item.copy || !refineInput.trim()) return;
    if (!apiKey) {
      alert(t("Debes configurar la API Key primero en Ajustes (⚙️)", "You must configure the API Key first in Settings (⚙️)"));
      openSettings();
      return;
    }
    setLoadingRefine(true);
    try {
      const newCopy = await refineCopy(item.copy, refineInput, { apiKey, textModel, imageModel }, uiLanguage);
      onUpdateItem({ ...item, copy: newCopy });
      setRefineInput('');
    } catch (e: any) {
      console.error(e);
      alert(e.message || t('Error refinando copy', 'Error refining copy'));
    } finally {
      setLoadingRefine(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!apiKey) {
      alert(t("Debes configurar la API Key primero en Ajustes (⚙️)", "You must configure the API Key first in Settings (⚙️)"));
      openSettings();
      return;
    }
    setLoadingImage(true);
    try {
      // Use current UI language for the image prompt
      const base64Image = await generateImage(item, project, aspectRatio, { apiKey, textModel, imageModel }, imageLanguage);
      
      if (base64Image) {
        const uploadUrl = await generateUploadUrl();
        const blobResponse = await fetch(base64Image);
        const blob = await blobResponse.blob();
        
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });

        if (!uploadResult.ok) throw new Error("Failed to upload image to Convex");

        const { storageId } = await uploadResult.json();
        const imageUrl = await getPublicUrl({ storageId });

        if (imageUrl) {
          const currentUrls = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);
          onUpdateItem({ 
            ...item, 
            imageUrls: [...currentUrls, imageUrl],
            imageUrl: imageUrl // Keep as main for list view
          });
        } else {
          alert(t('No se pudo obtener la URL de la imagen', 'Could not obtain image URL'));
        }
      } else {
        alert(t('No se pudo generar la imagen', 'Could not generate image'));
      }
    } catch (e: any) {
      console.error("Error in handleGenerateImage:", e);
      alert(e.message || t('Error generando o subiendo la imagen', 'Error generating or uploading image'));
    } finally {
      setLoadingImage(false);
    }
  };

  const handleDeleteImage = (urlToDelete: string) => {
    const currentUrls = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);
    const updatedUrls = currentUrls.filter(url => url !== urlToDelete);
    onUpdateItem({ 
        ...item, 
        imageUrls: updatedUrls,
        imageUrl: updatedUrls[0] || undefined
    });
  };

  const handleCopyClipboard = () => {
    if (item.copy) {
      navigator.clipboard.writeText(item.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const markAsUsed = () => {
    onUpdateItem({ ...item, status: ContentStatus.USED });
  };

  // Supported ratios for API
  const ratioOptions = [
      { value: '1:1', label: '1:1' },
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '4:5', label: '4:5' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className="relative w-full max-w-[600px] max-h-[90vh] flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-start bg-surface sticky top-0 z-10">
          <div>
            <span className="text-accent text-xs font-bold uppercase tracking-wider mb-1 block">
              {item.contentType}
            </span>
            <h2 className="text-textMain font-bold text-lg leading-tight">{item.title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-textSec hover:text-textMain transition-colors p-1 rounded hover:bg-surfaceHover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Context Info */}
          <div className="space-y-3">
            <div className="bg-background p-4 rounded-lg border border-border">
              <span className="text-textSec text-xs uppercase font-bold block mb-1">{t('Ángulo Estratégico', 'Strategic Angle')}</span>
              <p className="text-textMain text-sm leading-relaxed">{item.angle}</p>
            </div>

            {item.isTrend && (
              <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-900/50 flex gap-3">
                <Zap className="w-5 h-5 text-accentAmber fill-accentAmber flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-accentAmber text-xs uppercase font-bold block mb-1">{t('Tendencia Detectada', 'Trend Detected')}</span>
                  <p className="text-textMain text-sm leading-relaxed">{item.trendContext}</p>
                </div>
              </div>
            )}
          </div>

          {/* COPY GENERATION */}
          <div>
              <div className="flex items-center justify-between mb-3">
                  <h3 className="text-textMain font-bold text-sm">{t('Contenido de Texto', 'Text Content')}</h3>
                  <div className="flex gap-2">
                    {item.status === ContentStatus.GENERATED && <span className="text-success text-[10px] font-bold bg-success/10 px-2 py-0.5 rounded-full border border-success/20">{t('GENERADO', 'GENERATED')}</span>}
                    {item.status === ContentStatus.USED && <span className="text-textSec text-[10px] font-bold bg-surfaceHover px-2 py-0.5 rounded-full border border-border">{t('PUBLICADO', 'PUBLISHED')}</span>}
                  </div>
              </div>

              {!item.copy ? (
                  <button 
                      onClick={handleGenerateCopy}
                      disabled={loadingCopy}
                      className="w-full py-4 bg-textMain hover:opacity-90 text-background rounded-lg font-semibold transition-all shadow-lg shadow-textMain/10 flex items-center justify-center gap-2 text-sm"
                  >
                      {loadingCopy ? (
                           <>
                           <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                           {t('Escribiendo con IA...', 'Writing with AI...')}
                           </>
                      ) : (
                          <><Wand2 className="w-4 h-4" /> {t('Redactar Contenido con IA', 'Write Content with AI')}</>
                      )}
                  </button>
              ) : (
                  <div className="space-y-3 animate-fadeIn">
                      <div className="relative group border border-border rounded-lg overflow-hidden bg-background">
                          <textarea 
                              className="w-full h-80 bg-background p-4 text-sm text-textMain resize-none focus:outline-none leading-relaxed scrollbar-thin"
                              value={item.copy}
                              readOnly
                          />
                          <button 
                              onClick={handleCopyClipboard}
                              className="absolute top-2 right-2 p-1.5 bg-surface border border-border rounded text-textSec hover:text-accent hover:border-accent transition-all shadow-sm"
                              title={t("Copiar texto", "Copy text")}
                          >
                              {copied ? 
                                  <Check className="w-4 h-4 text-success" /> :
                                  <Copy className="w-4 h-4" />
                              }
                          </button>
                      </div>

                      {/* Refine Copy - Changed to Textarea */}
                      <div className="flex gap-2 items-start">
                          <textarea 
                              value={refineInput}
                              onChange={(e) => setRefineInput(e.target.value)}
                              placeholder={t("Instrucción para mejorar (ej: 'Hazlo más divertido', 'Tradúcelo al inglés')...", "Improvement instruction (e.g. 'Make it funnier', 'Translate to English')...")}
                              className="flex-1 bg-background border border-border rounded-lg px-3 py-3 text-sm text-textMain focus:outline-none focus:border-accent placeholder-textSec/50 resize-none h-20"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleRefineCopy();
                                }
                              }}
                          />
                          <button 
                              onClick={handleRefineCopy}
                              disabled={!refineInput.trim() || loadingRefine}
                              className="h-20 px-4 bg-surfaceHover border border-border text-textMain rounded-lg hover:bg-border disabled:opacity-50 text-xs font-medium transition-colors flex items-center justify-center"
                          >
                              {loadingRefine ? (
                                <div className="w-4 h-4 border-2 border-textSec border-t-transparent rounded-full animate-spin"></div>
                              ) : t('Mejorar', 'Improve')}
                          </button>
                      </div>
                  </div>
              )}
          </div>

          {/* IMAGE GENERATION SECTION */}
          {item.copy && (
              <div className="border-t border-border pt-5 pb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-textMain font-bold text-sm">{t('Recursos Visuales', 'Visual Assets')}</h3>
                    <span className="text-[10px] text-textSec font-medium">
                        {((item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls.length : (item.imageUrl ? 1 : 0))} {t('imágenes', 'images')}
                    </span>
                  </div>
                  
                  {/* Gallery Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      {((item.imageUrls && item.imageUrls.length > 0) 
                        ? item.imageUrls 
                        : (item.imageUrl ? [item.imageUrl] : [])
                      ).map((url, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border border-border bg-background aspect-square flex items-center justify-center">
                              <img src={url} alt={`Asset ${idx + 1}`} className="w-full h-full object-cover cursor-zoom-in" onClick={() => window.open(url)} />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteImage(url); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                title={t('Eliminar', 'Delete')}
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  #{idx + 1}
                              </div>
                          </div>
                      ))}
                      
                      {/* Generation Slot (If space available or always for more) */}
                      <div className="bg-surface/50 border border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 aspect-square">
                          {loadingImage ? (
                               <div className="flex flex-col items-center gap-2">
                                   <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                                   <span className="text-[10px] text-textSec">{t('Generando...', 'Generating...')}</span>
                               </div>
                          ) : (
                               <button 
                                   onClick={handleGenerateImage}
                                   className="flex flex-col items-center gap-2 text-textSec hover:text-accent transition-colors"
                               >
                                   <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
                                       <ImageIcon className="w-4 h-4" />
                                   </div>
                                   <span className="text-[10px] font-medium">{t('Generar Otra', 'Generate Another')}</span>
                               </button>
                          )}
                      </div>
                  </div>

                  {/* Configuration for Next Generation */}
                  <div className="bg-background rounded-xl p-4 border border-border">
                      <div className="flex gap-6 mb-4">
                          <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-textSec uppercase mb-2">{t('Formato de Próxima Imagen', 'Next Image Format')}</label>
                              <div className="flex flex-wrap gap-2">
                                {ratioOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setAspectRatio(option.value)}
                                        className={`px-3 py-1 text-[10px] rounded-full border transition-all ${
                                            aspectRatio === option.value 
                                            ? 'bg-textMain border-textMain text-background' 
                                            : 'bg-surface border-border text-textSec hover:border-textSec hover:text-textMain'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-semibold text-textSec uppercase mb-2">{t('Idioma', 'Language')}</label>
                              <div className="flex bg-surface border border-border rounded-full p-0.5">
                                  <button 
                                      onClick={() => setImageLanguage('es')}
                                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${imageLanguage === 'es' ? 'bg-textMain text-background' : 'text-textSec hover:text-textMain'}`}
                                  >
                                      ES
                                  </button>
                                  <button 
                                      onClick={() => setImageLanguage('en')}
                                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${imageLanguage === 'en' ? 'bg-textMain text-background' : 'text-textSec hover:text-textMain'}`}
                                  >
                                      EN
                                  </button>
                              </div>
                          </div>
                      </div>
                      
                      <button 
                          onClick={handleGenerateImage}
                          disabled={loadingImage}
                          className="w-full py-2.5 bg-textMain text-background rounded-lg hover:opacity-90 font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
                      >
                          {loadingImage ? (
                              t('Generando recurso...', 'Generating asset...')
                          ) : (
                              <><Wand2 className="w-3.5 h-3.5" /> {t('Generar Versión / Diapositiva', 'Generate Version / Slide')}</>
                          )}
                      </button>
                  </div>
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface sticky bottom-0 z-10 grid grid-cols-2 gap-3">
            <button 
                onClick={() => onSaveItem(item)}
                className="py-3 border border-border bg-surface hover:bg-surfaceHover text-textMain rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
                <Save className="w-4 h-4" /> {t('Guardar', 'Save')}
            </button>
            {item.status !== ContentStatus.USED ? (
               <button 
                onClick={markAsUsed}
                className="py-3 border border-success/30 bg-success/10 text-success hover:bg-success/20 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
               >
                 <CheckCircle className="w-4 h-4" /> {t('Completar', 'Complete')}
               </button>
             ) : (
                 <div className="text-center text-success font-medium text-sm py-3 rounded-lg border border-success/20 bg-success/5 flex items-center justify-center gap-2">
                     <CheckCircle className="w-4 h-4" /> {t('Completado', 'Completed')}
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default SidePanel;