/**
 * Centralized Color Codes for Lead Lifecycle Tracking
 * 
 * This file defines the professional color-coding system for:
 * - Viviers (Cold Leads): Colored by campaign engagement
 * - Cockpit Leads (Qualified): Colored by source/origin
 */

// ============================================
// VIVIERS - Engagement Levels (Campaign-based)
// ============================================

export type VivierEngagementLevel = 
  | 'never_contacted'
  | 'single_campaign'
  | 'multi_campaign'
  | 'engaged'
  | 'bounced';

export interface EngagementConfig {
  level: number;
  label: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hoverBgClass: string;
}

export const VIVIER_ENGAGEMENT_COLORS: Record<VivierEngagementLevel, EngagementConfig> = {
  never_contacted: {
    level: 0,
    label: 'Jamais contacté',
    description: 'Aucune campagne envoyée',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-200',
    hoverBgClass: 'hover:bg-slate-150',
  },
  single_campaign: {
    level: 1,
    label: 'En campagne',
    description: '1 campagne active, pas encore de réponse',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    hoverBgClass: 'hover:bg-blue-100',
  },
  multi_campaign: {
    level: 2,
    label: 'Multi-contact',
    description: '2+ campagnes, pas de réponse',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    hoverBgClass: 'hover:bg-indigo-100',
  },
  engaged: {
    level: 3,
    label: 'Ouvert',
    description: 'A ouvert/cliqué au moins 1 email',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    hoverBgClass: 'hover:bg-amber-100',
  },
  bounced: {
    level: 4,
    label: 'Bounce/Erreur',
    description: 'Email invalide ou désabonné',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    hoverBgClass: 'hover:bg-red-100',
  },
};

// ============================================
// COCKPIT LEADS - Source Colors
// ============================================

export type LeadSource = 
  | 'contact'
  | 'newsletter'
  | 'atelier-webinaire'
  | 'livre-blanc'
  | 'formulaire'
  | 'cold-outreach'
  | 'booking'
  | 'referral'
  | 'networking'
  | 'other';

export interface LeadSourceConfig {
  label: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hoverBgClass: string;
  indicatorClass: string;
}

export const LEAD_SOURCE_COLORS: Record<LeadSource, LeadSourceConfig> = {
  'cold-outreach': {
    label: 'Promu (Vivier)',
    description: 'Promu depuis une campagne vivier',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    hoverBgClass: 'hover:bg-emerald-100',
    indicatorClass: 'bg-emerald-500',
  },
  contact: {
    label: 'Contact',
    description: 'Formulaire de contact direct',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    hoverBgClass: 'hover:bg-blue-100',
    indicatorClass: 'bg-blue-500',
  },
  booking: {
    label: 'Réservation',
    description: 'Prise de RDV',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    hoverBgClass: 'hover:bg-purple-100',
    indicatorClass: 'bg-purple-500',
  },
  newsletter: {
    label: 'Newsletter',
    description: 'Inscription newsletter',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
    hoverBgClass: 'hover:bg-sky-100',
    indicatorClass: 'bg-sky-500',
  },
  'atelier-webinaire': {
    label: 'Atelier/Webinaire',
    description: 'Inscription à un événement',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-200',
    hoverBgClass: 'hover:bg-violet-100',
    indicatorClass: 'bg-violet-500',
  },
  'livre-blanc': {
    label: 'Livre blanc',
    description: 'Téléchargement de ressource',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
    hoverBgClass: 'hover:bg-teal-100',
    indicatorClass: 'bg-teal-500',
  },
  formulaire: {
    label: 'Formulaire',
    description: 'Formulaire personnalisé',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-700',
    borderClass: 'border-cyan-200',
    hoverBgClass: 'hover:bg-cyan-100',
    indicatorClass: 'bg-cyan-500',
  },
  referral: {
    label: 'Recommandation',
    description: 'Recommandé par un contact',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
    hoverBgClass: 'hover:bg-orange-100',
    indicatorClass: 'bg-orange-500',
  },
  networking: {
    label: 'Networking',
    description: 'Rencontre networking',
    bgClass: 'bg-pink-50',
    textClass: 'text-pink-700',
    borderClass: 'border-pink-200',
    hoverBgClass: 'hover:bg-pink-100',
    indicatorClass: 'bg-pink-500',
  },
  other: {
    label: 'Autre',
    description: 'Autre source',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-200',
    hoverBgClass: 'hover:bg-gray-100',
    indicatorClass: 'bg-gray-400',
  },
};

// Helper to get source config with fallback
export function getLeadSourceConfig(source: string): LeadSourceConfig {
  return LEAD_SOURCE_COLORS[source as LeadSource] || LEAD_SOURCE_COLORS.other;
}

// Helper to get engagement config with fallback
export function getVivierEngagementConfig(level: VivierEngagementLevel): EngagementConfig {
  return VIVIER_ENGAGEMENT_COLORS[level] || VIVIER_ENGAGEMENT_COLORS.never_contacted;
}
