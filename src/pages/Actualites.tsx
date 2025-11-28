import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Actualites = () => {
  return (
    <BackgroundLayout>
      <Helmet>
        <title>Actualités · IArche · Veille IA et conseils</title>
        <meta name="description" content="Articles, veille IA et retours d'expérience. Conseils pratiques pour dirigeants de PME." />
        <link rel="canonical" href="https://iarche.fr/actualites" />
        <meta property="og:title" content="Actualités · IArche · Veille IA et conseils" />
        <meta property="og:description" content="Articles, veille IA et retours d'expérience. Conseils pratiques pour dirigeants de PME." />
        <meta property="og:url" content="https://iarche.fr/actualites" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-20">
        <section className="max-w-6xl mx-auto px-6 py-16">
          {/* En-tête */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Actualités
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Veille IA, conseils et retours d'expérience
            </p>
          </div>

          {/* Contenu placeholder */}
          <div className="max-w-2xl mx-auto text-center space-y-8 invisible animate-fadeIn [animation-delay:0.3s]">
            <div className="bg-secondary/50 rounded-lg p-12 border border-border">
              <p className="text-lg text-muted-foreground mb-6">
                Les premiers articles arrivent bientôt.
              </p>
              <p className="text-base text-muted-foreground mb-8">
                En attendant, inscrivez-vous à notre newsletter pour recevoir nos derniers contenus et analyses directement dans votre boîte mail.
              </p>
              <Link to="/newsletter">
                <Button 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base group"
                >
                  S'inscrire à la newsletter
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Actualites;
