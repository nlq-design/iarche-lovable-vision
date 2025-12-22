import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';
import { ArrowRight, Lightbulb, Compass } from 'lucide-react';
import { Card } from './card';
import GradientTitle from './GradientTitle';
import LogoArc from './LogoArc';
import { useCTATracking } from '@/hooks/useCTATracking';

interface Solution {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  tags: string[] | null;
}

interface ScoredSolution extends Solution {
  score: number;
}

interface RelatedSolutionsProps {
  /** Slugs des solutions à afficher (ex: ['collaboria', 'datalia']) */
  solutionSlugs?: string[];
  /** Titre de la section */
  title?: string;
  /** Limite si pas de slugs spécifiques */
  limit?: number;
  /** Contexte pour le tracking CTA */
  sourceContext?: string;
  /** Tags de l'article courant pour le scoring */
  articleTags?: string[];
  /** Mots-clés du contenu de l'article pour le scoring */
  articleKeywords?: string[];
  /** Seuil de pertinence (0-100) - en dessous, redirige vers /services */
  relevanceThreshold?: number;
}

// Mapping des mots-clés par solution pour le scoring
const SOLUTION_KEYWORDS: Record<string, string[]> = {
  'dialogue-plus': ['rag', 'chatbot', 'dialogue', 'assistant', 'documents', 'recherche', 'base de connaissances', 'ia conversationnelle', 'questions-réponses'],
  'collaboria': ['collaboration', 'équipe', 'workflow', 'processus', 'automatisation', 'productivité', 'travail collaboratif', 'prompt', 'prompting'],
  'datalia': ['données', 'data', 'analyse', 'dashboard', 'reporting', 'visualisation', 'bi', 'business intelligence', 'kpi', 'indicateurs'],
  'formalia': ['formulaire', 'saisie', 'collecte', 'validation', 'données structurées', 'extraction', 'ocr', 'documents'],
  'recrut-ia': ['recrutement', 'cv', 'candidat', 'embauche', 'rh', 'ressources humaines', 'talent', 'matching'],
  'legal-ia': ['juridique', 'contrat', 'conformité', 'rgpd', 'legal', 'droit', 'réglementation', 'compliance']
};

// Calcule le score de pertinence entre un article et une solution
const calculateRelevanceScore = (
  solution: Solution,
  articleTags: string[],
  articleKeywords: string[]
): number => {
  const solutionKeywords = SOLUTION_KEYWORDS[solution.slug] || [];
  const solutionTags = solution.tags || [];
  
  let score = 0;
  let matchCount = 0;
  const totalPossibleMatches = Math.max(1, solutionKeywords.length);
  
  // Normaliser les termes pour la comparaison
  const normalizedArticleTags = articleTags.map(t => t.toLowerCase().trim());
  const normalizedArticleKeywords = articleKeywords.map(k => k.toLowerCase().trim());
  const allArticleTerms = [...normalizedArticleTags, ...normalizedArticleKeywords];
  
  // Vérifier les correspondances avec les mots-clés de la solution
  for (const keyword of solutionKeywords) {
    const normalizedKeyword = keyword.toLowerCase();
    if (allArticleTerms.some(term => 
      term.includes(normalizedKeyword) || normalizedKeyword.includes(term)
    )) {
      matchCount++;
    }
  }
  
  // Vérifier les correspondances avec les tags de la solution
  for (const tag of solutionTags) {
    const normalizedTag = tag.toLowerCase();
    if (allArticleTerms.some(term => 
      term.includes(normalizedTag) || normalizedTag.includes(term)
    )) {
      matchCount += 0.5; // Bonus pour les tags
    }
  }
  
  // Calculer le score en pourcentage
  score = Math.min(100, Math.round((matchCount / totalPossibleMatches) * 100));
  
  return score;
};

const RelatedSolutions: React.FC<RelatedSolutionsProps> = ({
  solutionSlugs = [],
  title = "Solution liée",
  limit = 2,
  sourceContext = 'article',
  articleTags = [],
  articleKeywords = [],
  relevanceThreshold = 80
}) => {
  const [scoredSolutions, setScoredSolutions] = useState<ScoredSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServicesLink, setShowServicesLink] = useState(false);
  const { trackCTAClick } = useCTATracking();

  useEffect(() => {
    loadAndScoreSolutions();
  }, [solutionSlugs.join(','), articleTags.join(','), articleKeywords.join(',')]);

  const loadAndScoreSolutions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('articles')
        .select('id, title, slug, excerpt, cover_image_url, tags')
        .eq('published', true)
        .eq('resource_type', 'solution');

      if (solutionSlugs.length > 0) {
        query = query.in('slug', solutionSlugs);
      } else {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setScoredSolutions([]);
        setShowServicesLink(true);
        return;
      }

      // Calculer le score pour chaque solution
      const scored = data.map(solution => ({
        ...solution,
        score: calculateRelevanceScore(solution, articleTags, articleKeywords)
      }));

      // Trier par score décroissant
      scored.sort((a, b) => b.score - a.score);

      // Filtrer les solutions au-dessus du seuil
      const relevantSolutions = scored.filter(s => s.score >= relevanceThreshold);

      // Si aucune solution pertinente, afficher le lien vers /services
      if (relevantSolutions.length === 0) {
        setScoredSolutions([]);
        setShowServicesLink(true);
      } else {
        // Garder uniquement la meilleure solution (anti-duplication)
        setScoredSolutions(relevantSolutions.slice(0, 1));
        setShowServicesLink(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des solutions liées:', error);
      setScoredSolutions([]);
      setShowServicesLink(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // Afficher le lien vers la page Services si aucune solution pertinente
  if (showServicesLink) {
    return (
      <section className="mt-12 mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-primary">
              Découvrez nos services
            </h3>
          </div>

          <NavLink
            to="/services"
            onClick={() => trackCTAClick('discover_services', sourceContext)}
            className="block group"
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30 border-border/50 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <GradientTitle size="sm" as="h4" centered={false} className="!mb-2">
                    Explorer nos solutions IA
                  </GradientTitle>
                  <p className="text-sm text-muted-foreground">
                    Découvrez comment l'intelligence artificielle peut transformer votre entreprise
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
              </div>
            </Card>
          </NavLink>

          <LogoArc size="sm" className="mx-auto mt-6" />
        </div>
      </section>
    );
  }

  // Afficher les solutions pertinentes
  return (
    <section className="mt-12 mb-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-primary">
            {scoredSolutions.length > 1 ? "Solutions liées" : title}
          </h3>
        </div>

        <div className={`grid gap-4 ${scoredSolutions.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          {scoredSolutions.map((solution, index) => (
            <NavLink
              key={solution.id}
              to={`/solutions/${solution.slug}`}
              onClick={() => trackCTAClick(`solution_${solution.slug}`, sourceContext)}
              className="block group"
            >
              <Card className="h-full p-4 hover:shadow-lg transition-all duration-300 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30 border-border/50 invisible animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  {solution.cover_image_url && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={solution.cover_image_url}
                        alt={solution.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <GradientTitle size="sm" as="h4" centered={false} className="!mb-0">
                        {solution.title.split('—')[0].trim()}
                      </GradientTitle>
                      <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                    </div>
                    
                    {solution.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {solution.excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </NavLink>
          ))}
        </div>

        <LogoArc size="sm" className="mx-auto mt-6" />
      </div>
    </section>
  );
};

export default RelatedSolutions;
