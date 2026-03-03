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
import { 
  ArrowLeft, Star, RefreshCw, Plus, Rocket, Mail, FolderOpen, 
  ArrowRight, LayoutGrid, ListFilter
} from 'lucide-react';

type ViewMode = 'PLAN' | 'SAVED';

const LOADING_MESSAGES = [
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

const ProjectPlan: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const rawProject = useQuery(api.projects.getProject, id ? { id: id as Id<"projects"> } : "skip");
  const updateProjectMutation = useMutation(api.projects.updateProject);

  const project: Project | null = rawProject ? {
      ...rawProject,
      id: rawProject._id,
      createdAt: rawProject._creationTime,
      plan: (rawProject.plan || []) as ContentItem[],
      savedItems: (rawProject.savedItems || []) as ContentItem[],
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
      // Cast to any to destructure potential Convex system fields that are not in Project type but exist at runtime
      const { id, createdAt, _id, _creationTime, ...rest } = updatedProject as any;
      await updateProjectMutation({
          id: id as Id<"projects">,
          ...rest
      });
  };

  const handleGeneratePlan = async () => {
    if (!project) return;

    // Confirmación si ya hay progreso
    const hasProgress = project.plan.some(i => i.status === ContentStatus.GENERATED || i.status === ContentStatus.USED);
    if (project.plan.length > 0 && hasProgress) {
        const confirm = window.confirm("ATENCIÓN: Tienes tarjetas generadas o usadas. Si regeneras el plan, estas se perderán. Asegúrate de GUARDAR lo que quieras conservar en la sección 'Guardados'. ¿Deseas continuar y sobrescribir el plan?");
        if (!confirm) return;
    } else if (project.plan.length > 0) {
         if(!window.confirm("¿Deseas generar un nuevo plan? El plan anterior se eliminará.")) return;
    }

    if (!apiKey) {
        alert("LaunchKit requiere una API Key de OpenRouter. Por favor configúrala primero.");
        openSettings();
        return;
    }

    setLoading(true);
    try {
      const plan = await generateMonthlyPlan(project, useSearch, { apiKey, textModel, imageModel });
      // Mantener savedItems y launchKit, reemplazar plan
      const updatedProject = { ...project, plan };
      handleUpdateProject(updatedProject);
      setViewMode('PLAN');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error generando el plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIdea = async (week: WeekPhase) => {
    if (!project) return;
    if (!apiKey) {
        alert("Configura tu API Key primero.");
        openSettings();
        return;
    }
    setLoadingWeekId(week);
    try {
        const newItem = await generateSingleIdea(project, week, { apiKey, textModel, imageModel });
        const updatedProject = {
            ...project,
            plan: [...project.plan, newItem]
        };
        handleUpdateProject(updatedProject);
    } catch (e) {
        console.error(e);
        alert('Error generando nueva idea.');
    } finally {
        setLoadingWeekId(null);
    }
  };

  const handleDeleteItem = (itemId: string, isSavedItem: boolean = false) => {
    if (!project) return;
    if (window.confirm("¿Estás seguro de que quieres eliminar esta idea?")) {
        let updatedProject: Project;
        
        if (isSavedItem) {
            updatedProject = {
                ...project,
                savedItems: (project.savedItems || []).filter(i => i.id !== itemId)
            };
        } else {
            updatedProject = {
                ...project,
                plan: project.plan.filter(i => i.id !== itemId)
            };
        }
        
        handleUpdateProject(updatedProject);
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

    handleUpdateProject(updatedProject);
  };

  const handleSaveToLibrary = (item: ContentItem) => {
      if (!project) return;
      
      const alreadySaved = (project.savedItems || []).some(i => i.id === item.id);
      if (alreadySaved) {
          alert("Este ítem ya está guardado.");
          return;
      }

      const newItem = { ...item };
      const updatedProject = {
          ...project,
          savedItems: [newItem, ...(project.savedItems || [])] // Prepend new item
      };
      handleUpdateProject(updatedProject);
      alert("¡Guardado en la librería!");
  };

  const getFilteredItems = (week: WeekPhase) => {
    if (!project) return [];
    return project.plan.filter(item => {
      const matchesWeek = item.week === week;
      const matchesFilter = filter === 'ALL' || item.status === filter;
      return matchesWeek && matchesFilter;
    });
  };

  if (rawProject === undefined) return <div className="min-h-screen flex items-center justify-center bg-background text-textSec">Cargando proyecto...</div>;
  if (!project) return <div className="min-h-screen flex items-center justify-center bg-background text-textSec">Proyecto no encontrado.</div>;

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
                Generando tu Plan
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
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Mis Proyectos
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-textMain">{project.name}</h1>
                    <div className="flex bg-surface rounded-lg p-1 border border-border">
                        <button 
                            onClick={() => setViewMode('PLAN')}
                            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${viewMode === 'PLAN' ? 'bg-textMain text-background shadow-lg' : 'text-textSec hover:text-textMain'}`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> Plan Mensual
                        </button>
                        <button 
                            onClick={() => setViewMode('SAVED')}
                            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${viewMode === 'SAVED' ? 'bg-accentAmber text-background shadow-lg' : 'text-textSec hover:text-textMain'}`}
                        >
                            <Star className={`w-3.5 h-3.5 ${viewMode === 'SAVED' ? 'fill-background' : ''}`} />
                            Guardados ({project.savedItems?.length || 0})
                        </button>
                    </div>
                </div>
                <p className="text-textSec mt-1 text-sm max-w-2xl line-clamp-1">{project.description}</p>
              </div>
              
              {project.plan.length > 0 && viewMode === 'PLAN' && (
                  <div className="flex bg-surface rounded-lg p-1 border border-border self-start">
                      {(['ALL', ContentStatus.PENDING, ContentStatus.GENERATED, ContentStatus.USED] as const).map((f) => (
                          <button
                              key={f}
                              onClick={() => setFilter(f)}
                              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${filter === f ? 'bg-surfaceHover text-textMain shadow-sm' : 'text-textSec hover:text-textMain'}`}
                          >
                              {f === 'ALL' ? 'Todos' : f === ContentStatus.PENDING ? 'Pendientes' : f === ContentStatus.GENERATED ? 'Generados' : 'Usados'}
                          </button>
                      ))}
                  </div>
              )}
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
                            <Star className="text-accentAmber fill-accentAmber w-6 h-6" /> Librería de Guardados
                        </h2>
                     </div>
                     {(project.savedItems || []).length === 0 ? (
                         <div className="text-center py-20 border border-dashed border-border rounded-xl bg-surface/30">
                             <p className="text-textSec">No has guardado ninguna tarjeta todavía.</p>
                         </div>
                     ) : (
                         <div className="flex flex-wrap gap-4">
                             {(project.savedItems || []).map(item => (
                                 <div key={item.id} className="relative">
                                     <PlanCard 
                                         item={item} 
                                         isSelected={selectedItemId === item.id}
                                         onClick={() => setSelectedItemId(item.id)}
                                         onDelete={() => handleDeleteItem(item.id, true)}
                                     />
                                 </div>
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
                        <h2 className="text-2xl font-bold text-textMain mb-2">Plan Mensual de Contenido</h2>
                        <p className="text-textSec mb-6 text-center max-w-md">
                        LaunchKit buscará tendencias y creará un calendario de 4 semanas.
                        </p>
                        
                        <div className="flex items-center gap-3 mb-6 bg-surface p-3 rounded-lg border border-border">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                <span className="ml-3 text-sm font-medium text-textMain">Buscar tendencias en vivo</span>
                            </label>
                            <span className="text-xs text-textSec border-l border-border pl-3">
                                {useSearch 
                                    ? 'Usa Google Search (Gemini 3 Pro) - Más lento, conectado a la actualidad.'
                                    : 'Sin búsqueda (Gemini 3 Flash) - Rápido, contenido estratégico y evergreen.'}
                            </span>
                        </div>

                        <button
                        onClick={handleGeneratePlan}
                        disabled={loading}
                        className="bg-textMain hover:opacity-90 text-background px-8 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-textMain/10 flex items-center gap-2 disabled:opacity-50"
                        >
                        {loading ? 'Iniciando...' : 'Generar Plan Mensual'}
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
                                  <>Regenerando...</>
                                ) : (
                                  <><RefreshCw className="w-3.5 h-3.5" /> Regenerar Plan Completo</>
                                )}
                            </button>
                        </div>
                        {Object.values(WeekPhase).map((phase) => {
                            const items = getFilteredItems(phase);
                            if (items.length === 0 && filter !== 'ALL') return null;
                            return (
                                <div key={phase} className="animate-fadeIn">
                                <div className="flex items-baseline justify-between mb-4 border-b border-border/50 pb-2">
                                    <h3 className="text-xl font-semibold text-textMain flex items-center gap-3">
                                        {phase}
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
                                                  <span className="text-sm font-medium text-textSec group-hover/btn:text-textMain">Nueva idea</span>
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
                                <Rocket className="w-6 h-6 text-accent" /> Kit de Lanzamiento
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
                                    <h3 className="text-lg font-bold mb-2">Emails de Lanzamiento</h3>
                                    <p className="text-sm text-textSec mb-4">Secuencia de 3 emails: Teaser, Día 0 y Recordatorio.</p>
                                    <div className="text-xs font-medium text-accent flex items-center gap-1">
                                        {project.launchKit.emails.status === ContentStatus.PENDING ? 'Generar' : 'Ver y Copiar'} <ArrowRight className="w-3 h-3" />
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
                                    <h3 className="text-lg font-bold mb-2">Product Hunt Assets</h3>
                                    <p className="text-sm text-textSec mb-4">Tagline, descripción para el maker y primer comentario.</p>
                                    <div className="text-xs font-medium text-accent flex items-center gap-1">
                                        {project.launchKit.productHunt.status === ContentStatus.PENDING ? 'Generar' : 'Ver y Copiar'} <ArrowRight className="w-3 h-3" />
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
                                    <h3 className="text-lg font-bold mb-2">Directorios</h3>
                                    <p className="text-sm text-textSec mb-4">Descripción corta y larga optimizadas para listados.</p>
                                    <div className="text-xs font-medium text-accent flex items-center gap-1">
                                        {project.launchKit.directories.status === ContentStatus.PENDING ? 'Generar' : 'Ver y Copiar'} <ArrowRight className="w-3 h-3" />
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