import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractPRD } from '../services/geminiService';
// import { saveProject } from '../services/storageService'; // DEPRECATED
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { ProjectFormData, ContentStatus } from '../types';
import { Sparkles, FileText, ArrowLeft } from 'lucide-react';
import { useAISettings } from './AISettingsContext';

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const createProject = useMutation(api.projects.createProject);
  
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [loading, setLoading] = useState(false);
  const [prdText, setPrdText] = useState('');
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    targetAudience: '',
    problemSolved: ''
  });

  const { apiKey, textModel, imageModel, openSettings } = useAISettings();

  const handleExtract = async () => {
    if (!apiKey) {
        alert("Por favor, configura tu API Key de OpenRouter en la configuración (⚙️) antes de procesar.");
        openSettings();
        return;
    }
    if (!prdText.trim()) return;
    setLoading(true);
    try {
      const extracted = await extractPRD(prdText, { apiKey, textModel, imageModel });
      setFormData(prev => ({ ...prev, ...extracted }));
      setMode('manual'); // Switch to manual review
    } catch (e) {
      console.error(e);
      alert('Error al extraer información. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.description) {
        alert("Por favor completa al menos el nombre y la descripción");
        return;
    }

    try {
        const projectId = await createProject({
            ...formData,
            createdAt: Date.now(),
            plan: [],
            savedItems: [],
            launchKit: {
                emails: { 
                    status: ContentStatus.PENDING, 
                    content: { teaser: '', lanzamiento: '', recordatorio: '' } 
                },
                productHunt: { 
                    status: ContentStatus.PENDING, 
                    content: { tagline: '', descripcion: '', primerComentario: '' } 
                },
                directories: { 
                    status: ContentStatus.PENDING, 
                    content: { descripcionCorta: '', descripcionLarga: '' } 
                },
            }
        });

        navigate(`/project/${projectId}`);
    } catch (error) {
        console.error("Error creating project:", error);
        alert("Error al crear el proyecto. Intenta nuevamente.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="text-textSec hover:text-textMain mb-6 flex items-center gap-2 text-sm transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver
      </button>
      
      <h1 className="text-3xl font-bold text-textMain mb-2">Nuevo Proyecto</h1>
      <p className="text-textSec mb-8">Ingresa la información de tu producto para que LaunchKit genere tu plan.</p>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8">
        <button
          className={`pb-3 px-1 mr-6 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${mode === 'ai' ? 'border-accent text-textMain' : 'border-transparent text-textSec hover:text-textMain'}`}
          onClick={() => setMode('ai')}
        >
          <Sparkles className="w-4 h-4" /> Extraer info con IA
        </button>
        <button
          className={`pb-3 px-1 mr-6 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${mode === 'manual' ? 'border-accent text-textMain' : 'border-transparent text-textSec hover:text-textMain'}`}
          onClick={() => setMode('manual')}
        >
          <FileText className="w-4 h-4" /> Manual
        </button>
      </div>

      {mode === 'ai' && (
        <div className="animate-fadeIn">
          <label className="block text-sm font-medium text-textSec mb-2">
            Pega tu PRD, descripción de App Store o documento de producto
          </label>
          <textarea
            className="w-full h-96 bg-surface border border-border rounded-lg p-4 text-textMain focus:outline-none focus:border-accent resize-none placeholder-textSec/30"
            placeholder="Ej: LaunchKit es una herramienta que ayuda a creadores a..."
            value={prdText}
            onChange={(e) => setPrdText(e.target.value)}
          />
          <button
            onClick={handleExtract}
            disabled={loading || !prdText.trim()}
            className="mt-4 w-full bg-textMain hover:opacity-90 text-background font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
                <>
                 <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                 Analizando...
                </>
            ) : (
                'Extraer Información'
            )}
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <label className="block text-sm text-textSec mb-1">Nombre del Producto / App</label>
            <input
              type="text"
              className="w-full bg-surface border border-border rounded p-3 text-textMain focus:border-accent focus:outline-none"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm text-textSec mb-1">Descripción (¿Qué hace?)</label>
            <textarea
              className="w-full bg-surface border border-border rounded p-3 text-textMain focus:border-accent focus:outline-none h-32 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm text-textSec mb-1">Público Objetivo</label>
                <textarea
                className="w-full bg-surface border border-border rounded p-3 text-textMain focus:border-accent focus:outline-none h-40 resize-none"
                value={formData.targetAudience}
                onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm text-textSec mb-1">Problema que Resuelve</label>
                <textarea
                className="w-full bg-surface border border-border rounded p-3 text-textMain focus:border-accent focus:outline-none h-40 resize-none"
                value={formData.problemSolved}
                onChange={(e) => setFormData({...formData, problemSolved: e.target.value})}
                />
            </div>
          </div>

          <div className="pt-4">
            <button
                onClick={handleCreate}
                className="w-full bg-textMain text-background hover:opacity-90 font-bold py-3 rounded-lg transition-all"
            >
                Crear Proyecto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProject;