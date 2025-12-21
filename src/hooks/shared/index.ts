/**
 * Hooks partagés entre Admin et Cockpit
 * 
 * Ces hooks contiennent la logique de base pour la gestion des données.
 * Les modules spécifiques (Admin, Cockpit) peuvent les étendre avec
 * des fonctionnalités supplémentaires.
 */

export { useBookings, useBookingTypes, useBookingAvailability, BOOKING_QUERY_KEY } from './useBookings';
export { useLeads, useLeadsByStatus, useLeadsBySource, LEADS_QUERY_KEY } from './useLeads';
