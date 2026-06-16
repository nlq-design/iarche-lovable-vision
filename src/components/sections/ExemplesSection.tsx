import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '../NavLink';
import { Loader2 } from 'lucide-react';
import { useCTATracking } from '@/hooks/useCTATracking';
import { Section, SectionTitle, GlassCard, Reveal } from '@/components/brand';

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

  if (!loading && casClients.length === 0) return null;

  return (
    <Section tone="dark" id="exemples">
      <div className="flex flex-col items-center text-center">
        <SectionTitle
          center
          eyebrow="04 — La preuve"
          lede="Pas de promesses en l'air : des cas réels, sur le terrain, chez des dirigeants comme vous."
        >
          La preuve par <em>le terrain.</em>
        </SectionTitle>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent-soft))]" />
        </div>
      ) : (
        <div className="mt-12 grid gap-[18px] grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto">
          {casClients.map((casClient, index) => (
            <Reveal key={casClient.id} delay={index * 80}>
              <NavLink to={`/cas-clients/${casClient.slug}`}>
                <GlassCard num={String(index + 1).padStart(2, '0')} className="h-full cursor-pointer">
                  <h3>{casClient.title}</h3>
                  <p>{casClient.excerpt}</p>
                  <div className="mt-4">
                    <span
                      onClick={(e) => { e.preventDefault(); trackCTAClick('voir_projet', 'exemples_section', casClient.slug); }}
                      className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--accent-soft))] group-hover:text-[hsl(var(--cream))]"
                    >
                      Voir le projet
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </GlassCard>
              </NavLink>
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  );
};

export default ExemplesSection;
