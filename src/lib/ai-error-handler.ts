/**
 * Centralized AI Error Handler
 * 
 * Provides consistent error handling for AI-related edge function calls
 * including quota limits, rate limits, and credit exhaustion.
 */

import { toast } from 'sonner';

export interface AIErrorContext {
  status?: number;
  message?: string;
  body?: unknown;
}

export interface AIError {
  type: 'rate_limit' | 'quota_exceeded' | 'credits_exhausted' | 'network' | 'unknown';
  message: string;
  retryable: boolean;
}

/**
 * Extract error details from various error formats
 */
export function extractAIErrorContext(err: unknown): AIErrorContext {
  const error = err as Record<string, unknown>;
  
  // FunctionsHttpError format
  if (error?.context) {
    const ctx = error.context as Record<string, unknown>;
    return {
      status: ctx.status as number | undefined,
      body: ctx.body,
      message: typeof ctx.body === 'string' 
        ? ctx.body 
        : (ctx.body as Record<string, unknown>)?.error as string 
          || (ctx.body as Record<string, unknown>)?.message as string
          || error.message as string,
    };
  }
  
  // Standard Error
  if (error?.message) {
    const message = error.message as string;
    // Try to extract status code from message
    const statusMatch = message.match(/\b(4\d{2}|5\d{2})\b/);
    return {
      status: statusMatch ? parseInt(statusMatch[1], 10) : undefined,
      message,
    };
  }
  
  return { message: 'Erreur inconnue' };
}

/**
 * Parse error and return structured AI error
 */
export function parseAIError(err: unknown): AIError {
  const ctx = extractAIErrorContext(err);
  const { status, message = '' } = ctx;
  const lowerMessage = message.toLowerCase();
  
  // Rate limit (429)
  if (status === 429 || lowerMessage.includes('429') || lowerMessage.includes('rate_limit') || lowerMessage.includes('rate limit')) {
    return {
      type: 'rate_limit',
      message: 'Limite de requêtes atteinte. Réessayez dans quelques instants.',
      retryable: true,
    };
  }
  
  // Payment required / Credits exhausted (402)
  if (status === 402 || lowerMessage.includes('402') || lowerMessage.includes('credits_exhausted') || lowerMessage.includes('payment required')) {
    return {
      type: 'credits_exhausted',
      message: 'Crédits IA insuffisants. Contactez l\'administrateur.',
      retryable: false,
    };
  }
  
  // Workspace quota exceeded
  if (lowerMessage.includes('quota') || lowerMessage.includes('quota exceeded') || lowerMessage.includes('quota épuisé')) {
    return {
      type: 'quota_exceeded',
      message: 'Quota mensuel IA épuisé pour ce workspace.',
      retryable: false,
    };
  }
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || status === 503) {
    return {
      type: 'network',
      message: 'Erreur réseau. Vérifiez votre connexion et réessayez.',
      retryable: true,
    };
  }
  
  // Unknown error
  return {
    type: 'unknown',
    message: message || 'Erreur lors de la génération IA.',
    retryable: false,
  };
}

/**
 * Handle AI error with toast notification
 * Returns the parsed error for further handling if needed
 */
export function handleAIError(err: unknown, options?: { silent?: boolean }): AIError {
  const aiError = parseAIError(err);
  
  if (!options?.silent) {
    toast.error(aiError.message);
  }
  
  // Log for debugging
  console.error('[AI Error]', {
    type: aiError.type,
    message: aiError.message,
    original: err,
  });
  
  return aiError;
}

/**
 * Wrapper for edge function calls with automatic AI error handling
 */
export async function invokeWithAIErrorHandling<T>(
  invokeFn: () => Promise<{ data: T | null; error: unknown }>,
  options?: { silent?: boolean }
): Promise<{ data: T | null; error: AIError | null }> {
  try {
    const { data, error } = await invokeFn();
    
    if (error) {
      const aiError = handleAIError(error, options);
      return { data: null, error: aiError };
    }
    
    return { data, error: null };
  } catch (err) {
    const aiError = handleAIError(err, options);
    return { data: null, error: aiError };
  }
}
