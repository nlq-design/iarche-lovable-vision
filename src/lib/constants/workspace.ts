/**
 * Constante partagée pour le workspace par défaut (IArche Interne).
 * Utilisée comme fallback ultime quand le WorkspaceContext n'a pas encore résolu de workspace.
 * Mono-tenant en prod actuellement — voir TODO M5 pour migration multi-workspace.
 */
export const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
