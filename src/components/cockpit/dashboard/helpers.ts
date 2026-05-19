import { useNavigate } from 'react-router-dom';
import { SentinelAlert } from '@/hooks/cockpit/useAISentinel';
import { toast } from '@/hooks/use-toast';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  opportunity: 'Opportunité',
  project: 'Projet',
  partner: 'Partenaire',
  solution: 'Solution',
  transcription: 'Transcription',
  task: 'Tâche',
};

export function entityRoute(type: string, id: string): string | null {
  if (!type || !id) return null;
  const routes: Record<string, string> = {
    lead: `/cockpit/leads/${id}`,
    opportunity: `/cockpit/pipeline?focus=${id}`,
    project: `/cockpit/projects/${id}`,
    partner: `/cockpit/partenaires/${id}`,
    solution: `/cockpit/solutions/${id}`,
    transcription: `/cockpit/transcriptions/${id}`,
    task: `/cockpit/projects`,
  };
  return routes[type] ?? null;
}

/**
 * Navigate to an entity's dedicated page with user-friendly fallback toasts.
 * Returns true if navigation occurred, false if blocked by a missing id/unknown type.
 */
export function safeNavigateToEntity(
  navigate: ReturnType<typeof useNavigate>,
  type: string | null | undefined,
  id: string | null | undefined,
  entityName?: string,
): boolean {
  if (!type) {
    toast({
      title: 'Navigation impossible',
      description: "Type d'entité manquant. Impossible d'ouvrir la fiche.",
      variant: 'destructive',
    });
    return false;
  }
  if (!id) {
    toast({
      title: 'Navigation impossible',
      description: `Identifiant manquant pour ${entityName ?? ENTITY_TYPE_LABELS[type] ?? type}.`,
      variant: 'destructive',
    });
    return false;
  }
  const path = entityRoute(type, id);
  if (!path) {
    toast({
      title: 'Type non reconnu',
      description: `Aucune page dédiée pour le type « ${type} ».`,
      variant: 'destructive',
    });
    return false;
  }
  navigate(path);
  return true;
}

export function navigateToEntity(navigate: ReturnType<typeof useNavigate>, alert: SentinelAlert) {
  safeNavigateToEntity(navigate, alert.entity_type, alert.entity_id);
}

export function getSmartHeadline(ctx: {
  humanOverdue: number; criticalAlerts: number; todayTasks: number;
  todayBookings: number; overdueAi: number; staleQueue: number;
}): string {
  if (ctx.criticalAlerts > 0) return `⚠️ ${ctx.criticalAlerts} alerte${ctx.criticalAlerts > 1 ? 's' : ''} critique${ctx.criticalAlerts > 1 ? 's' : ''}`;
  if (ctx.humanOverdue >= 3) return `🔴 ${ctx.humanOverdue} tâches en retard`;
  if (ctx.todayBookings > 0 && ctx.todayTasks > 0) return `${ctx.todayTasks} tâche${ctx.todayTasks > 1 ? 's' : ''} et ${ctx.todayBookings} RDV aujourd'hui`;
  if (ctx.todayTasks > 0) return `${ctx.todayTasks} tâche${ctx.todayTasks > 1 ? 's' : ''} au programme`;
  if (ctx.overdueAi > 20) return `🌾 ${ctx.overdueAi} tâches IA à récolter`;
  if (ctx.staleQueue > 0) return `🔄 ${ctx.staleQueue} synthèses à mettre à jour`;
  return 'Analyse en cours...';
}

export function formatCurrency(value: number): string {
  if (value >= 1000) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

export const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', r1: 'R1', r2: 'R2', pause: 'Pause',
  closed_won: 'Gagné', closed_lost: 'Perdu',
};

export const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  r1: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  r2: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  pause: 'bg-muted text-muted-foreground',
  closed_won: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  closed_lost: 'bg-destructive/20 text-destructive',
};
