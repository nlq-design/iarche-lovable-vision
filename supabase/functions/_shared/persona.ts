/**
 * Persona helper — injects workspace-specific AI identity into prompts.
 * Use this in any edge function that loads a prompt via prompt-loader.
 *
 * Replaces {{persona_assistant_name}}, {{persona_company}}, {{persona_city}},
 * {{persona_role}}, {{persona_tone}}, {{persona_language}} in any text.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface WorkspacePersona {
  assistant_name: string;
  company: string;
  city: string;
  role: string;
  tone: string;
  language: string;
}

const DEFAULT_PERSONA: WorkspacePersona = {
  assistant_name: 'Assistant',
  company: '',
  city: '',
  role: 'Assistant commercial',
  tone: 'Professionnel et concis',
  language: 'fr',
};

const cache = new Map<string, { data: WorkspacePersona; cachedAt: number }>();
const TTL = 5 * 60 * 1000;

export async function getWorkspacePersona(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspacePersona> {
  const cached = cache.get(workspaceId);
  if (cached && Date.now() - cached.cachedAt < TTL) return cached.data;

  const { data } = await supabase.rpc('get_workspace_persona', { _workspace_id: workspaceId });
  const persona = { ...DEFAULT_PERSONA, ...(data ?? {}) } as WorkspacePersona;
  cache.set(workspaceId, { data: persona, cachedAt: Date.now() });
  return persona;
}

export function injectPersona(text: string, persona: WorkspacePersona): string {
  return text
    .replace(/\{\{persona_assistant_name\}\}/g, persona.assistant_name)
    .replace(/\{\{persona_company\}\}/g, persona.company)
    .replace(/\{\{persona_city\}\}/g, persona.city)
    .replace(/\{\{persona_role\}\}/g, persona.role)
    .replace(/\{\{persona_tone\}\}/g, persona.tone)
    .replace(/\{\{persona_language\}\}/g, persona.language);
}

export function invalidatePersonaCache(workspaceId?: string) {
  if (workspaceId) cache.delete(workspaceId);
  else cache.clear();
}
