import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useBrochureBySlug } from '@/hooks/useBrochures';
import BrochureWebView from '@/components/admin/brochures/BrochureWebView';

const BrochurePublic = () => {
  const { slug } = useParams();
  const { data: brochure, isLoading, error } = useBrochureBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (error || !brochure) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-bold text-primary mb-4">Brochure introuvable</h1>
        <p className="text-muted-foreground mb-8">
          Cette brochure n'existe pas ou n'est pas publiée.
        </p>
        <a 
          href="/"
          className="text-accent hover:underline"
        >
          Retour à l'accueil
        </a>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{brochure.cover_title} | IArche</title>
        <meta name="description" content={brochure.cover_subtitle || `Découvrez ${brochure.cover_title} par IArche`} />
        <meta name="robots" content="noindex" />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${brochure.cover_title} | IArche`} />
        <meta property="og:description" content={brochure.cover_subtitle || `Découvrez ${brochure.cover_title} par IArche`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://iarche.fr/brochure/${brochure.slug}`} />
        {brochure.cover_image_url && (
          <meta property="og:image" content={brochure.cover_image_url} />
        )}
      </Helmet>

      <BrochureWebView brochure={brochure} />
    </>
  );
};

export default BrochurePublic;
