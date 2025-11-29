import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { newsletterSchema } from '@/schemas/contact';

const Newsletter = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const validatedData = newsletterSchema.parse({ email });
      
      const { error: dbError } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email: validatedData.email }]);

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('Cet email est déjà inscrit');
        }
        throw dbError;
      }

      toast({
        title: "Inscription réussie",
        description: "Vous recevrez nos actualités par email.",
      });

      setEmail('');
    } catch (error: any) {
      if (error.errors) {
        setError(error.errors[0]?.message || 'Email invalide');
      } else {
        setError(error.message || 'Une erreur est survenue');
        toast({
          title: "Erreur",
          description: error.message || "Une erreur est survenue. Réessayez.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Newsletter · IArche · Actualités IA</title>
        <meta name="description" content="Inscrivez-vous à la newsletter IArche. Actualités et conseils IA pour dirigeants de PME, sans spam." />
        <link rel="canonical" href="https://iarche.fr/newsletter" />
        <meta property="og:title" content="Newsletter · IArche · Actualités IA" />
        <meta property="og:description" content="Inscrivez-vous à la newsletter IArche. Actualités et conseils IA pour dirigeants de PME." />
        <meta property="og:url" content="https://iarche.fr/newsletter" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-4xl mx-auto px-6 py-8">
          {/* En-tête */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 invisible animate-fadeIn [animation-delay:0.1s]">
              Newsletter
            </h1>
            {/* Ligne décorative gradient */}
            <div className="w-24 h-1 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60 invisible animate-fadeIn [animation-delay:0.15s]"></div>
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
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Veille technologique et actualités IA</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Conseils pratiques pour dirigeants</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Retours d'expérience et cas d'usage</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {error && <p className="text-sm text-destructive mt-1">{error}</p>}
                </div>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Inscription...' : "S'inscrire"}
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
