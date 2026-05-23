import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '../NavLink';
import { Loader2 } from 'lucide-react';
import GradientLink from '../ui/GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';

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
  const { trackCTAClick } = useCTATracking();

  useEffect(() => {
    loadCasClients();
  }, []);

  const loadCasClients = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, content, created_at')
        .eq('resource_type', 'cas-client')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      setCasClients(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des cas clients:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <section id="exemples" className="relative py-20 md:py-28 bg-primary text-primary-foreground overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl"
      />
      <div className="container mx-auto px-6 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
              Nos derniers projets
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-extrabold leading-[1.05] tracking-tight max-w-2xl">
              Impact concret,
              <br />
              <span className="text-accent">résultats mesurés.</span>
            </h2>
          </div>
          <p className="text-primary-foreground/60 max-w-sm leading-relaxed">
            Comment nous avons transformé les processus métiers de PME et ETI françaises grâce à des agents IA sur-mesure.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-primary-foreground/10 border border-primary-foreground/10 rounded-2xl overflow-hidden">
            {casClients.map((casClient, index) => (
              <NavLink key={casClient.id} to={`/cas-clients/${casClient.slug}`}>
                <article className="group h-full bg-primary p-8 md:p-10 hover:bg-primary-foreground/[0.04] transition-colors cursor-pointer flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-5xl font-black text-primary-foreground/10 tabular-nums leading-none">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">
                      Cas client
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold leading-snug mb-4 group-hover:text-accent transition-colors">
                    {casClient.title}
                  </h3>
                  {casClient.excerpt && (
                    <p className="text-sm text-primary-foreground/60 leading-relaxed mb-8 flex-1">
                      {casClient.excerpt}
                    </p>
                  )}
                  <div>
                    <GradientLink
                      href={`/cas-clients/${casClient.slug}`}
                      onClick={() =>
                        trackCTAClick("voir_projet", "exemples_section", casClient.slug)
                      }
                      className="!text-primary-foreground/80 hover:!text-accent text-xs font-semibold uppercase tracking-[0.2em] border-b border-primary-foreground/20 pb-1 inline-flex items-center gap-2"
                    >
                      Voir le cas d&apos;étude
                      <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
                    </GradientLink>
                  </div>
                </article>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ExemplesSection;
