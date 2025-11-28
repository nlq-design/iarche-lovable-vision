import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

const Newsletter = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Newsletter subscription - Backend integration à venir');
  };

  return (
    <BackgroundLayout>
      <Header />
      
      <main className="min-h-screen pt-20">
        <section className="max-w-4xl mx-auto px-6 py-16">
          {/* En-tête */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Newsletter
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Actualités et conseils IA, sans spam
            </p>
          </div>

          {/* Formulaire d'inscription */}
          <div className="max-w-2xl mx-auto invisible animate-fadeIn [animation-delay:0.3s]">
            <div className="bg-secondary/50 rounded-lg p-8 md:p-12 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Restez informé
              </h2>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span>Veille technologique et actualités IA</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span>Conseils pratiques pour dirigeants</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span>Retours d'expérience et cas d'usage</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span>Envoi mensuel, désinscription en un clic</span>
                </li>
              </ul>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email-newsletter">Adresse email</Label>
                  <Input 
                    id="email-newsletter" 
                    type="email" 
                    placeholder="votre@email.com" 
                    required 
                    className="mt-2"
                  />
                </div>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  S'inscrire
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  En vous inscrivant, vous acceptez de recevoir nos emails. Vous pouvez vous désinscrire à tout moment.
                </p>
              </form>
            </div>
          </div>

          {/* Section dernières éditions (placeholder) */}
          <div className="mt-16 invisible animate-fadeIn [animation-delay:0.4s]">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              Dernières éditions
            </h2>
            <div className="text-center">
              <p className="text-muted-foreground">
                Les archives de nos newsletters seront bientôt disponibles ici.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Newsletter;
