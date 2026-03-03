import React from 'react';
import { ContentItem, ContentStatus } from '../types';
import { Twitter, Linkedin, Instagram, Mail, FileText, Zap, Trash2 } from 'lucide-react';

interface PlanCardProps {
  item: ContentItem;
  onClick: () => void;
  onDelete: () => void;
  isSelected: boolean;
  fluidWidth?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ item, onClick, onDelete, isSelected, fluidWidth = false }) => {
  const getStatusColor = (status: ContentStatus) => {
    switch (status) {
      case ContentStatus.USED: return 'bg-success';
      case ContentStatus.GENERATED: return 'bg-accent';
      default: return 'bg-textSec';
    }
  };

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    const iconClass = "w-5 h-5";
    if (t.includes('twitter') || t.includes('post x')) return <Twitter className={iconClass} />;
    if (t.includes('linkedin')) return <Linkedin className={iconClass} />;
    if (t.includes('instagram')) return <Instagram className={iconClass} />;
    if (t.includes('email')) return <Mail className={iconClass} />;
    return <FileText className={iconClass} />;
  };

  return (
    <div 
      onClick={onClick}
      className={`
        group relative flex-shrink-0 p-4 rounded-lg cursor-pointer transition-all duration-200 border
        hover:bg-surfaceHover
        ${fluidWidth ? 'w-full' : 'w-50'}
        ${isSelected ? 'bg-surfaceHover border-accent shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-surface border-border shadow-md'}
      `}
    >
      <div className="flex justify-between items-start mb-3 pr-4">
        <div className="flex items-center gap-2 overflow-hidden text-textSec">
            <span className="flex-shrink-0">{getTypeIcon(item.contentType)}</span>
            <span className="text-xs font-medium uppercase tracking-wider truncate" title={item.contentType}>
            {item.contentType}
            </span>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(item.status)}`} title={item.status} />
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 text-textSec/20 hover:text-red-500 hover:bg-surface rounded p-1 transition-all opacity-0 group-hover:opacity-100"
        title="Eliminar idea"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <h3 className="text-textMain text-sm font-medium leading-snug line-clamp-3 mb-3 min-h-[3rem]">
        {item.title}
      </h3>

      {item.isTrend && (
        <div className="flex items-center gap-1.5 mt-auto">
          <Zap className="w-3.5 h-3.5 text-accentAmber fill-accentAmber" />
          <span className="text-accentAmber text-xs font-semibold">Tendencia</span>
        </div>
      )}
    </div>
  );
};

export default PlanCard;