import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';
import { ArrowRight, Lightbulb } from 'lucide-react';
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
}

const RelatedSolutions: React.FC<RelatedSolutionsProps> = ({
  solutionSlugs = [],
  title = "Solution liée",
  limit = 2,
  sourceContext = 'article'
}) => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const { trackCTAClick } = useCTATracking();

  useEffect(() => {
    loadSolutions();
  }, [solutionSlugs.join(',')]);

  const loadSolutions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('articles')
        .select('id, title, slug, excerpt, cover_image_url')
        .eq('published', true)
        .eq('resource_type', 'solution');

      if (solutionSlugs.length > 0) {
        query = query.in('slug', solutionSlugs);
      } else {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Trier selon l'ordre des slugs fournis
      if (solutionSlugs.length > 0 && data) {
        const sortedData = solutionSlugs
          .map(slug => data.find(s => s.slug === slug))
          .filter(Boolean) as Solution[];
        setSolutions(sortedData);
      } else {
        setSolutions(data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des solutions liées:', error);
      setSolutions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || solutions.length === 0) {
    return null;
  }

  const sectionTitle = solutions.length > 1 ? "Solutions liées" : title;

  return (
    <section className="mt-12 mb-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-primary">
            {sectionTitle}
          </h3>
        </div>

        <div className={`grid gap-4 ${solutions.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          {solutions.map((solution, index) => (
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
