import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { contactSchema, type ContactFormData } from '@/schemas/contact';
import GradientLink from '@/components/ui/GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';

interface SolutionContactFormProps {
  solutionName: string;
}

const SolutionContactForm = ({ solutionName }: SolutionContactFormProps) => {
  const { toast } = useToast();
  const { getSessionId } = useCTATracking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    subject: 'autre' as const,
    message: `Je souhaite essayer ${solutionName}`
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});

  // Update message when solutionName changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      message: `Je souhaite essayer ${solutionName}`
    }));
  }, [solutionName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validatedData = contactSchema.parse(formData);
      
      // Créer le lead
      const { error: leadError } = await supabase
        .from('leads')
        .insert([{
          name: validatedData.name,
          email: validatedData.email,
          company: validatedData.company || null,
          source: 'contact',
          consent_marketing: false
        }]);

      if (leadError && leadError.code !== '23505') {
        console.warn('Failed to create lead:', leadError);
      }

      // Créer le contact
      const { data: contactData, error } = await supabase
        .from('contacts')
        .insert([{
          name: validatedData.name,
          email: validatedData.email,
          company: validatedData.company || null,
          subject: validatedData.subject,
          message: validatedData.message,
          source: 'solution_detail',
          source_context: solutionName,
          user_session: getSessionId(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Envoyer notification email pour le nouveau lead
      try {
        await supabase.functions.invoke('send-lead-notification', {
          body: {
            lead_id: contactData.id,
            name: validatedData.name,
            email: validatedData.email,
            company: validatedData.company,
            phone: null,
            source: 'solution_detail',
            source_context: solutionName,
          },
        });
      } catch (notifError) {
        console.warn('Failed to send lead notification:', notifError);
        // Ne pas bloquer si la notification échoue
      }

      toast({
        title: "Demande envoyée",
        description: "Nous vous contacterons rapidement pour discuter de votre projet.",
      });

      // Push GTM event
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: 'solution_contact_form_submit',
        solution_name: solutionName,
      });

      setFormData({
        name: '',
        email: '',
        company: '',
        subject: 'autre',
        message: `Je souhaite essayer ${solutionName}`
      });
    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof ContactFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue. Réessayez.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-secondary/30 rounded-lg p-8 border border-border animate-fadeIn [animation-delay:0.5s]">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        Essayer {solutionName}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="nom">Nom *</Label>
          <Input 
            id="nom" 
            type="text" 
            placeholder="Votre nom" 
            required 
            className="mt-2"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="votre@email.com" 
            required 
            className="mt-2"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
        </div>

        <div>
          <Label htmlFor="entreprise">Entreprise (optionnel)</Label>
          <Input 
            id="entreprise" 
            type="text" 
            placeholder="Nom de votre entreprise" 
            className="mt-2"
            value={formData.company || ''}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          {errors.company && <p className="text-sm text-destructive mt-1">{errors.company}</p>}
        </div>

        <div>
          <Label htmlFor="message">Message *</Label>
          <Textarea 
            id="message" 
            placeholder="Décrivez votre besoin..." 
            required 
            className="mt-2 min-h-[120px]"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
          {errors.message && <p className="text-sm text-destructive mt-1">{errors.message}</p>}
        </div>

        <GradientLink 
          type="submit" 
          disabled={isSubmitting}
          className="w-full justify-center text-base py-3"
        >
          {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
        </GradientLink>
      </form>
    </div>
  );
};

export default SolutionContactForm;
