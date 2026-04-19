import { Badge } from "@/components/ui/badge";
import { Video, Phone, MapPin, Calendar, Mail, Building2 } from "lucide-react";
import { ReactNode } from "react";

/**
 * Fonctions de formatage centralisées
 * Utilisées par Admin ET Cockpit pour garantir la cohérence
 */

// ============================================================================
// FORMATAGE MONÉTAIRE
// ============================================================================

export const formatCurrency = (
  value: number,
  currency: string = "EUR",
  locale: string = "fr-FR"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M€`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k€`;
  }
  return formatCurrency(value);
};

// ============================================================================
// BADGES DE STATUT
// ============================================================================

export type EntityType = "booking" | "lead" | "opportunity" | "project" | "task";

export interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  className?: string;
}

export const getBookingStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "confirmed":
      return { label: "Confirmé", variant: "default", className: "bg-green-100 text-green-800" };
    case "pending":
      return { label: "En attente", variant: "secondary", className: "bg-amber-100 text-amber-800" };
    case "cancelled":
      return { label: "Annulé", variant: "destructive", className: "bg-red-100 text-red-800" };
    case "completed":
      return { label: "Terminé", variant: "default", className: "bg-blue-100 text-blue-800" };
    default:
      return { label: status, variant: "secondary" };
  }
};

export const getLeadStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "new":
      return { label: "Nouveau", variant: "default", className: "bg-blue-100 text-blue-800" };
    case "contacted":
      return { label: "Contacté", variant: "secondary", className: "bg-yellow-100 text-yellow-800" };
    case "qualified":
      return { label: "Qualifié", variant: "default", className: "bg-green-100 text-green-800" };
    case "converted":
      return { label: "Converti", variant: "default", className: "bg-purple-100 text-purple-800" };
    case "lost":
      return { label: "Perdu", variant: "destructive", className: "bg-red-100 text-red-800" };
    default:
      return { label: status, variant: "secondary" };
  }
};

export const getOpportunityStageConfig = (stage: string): StatusConfig => {
  switch (stage) {
    case "lead":
      return { label: "Lead", variant: "secondary", className: "bg-slate-100 text-slate-800" };
    case "r1":
      return { label: "R1", variant: "default", className: "bg-blue-100 text-blue-800" };
    case "r2":
      return { label: "R2", variant: "default", className: "bg-amber-100 text-amber-800" };
    case "pause":
      return { label: "Pause", variant: "default", className: "bg-orange-100 text-orange-800" };
    case "closed_won":
      return { label: "Gagné", variant: "default", className: "bg-green-100 text-green-800" };
    case "lost":
      return { label: "Perdu", variant: "destructive", className: "bg-red-100 text-red-800" };
    default:
      return { label: stage, variant: "secondary" };
  }
};

export const getProjectStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "draft":
      return { label: "Brouillon", variant: "secondary" };
    case "active":
      return { label: "En cours", variant: "default", className: "bg-blue-100 text-blue-800" };
    case "on_hold":
      return { label: "En pause", variant: "secondary", className: "bg-amber-100 text-amber-800" };
    case "completed":
      return { label: "Terminé", variant: "default", className: "bg-green-100 text-green-800" };
    case "cancelled":
      return { label: "Annulé", variant: "destructive" };
    default:
      return { label: status, variant: "secondary" };
  }
};

export const getTaskStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "pending":
      return { label: "En attente", variant: "secondary" };
    case "in_progress":
      return { label: "En cours", variant: "default", className: "bg-blue-100 text-blue-800" };
    case "completed":
      return { label: "Terminé", variant: "default", className: "bg-green-100 text-green-800" };
    case "cancelled":
      return { label: "Annulé", variant: "destructive" };
    default:
      return { label: status, variant: "secondary" };
  }
};

// ============================================================================
// SOURCES DE LEADS
// ============================================================================

export const getSourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    newsletter: "Newsletter",
    "atelier-webinaire": "Atelier/Webinaire",
    "livre-blanc": "Livre blanc",
    contact: "Contact",
    booking: "Rendez-vous",
  };
  return labels[source] || source;
};

export const getSourceBadgeColor = (source: string): string => {
  switch (source) {
    case "newsletter":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "atelier-webinaire":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "livre-blanc":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    case "contact":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100";
    case "booking":
      return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

// ============================================================================
// TYPES DE RÉUNION
// ============================================================================

export const getMeetingTypeLabel = (type: string): string => {
  switch (type) {
    case "visio_meet":
      return "Google Meet";
    case "visio_zoom":
      return "Zoom";
    case "telephone":
      return "Téléphone";
    case "presentiel":
      return "Présentiel";
    default:
      return type;
  }
};

export const getMeetingTypeIcon = (type: string): typeof Video => {
  switch (type) {
    case "visio_meet":
    case "visio_zoom":
      return Video;
    case "telephone":
      return Phone;
    case "presentiel":
      return MapPin;
    default:
      return Video;
  }
};

// ============================================================================
// TYPES DE TÂCHES
// ============================================================================

export const getTaskTypeLabel = (type: string): string => {
  switch (type) {
    case "follow_up":
      return "Suivi";
    case "call":
      return "Appel";
    case "meeting":
      return "Réunion";
    case "email":
      return "Email";
    case "proposal":
      return "Proposition";
    case "other":
      return "Autre";
    default:
      return type;
  }
};

export const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case "low":
      return "Basse";
    case "medium":
      return "Moyenne";
    case "high":
      return "Haute";
    case "urgent":
      return "Urgente";
    default:
      return priority;
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "low":
      return "text-slate-500";
    case "medium":
      return "text-blue-500";
    case "high":
      return "text-orange-500";
    case "urgent":
      return "text-red-500";
    default:
      return "text-slate-500";
  }
};

// ============================================================================
// SUJETS DE CONTACT
// ============================================================================

export const getSubjectLabel = (subject: string): string => {
  const labels: Record<string, string> = {
    audit: "Audit IA",
    developpement: "Développement",
    accompagnement: "Accompagnement",
    conformite: "Conformité",
    autre: "Autre",
  };
  return labels[subject] || subject;
};

// ============================================================================
// JOURS DE LA SEMAINE
// ============================================================================

export const DAYS_OF_WEEK = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export const DAYS_OF_WEEK_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
