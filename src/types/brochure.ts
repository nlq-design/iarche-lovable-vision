export interface BrochureKeyPoint {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface BrochurePricingPlan {
  id: string;
  name: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
}

export interface BrochureCTA {
  enabled: boolean;
  title: string;
  description: string;
  button_text: string;
  button_url: string;
}

export interface BrochureSections {
  introduction: {
    enabled: boolean;
    content: string;
  };
  keyPoints: {
    enabled: boolean;
    points: BrochureKeyPoint[];
  };
  details: {
    enabled: boolean;
    content: string;
    features: string[];
  };
  cta: BrochureCTA;
  pricing: {
    enabled: boolean;
    title: string;
    plans: BrochurePricingPlan[];
  };
  testimonial: {
    enabled: boolean;
    quote: string;
    author: string;
    company: string;
  };
  contact: {
    enabled: boolean;
    cta_text: string;
    show_coordinates: boolean;
  };
}

export interface BrochureCustomColors {
  primary?: string | null;
  accent?: string | null;
}

export type WebScrollDirection = 'vertical' | 'horizontal';
export type PDFOrientation = 'portrait' | 'landscape';

export interface BrochureExportSettings {
  web_scroll: WebScrollDirection;
  pdf_orientation: PDFOrientation;
  pdf_auto_pagination: boolean;
}

export interface Brochure {
  id: string;
  slug: string;
  title: string;
  cover_title: string;
  cover_subtitle?: string;
  cover_image_url?: string;
  sections: BrochureSections;
  published: boolean;
  views_count: number;
  custom_colors?: BrochureCustomColors;
  export_settings?: BrochureExportSettings;
  created_at: string;
  updated_at: string;
}

export const defaultSections: BrochureSections = {
  introduction: { enabled: true, content: '' },
  keyPoints: { enabled: true, points: [] },
  details: { enabled: false, content: '', features: [] },
  cta: { enabled: false, title: '', description: '', button_text: 'Prendre rendez-vous', button_url: '' },
  pricing: { enabled: false, title: 'Nos formules', plans: [] },
  testimonial: { enabled: false, quote: '', author: '', company: '' },
  contact: { enabled: true, cta_text: 'Nous contacter', show_coordinates: true },
};

export const defaultExportSettings: BrochureExportSettings = {
  web_scroll: 'vertical',
  pdf_orientation: 'portrait',
  pdf_auto_pagination: true,
};
