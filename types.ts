export enum ContentStatus {
  PENDING = 'PENDING',
  GENERATED = 'GENERATED',
  USED = 'USED'
}

export enum WeekPhase {
  WEEK_1 = 'Semana 1',
  WEEK_2 = 'Semana 2',
  WEEK_3 = 'Semana 3',
  WEEK_4 = 'Semana 4'
}

export interface ContentItem {
  id: string;
  week: WeekPhase;
  contentType: string; // "Post X", "Email", etc.
  title: string;
  angle: string;
  isTrend: boolean;
  trendContext?: string;
  status: ContentStatus;
  copy?: string;
  imageUrl?: string;
}

// Estructuras para el Kit de Lanzamiento
export type LaunchKitType = 'emails' | 'productHunt' | 'directories';

export interface LaunchKitEmails {
  status: ContentStatus;
  content: {
    teaser: string;
    lanzamiento: string;
    recordatorio: string;
  };
}

export interface LaunchKitPH {
  status: ContentStatus;
  content: {
    tagline: string;
    descripcion: string;
    primerComentario: string;
  };
}

export interface LaunchKitDirectories {
  status: ContentStatus;
  content: {
    descripcionCorta: string;
    descripcionLarga: string;
  };
}

export interface LaunchKitData {
  emails: LaunchKitEmails;
  productHunt: LaunchKitPH;
  directories: LaunchKitDirectories;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  problemSolved: string;
  createdAt: number;
  plan: ContentItem[];
  savedItems: ContentItem[];
  launchKit: LaunchKitData; // Nueva sección
}

export type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'plan' | 'savedItems' | 'launchKit'>;

export interface AIConfig {
  apiKey: string;
  textModel: string;
  imageModel: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  architecture?: {
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
  };
}