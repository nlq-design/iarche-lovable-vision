import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { supabase } from '@/integrations/supabase/client';
import GradientLink from '@/components/ui/GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';
import GradientTitle from '@/components/ui/GradientTitle';
import { Loader2 } from 'lucide-react';
import ArticlePlaceholder from '@/components/ui/ArticlePlaceholder';
import ResourceCard from '@/components/ui/ResourceCard';

interface Solution {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  created_at: string;
}

const Solutions = () => {
  const { trackCTAClick } = useCTATracking();
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSolutions();
  }, []);

  const loadSolutions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, created_at')
      .eq('published', true)
      .eq('resource_type', 'solution')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors du chargement des solutions:', error);
    } else {
      setSolutions(data || []);
    }
    setLoading(false);
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <html lang="fr" />
        <link rel="alternate" hrefLang="fr" href="https://iarche.fr/solutions" />
        <title>Nos solutions · IArche · SaaS IA pour PME</title>
        <meta name="description" content="Solutions IA développées par IArche : Team 5 Connect, Lexia, Dialogue Plus. Ce qu'on conseille, on le construit aussi." />
        <link rel="canonical" href="https://iarche.fr/solutions" />
        <meta property="og:title" content="Nos solutions · IArche · SaaS IA pour PME" />
        <meta property="og:description" content="Solutions IA développées par IArche : Team 5 Connect, Lexia, Dialogue Plus." />
        <meta property="og:url" content="https://iarche.fr/solutions" />
        <meta property="og:type" content="website" />

        {/* Schema.org BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Accueil",
                "item": "https://iarche.fr/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Solutions",
                "item": "https://iarche.fr/solutions"
              }
            ]
          })}
        </script>
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <GradientTitle size="lg" className="mb-6 animate-fadeIn [animation-delay:0.1s]">
              Nos solutions
            </GradientTitle>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              <span className="hero-gradient-text">IArche</span> déploie des solutions SaaS conçues à partir de besoins concrets identifiés sur le terrain.
            </p>
          </div>

          {/* CTA en-tête */}
          <div className="text-center mb-10 animate-fadeIn [animation-delay:0.3s]">
            <GradientLink 
              href="/contact" 
              className="text-lg"
              onClick={() => trackCTAClick('en_savoir_plus', 'solutions_page_top')}
            >
              Je veux en savoir plus
            </GradientLink>
          </div>

          {/* Liste des solutions */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : solutions.length === 0 ? (
            <div className="text-center py-20">
              <ArticlePlaceholder />
              <p className="text-muted-foreground mt-4">
                Aucune solution disponible pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {solutions.map((solution, index) => (
                <ResourceCard
                  key={solution.id}
                  id={solution.id}
                  title={solution.title}
                  slug={solution.slug}
                  excerpt={solution.excerpt}
                  coverImageUrl={solution.cover_image_url}
                  createdAt={solution.created_at}
                  basePath="/solutions"
                  index={index}
                  showDate={false}
                  showArc={true}
                  arcSize="sm"
                  onClick={() => trackCTAClick('solution_card', 'solutions_page', solution.slug)}
                />
              ))}
            </div>
          )}

          {/* CTA bas de page */}
          <div className="text-center mt-12 animate-fadeIn [animation-delay:0.8s]">
            <p className="text-lg text-foreground mb-6">
              Envie de créer votre propre solution ?
            </p>
            <GradientLink 
              href="/contact" 
              className="text-lg"
              onClick={() => trackCTAClick('discuter_projet', 'solutions_page_bottom')}
            >
              Discuter de votre projet
            </GradientLink>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Solutions;
