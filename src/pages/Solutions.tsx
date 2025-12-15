import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import GradientLink from '@/components/ui/GradientLink';
import IArcheLink from '@/components/ui/IArcheLink';
import { useCTATracking } from '@/hooks/useCTATracking';
import LogoArc from '@/components/ui/LogoArc';
import { Loader2 } from 'lucide-react';
import ArticlePlaceholder from '@/components/ui/ArticlePlaceholder';

interface Solution {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
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
      .select('id, title, slug, excerpt')
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
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Nos solutions
            </h1>
            <LogoArc size="md" className="mx-auto mb-6 animate-fadeIn [animation-delay:0.15s]" />
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              <span className="hero-gradient-text">IArche</span> déploie des solutions SaaS conçues à partir de besoins concrets identifiés sur le terrain.
            </p>
          </div>

          {/* SaaS IArche */}
          <div className="mb-12 pb-8">
            <div className="text-center mb-8 animate-fadeIn [animation-delay:0.3s]">
              <GradientLink 
                href="/contact" 
                className="text-lg"
                onClick={() => trackCTAClick('en_savoir_plus', 'solutions_page_top')}
              >
                Je veux en savoir plus
              </GradientLink>
            </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {solutions.map((solution, index) => (
                  <Card 
                    key={solution.id}
                    className="animate-fadeIn hover:shadow-lg transition-shadow duration-300"
                    style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl text-foreground">
                        {solution.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {solution.excerpt && (
                        <p className="text-muted-foreground mb-4">
                          {solution.excerpt}
                        </p>
                      )}
                      <IArcheLink 
                        href={`/solutions/${solution.slug}`}
                        onClick={() => trackCTAClick('en_savoir_plus_solution', 'solutions_page', solution.slug)}
                      >
                        Découvrir {solution.title}
                      </IArcheLink>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="text-center mt-4 animate-fadeIn [animation-delay:1.6s]">
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
