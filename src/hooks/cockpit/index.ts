/**
 * Hooks Cockpit - Étendent les hooks partagés avec fonctionnalités cockpit-specific
 * 
 * IMPORTANT: Ces hooks ÉTENDENT les hooks de /hooks/shared/
 * Ils ne dupliquent PAS la logique de base.
 * 
 * @see docs/COCKPIT_DEV_CHARTER.md
 */

// Auth cockpit
export { useCockpitAuth } from './useCockpitAuth';

// Hooks qui ÉTENDENT les hooks partagés
export { useCockpitLeads } from './useCockpitLeads';
export { useCockpitBookings } from './useCockpitBookings';

// Hooks cockpit-only (pas d'équivalent dans shared)
export { useCockpitOpportunities } from './useCockpitOpportunities';
export { useCockpitProjects } from './useCockpitProjects';
export { useCockpitTasks } from './useCockpitTasks';
export { useCockpitMeetingNotes } from './useCockpitMeetingNotes';
export { useCockpitSpecifications, SPECIFICATION_STATUSES } from './useCockpitSpecifications';
export { useCockpitActivityLog, ACTIVITY_TYPES } from './useCockpitActivityLog';
export { useCockpitProjectDocuments } from './useCockpitProjectDocuments';
export { useCockpitProjectNotes } from './useCockpitProjectNotes';
export { useCockpitSolutionLeads } from './useCockpitSolutionLeads';
export { useCockpitVoiceTranscriptions, useAIPromptProfiles } from './useCockpitVoiceTranscriptions';
export { useCockpitGeneratedDocuments, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG } from './useCockpitGeneratedDocuments';
export { useCockpitUploads } from './useCockpitUploads';
export { useCockpitPartners, useProjectPartners, PARTNER_TYPES } from './useCockpitPartners';
export { usePartnerAllLinks, useEntityPartners, usePartnerLinkCounts } from './usePartnerLinks';
export { usePappersLookup } from './usePappersLookup';
export { useEntityLinks, type EntityType, type LinkedEntity, type EntityLinksData } from './useEntityLinks';
export { useEntityContextNotes, type ContextNoteEntityType, type EntityContextNote } from './useEntityContextNotes';
export { useCockpitAICopilot } from './useCockpitAICopilot';

// Ré-exporter les hooks partagés pour faciliter les imports
export { useBookings, useBookingTypes, BOOKING_QUERY_KEY } from '@/hooks/shared/useBookings';
export { useLeads, LEADS_QUERY_KEY } from '@/hooks/shared/useLeads';
