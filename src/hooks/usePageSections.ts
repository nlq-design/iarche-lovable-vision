import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FALLBACKS: Record<string, Record<string, string>> = {
  'iarche-labs': {
    hero_title: 'Construis ton SaaS en 5 jours. À Bayonne.',
    hero_subtitle: 'Une semaine intensive à Bayonne. Tu arrives avec une idée. Tu repars avec un produit en production.',
    cible_1_titre: 'Consultant expert',
    cible_1_texte: 'Tu vends ton temps. Tu veux vendre un outil.',
    cible_2_titre: 'Entrepreneur en pivot',
    cible_2_texte: 'Tu as un projet. Tu veux le tester vite, sans 6 mois de dev.',
    cible_3_titre: 'Porteur de MVP',
    cible_3_texte: "Tu veux valider avant d'investir 50k€ en agence.",
    formule_titre: 'Une formule, un engagement.',
    formule_nom: 'Semaine Intensive SaaS',
    formule_sous_titre: "Tarif sur devis — échangeons d'abord.",
    lieu_texte: 'Nos locaux à Bayonne, Pays Basque. Espace de travail dédié.',
    formulaire_titre: 'Candidater',
    formulaire_sous_titre: 'On revient vers toi sous 48h pour un premier échange.',
  },
};

export function usePageSections(pageSlug: string) {
  const [sections, setSections] = useState<Record<string, string>>(FALLBACKS[pageSlug] || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('page_sections')
        .select('section_key, content')
        .eq('page_slug', pageSlug);

      if (err) {
        setError(err.message);
        // Keep fallbacks
      } else if (data && data.length > 0) {
        const map: Record<string, string> = { ...(FALLBACKS[pageSlug] || {}) };
        data.forEach((row: { section_key: string; content: string }) => {
          map[row.section_key] = row.content;
        });
        setSections(map);
      }
      setLoading(false);
    };
    fetch();
  }, [pageSlug]);

  const updateSection = useCallback(async (sectionKey: string, content: string) => {
    const { error: err } = await supabase
      .from('page_sections')
      .upsert(
        { page_slug: pageSlug, section_key: sectionKey, content, updated_at: new Date().toISOString() },
        { onConflict: 'page_slug,section_key' }
      );
    if (err) throw err;
    setSections(prev => ({ ...prev, [sectionKey]: content }));
  }, [pageSlug]);

  return { sections, loading, error, updateSection };
}
