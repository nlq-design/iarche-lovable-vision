import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '../NavLink';
import { Loader2 } from 'lucide-react';

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
        <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]">
          <div className="bg-muted rounded-lg p-8 md:p-10">
            <h2 className="text-lg md:text-xl font-semibold text-primary text-center mb-8 md:mb-12">
              Nos derniers projets
            </h2>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn opacity-0 [animation-delay:0.2s]" style={{ animationFillMode: 'forwards' }}>
            {casClients.map((casClient, index) => (
              <NavLink key={casClient.id} to={`/cas-clients/${casClient.slug}`}>
                <div className="relative rounded-lg p-[2px] gradient-border-animated cursor-pointer group">
                  <div 
                    className="bg-background rounded-lg p-6 h-full transition-all duration-300 group-hover:shadow-[0_10px_40px_hsla(var(--primary)/0.2)] group-hover:scale-[1.02] group-hover:-translate-y-0.5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                            {casClient.title}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-primary mb-2">
                          {casClient.excerpt}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {casClient.content}
                        </p>
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
      </div>
    </section>
  );
};

export default ExemplesSection;
