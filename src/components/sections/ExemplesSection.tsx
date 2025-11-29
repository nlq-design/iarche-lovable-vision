import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '../NavLink';
import { Loader2 } from 'lucide-react';
import GradientLink from '../ui/GradientLink';

interface CasClient {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
}

const ExemplesSection = () => {
  const [casClients, setCasClients] = useState<CasClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCasClients();
  }, []);

  const loadCasClients = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, content')
        .eq('resource_type', 'cas-client')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setCasClients(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des cas clients:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <section id="exemples" className="py-8 md:py-12 bg-muted">
      <div className="container mx-auto px-6">
        <div className="rounded-lg p-8 md:p-10">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-8 md:mb-12">
              Nos derniers projets
            </h2>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6 invisible animate-fadeIn [animation-delay:0.2s]">
                {casClients.map((casClient, index) => (
                  <NavLink key={casClient.id} to={`/cas-clients/${casClient.slug}`}>
                    <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[length:100%_100%] transition-all duration-500 cursor-pointer group">
                      <div 
                        className="bg-background rounded-lg p-6 h-full"
                      >
                        <div className="flex flex-col gap-3">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {casClient.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {casClient.excerpt}
                          </p>
                          <div className="pt-2">
                            <GradientLink href={`/cas-clients/${casClient.slug}`}>
                              Voir le projet
                            </GradientLink>
                          </div>
                        </div>
                      </div>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}
        </div>
      </div>
    </section>
  );
};

export default ExemplesSection;
