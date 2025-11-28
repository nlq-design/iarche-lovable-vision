import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';

const ConditionsGenerales = () => {
  return (
    <BackgroundLayout>
      <Helmet>
        <title>Conditions générales · IArche</title>
        <meta name="description" content="Conditions générales de vente des services IArche. Prestations, tarifs, paiement." />
        <link rel="canonical" href="https://iarche.fr/conditions-generales" />
        <meta property="og:title" content="Conditions générales · IArche" />
        <meta property="og:description" content="Conditions générales de vente des services IArche. Prestations, tarifs, paiement." />
        <meta property="og:url" content="https://iarche.fr/conditions-generales" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen">
        <section className="max-w-4xl mx-auto px-6 py-16">
          {/* En-tête */}
          <div className="mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Conditions générales de vente
            </h1>
          </div>

          {/* Contenu */}
          <div className="prose prose-lg max-w-none invisible animate-fadeIn [animation-delay:0.2s]">
            <div className="space-y-8 text-muted-foreground">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 1 - Objet</h2>
                <p>
                  Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre IArche et ses clients dans le cadre 
                  de la fourniture de services de conseil, développement, formation et conformité en intelligence artificielle.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 2 - Services</h2>
                <p>
                  IArche propose les prestations suivantes :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Audit et conseil en intelligence artificielle</li>
                  <li>Développement et intégration de solutions IA</li>
                  <li>Formation et accompagnement des équipes</li>
                  <li>Conformité réglementaire (RGPD, AI Act)</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 3 - Tarifs</h2>
                <p>
                  Les tarifs de nos prestations sont communiqués sur devis personnalisé. Ils sont exprimés en euros HT et s'entendent hors taxes. 
                  La TVA applicable est celle en vigueur au jour de la facturation.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 4 - Modalités de paiement</h2>
                <p>
                  Le paiement des prestations s'effectue selon les conditions définies dans le devis accepté. Sauf mention contraire, 
                  le règlement est dû à 30 jours net à compter de la date de facturation.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 5 - Livraison des prestations</h2>
                <p>
                  Les délais de réalisation sont communiqués à titre indicatif dans le devis. IArche s'engage à respecter les délais convenus, 
                  sauf en cas de force majeure ou de modification de périmètre demandée par le client.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 6 - Réclamations</h2>
                <p>
                  Toute réclamation doit être adressée par email à <a href="mailto:nlq@iarche.fr" className="text-primary hover:underline">nlq@iarche.fr</a> dans un délai de 15 jours suivant la livraison de la prestation.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 7 - Responsabilité</h2>
                <p>
                  IArche s'engage à mettre en œuvre tous les moyens nécessaires pour la bonne exécution des prestations. Sa responsabilité ne pourra être engagée 
                  qu'en cas de faute prouvée et sera limitée au montant de la prestation concernée.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 8 - Données personnelles</h2>
                <p>
                  Les données personnelles collectées dans le cadre de nos prestations sont traitées conformément à notre politique de confidentialité 
                  et à la réglementation RGPD en vigueur.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Article 9 - Règlement des litiges</h2>
                <p>
                  Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'efforceront de trouver une solution amiable. 
                  À défaut, le litige sera porté devant les tribunaux compétents.
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

export default ConditionsGenerales;
