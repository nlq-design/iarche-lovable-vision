/**
 * Constante partagée pour le workspace par défaut (IArche Interne).
 * Utilisée par les edge fns publiques qui écrivent dans des tables
 * workspace_id NOT NULL sans DEFAULT.
 */
export const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
