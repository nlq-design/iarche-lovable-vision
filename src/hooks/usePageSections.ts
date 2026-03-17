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
    resultat_titre: 'Ce que tu repars avec',
    resultat_1: 'Un MVP fonctionnel déployé en production (domaine custom + hébergement)',
    resultat_2: 'Authentification, base de données et paiement Stripe configurés',
    resultat_3: 'Une landing page optimisée pour tes premiers utilisateurs',
    resultat_4: 'La documentation technique et le transfert de compétences',
    programme_j1_titre: 'J1 — Cadrage & Architecture',
    programme_j1_desc: 'Validation du concept, définition du périmètre MVP, choix de la stack technique, wireframes des écrans clés.',
    programme_j2_titre: 'J2 — Fondations & Data',
    programme_j2_desc: "Mise en place de l'infrastructure (base de données, auth, storage), modèle de données, premières API.",
    programme_j3_titre: 'J3 — Build Core',
    programme_j3_desc: 'Développement des fonctionnalités cœur du produit. Intégrations métier et logique applicative.',
    programme_j4_titre: 'J4 — Polish & Business',
    programme_j4_desc: 'UI/UX final, intégration Stripe, landing page, SEO de base, cadrage juridique (CGV, mentions légales).',
    programme_j5_titre: 'J5 — Launch & Go-to-Market',
    programme_j5_desc: "Déploiement en production, tests finaux, stratégie d'acquisition, plan d'action post-session.",
    equipe_titre: 'Ton équipe pendant 5 jours',
    equipe_1_nom: 'Nicolas',
    equipe_1_role: 'CTO & Architecte IA',
    equipe_1_desc: "Expert en développement full-stack et intégration IA. 10+ ans d'expérience en architecture logicielle et accompagnement de startups.",
    equipe_2_nom: 'Aleksandar',
    equipe_2_role: 'Business & Stratégie',
    equipe_2_desc: "Spécialiste go-to-market et structuration juridique. Il s'assure que ton produit est prêt à vendre dès J5.",
    chiffres_1_valeur: '5',
    chiffres_1_label: 'jours intensifs',
    chiffres_2_valeur: '3',
    chiffres_2_label: 'places par session',
    chiffres_3_valeur: '1',
    chiffres_3_label: 'produit en production',
    temoignage_1_texte: "Je suis arrivé avec une idée sur un post-it. Je suis reparti avec un SaaS fonctionnel, des premiers utilisateurs et une vraie stratégie.",
    temoignage_1_nom: 'Thomas R.',
    temoignage_1_role: 'Consultant indépendant',
    temoignage_2_texte: "L'accompagnement est incroyable. En 5 jours, on a fait ce qu'une agence m'avait devisé en 3 mois.",
    temoignage_2_nom: 'Sophie M.',
    temoignage_2_role: 'Fondatrice, EdTech',
    formule_titre: 'Une formule, un engagement.',
    formule_nom: 'Semaine Intensive SaaS',
    formule_sous_titre: "Tarif sur devis — échangeons d'abord.",
    lieu_texte: 'Nos locaux à Bayonne, Pays Basque. Espace de travail dédié.',
    formulaire_titre: 'Candidater',
    formulaire_sous_titre: 'On revient vers toi sous 48h pour un premier échange.',
    faq_1_question: 'Combien coûte la semaine intensive ?',
    faq_1_reponse: "Le tarif est sur devis car il dépend de la complexité de ton projet. Contacte-nous pour un premier échange gratuit — on te donnera une estimation précise.",
    faq_2_question: 'Faut-il savoir coder ?',
    faq_2_reponse: 'Non. On gère toute la partie technique. Toi, tu te concentres sur ton métier, tes utilisateurs et ton business.',
    faq_3_question: "C'est possible à distance ?",
    faq_3_reponse: 'Le programme est conçu en présentiel à Bayonne pour maximiser la productivité. On étudie les cas exceptionnels au cas par cas.',
    faq_4_question: 'Que se passe-t-il après les 5 jours ?',
    faq_4_reponse: "Tu bénéficies d'un suivi Slack de 30 jours + infrastructure hébergée 12 mois. On reste disponibles pour t'accompagner dans la durée.",
    faq_5_question: 'Quels types de SaaS peut-on construire ?',
    faq_5_reponse: 'Tout produit web : plateforme de gestion, outil métier, marketplace, dashboard, app client… Si ton idée tient en un MVP, on peut la construire.',
    faq_6_question: 'Quelle est la stack technique utilisée ?',
    faq_6_reponse: 'React + TypeScript + Supabase (base de données, auth, storage) + Stripe (paiements). Une stack moderne, scalable et maintenable.',
    stack_titre: 'Une stack moderne et scalable',
    stack_description: 'On utilise les mêmes outils que les meilleures startups. Ton produit est construit pour durer.',
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
