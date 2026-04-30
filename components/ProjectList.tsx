import React from 'react';
import { useNavigate } from 'react-router-dom';
// import { Project } from '../types'; // Convex returns its own types roughly matching key structure
// import { getProjects, deleteProject } from '../services/storageService'; // DEPRECATED
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { ArrowRight, Trash2, Settings } from 'lucide-react';
import { Id } from "../convex/_generated/dataModel";
import { useAISettings } from './AISettingsContext';

const ProjectList: React.FC = () => {
  const projects = useQuery(api.projects.getProjects);
  const deleteProject = useMutation(api.projects.deleteProject);
  const navigate = useNavigate();
  const { apiKey, openSettings } = useAISettings();

  const { signOut } = useAuthActions();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que quieres eliminar este proyecto?')) {
        await deleteProject({ id: id as Id<"projects"> });
    }
  };

  if (projects === undefined) {
      console.log("[DEBUG] ProjectList - projects is undefined (loading)");
      return <div className="p-10 text-center text-textSec">Cargando proyectos...</div>;
  }

  console.log("[DEBUG] ProjectList - projects loaded, count:", projects.length);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-10">
        <div>
            <h1 className="text-3xl font-bold text-textMain tracking-tight">LaunchKit</h1>
            <p className="text-textSec mt-2">Genera un plan de contenido mensual y assets de lanzamiento.</p>
        </div>
        <div className="flex gap-4 items-center">
            <button 
                onClick={openSettings}
                className="relative p-2 text-textSec hover:text-textMain hover:bg-surfaceHover rounded-md transition-colors border border-transparent hover:border-border"
                title="Configuración de IA (BYOK)"
            >
                <Settings className="w-5 h-5" />
                <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-background ${apiKey ? 'bg-success' : 'bg-red-500 animate-pulse'}`}></span>
            </button>
            <button 
              onClick={() => void signOut()}
              className="text-textSec hover:text-white px-4 py-2 font-medium transition-colors border border-border rounded-md hover:border-textSec"
            >
              Cerrar Sesión
            </button>
            <button 
              onClick={() => navigate('/create')}
              className="bg-textMain text-background px-5 py-2.5 rounded-md font-semibold hover:opacity-90 transition-all shadow-lg shadow-textMain/10"
            >
              + Nuevo Plan
            </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-surface/30">
          <p className="text-textSec mb-4">No tienes planes creados aún.</p>
          <button 
             onClick={() => navigate('/create')}
             className="text-accent hover:underline flex items-center justify-center gap-1 mx-auto"
           >
            Crear mi primer proyecto <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project._id}
              onClick={() => navigate(`/project/${project._id}`)}
              className="group relative bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-textSec/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <h3 className="text-xl font-semibold text-textMain mb-2">{project.name}</h3>
              <p className="text-textSec text-sm line-clamp-2 mb-6 h-10">{project.description}</p>
              
              <div className="flex justify-between items-center mt-auto">
                <span className="text-xs text-textSec bg-surfaceHover px-2 py-1 rounded">
                  {project.plan.length > 0 ? `${project.plan.length} Ideas` : 'Sin plan'}
                </span>
                <span className="text-xs text-textSec">
                   {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <button 
                onClick={(e) => handleDelete(e, project._id)}
                className="absolute top-4 right-4 text-textSec opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;