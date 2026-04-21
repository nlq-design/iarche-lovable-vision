/**
 * Types stricts pour la transformation content_json → HTML email-safe (Brevo).
 * Reflète la structure stockée dans `generated_documents.content_json` pour les
 * documents de type 'invitation'.
 */

export interface InvitationMetadata {
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventType?: string;
  organizerName?: string;
  footerText?: string;
  qrTitle?: string;
  qrDescription?: string;
}

export interface InvitationSection {
  id: string;
  order: number;
  title: string;
  /** HTML brut (issu de l'éditeur contentEditable). Doit être sanitizé avant injection email. */
  content: string;
}

export interface ProgrammeRow {
  horaire: string;
  theme: string;
  intervenant: string;
}

export interface InvitationModules {
  programme?: {
    rows: ProgrammeRow[];
  };
}

export interface InvitationContentJson {
  metadata: InvitationMetadata;
  sections: InvitationSection[];
  modules?: InvitationModules;
}

export interface BuildEmailHtmlOptions {
  /** URL publique complète de l'événement, ex: https://iarche.fr/evenements/mon-event */
  publicUrl: string;
  /** Optionnel : URL publique du QR code (Supabase Storage). Si absent, le bloc QR est masqué. */
  qrCodeUrl?: string;
}
