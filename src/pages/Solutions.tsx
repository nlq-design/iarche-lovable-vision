import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BackgroundLayout from "@/components/layouts/BackgroundLayout";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet";
import BreadcrumbNav from "@/components/ui/BreadcrumbNav";
import ArticlePlaceholder from "@/components/ui/ArticlePlaceholder";

interface Solution {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const Solutions = () => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSolutions();
  }, []);

  const loadSolutions = async () => {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, cover_image_url, published_at, created_at")
      .eq("resource_type", "solution")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error loading solutions:", error);
    } else {
      setSolutions(data || []);
    }
    setLoading(false);
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <html lang="fr" />
        <title>Nos solutions IA - Projets et réalisations | IArche</title>
        <meta
          name="description"
          content="Découvrez nos solutions IA pour PME : analyse pricing, automatisation logistique, réponse appels d'offres, gestion associative et chatbot vocal."
        />
        <link rel="canonical" href="https://iarche.fr/solutions" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-6 pt-32 pb-16 min-h-screen">
        <BreadcrumbNav />

        <div className="max-w-6xl mx-auto">
          {/* Header enrichi */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6 invisible animate-fadeIn [animation-delay:0.1s]">
              Nos solutions IA
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Projets concrets, résultats mesurables. Découvrez comment l'IA transforme les PME.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : solutions.length === 0 ? (
            <div className="text-center py-20">
              <ArticlePlaceholder className="max-w-md mx-auto mb-6" />
              <p className="text-muted-foreground text-lg">
                Aucune solution disponible pour le moment
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Nos premières solutions seront bientôt présentées
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {solutions.map((solution, index) => {
                const [secteur, realisation] = solution.title.split(' — ');
                return (
                  <NavLink
                    key={solution.id}
                    to={`/solutions/${solution.slug}`}
                    className="group block invisible animate-fadeIn"
                    style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  >
                    <Card className="h-full overflow-hidden hover:shadow-lg hover:border-accent transition-all duration-300">
                      {/* Image ou placeholder */}
                      {solution.cover_image_url ? (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={solution.cover_image_url}
                            alt={solution.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video">
                          <ArticlePlaceholder />
                        </div>
                      )}

                      {/* Contenu */}
                      <div className="p-6">
                        {/* Badge secteur */}
                        <div className="mb-3">
                          <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                            {secteur}
                          </span>
                        </div>

                        {/* Titre */}
                        <h2 className="text-xl font-semibold text-primary mb-3 group-hover:text-accent transition-colors line-clamp-2">
                          {realisation}
                        </h2>

                        {/* Excerpt */}
                        {solution.excerpt && (
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                            {solution.excerpt}
                          </p>
                        )}

                        {/* CTA */}
                        <div className="flex items-center text-sm text-accent font-medium group-hover:translate-x-2 transition-transform duration-300">
                          <span>Découvrir le projet</span>
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      </div>
                    </Card>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default Solutions;
