import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Project, WeekPhase, ContentItem, ContentStatus, LaunchKitType } from '../types';
// import { getProjectById, saveProject } from '../services/storageService'; // DEPRECATED
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { generateMonthlyPlan, generateSingleIdea } from '../services/geminiService';
import PlanCard from './PlanCard';
import SidePanel from './SidePanel';
import LaunchKitModal from './LaunchKitModal';
import { useAISettings } from './AISettingsContext';
import { useLanguage } from './LanguageContext';
import { 
  ArrowLeft, Star, RefreshCw, Plus, Rocket, Mail, FolderOpen, 
  ArrowRight, LayoutGrid, ListFilter
} from 'lucide-react';

type ViewMode = 'PLAN' | 'SAVED';

const LOADING_MESSAGES_ES = [
    "Buscando tendencias actuales...",
    "Analizando tu producto...",
    "Explorando qué se está hablando en redes...",
    "Identificando oportunidades de contenido...",
    "Conectando tendencias con tu producto...",
    "Creando ideas para X, LinkedIn e Instagram...",
    "Pensando en los mejores ángulos...",
    "Definiendo estrategia para cada semana...",
    "Generando ideas de emails...",
    "Organizando el plan por semanas...",
    "Refinando las ideas...",
    "Preparando tu plan de contenido...",
    "Últimos ajustes...",
    "Casi listo..."
];

const LOADING_MESSAGES_EN = [
    "Searching for current trends...",
    "Analyzing your product...",
    "Exploring what's trending on social media...",
    "Identifying content opportunities...",
    "Connecting trends with your product...",
    "Creating ideas for X, LinkedIn, and Instagram...",
    "Thinking about the best angles...",
    "Defining strategy for each week...",
    "Generating email ideas...",
    "Organizing the plan by weeks...",
    "Refining the ideas...",
    "Preparing your content plan...",
    "Last adjustments...",
    "Almost ready..."
];

const ProjectPlan: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  
  const LOADING_MESSAGES = language === 'es' ? LOADING_MESSAGES_ES : LOADING_MESSAGES_EN;
  
  const rawProject = useQuery(api.projects.getProject, id ? { id: id as Id<"projects"> } : "skip");
  const updateProjectMutation = useMutation(api.projects.updateProject);

  const project: Project | null = rawProject ? {
      ...rawProject,
      id: rawProject._id,
      createdAt: rawProject._creationTime,
      plan: (rawProject.plan || []).map((item: any, idx: number) => {
          const id = item.id || `plan-${idx}`;
          const hasImageUrls = item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0;
          return {
              ...item,
              id,
              imageUrls: hasImageUrls ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : [])
          };
      }) as ContentItem[],
      savedItems: (rawProject.savedItems || []).map((item: any, idx: number) => {
          const id = item.id || `saved-${idx}`;
          const hasImageUrls = item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0;
          return {
              ...item,
              id,
              imageUrls: hasImageUrls ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : [])
          };
      }) as ContentItem[],
      launchKit: rawProject.launchKit ? {
          emails: { status: rawProject.launchKit.emails.status as ContentStatus, content: rawProject.launchKit.emails.content },
          productHunt: { status: rawProject.launchKit.productHunt.status as ContentStatus, content: rawProject.launchKit.productHunt.content },
          directories: { status: rawProject.launchKit.directories.status as ContentStatus, content: rawProject.launchKit.directories.content },
      } : {
          emails: { status: ContentStatus.PENDING, content: { teaser: '', lanzamiento: '', recordatorio: '' } },
          productHunt: { status: ContentStatus.PENDING, content: { tagline: '', descripcion: '', primerComentario: '' } },
          directories: { status: ContentStatus.PENDING, content: { descripcionCorta: '', descripcionLarga: '' } },
      }
  } : null;
  
  // const [project, setProject] = useState<Project | null>(null); // Replaced by derived state
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [loadingWeekId, setLoadingWeekId] = useState<string | null>(null);

  const [filter, setFilter] = useState<'ALL' | ContentStatus>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('PLAN');
  const [useSearch, setUseSearch] = useState(true); // New state for search toggle
  
  // Side Panel State (Monthly Plan)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Launch Kit Modal State
  const [launchKitModalType, setLaunchKitModalType] = useState<LaunchKitType | null>(null);

  const { apiKey, textModel, imageModel, openSettings } = useAISettings();
  
  // Cycle loading messages
  useEffect(() => {
    let interval: any;
    if (loading) {
        setLoadingMsgIndex(0);
        interval = setInterval(() => {
            setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 4000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Removed useEffect for loading project from localStorage

  const handleUpdateProject = async (updatedProject: Project) => {
      try {
          // Convex mutations are strict with arguments. Only send allowed fields.
          await updateProjectMutation({
              id: id as Id<"projects">,
              name: updatedProject.name,
              description: updatedProject.description,
              targetAudience: updatedProject.targetAudience,
              problemSolved: updatedProject.problemSolved,
              plan: updatedProject.plan,
              savedItems: updatedProject.savedItems,
              launchKit: updatedProject.launchKit
          });
      } catch (error: any) {
          console.error("Error updating project:", error);
          alert(t("Error al guardar cambios: ", "Error saving changes: ") + (error.message || "Unknown error"));
      }
  };

  const handleGeneratePlan = async () => {
    if (!project) return;

    // Confirmación si ya hay progreso
    const hasProgress = project.plan.some(i => i.status === ContentStatus.GENERATED || i.status === ContentStatus.USED);
    if (project.plan.length > 0 && hasProgress) {
        const confirm = window.confirm(t("ATENCIÓN: Tienes tarjetas generadas o usadas. Si regeneras el plan, estas se perderán. Asegúrate de GUARDAR lo que quieras conservar en la sección 'Guardados'. ¿Deseas continuar y sobrescribir el plan?", "ATTENTION: You have generated or used cards. If you regenerate the plan, these will be lost. Make sure to SAVE what you want to keep in the 'Saved' section. Do you want to continue and overwrite the plan?"));
        if (!confirm) return;
    } else if (project.plan.length > 0) {
         if(!window.confirm(t("¿Deseas generar un nuevo plan? El plan anterior se eliminará.", "Do you want to generate a new plan? The previous plan will be deleted."))) return;
    }

    if (!apiKey) {
        alert(t("LaunchKit requiere una API Key de OpenRouter. Por favor configúrala primero.", "LaunchKit requires an OpenRouter API Key. Please configure it first."));
        openSettings();
        return;
    }

    setLoading(true);
    try {
      const plan = await generateMonthlyPlan(project, useSearch, { apiKey, textModel, imageModel }, language);
      // Mantener savedItems y launchKit, reemplazar plan
      const updatedProject = { ...project, plan };
      handleUpdateProject(updatedProject);
      setViewMode('PLAN');
    } catch (e: any) {
      console.error(e);
      alert(e.message || t('Error generando el plan.', 'Error generating the plan.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddIdea = async (week: WeekPhase) => {
    if (!project) return;
    if (!apiKey) {
        alert(t("Configura tu API Key primero.", "Configure your API Key first."));
        openSettings();
        return;
    }
    setLoadingWeekId(week);
    try {
        const newItem = await generateSingleIdea(project, week, { apiKey, textModel, imageModel }, language);
        const updatedProject = {
            ...project,
            plan: [...project.plan, newItem]
        };
        handleUpdateProject(updatedProject);
    } catch (e) {
        console.error(e);
        alert(t('Error generando nueva idea.', 'Error generating new idea.'));
    } finally {
        setLoadingWeekId(null);
    }
  };

  const handleDeleteItem = (itemId: string, isSavedItem: boolean = false) => {
    if (!project) return;
    if (window.confirm(t("¿Estás seguro de que quieres eliminar esta idea?", "Are you sure you want to delete this idea?"))) {
        let updatedProject: Project;
        
        if (isSavedItem) {
            updatedProject = {
                ...project,
                savedItems: (project.savedItems || []).filter(i => i.id !== itemId)
            };
        } else {
            updatedProject = {
                ...project,
                plan: (project.plan || []).filter(i => i.id !== itemId)
            };
        }
        
        handleUpdateProject(updatedProject as any);
        if (selectedItemId === itemId) setSelectedItemId(null);
    }
  };

  const updateItem = (updatedItem: ContentItem) => {
    if (!project) return;
    
    // Check if item is in plan or saved items
    const isInPlan = project.plan.some(i => i.id === updatedItem.id);
    const isInSaved = (project.savedItems || []).some(i => i.id === updatedItem.id);

    let updatedProject = { ...project };

    if (isInPlan) {
        updatedProject.plan = project.plan.map(item => item.id === updatedItem.id ? updatedItem : item);
    } 
    if (isInSaved) {
        updatedProject.savedItems = (project.savedItems || []).map(item => item.id === updatedItem.id ? updatedItem : item);
    }

    handleUpdateProject(updatedProject as any);
  };

  const handleSaveToLibrary = (item: ContentItem) => {
      if (!project) return;
      
      const alreadySaved = (project.savedItems || []).some(i => i.id === item.id);
      if (alreadySaved) {
          alert(t("Este ítem ya está guardado.", "This item is already saved."));
          return;
      }

      const newItem = { ...item };
      const updatedProject = {
          ...project,
          savedItems: [newItem, ...(project.savedItems || [])] // Prepend new item
      };
      handleUpdateProject(updatedProject as any);
      alert(t("¡Guardado en la librería!", "Saved to library!"));
  };

  const getFilteredItems = (week: WeekPhase) => {
    if (!project) return [];
    
    // Fallback mapping for old data consistency
    const weekMap: Record<string, WeekPhase> = {
        'Semana 1': WeekPhase.WEEK_1, 'Week 1': WeekPhase.WEEK_1,
        'Semana 2': WeekPhase.WEEK_2, 'Week 2': WeekPhase.WEEK_2,
        'Semana 3': WeekPhase.WEEK_3, 'Week 3': WeekPhase.WEEK_3,
        'Semana 4': WeekPhase.WEEK_4, 'Week 4': WeekPhase.WEEK_4,
    };

    return project.plan.filter(item => {
      const normalizedWeek = weekMap[item.week] || item.week;
      const matchesWeek = normalizedWeek === week;
      const matchesFilter = filter === 'ALL' || item.status === filter;
      return matchesWeek && matchesFilter;
    });
  };

  if (rawProject === undefined) return <div className="min-h-screen flex items-center justify-center bg-background text-textSec">{t('Cargando proyecto...', 'Loading project...')}</div>;
  if (!project) return <div className="min-h-screen flex items-center justify-center bg-background text-textSec">{t('Proyecto no encontrado.', 'Project not found.')}</div>;

  const selectedItem = project.plan.find(i => i.id === selectedItemId) || (project.savedItems || []).find(i => i.id === selectedItemId) || null;
  const isModalOpen = !!selectedItem;

  return (
    <div className="min-h-screen bg-background text-textMain">
      
      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-24 h-24 mb-10">
                <div className="absolute inset-0 border-4 border-border rounded-full"></div>
                <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                    <Rocket className="w-10 h-10 text-accent" />
                </div>
            </div>
            <h3 className="text-3xl font-bold text-textMain mb-4 text-center px-4 tracking-tight">
                {t('Generando tu Plan', 'Generating your Plan')}
            </h3>
            <div className="h-8 flex items-center justify-center">
                <p key={loadingMsgIndex} className="text-accent text-lg font-medium animate-fadeIn text-center px-4">
                    {LOADING_MESSAGES[loadingMsgIndex]}
                </p>
            </div>
            <div className="mt-8 w-64 h-1 bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-accent animate-pulse w-full origin-left scale-x-50 transition-transform"></div>
            </div>
        </div>
      )}

      {/* Header Fixed */}
      <div className="sticky top-0 z-20 px-8 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="max-w-[1900px] mx-auto w-full">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-textSec text-sm mb-2 hover:text-textMain transition-colors flex items-center gap-1 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {t('Mis Proyectos', 'My Projects')}
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-textMain">{project.name}</h1>
                    <div className="flex bg-surface rounded-lg p-1 border border-border">
                        <button 
                            onClick={() => setViewMode('PLAN')}
                            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${viewMode === 'PLAN' ? 'bg-textMain text-background shadow-lg' : 'text-textSec hover:text-textMain'}`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> {t('Plan Mensual', 'Monthly Plan')}
                        </button>
                        <button 
                            onClick={() => setViewMode('SAVED')}
                            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${viewMode === 'SAVED' ? 'bg-accentAmber text-background shadow-lg' : 'text-textSec hover:text-textMain'}`}
                        >
                            <Star className={`w-3.5 h-3.5 ${viewMode === 'SAVED' ? 'fill-background' : ''}`} />
                            {t('Guardados', 'Saved')} ({project.savedItems?.length || 0})
                        </button>
                    </div>
                </div>
                <p className="text-textSec mt-1 text-sm max-w-2xl line-clamp-1">{project.description}</p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Language Toggle */}
                <div className="flex items-center gap-2 text-xs font-medium border border-border rounded-full px-3 py-1 bg-surface self-center">
                    <button 
                        onClick={() => setLanguage('es')}
                        className={`${language === 'es' ? 'text-textMain' : 'text-textSec hover:text-textMain'} transition-colors`}
                    >
                        ES
                    </button>
                    <span className="text-border">|</span>
                    <button 
                        onClick={() => setLanguage('en')}
                        className={`${language === 'en' ? 'text-textMain' : 'text-textSec hover:text-textMain'} transition-colors`}
                    >
                        EN
                    </button>
                </div>

                {project.plan.length > 0 && viewMode === 'PLAN' && (
                    <div className="flex bg-surface rounded-lg p-1 border border-border self-start">
                        {(['ALL', ContentStatus.PENDING, ContentStatus.GENERATED, ContentStatus.USED] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${filter === f ? 'bg-surfaceHover text-textMain shadow-sm' : 'text-textSec hover:text-textMain'}`}
                            >
                                {f === 'ALL' ? t('Todos', 'All') : f === ContentStatus.PENDING ? t('Pendientes', 'Pending') : f === ContentStatus.GENERATED ? t('Generados', 'Generated') : t('Usados', 'Used')}
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pt-6">
          <div className="max-w-[1900px] mx-auto w-full">
            
            {viewMode === 'SAVED' ? (
                 <div className="animate-fadeIn pb-20">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Star className="text-accentAmber fill-accentAmber w-6 h-6" /> {t('Librería de Guardados', 'Saved Library')}
                        </h2>
                     </div>
                     {(project.savedItems || []).length === 0 ? (
                         <div className="text-center py-20 border border-dashed border-border rounded-xl bg-surface/30">
                             <p className="text-textSec">{t('No has guardado ninguna tarjeta todavía.', 'You haven\'t saved any cards yet.')}</p>
                         </div>
                     ) : (
                         <div className="flex flex-wrap gap-4">
                             {(project.savedItems || []).map(item => (
                                  <PlanCard 
                                      key={item.id}
                                      item={item} 
                                      isSelected={selectedItemId === item.id}
                                      onClick={() => setSelectedItemId(item.id)}
                                      onDelete={() => handleDeleteItem(item.id, true)}
                                  />
                             ))}
                         </div>
                     )}
                 </div>
            ) : (
                <>
                    {/* MONTHLY PLAN SECTION */}
                    {project.plan.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-surface/30 border border-dashed border-border rounded-xl mt-4 mb-6">
                        <Rocket className="w-16 h-16 mb-4 text-textSec opacity-50" strokeWidth={1.5} />
                        <h2 className="text-2xl font-bold text-textMain mb-2">{t('Plan Mensual de Contenido', 'Monthly Content Plan')}</h2>
                        <p className="text-textSec mb-6 text-center max-w-md">
                            {t('LaunchKit buscará tendencias y creará un calendario de 4 semanas.', 'LaunchKit will search for trends and create a 4-week calendar.')}
                        </p>
                        
                        <div className="flex items-center gap-3 mb-6 bg-surface p-3 rounded-lg border border-border">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                <span className="ml-3 text-sm font-medium text-textMain">{t('Buscar tendencias en vivo', 'Search live trends')}</span>
                            </label>
                            <span className="text-xs text-textSec border-l border-border pl-3">
                                {useSearch 
                                    ? t('Usa Google Search (Gemini 3 Pro) - Más lento, conectado a la actualidad.', 'Uses Google Search (Gemini 3 Pro) - Slower, connected to current events.')
                                    : t('Sin búsqueda (Gemini 3 Flash) - Rápido, contenido estratégico y evergreen.', 'No search (Gemini 3 Flash) - Fast, strategic and evergreen content.')}
                            </span>
                        </div>

                        <button
                        onClick={handleGeneratePlan}
                        disabled={loading}
                        className="bg-textMain hover:opacity-90 text-background px-8 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-textMain/10 flex items-center gap-2 disabled:opacity-50"
                        >
                        {loading ? t('Iniciando...', 'Starting...') : t('Generar Plan Mensual', 'Generate Monthly Plan')}
                        </button>
                    </div>
                    ) : (
                    <div className="space-y-10 pb-16">
                        <div className="flex justify-end">
                            <button 
                                onClick={handleGeneratePlan}
                                disabled={loading}
                                className="text-xs text-textSec hover:text-accent transition-colors flex items-center gap-1.5"
                            >
                                {loading ? (
                                  <>{t('Regenerando...', 'Regenerating...')}</>
                                ) : (
                                  <><RefreshCw className="w-3.5 h-3.5" /> {t('Regenerar Plan Completo', 'Regenerate Full Plan')}</>
                                )}
                            </button>
                        </div>
                        {Object.values(WeekPhase).map((phase) => {
                            const items = getFilteredItems(phase);
                            if (items.length === 0 && filter !== 'ALL') return null;
                            
                            const phaseLabel = {
                                [WeekPhase.WEEK_1]: t('Semana 1: Awareness', 'Week 1: Awareness'),
                                [WeekPhase.WEEK_2]: t('Semana 2: Consideration', 'Week 2: Consideration'),
                                [WeekPhase.WEEK_3]: t('Semana 3: Conversion', 'Week 3: Conversion'),
                                [WeekPhase.WEEK_4]: t('Semana 4: Loyalty', 'Week 4: Loyalty'),
                            }[phase];

                            return (
                                <div key={phase} className="animate-fadeIn">
                                <div className="flex items-baseline justify-between mb-4 border-b border-border/50 pb-2">
                                    <h3 className="text-xl font-semibold text-textMain flex items-center gap-3">
                                        {phaseLabel}
                                        <span className="text-xs font-normal text-textSec bg-surface px-2 py-0.5 rounded-full border border-border">
                                            {items.length}
                                        </span>
                                    </h3>
                                </div>
                                <div className="relative group">
                                    <div className="flex overflow-x-auto gap-4 pb-6 px-1 snap-x scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                                        {items.map(item => (
                                            <PlanCard 
                                                key={item.id} 
                                                item={item} 
                                                isSelected={selectedItemId === item.id}
                                                onClick={() => setSelectedItemId(item.id)}
                                                onDelete={() => handleDeleteItem(item.id, false)}
                                            />
                                        ))}
                                        {filter === 'ALL' && (
                                            <button onClick={() => handleAddIdea(phase)} disabled={loadingWeekId === phase} className="flex-shrink-0 w-50 p-4 rounded-lg border-2 border-dashed border-border hover:border-accent hover:bg-surfaceHover flex flex-col items-center justify-center gap-3 transition-all group/btn">
                                                {loadingWeekId === phase ? <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div> : (
                                                <>
                                                  <span className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-textSec group-hover/btn:text-accent group-hover/btn:border-accent transition-colors">
                                                    <Plus className="w-5 h-5" />
                                                  </span>
                                                  <span className="text-sm font-medium text-textSec group-hover/btn:text-textMain">{t('Nueva idea', 'New idea')}</span>
                                                </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <div className="absolute top-0 right-0 bottom-6 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                                </div>
                            );
                        })}
                    </div>
                    )}

                    {/* LAUNCH KIT SECTION */}
                    {project.launchKit && (
                        <div className="border-t border-border pt-8 pb-24 animate-fadeIn">
                            <h2 className="text-2xl font-bold text-textMain mb-6 flex items-center gap-2">
                                <Rocket className="w-6 h-6 text-accent" /> {t('Kit de Lanzamiento', 'Launch Kit')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Emails Block */}
                                <div 
                                    onClick={() => setLaunchKitModalType('emails')}
                                    className={`bg-surface border rounded-xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${project.launchKit.emails.status !== ContentStatus.PENDING ? 'border-accent/50' : 'border-border hover:border-textSec'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <Mail className="w-8 h-8 text-textSec" />
                                        <div className={`w-2.5 h-2.5 rounded-full ${project.launchKit.emails.status === ContentStatus.USED ? 'bg-success' : project.launchKit.emails.status === ContentStatus.GENERATED ? 'bg-accent' : 'bg-border'}`} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">{t('Emails de Lanzamiento', 'Launch Emails')}</h3>
                                    <p className="text-sm text-textSec mb-4">{t('Secuencia de 3 emails: Teaser, Día 0 y Recordatorio.', 'Sequence of 3 emails: Teaser, Day 0, and Reminder.')}</p>
                                    <div className="text-xs font-medium text-accent flex items-center gap-1">
                                        {project.launchKit.emails.status === ContentStatus.PENDING ? t('Generar', 'Generate') : t('Ver y Copiar', 'View and Copy')} <ArrowRight className="w-3 h-3" />
                                    </div>
                                </div>

                                {/* Product Hunt Block */}
                                <div 
                                    onClick={() => setLaunchKitModalType('productHunt')}
                                    className={`bg-surface border rounded-xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${project.launchKit.productHunt.status !== ContentStatus.PENDING ? 'border-accent/50' : 'border-border hover:border-textSec'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <Rocket className="w-8 h-8 text-textSec" />
                                        <div className={`w-2.5 h-2.5 rounded-full ${project.launchKit.productHunt.status === ContentStatus.USED ? 'bg-success' : project.launchKit.productHunt.status === ContentStatus.GENERATED ? 'bg-accent' : 'bg-border'}`} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">{t('Product Hunt Assets', 'Product Hunt Assets')}</h3>
                                    <p className="text-sm text-textSec mb-4">{t('Tagline, descripción para el maker y primer comentario.', 'Tagline, maker description, and first comment.')}</p>
                                    <div className="text-xs font-medium text-accent flex items-center gap-1">
                                        {project.launchKit.productHunt.status === ContentStatus.PENDING ? t('Generar', 'Generate') : t('Ver y Copiar', 'View and Copy')} <ArrowRight className="w-3 h-3" />
                                    </div>
                                </div>

                                {/* Directories Block */}
                                <div 
                                    onClick={() => setLaunchKitModalType('directories')}
                                    className={`bg-surface border rounded-xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${project.launchKit.directories.status !== ContentStatus.PENDING ? 'border-accent/50' : 'border-border hover:border-textSec'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <FolderOpen className="w-8 h-8 text-textSec" />
                                        <div className={`w-2.5 h-2.5 rounded-full ${project.launchKit.directories.status === ContentStatus.USED ? 'bg-success' : project.launchKit.directories.status === ContentStatus.GENERATED ? 'bg-accent' : 'bg-border'}`} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">{t('Directorios', 'Directories')}</h3>
                                    <p className="text-sm text-textSec mb-4">{t('Descripción corta y larga optimizadas para listados.', 'Short and long descriptions optimized for listings.')}</p>
                                    <div className="text-xs font-medium text-accent flex items-center gap-1">
                                        {project.launchKit.directories.status === ContentStatus.PENDING ? t('Generar', 'Generate') : t('Ver y Copiar', 'View and Copy')} <ArrowRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
          </div>
      </div>

      <SidePanel 
        item={selectedItem}
        project={project}
        isOpen={isModalOpen}
        onClose={() => setSelectedItemId(null)}
        onUpdateItem={updateItem}
        onSaveItem={handleSaveToLibrary}
      />

      {launchKitModalType && project && (
          <LaunchKitModal
            type={launchKitModalType}
            isOpen={!!launchKitModalType}
            onClose={() => setLaunchKitModalType(null)}
            project={project}
            onUpdateProject={handleUpdateProject}
          />
      )}
    </div>
  );
};

export default ProjectPlan;