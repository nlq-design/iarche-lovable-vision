import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { supabase } from '@/integrations/supabase/client';
import GradientLink from '@/components/ui/GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';
import { Loader2, ArrowUpRight, ArrowRight } from 'lucide-react';
import { Section, Reveal, SectionTitle, SolidCard } from '@/components/brand';

interface SolutionItem {
  landing_url: string | null;
  is_external: boolean;
  status: string;
  logo_url: string | null;
  short_pitch: string | null;
  featured: boolean;
  display_order: number;
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
  } | null;
}

const Solutions = () => {
  const { trackCTAClick } = useCTATracking();
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSolutions();
  }, []);

  const loadSolutions = async () => {
    setLoading(true);
    // Source de vérité : solution_meta (catalogue) ⨝ articles (contenu publié).
    const { data, error } = await supabase
      .from('solution_meta')
      .select(
        'landing_url, is_external, status, logo_url, short_pitch, featured, display_order, articles!inner(id, title, slug, excerpt, published, resource_type)'
      )
      .eq('articles.published', true)
      .eq('articles.resource_type', 'solution')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Erreur lors du chargement des solutions:', error);
    } else {
      const mapped = (data || []).map((row: any) => ({
        landing_url: row.landing_url,
        is_external: row.is_external,
        status: row.status,
        logo_url: row.logo_url,
        short_pitch: row.short_pitch,
        featured: row.featured,
        display_order: row.display_order,
        article: Array.isArray(row.articles) ? row.articles[0] : row.articles,
      })) as SolutionItem[];
      setSolutions(mapped.filter((s) => s.article));
    }
    setLoading(false);
  };

  // Schema.org ItemList des solutions (SoftwareApplication) pour le SEO du hub.
  const absolute = (url: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `https://iarche.fr${url}`;
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Solutions IArche',
    itemListElement: solutions.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: s.article?.title,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: absolute(s.landing_url),
        description: s.short_pitch || s.article?.excerpt || undefined,
      },
    })),
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <html lang="fr" />
        <link rel="alternate" hrefLang="fr" href="https://iarche.fr/solutions" />
        <title>Nos solutions · IArche · SaaS IA souverains pour PME</title>
        <meta
          name="description"
          content="Les solutions SaaS souveraines IArche : Cockpit, ALMA, Anomia, Pléiades. Conçues, construites et opérées par IArche, à Bayonne."
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="IArche" />
        <meta name="keywords" content="solutions IA, SaaS souverain, PME, Cockpit, ALMA, Anomia, Pléiades, IArche" />
        <link rel="canonical" href="https://iarche.fr/solutions" />

        <meta property="og:title" content="Nos solutions · IArche · SaaS IA souverains" />
        <meta property="og:description" content="Cockpit, ALMA, Anomia, Pléiades — les plateformes SaaS souveraines d'IArche." />
        <meta property="og:url" content="https://iarche.fr/solutions" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og/solutions.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Nos solutions · IArche" />
        <meta name="twitter:description" content="Les plateformes SaaS souveraines d'IArche." />
        <meta name="twitter:image" content="https://iarche.fr/og/solutions.png" />

        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://iarche.fr/' },
              { '@type': 'ListItem', position: 2, name: 'Solutions', item: 'https://iarche.fr/solutions' },
            ],
          })}
        </script>
        {!loading && solutions.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        )}
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen">
        {/* Hero — ton sombre */}
        <Section tone="dark" spacing="hero">
          <SectionTitle
            as="h1"
            center
            eyebrow="Nos plateformes"
            lede="Au-delà du sur-mesure, IArche conçoit ses propres solutions SaaS souveraines — pensées, construites et opérées en interne."
          >
            Les <em>solutions</em> IArche.
          </SectionTitle>
        </Section>

        {/* Catalogue — ton clair */}
        <Section tone="light">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : solutions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Aucune solution disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {solutions.map((s, index) => {
                const art = s.article!;
                const isSoon = s.status === 'soon';
                const href = s.landing_url || '#';
                const pitch = s.short_pitch || art.excerpt || '';
                const inner = (
                  <SolidCard num={String(index + 1).padStart(2, '0')} className="h-full">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="!mb-0">{art.title}</h3>
                      {isSoon && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          Bientôt
                        </span>
                      )}
                    </div>
                    {pitch && <p>{pitch}</p>}
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:text-[hsl(var(--accent-deep))] transition-colors">
                      {s.is_external ? 'Visiter la solution' : 'Accéder'}
                      {s.is_external ? (
                        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      )}
                    </span>
                  </SolidCard>
                );

                const onClick = () => trackCTAClick('solution_card', 'solutions_page', art.slug);

                return (
                  <Reveal key={art.id} delay={index * 80}>
                    {s.is_external ? (
                      <a
                        href={href}
                        onClick={onClick}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block h-full"
                        aria-label={`${art.title} — ouvrir la solution (nouvel onglet)`}
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link to={href} onClick={onClick} className="group block h-full">
                        {inner}
                      </Link>
                    )}
                  </Reveal>
                );
              })}
            </div>
          )}

          {/* CTA bas de page */}
          <div className="text-center mt-14">
            <p className="text-lg text-foreground mb-6">Envie de créer votre propre solution ?</p>
            <GradientLink
              href="/contact"
              className="text-lg"
              onClick={() => trackCTAClick('discuter_projet', 'solutions_page_bottom')}
            >
              Discuter de votre projet
            </GradientLink>
          </div>
        </Section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default Solutions;
