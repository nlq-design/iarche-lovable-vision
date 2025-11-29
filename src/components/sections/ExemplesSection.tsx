import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";

interface CasClient {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  created_at: string;
}

const ExemplesSection = () => {
  const [casClients, setCasClients] = useState<CasClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCasClients = async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, created_at')
        .eq('resource_type', 'cas-client')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) setCasClients(data);
      if (error) console.error('Error fetching cas clients:', error);
      setLoading(false);
    };
    
    fetchCasClients();
  }, []);
  if (loading) {
    return (
      <section id="exemples" className="py-8 md:py-12 bg-muted">
        <div className="container mx-auto px-6">
          <h2 className="text-lg md:text-xl font-semibold text-primary text-center mb-8 md:mb-12">
            Nos derniers projets
          </h2>
          <div className="max-w-4xl mx-auto space-y-6">
            <p className="text-center text-muted-foreground">Chargement des projets...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="exemples" className="py-8 md:py-12 bg-muted">
      <div className="container mx-auto px-6">
        <h2 className="text-lg md:text-xl font-semibold text-primary text-center mb-8 md:mb-12">
          Nos derniers projets
        </h2>
        <div className="max-w-4xl mx-auto space-y-6 invisible animate-fadeIn [animation-delay:0.2s]">
          {casClients.map((casClient) => {
            const [secteur, realisation] = casClient.title.split(' — ');
            return (
              <NavLink 
                key={casClient.id}
                to={`/cas-clients/${casClient.slug}`}
                className="block"
              >
                <div className="bg-background border border-border rounded-lg p-6 hover:border-accent transition-colors duration-300">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                          {secteur}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-primary mb-2">
                        {realisation}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {casClient.excerpt}
                      </p>
                    </div>
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExemplesSection;
