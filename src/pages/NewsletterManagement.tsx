import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, Trash2 } from 'lucide-react';

const NewsletterManagement = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer votre adresse email',
        variant: 'destructive',
      });
      return;
    }

    setUnsubscribing(true);

    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('email', email.toLowerCase());

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de vous désabonner. Vérifiez votre email.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Désabonnement réussi',
        description: 'Vous ne recevrez plus nos newsletters.',
      });
      setEmail('');
    }

    setUnsubscribing(false);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer votre adresse email',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une adresse email valide',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { data: existingSubscriber } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingSubscriber) {
      toast({
        title: 'Déjà inscrit',
        description: 'Cet email est déjà abonné à notre newsletter',
      });
      setEmail('');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: email.toLowerCase() });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de vous inscrire. Veuillez réessayer.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Inscription réussie !',
        description: 'Vous recevrez nos prochains articles par email.',
      });
      setEmail('');
    }

    setLoading(false);
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Gérer ma newsletter - IArche</title>
        <meta
          name="description"
          content="Gérez votre abonnement à la newsletter IArche. Inscrivez-vous ou désabonnez-vous de nos actualités IA."
        />
        <link rel="canonical" href="https://iarche.fr/newsletter" />
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-20">
        <section className="max-w-2xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Gérer ma newsletter
            </h1>
            <p className="text-lg text-muted-foreground">
              Restez informé de nos dernières actualités sur l'IA
            </p>
          </div>

          <div className="space-y-8">
            {/* Inscription */}
            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  S'abonner à la newsletter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Recevez un email à chaque nouvel article publié sur notre blog.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="votre@email.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || unsubscribing}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={loading || unsubscribing}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Inscription...
                        </>
                      ) : (
                        'S\'inscrire'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Désabonnement */}
            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Se désabonner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUnsubscribe} className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Vous ne souhaitez plus recevoir nos emails ? Entrez votre adresse pour vous désabonner.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="votre@email.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || unsubscribing}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      variant="destructive" 
                      disabled={loading || unsubscribing}
                    >
                      {unsubscribing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Désabonnement...
                        </>
                      ) : (
                        'Se désabonner'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Informations */}
            <Card className="bg-background/50 border-border">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">
                  À propos de notre newsletter
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Recevez uniquement nos nouveaux articles</li>
                  <li>✓ Pas de spam, nous respectons votre boîte mail</li>
                  <li>✓ Désabonnement simple en un clic</li>
                  <li>✓ Vos données ne seront jamais partagées</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default NewsletterManagement;
