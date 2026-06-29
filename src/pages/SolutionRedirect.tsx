import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * /solutions/:slug — plus de page « article » intermédiaire (step-2).
 * On résout la destination canonique de la solution (solution_meta.landing_url)
 * et on redirige DIRECTEMENT : route interne (ex /cockpit) ou sous-domaine.
 * Slug inconnu / non-solution / dépublié → retour propre vers /solutions.
 */
const SolutionRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        navigate('/solutions', { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from('solution_meta')
        .select('landing_url, is_external, articles!inner(slug, published, resource_type)')
        .eq('articles.slug', slug)
        .eq('articles.published', true)
        .eq('articles.resource_type', 'solution')
        .maybeSingle();

      if (cancelled) return;

      const landing = (data as any)?.landing_url as string | undefined;
      if (!error && landing) {
        if ((data as any).is_external) {
          window.location.replace(landing);
        } else {
          navigate(landing, { replace: true });
        }
      } else {
        navigate('/solutions', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  return (
    <div className="sec-light min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Redirection…" />
    </div>
  );
};

export default SolutionRedirect;
