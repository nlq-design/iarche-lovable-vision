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

export interface Brochure {
  id: string;
  slug: string;
  title: string;
  cover_title: string;
  cover_subtitle?: string;
  cover_image_url?: string;
  sections: BrochureSections;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export const defaultSections: BrochureSections = {
  introduction: { enabled: true, content: '' },
  keyPoints: { enabled: true, points: [] },
  details: { enabled: false, content: '', features: [] },
  pricing: { enabled: false, title: 'Nos formules', plans: [] },
  testimonial: { enabled: false, quote: '', author: '', company: '' },
  contact: { enabled: true, cta_text: 'Nous contacter', show_coordinates: true },
};
