/**
 * Shared Prompt Loader - Loads prompts from ai_prompts table by slug
 * Centralizes all AI prompt management for edge functions.
 * 
 * Usage:
 *   import { loadPrompt } from "../_shared/prompt-loader.ts";
 *   const prompt = await loadPrompt(supabase, "sentinel-analysis");
 *   // prompt.system_prompt, prompt.user_prompt, prompt.model_config
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface LoadedPrompt {
  slug: string;
  system_prompt: string;
  user_prompt: string | null;
  model_config: Record<string, unknown>;
  category: string;
}

// In-memory cache with TTL
const promptCache = new Map<string, { data: LoadedPrompt; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load a prompt by slug from the ai_prompts table.
 * Falls back to provided default if not found in DB.
 */
export async function loadPrompt(
  supabase: SupabaseClient,
  slug: string,
  fallback?: { system_prompt: string; user_prompt?: string }
): Promise<LoadedPrompt> {
  // Check cache
  const cached = promptCache.get(slug);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("slug, system_prompt, user_prompt, model_config, category")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.warn(`[prompt-loader] Error fetching "${slug}":`, error.message);
    }

    if (data) {
      const loaded: LoadedPrompt = {
        slug: data.slug,
        system_prompt: data.system_prompt,
        user_prompt: data.user_prompt,
        model_config: (data.model_config as Record<string, unknown>) || {},
        category: data.category,
      };
      promptCache.set(slug, { data: loaded, cachedAt: Date.now() });
      console.log(`[prompt-loader] Loaded "${slug}" from DB`);
      return loaded;
    }
  } catch (e) {
    console.warn(`[prompt-loader] Fetch error for "${slug}":`, e);
  }

  // Fallback to hardcoded default
  if (fallback) {
    console.log(`[prompt-loader] Using fallback for "${slug}"`);
    return {
      slug,
      system_prompt: fallback.system_prompt,
      user_prompt: fallback.user_prompt || null,
      model_config: {},
      category: "fallback",
    };
  }

  throw new Error(`[prompt-loader] Prompt "${slug}" not found and no fallback provided`);
}

/**
 * Load multiple prompts at once (batch)
 */
export async function loadPrompts(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<Map<string, LoadedPrompt>> {
  const result = new Map<string, LoadedPrompt>();
  const toFetch: string[] = [];

  // Check cache first
  for (const slug of slugs) {
    const cached = promptCache.get(slug);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
      result.set(slug, cached.data);
    } else {
      toFetch.push(slug);
    }
  }

  if (toFetch.length > 0) {
    try {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("slug, system_prompt, user_prompt, model_config, category")
        .in("slug", toFetch);

      if (!error && data) {
        for (const row of data) {
          const loaded: LoadedPrompt = {
            slug: row.slug,
            system_prompt: row.system_prompt,
            user_prompt: row.user_prompt,
            model_config: (row.model_config as Record<string, unknown>) || {},
            category: row.category,
          };
          promptCache.set(row.slug, { data: loaded, cachedAt: Date.now() });
          result.set(row.slug, loaded);
        }
      }
    } catch (e) {
      console.warn(`[prompt-loader] Batch fetch error:`, e);
    }
  }

  return result;
}

/**
 * Invalidate cache for a specific slug or all
 */
export function invalidatePromptCache(slug?: string) {
  if (slug) {
    promptCache.delete(slug);
  } else {
    promptCache.clear();
  }
}
