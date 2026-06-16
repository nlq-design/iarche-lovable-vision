-- ════════════════════════════════════════════════════════════════════════
-- solution_meta — fait de articles[resource_type='solution'] une ENTITÉ PRODUIT
-- de 1ère classe (catalogue), SANS casser les ~12 satellites qui référencent
-- déjà articles.id (opportunities, projects, solution_leads, solution_partners,
-- tickets, nps_responses, product_features, onboarding_milestones, ...).
--
-- Additif et réversible : DROP TABLE public.solution_meta; suffit à annuler la
-- partie schéma. Les 4 lignes seedées sont identifiables par leur slug.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Table compagnon 1:1 de la solution (= l'article correspondant)
CREATE TABLE IF NOT EXISTS public.solution_meta (
  solution_id   uuid PRIMARY KEY REFERENCES public.articles(id) ON DELETE CASCADE,
  landing_url   text,                         -- destination canonique (interne "/cockpit" ou "https://x.iarche.fr")
  is_external   boolean     NOT NULL DEFAULT true,   -- true = sous-domaine externe, false = route interne iarche.fr
  status        text        NOT NULL DEFAULT 'soon' CHECK (status IN ('live','soon','internal')),
  logo_url      text,
  accent_color  text,                         -- accent de marque de la solution (hex)
  short_pitch   text,                         -- baseline courte affichée sur le hub
  display_order integer     NOT NULL DEFAULT 100,
  featured      boolean     NOT NULL DEFAULT false,
  og_image_url  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solution_meta_order ON public.solution_meta(display_order);

DROP TRIGGER IF EXISTS trg_solution_meta_updated_at ON public.solution_meta;
CREATE TRIGGER trg_solution_meta_updated_at
  BEFORE UPDATE ON public.solution_meta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) RLS : lecture publique (c'est un catalogue), écriture réservée aux admins
ALTER TABLE public.solution_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read solution_meta" ON public.solution_meta;
CREATE POLICY "Public can read solution_meta"
  ON public.solution_meta FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage solution_meta" ON public.solution_meta;
CREATE POLICY "Admins manage solution_meta"
  ON public.solution_meta FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Nouveau catalogue : Cockpit, Pléiades, ALMA, Anomia (idempotent via slug)
--    NB : URLs/statuts ci-dessous = valeurs de départ, ÉDITABLES depuis l'admin.
INSERT INTO public.articles (title, slug, content, excerpt, resource_type, published, published_at)
VALUES
  ('Cockpit by IArche', 'cockpit',  'Le cockpit commercial augmenté à l''IA.',            'CRM et pilotage commercial augmentés à l''IA, pour indépendants et équipes ambitieuses.', 'solution', true, now()),
  ('Pléiades',          'pleiades', 'Pléiades — solution IArche.',                         'À venir.',                                                                                'solution', true, now()),
  ('ALMA',              'alma',     'ALMA — agent de marque & RAG avancé.',                'Agent conversationnel de marque, RAG avancé, par IArche.',                                'solution', true, now()),
  ('Anomia',            'anomia',   'Anomia — solution IArche.',                           'À venir.',                                                                                'solution', true, now())
ON CONFLICT (slug) DO NOTHING;

-- 4) Métadonnées produit de chaque solution (idempotent)
INSERT INTO public.solution_meta (solution_id, landing_url, is_external, status, display_order, featured, short_pitch)
SELECT a.id, v.landing_url, v.is_external, v.status, v.display_order, v.featured, v.short_pitch
FROM (VALUES
  ('cockpit',  '/cockpit',                  false, 'live', 10, true,  'Le cockpit commercial augmenté à l''IA'),
  ('alma',     'https://alma.iarche.fr',     true, 'live', 20, false, 'L''agent de marque & RAG avancé'),
  ('anomia',   'https://anomia.iarche.fr',   true, 'soon', 30, false, 'Bientôt disponible'),
  ('pleiades', 'https://pleiades.iarche.fr', true, 'soon', 40, false, 'Bientôt disponible')
) AS v(slug, landing_url, is_external, status, display_order, featured, short_pitch)
JOIN public.articles a ON a.slug = v.slug AND a.resource_type = 'solution'
ON CONFLICT (solution_id) DO NOTHING;
