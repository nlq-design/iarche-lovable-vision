-- Table pour stocker les métriques de performance
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Lighthouse scores (0-100)
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  accessibility_score INTEGER CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
  best_practices_score INTEGER CHECK (best_practices_score >= 0 AND best_practices_score <= 100),
  seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
  
  -- Core Web Vitals (en millisecondes ou secondes)
  fcp DECIMAL(10,2), -- First Contentful Paint (seconds)
  lcp DECIMAL(10,2), -- Largest Contentful Paint (seconds)
  tti DECIMAL(10,2), -- Time to Interactive (seconds)
  tbt INTEGER, -- Total Blocking Time (ms)
  cls DECIMAL(10,3), -- Cumulative Layout Shift (ratio)
  
  -- Bundle sizes (en KB)
  bundle_size_js INTEGER, -- Taille JS principal
  bundle_size_css INTEGER, -- Taille CSS
  bundle_size_total INTEGER, -- Taille totale
  
  -- Metadata
  environment TEXT DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'local')),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id)
);

-- Index pour requêtes chronologiques
CREATE INDEX idx_performance_metrics_recorded_at ON public.performance_metrics(recorded_at DESC);
CREATE INDEX idx_performance_metrics_environment ON public.performance_metrics(environment);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policies : seuls les admins peuvent gérer les métriques
CREATE POLICY "Admins can view performance metrics"
  ON public.performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert performance metrics"
  ON public.performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update performance metrics"
  ON public.performance_metrics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete performance metrics"
  ON public.performance_metrics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );