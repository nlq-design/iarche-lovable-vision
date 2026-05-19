/**
 * useAIAction — Persistance + contexte utilisateur sur les éléments IA du dashboard
 * (Actions Prioritaires, Signaux Croisés, Sentinelle, Prédictions)
 *
 * Architecture lazy : pas de snapshot bulk, l'enregistrement est créé/upserté
 * uniquement lors de la 1re interaction utilisateur (clic sur la carte).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants/workspace';
import { toast } from 'sonner';

export type AIActionSource = 'top_action' | 'cross_signal' | 'sentinel' | 'prediction';
export type AIActionStatus = 'pending' | 'acknowledged' | 'snoozed' | 'done' | 'dismissed';

export type AIActionNoteKind = 'note' | 'status' | 'update';

export interface AIActionNote {
  at: string;
  by?: string;
  text: string;
  kind?: AIActionNoteKind;
  meta?: Record<string, unknown>;
}

export interface AIActionStructuredUpdates {
  new_deadline?: string;
  new_amount?: number;
  new_contact?: string;
  new_stage?: string;
  [key: string]: unknown;
}

export interface AIActionRow {
  id: string;
  workspace_id: string;
  user_id: string | null;
  signature: string;
  source: AIActionSource;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  action_text: string;
  reasoning: string | null;
  urgency: string | null;
  impact_value: number | null;
  status: AIActionStatus;
  snooze_until: string | null;
  user_notes: AIActionNote[];
  structured_updates: AIActionStructuredUpdates;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AIActionSnapshot {
  signature: string;
  source: AIActionSource;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_name?: string | null;
  action_text: string;
  reasoning?: string | null;
  urgency?: string | null;
  impact_value?: number | null;
}

/**
 * Génère un slug court et stable depuis un texte (1ers 80 chars normalisés).
 */
function slugifyShort(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Formate une valeur de change pour affichage compact dans le résumé d'historique. */
function formatChangeValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return new Intl.NumberFormat('fr-FR').format(v);
  return String(v);
}

/**
 * Calcule une signature stable d'un élément IA.
 * top_action / prediction → source::entity_type::entity_id::slug(action)
 * cross_signal           → source::multi::<sorted entity ids>::slug(signal)
 * sentinel               → source::<alert.id>
 */
export function computeAIActionSignature(params: {
  source: AIActionSource;
  entity_type?: string | null;
  entity_id?: string | null;
  action_text: string;
  alert_id?: string;
  entities?: Array<{ id: string }>;
}): string {
  if (params.source === 'sentinel' && params.alert_id) {
    return `sentinel::${params.alert_id}`;
  }
  if (params.source === 'cross_signal') {
    const ids = (params.entities || []).map((e) => e.id).sort().join('|');
    return `cross_signal::multi::${ids}::${slugifyShort(params.action_text)}`;
  }
  return `${params.source}::${params.entity_type || 'none'}::${params.entity_id || 'none'}::${slugifyShort(params.action_text)}`;
}

export function useAIAction(snapshot: AIActionSnapshot | null) {
  const { user } = useAuth();
  const ctxWorkspaceId = useWorkspaceId();
  const workspaceId = ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;
  const queryClient = useQueryClient();

  const signature = snapshot?.signature ?? null;

  const query = useQuery({
    queryKey: ['ai-action', workspaceId, signature],
    queryFn: async (): Promise<AIActionRow | null> => {
      if (!signature) return null;
      const { data, error } = await supabase
        .from('ai_actions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('signature', signature)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AIActionRow) ?? null;
    },
    enabled: !!signature,
    staleTime: 30_000,
  });

  /** Crée la ligne si absente, retourne la ligne courante. */
  const ensureRow = async (): Promise<AIActionRow> => {
    if (!snapshot) throw new Error('Snapshot manquant');
    if (query.data) return query.data;

    const { data, error } = await supabase
      .from('ai_actions')
      .upsert(
        {
          workspace_id: workspaceId,
          user_id: user?.id ?? null,
          signature: snapshot.signature,
          source: snapshot.source,
          entity_type: snapshot.entity_type ?? null,
          entity_id: snapshot.entity_id ?? null,
          entity_name: snapshot.entity_name ?? null,
          action_text: snapshot.action_text,
          reasoning: snapshot.reasoning ?? null,
          urgency: snapshot.urgency ?? null,
          impact_value: snapshot.impact_value ?? null,
        },
        { onConflict: 'workspace_id,signature', ignoreDuplicates: false },
      )
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as AIActionRow;
  };

  /** Append d'une entrée d'historique au tableau user_notes. */
  const appendHistory = async (
    row: AIActionRow,
    entry: Omit<AIActionNote, 'at' | 'by'> & { by?: string },
  ): Promise<void> => {
    const newEntry: AIActionNote = {
      at: new Date().toISOString(),
      by: entry.by ?? user?.email ?? user?.id ?? 'user',
      kind: entry.kind ?? 'note',
      text: entry.text,
      meta: entry.meta,
    };
    const notes = [...(row.user_notes || []), newEntry];
    const { error } = await supabase
      .from('ai_actions')
      .update({ user_notes: notes as never })
      .eq('id', row.id);
    if (error) throw error;
  };

  const statusLabelsFr: Record<AIActionStatus, string> = {
    pending: 'Réouvert',
    acknowledged: 'Marqué comme vu',
    snoozed: 'Reporté',
    done: 'Marqué traité',
    dismissed: 'Marqué non pertinent',
  };

  const updateStatus = useMutation({
    mutationFn: async (params: { status: AIActionStatus; snoozeDays?: number; silent?: boolean }) => {
      const row = await ensureRow();
      const patch: Record<string, unknown> = { status: params.status };
      if (params.status === 'snoozed' && params.snoozeDays) {
        patch.snooze_until = new Date(Date.now() + params.snoozeDays * 86400000).toISOString();
      } else {
        patch.snooze_until = null;
      }
      if (params.status === 'done' || params.status === 'dismissed') {
        patch.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from('ai_actions').update(patch).eq('id', row.id);
      if (error) throw error;

      // Trace dans l'historique (sauf auto-acknowledge silencieux)
      if (!params.silent) {
        const label = params.status === 'snoozed' && params.snoozeDays
          ? `Reporté de ${params.snoozeDays}j`
          : statusLabelsFr[params.status];
        await appendHistory(row, {
          kind: 'status',
          text: label,
          meta: { status: params.status, snoozeDays: params.snoozeDays },
        });
      }
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['ai-action', workspaceId, signature] });
      queryClient.invalidateQueries({ queryKey: ['ai-actions-active', workspaceId] });
      if (!params.silent) toast.success(statusLabelsFr[params.status]);
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });

  const addNote = useMutation({
    mutationFn: async (text: string) => {
      if (!text.trim()) return;
      const row = await ensureRow();
      await appendHistory(row, { kind: 'note', text: text.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-action', workspaceId, signature] });
      queryClient.invalidateQueries({ queryKey: ['ai-actions-active', workspaceId] });
      toast.success('Contexte ajouté');
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });

  const entityTypeLabelsFr: Record<string, string> = {
    opportunity: "l'opportunité",
    lead: 'le lead',
    project: 'le projet',
  };

  const applyStructuredUpdate = useMutation({
    mutationFn: async (params: { updates: AIActionStructuredUpdates; pushToEntity?: boolean }) => {
      const row = await ensureRow();
      const previous = row.structured_updates || {};
      const merged = { ...previous, ...params.updates };
      const { error } = await supabase
        .from('ai_actions')
        .update({ structured_updates: merged as never })
        .eq('id', row.id);
      if (error) throw error;

      // Push facultatif vers l'entité réelle — sync complet par type
      const entityPatch: Record<string, unknown> = {};
      const entityFieldsTouched: string[] = [];
      let entitySynced = false;

      if (params.pushToEntity && row.entity_type && row.entity_id) {
        const u = params.updates;

        if (row.entity_type === 'opportunity') {
          if (u.new_deadline) { entityPatch.expected_close_date = u.new_deadline; entityFieldsTouched.push('échéance'); }
          if (typeof u.new_amount === 'number') { entityPatch.value_amount = u.new_amount; entityFieldsTouched.push('montant'); }
          if (u.new_stage) { entityPatch.stage = u.new_stage; entityFieldsTouched.push('étape'); }
        } else if (row.entity_type === 'lead') {
          if (u.new_contact) {
            const c = String(u.new_contact).trim();
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
            if (isEmail) { entityPatch.email = c; entityFieldsTouched.push('email'); }
            else { entityPatch.phone = c; entityFieldsTouched.push('téléphone'); }
          }
          if (typeof u.new_amount === 'number') { entityPatch.budget = u.new_amount; entityFieldsTouched.push('budget'); }
          if (u.new_stage) { entityPatch.qualification_status = u.new_stage; entityFieldsTouched.push('qualification'); }
        } else if (row.entity_type === 'project') {
          if (u.new_deadline) { entityPatch.planned_end_date = u.new_deadline; entityFieldsTouched.push('échéance'); }
          if (typeof u.new_amount === 'number') { entityPatch.budget_amount = u.new_amount; entityFieldsTouched.push('budget'); }
          if (u.new_stage) { entityPatch.status = u.new_stage; entityFieldsTouched.push('statut'); }
        }

        if (Object.keys(entityPatch).length) {
          const table = row.entity_type === 'opportunity' ? 'opportunities'
            : row.entity_type === 'lead' ? 'leads'
            : row.entity_type === 'project' ? 'projects'
            : null;
          if (table) {
            const { error: e2 } = await supabase
              .from(table as 'opportunities' | 'leads' | 'projects')
              .update(entityPatch)
              .eq('id', row.entity_id);
            if (e2) throw e2;
            entitySynced = true;
          }
        }
      }

      // Trace structurée : on conserve before/after pour chaque champ modifié
      const changes: Array<{ field: string; before: unknown; after: unknown }> = [];
      for (const [k, v] of Object.entries(params.updates)) {
        changes.push({ field: k, before: previous[k] ?? null, after: v });
      }
      const summary = changes
        .map((c) => `${c.field.replace('new_', '')}: ${formatChangeValue(c.after)}`)
        .join(' · ');
      await appendHistory(row, {
        kind: 'update',
        text: summary,
        meta: {
          changes,
          pushed: !!params.pushToEntity,
          entity_synced: entitySynced,
          entity_fields: entityFieldsTouched,
          entity_type: row.entity_type,
        },
      });

      return {
        entitySynced,
        entityFieldsTouched,
        entityType: row.entity_type,
        entityName: row.entity_name,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ai-action', workspaceId, signature] });
      queryClient.invalidateQueries({ queryKey: ['entity-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit-leads'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });

      if (result?.entitySynced && result.entityType) {
        const label = entityTypeLabelsFr[result.entityType] ?? result.entityType;
        const name = result.entityName ? ` "${result.entityName}"` : '';
        const fields = result.entityFieldsTouched.length
          ? ` (${result.entityFieldsTouched.join(', ')})`
          : '';
        toast.success(`${label}${name} mis à jour${fields}`, {
          description: 'Modifications synchronisées dans la base.',
        });
      } else {
        toast.success('Contexte enregistré sur l\'action IA');
      }
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });

  return {
    row: query.data,
    isLoading: query.isLoading,
    updateStatus,
    addNote,
    applyStructuredUpdate,
  };
}

/**
 * Liste toutes les ai_actions actives (non done/dismissed) du workspace.
 * Utilisée pour : badges sur widgets + injection dans le brief IA.
 */
export function useActiveAIActions() {
  const ctxWorkspaceId = useWorkspaceId();
  const workspaceId = ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;

  return useQuery({
    queryKey: ['ai-actions-active', workspaceId],
    queryFn: async (): Promise<AIActionRow[]> => {
      const { data, error } = await supabase
        .from('ai_actions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .not('status', 'in', '(done,dismissed)')
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as AIActionRow[]) ?? [];
    },
    staleTime: 60_000,
  });
}
