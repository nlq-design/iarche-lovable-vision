import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { newsletterSchema } from '@/schemas/contact';
import { useCTATracking } from '@/hooks/useCTATracking';
import { Section, FinalCtaPanel, Eyebrow } from '@/components/brand';

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
      
      // Créer ou mettre à jour le lead via fonction sécurisée
      const { data: leadId, error: leadError } = await supabase
        .rpc('upsert_lead', {
          p_email: validatedData.email,
          p_name: validatedData.email.split('@')[0],
          p_source: 'newsletter',
          p_source_context: email,
          p_consent_marketing: true,
        });

      if (leadError) {
        console.warn('Failed to create/update lead:', leadError);
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

      // Envoyer email de bienvenue à l'utilisateur
      try {
        await supabase.functions.invoke('send-user-confirmation', {
          body: {
            email: validatedData.email,
            name: validatedData.email.split('@')[0],
            source_type: 'newsletter',
          },
        });
      } catch (confirmError) {
        console.warn('Failed to send welcome email:', confirmError);
      }

      // Envoyer notification email admin
      try {
        await supabase.functions.invoke('send-lead-notification', {
          body: {
            lead_id: leadId || 'newsletter-' + Date.now(),
            name: validatedData.email.split('@')[0],
            email: validatedData.email,
            source: 'newsletter',
            source_context: 'Inscription newsletter section homepage',
          },
        });
      } catch (notifError) {
        console.warn('Failed to send lead notification:', notifError);
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
    <Section tone="dark" id="newsletter" container="narrow">
      <FinalCtaPanel>
        <Eyebrow center>Newsletter</Eyebrow>
        <h2 className="mt-2 text-[clamp(28px,4vw,44px)] font-semibold leading-[1.08] tracking-[-0.022em] text-[hsl(var(--cream))]">
          Restez <em>informé.</em>
        </h2>
        <p className="mt-4 text-base md:text-lg text-[hsl(var(--cream)/0.72)] leading-relaxed max-w-xl mx-auto">
          Recevez nos actualités et conseils IA directement dans votre boîte mail.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-7 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
        >
          <div className="flex-1 text-left">
            <Input
              type="email"
              name="email"
              placeholder="votre@email.fr"
              required
              className="w-full rounded-full px-5 py-3 text-base bg-white/5 border-white/15 text-[hsl(var(--cream))] placeholder:text-[hsl(var(--cream)/0.4)] focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-vivid))] focus-visible:border-[hsl(var(--accent-soft))] transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-[hsl(var(--accent-soft))] mt-1.5 px-2">{error}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary justify-center disabled:opacity-60">
            {isSubmitting ? 'Inscription…' : "S'inscrire"}
            <span className="arrow" aria-hidden="true">→</span>
          </button>
        </form>

        <p className="mt-5 text-xs text-[hsl(var(--cream)/0.46)] text-center">
          En vous inscrivant, vous acceptez notre{' '}
          <a
            href="/confidentialite"
            className="underline text-[hsl(var(--accent-soft))] hover:text-[hsl(var(--cream))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-vivid))] rounded"
          >
            politique de confidentialité
          </a>
        </p>
      </FinalCtaPanel>

      <p className="mt-10 text-sm text-[hsl(var(--cream)/0.46)] tracking-widest text-center font-mono uppercase">
        Architecte IA · Bayonne · Pays Basque · France
      </p>
    </Section>
  );
};

export default NewsletterSection;
