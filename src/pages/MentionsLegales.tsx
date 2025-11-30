import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';

const MentionsLegales = () => {
  return (
    <BackgroundLayout>
      <Helmet>
        <title>Mentions légales · IArche</title>
        <meta name="description" content="Mentions légales du site IArche. Éditeur, hébergeur, propriété intellectuelle." />
        <link rel="canonical" href="https://iarche.fr/mentions-legales" />
        <meta property="og:title" content="Mentions légales · IArche" />
        <meta property="og:description" content="Mentions légales du site IArche. Éditeur, hébergeur, propriété intellectuelle." />
        <meta property="og:url" content="https://iarche.fr/mentions-legales" />
        <meta property="og:type" content="website" />

        {/* Schema.org BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Accueil",
                "item": "https://iarche.fr/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Mentions légales",
                "item": "https://iarche.fr/mentions-legales"
              }
            ]
          })}
        </script>
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-4xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Mentions légales
            </h1>
            {/* Ligne décorative gradient */}
            <div className="w-24 h-1 mb-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60 animate-fadeIn [animation-delay:0.15s]"></div>
          </div>

          {/* Contenu */}
          <div className="prose prose-lg max-w-none animate-fadeIn [animation-delay:0.2s]">
            <div className="space-y-8 text-muted-foreground">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Éditeur du site</h2>
                <p>
                  Le site iarche.fr est édité par IArche, société en cours d'immatriculation.
                </p>
                <p>
                  Siège social : Bayonne, France<br />
                  Email : nlq@iarche.fr
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Hébergement</h2>
                <p>
                  Ce site est hébergé par Lovable.dev<br />
                  [Informations d'hébergement à compléter]
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Propriété intellectuelle</h2>
                <p>
                  L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. 
                  Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                </p>
                <p>
                  La reproduction de tout ou partie de ce site sur un support électronique quel qu'il soit est formellement interdite sauf autorisation expresse du directeur de la publication.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Responsabilité</h2>
                <p>
                  Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement remis à jour, mais peut toutefois contenir des inexactitudes, 
                  des omissions ou des lacunes. Si vous constatez une lacune, erreur ou ce qui paraît être un dysfonctionnement, merci de bien vouloir nous le signaler par email à l'adresse nlq@iarche.fr.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Droit applicable</h2>
                <p>
                  Le présent site et les mentions légales sont soumis au droit français. En cas de litige et à défaut d'accord amiable, le litige sera porté devant les tribunaux français 
                  conformément aux règles de compétence en vigueur.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default MentionsLegales;
