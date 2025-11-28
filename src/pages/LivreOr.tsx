import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

const LivreOr = () => {
  return (
    <BackgroundLayout>
      <Header />
      
      <main className="min-h-screen pt-20">
        <section className="max-w-6xl mx-auto px-6 py-16">
          {/* En-tête */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Livre d'Or
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Ce que nos clients disent de nous
            </p>
          </div>

          {/* Contenu placeholder */}
          <div className="max-w-2xl mx-auto text-center space-y-8 invisible animate-fadeIn [animation-delay:0.3s]">
            <div className="bg-secondary/50 rounded-lg p-12 border border-border">
              <p className="text-lg text-muted-foreground mb-6">
                Les premiers témoignages arrivent bientôt.
              </p>
              <p className="text-base text-muted-foreground mb-8">
                Vous avez travaillé avec nous ? Partagez votre expérience.
              </p>
              <a href="mailto:nlq@iarche.fr?subject=Témoignage client">
                <Button 
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-white px-8 py-6 text-base"
                >
                  Laisser un avis
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default LivreOr;
