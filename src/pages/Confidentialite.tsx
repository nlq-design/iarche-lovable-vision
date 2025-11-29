import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';

const Confidentialite = () => {
  return (
    <BackgroundLayout>
      <Helmet>
        <title>Politique de confidentialité · IArche</title>
        <meta name="description" content="Politique de confidentialité IArche. Données collectées, finalités, vos droits RGPD." />
        <link rel="canonical" href="https://iarche.fr/confidentialite" />
        <meta property="og:title" content="Politique de confidentialité · IArche" />
        <meta property="og:description" content="Politique de confidentialité IArche. Données collectées, finalités, vos droits RGPD." />
        <meta property="og:url" content="https://iarche.fr/confidentialite" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-4xl mx-auto px-6 py-8">
          {/* En-tête */}
          <div className="mb-16">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Politique de confidentialité
            </h1>
            {/* Ligne décorative gradient */}
            <div className="w-24 h-1 mb-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60 animate-fadeIn [animation-delay:0.15s]"></div>
          </div>

          {/* Contenu */}
          <div className="prose prose-lg max-w-none animate-fadeIn [animation-delay:0.2s]">
            <div className="space-y-8 text-muted-foreground">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Données collectées</h2>
                <p>
                  Dans le cadre de l'utilisation de notre site et de nos services, nous sommes amenés à collecter les données personnelles suivantes :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Nom de l'entreprise (optionnel)</li>
                  <li>Message et informations fournies via nos formulaires de contact</li>
                  <li>Données de navigation (cookies techniques)</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Finalités du traitement</h2>
                <p>
                  Les données collectées sont utilisées pour :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Répondre à vos demandes d'information</li>
                  <li>Gérer votre inscription à notre newsletter</li>
                  <li>Améliorer nos services et l'expérience utilisateur</li>
                  <li>Respecter nos obligations légales</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Base légale du traitement</h2>
                <p>
                  Le traitement de vos données personnelles repose sur :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Votre consentement (inscription newsletter, formulaires de contact)</li>
                  <li>L'exécution d'un contrat ou de mesures précontractuelles</li>
                  <li>Le respect d'obligations légales</li>
                  <li>Notre intérêt légitime (amélioration de nos services)</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Durée de conservation</h2>
                <p>
                  Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Données de contact : durée de la relation commerciale + 3 ans</li>
                  <li>Données de newsletter : jusqu'à désinscription</li>
                  <li>Données de navigation : 13 mois maximum</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Destinataires des données</h2>
                <p>
                  Vos données personnelles sont destinées à IArche et ne sont pas transmises à des tiers, sauf :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Sous-traitants techniques (hébergement, outils de gestion)</li>
                  <li>Autorités légales en cas d'obligation légale</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Vos droits</h2>
                <p>
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Droit d'accès à vos données personnelles</li>
                  <li>Droit de rectification des données inexactes</li>
                  <li>Droit à l'effacement (droit à l'oubli)</li>
                  <li>Droit à la limitation du traitement</li>
                  <li>Droit à la portabilité de vos données</li>
                  <li>Droit d'opposition au traitement</li>
                  <li>Droit de retirer votre consentement à tout moment</li>
                </ul>
                <p className="mt-4">
                  Pour exercer ces droits, contactez-nous à l'adresse : nlq@iarche.fr
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Cookies et outils d'analyse</h2>
                <p className="mb-4">
                  Notre site utilise des cookies techniques strictement nécessaires au fonctionnement du site.
                </p>
                
                <h3 className="text-xl font-semibold text-foreground mb-2 mt-6">Google Tag Manager & Google Analytics</h3>
                <p className="mb-2">
                  Nous utilisons Google Tag Manager (GTM) et Google Analytics 4 (GA4) pour mesurer l'audience de notre site et améliorer nos contenus. Ces outils collectent des informations de manière anonyme, notamment :
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Pages visitées et temps passé</li>
                  <li>Source de trafic (recherche Google, lien direct, etc.)</li>
                  <li>Données démographiques générales (pays, langue)</li>
                  <li>Type d'appareil et navigateur utilisé</li>
                </ul>
                <p className="mb-2">
                  <strong>Anonymisation des données :</strong> Les adresses IP sont automatiquement anonymisées, conformément au RGPD.
                </p>
                <p>
                  Pour en savoir plus ou vous opposer au tracking Google Analytics, consultez : <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Extension de navigateur Google Analytics Opt-out</a>
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Contact DPO</h2>
                <p>
                  Pour toute question relative à la protection de vos données personnelles, vous pouvez contacter notre délégué à la protection des données à l'adresse : nlq@iarche.fr
                </p>
                <p className="mt-4">
                  Vous avez également le droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">www.cnil.fr</a>
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

export default Confidentialite;
