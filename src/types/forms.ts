// =============================================
// TYPES DE CHAMPS
// =============================================
export type FieldType = 
  | 'text'        // Texte court
  | 'textarea'    // Texte long
  | 'email'       // Email avec validation
  | 'phone'       // Téléphone FR
  | 'number'      // Nombre
  | 'date'        // Date picker
  | 'time'        // Heure
  | 'datetime'    // Date + heure
  | 'radio'       // Choix unique
  | 'checkbox'    // Choix multiple
  | 'select'      // Liste déroulante
  | 'file'        // Upload fichier
  | 'rating'      // Étoiles 1-5
  | 'scale'       // Échelle slider
  | 'boolean'     // Oui/Non toggle
  | 'signature'   // Signature canvas
  | 'rgpd'        // Consentement RGPD
  | 'heading'     // Titre de section (non-input)
  | 'paragraph'   // Texte explicatif (non-input)
  | 'divider';    // Séparateur visuel (non-input)

// =============================================
// STRUCTURE D'UN CHAMP
// =============================================
export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
}

export interface ConditionalLogic {
  enabled: boolean;
  action: 'show' | 'hide';
  conditions: Array<{
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'is_empty' | 'is_not_empty';
    value: string;
  }>;
  logicType: 'and' | 'or';
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  
  // Options pour radio, checkbox, select
  options?: FormFieldOption[];
  
  // Contraintes numériques
  min?: number;
  max?: number;
  step?: number;
  
  // Contraintes texte
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Options fichier
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  
  // Options rating/scale
  minLabel?: string;
  maxLabel?: string;
  
  // Valeur par défaut
  defaultValue?: any;
  
  // Logique conditionnelle
  conditionalLogic?: ConditionalLogic;
  
  // Style personnalisé
  width?: 'full' | 'half' | 'third';
  className?: string;
}

// =============================================
// PARAMÈTRES DU FORMULAIRE
// =============================================
export interface FormDesignSettings {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  logo?: string;
  showGradientBar: boolean;
  barSize: 'sm' | 'md' | 'lg' | 'xl';
  showCanalisations: boolean;
  fontFamily?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg';
}

export interface FormThankYouSettings {
  message: string;
  redirectUrl?: string;
  redirectDelay?: number;
  showSocialShare?: boolean;
}

export interface FormNotificationSettings {
  adminEmail?: string;
  adminEmailCc?: string[];
  sendToRespondent: boolean;
  respondentEmailField?: string;
  customSubject?: string;
  customMessage?: string;
  includeResponsePdf?: boolean;
}

export interface FormIntegrationSettings {
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
}

export interface FormRGPDSettings {
  retentionDays: number;
  autoPurge: boolean;
  showPrivacyLink?: boolean;
  privacyUrl?: string;
}

export interface FormBehaviorSettings {
  showProgressBar?: boolean;
  allowSaveProgress?: boolean;
  requireCaptcha?: boolean;
  limitOneResponse?: boolean;
  closeDate?: string;
  maxResponses?: number;
}

export interface FormSettings {
  design: FormDesignSettings;
  thankYou: FormThankYouSettings;
  notifications: FormNotificationSettings;
  integrations: FormIntegrationSettings;
  rgpd: FormRGPDSettings;
  behavior?: FormBehaviorSettings;
}

// =============================================
// FORMULAIRE COMPLET
// =============================================
export interface Form {
  id: string;
  title: string;
  slug: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  qr_code_url?: string;
  views_count: number;
  submissions_count: number;
}

// =============================================
// RÉPONSE
// =============================================
export interface FormResponseMetadata {
  ip?: string;
  userAgent?: string;
  source?: string;
  referrer?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  country?: string;
  submittedAt?: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  data: Record<string, any>;
  metadata: FormResponseMetadata;
  submitted_at: string;
  is_complete: boolean;
  partial_data?: Record<string, any>;
}

// =============================================
// ANALYTICS
// =============================================
export type FormEventType = 'view' | 'start' | 'field_focus' | 'field_blur' | 'drop' | 'submit';

export interface FormAnalyticsEvent {
  id: string;
  form_id: string;
  event_type: FormEventType;
  field_id?: string;
  step?: number;
  session_id?: string;
  created_at: string;
}

export interface FormAnalytics {
  formId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    views: number;
    starts: number;
    submissions: number;
    conversionRate: number;
    completionRate: number;
    averageTime: number;
  };
  dropOff: {
    byField: Record<string, number>;
    byStep: Record<number, number>;
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  sources: Record<string, number>;
}

// =============================================
// EXPORT OPTIONS
// =============================================
export interface FormExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  includeMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  fields?: string[];
}

export interface ResponsePdfOptions {
  mode: 'simple' | 'avec-barre' | 'complet';
  barSize: 'sm' | 'md' | 'lg' | 'xl';
  showLogo: boolean;
  showMetadata: boolean;
}

// =============================================
// DEFAULT SETTINGS
// =============================================
export const DEFAULT_FORM_SETTINGS: FormSettings = {
  design: {
    colors: {
      primary: '#1A2B4A',
      secondary: '#D15A3E',
      background: '#FAF9F7',
      text: '#4A5568'
    },
    showGradientBar: true,
    barSize: 'lg',
    showCanalisations: false,
    borderRadius: 'md'
  },
  thankYou: {
    message: 'Merci pour votre réponse ! Nous reviendrons vers vous rapidement.',
    showSocialShare: false
  },
  notifications: {
    sendToRespondent: false,
    includeResponsePdf: false
  },
  integrations: {},
  rgpd: {
    retentionDays: 365,
    autoPurge: false,
    showPrivacyLink: true
  },
  behavior: {
    showProgressBar: true,
    allowSaveProgress: false,
    requireCaptcha: false,
    limitOneResponse: false
  }
};

// =============================================
// FIELD TYPE METADATA
// =============================================
export const FIELD_TYPE_INFO: Record<FieldType, { 
  label: string; 
  icon: string; 
  category: string;
  isInput: boolean;
}> = {
  text: { label: 'Texte court', icon: 'Type', category: 'Texte', isInput: true },
  textarea: { label: 'Texte long', icon: 'AlignLeft', category: 'Texte', isInput: true },
  email: { label: 'Email', icon: 'Mail', category: 'Contact', isInput: true },
  phone: { label: 'Téléphone', icon: 'Phone', category: 'Contact', isInput: true },
  number: { label: 'Nombre', icon: 'Hash', category: 'Nombre', isInput: true },
  date: { label: 'Date', icon: 'Calendar', category: 'Nombre', isInput: true },
  time: { label: 'Heure', icon: 'Clock', category: 'Nombre', isInput: true },
  datetime: { label: 'Date & Heure', icon: 'CalendarClock', category: 'Nombre', isInput: true },
  radio: { label: 'Choix unique', icon: 'CircleDot', category: 'Choix', isInput: true },
  checkbox: { label: 'Choix multiple', icon: 'CheckSquare', category: 'Choix', isInput: true },
  select: { label: 'Liste déroulante', icon: 'ChevronDown', category: 'Choix', isInput: true },
  boolean: { label: 'Oui/Non', icon: 'ToggleLeft', category: 'Choix', isInput: true },
  file: { label: 'Fichier', icon: 'Upload', category: 'Avancé', isInput: true },
  rating: { label: 'Note', icon: 'Star', category: 'Avancé', isInput: true },
  scale: { label: 'Échelle', icon: 'Sliders', category: 'Avancé', isInput: true },
  signature: { label: 'Signature', icon: 'PenTool', category: 'Avancé', isInput: true },
  rgpd: { label: 'Consentement RGPD', icon: 'Shield', category: 'Légal', isInput: true },
  heading: { label: 'Titre', icon: 'Heading', category: 'Mise en page', isInput: false },
  paragraph: { label: 'Paragraphe', icon: 'FileText', category: 'Mise en page', isInput: false },
  divider: { label: 'Séparateur', icon: 'Minus', category: 'Mise en page', isInput: false },
};

export const FIELD_CATEGORIES = ['Texte', 'Contact', 'Nombre', 'Choix', 'Avancé', 'Mise en page', 'Légal'] as const;
