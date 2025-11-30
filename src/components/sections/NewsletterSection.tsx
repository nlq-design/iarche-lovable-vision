import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { newsletterSchema } from '@/schemas/contact';
import GradientLink from '@/components/ui/GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';

const NewsletterSection = () => {
  const { toast } = useToast();
  const { trackCTAClick } = useCTATracking();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const validatedData = newsletterSchema.parse({ email });
      
      // Track CTA click
      await trackCTAClick('newsletter_inscription', 'newsletter_section_homepage', email);
      
      // Créer le lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert([{
          name: validatedData.email.split('@')[0], // Nom basique depuis l'email
          email: validatedData.email,
          source: 'newsletter',
          source_context: email,
          consent_marketing: true
        }])
        .select()
        .single();

      if (leadError && leadError.code !== '23505') {
        console.warn('Failed to create lead:', leadError);
      }

      // Créer l'abonné newsletter
      const { error: dbError } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email: validatedData.email }]);

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('Cet email est déjà inscrit');
        }
        throw dbError;
      }

      // Envoyer notification email admin
      if (leadData) {
        try {
          await supabase.functions.invoke('send-lead-notification', {
            body: {
              lead_id: leadData.id,
              name: validatedData.email.split('@')[0],
              email: validatedData.email,
              source: 'newsletter',
              source_context: email,
            },
          });
        } catch (notifError) {
          console.warn('Failed to send lead notification:', notifError);
          // Ne pas bloquer si la notification échoue
        }
      }

      toast({
        title: "Inscription réussie",
        description: "Vous recevrez nos actualités par email.",
      });

      // Push GTM event
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: 'newsletter_signup',
        email: validatedData.email,
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
    <section id="newsletter" className="pt-8 md:pt-10 pb-12 md:pb-16 bg-muted">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold hero-gradient-text mb-4 invisible animate-fadeIn [animation-delay:0.2s]">
            Restez informé
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed max-w-xl mx-auto invisible animate-fadeIn [animation-delay:0.4s]">
            Recevez nos actualités et conseils IA directement dans votre boîte mail.
          </p>

          <form 
            onSubmit={handleSubmit} 
            className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto mb-4 invisible animate-fadeIn [animation-delay:0.6s]"
          >
            <div className="flex-1">
              <Input 
                type="email" 
                name="email"
                placeholder="votre@email.fr"
                required
                className="w-full border-border rounded-lg px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
            <GradientLink 
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 whitespace-nowrap"
            >
              {isSubmitting ? 'Inscription...' : "S'inscrire"}
            </GradientLink>
          </form>

          <p className="text-xs text-muted-foreground text-center mb-8 invisible animate-fadeIn [animation-delay:0.7s]">
            En vous inscrivant, vous acceptez notre{' '}
            <a 
              href="/confidentialite" 
              className="text-accent hover:underline focus:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
            >
              politique de confidentialité
            </a>
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground tracking-widest text-center invisible animate-fadeIn [animation-delay:0.8s]">
          Agence IA · Bayonne · Pays Basque · France
        </p>
      </div>
    </section>
  );
};

export default NewsletterSection;
