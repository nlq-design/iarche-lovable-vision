import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import GradientLink from '@/components/ui/GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';
import { CheckCircle } from 'lucide-react';

// Schema de validation Zod
const livreBlancsFormSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères" }),
  email: z.string()
    .trim()
    .email({ message: "Email invalide" })
    .max(255, { message: "L'email ne peut pas dépasser 255 caractères" }),
  company: z.string()
    .trim()
    .max(200, { message: "Le nom de l'entreprise ne peut pas dépasser 200 caractères" })
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .trim()
    .max(20, { message: "Le téléphone ne peut pas dépasser 20 caractères" })
    .optional()
    .or(z.literal('')),
  consent_marketing: z.boolean(),
});

type LivreBlancsFormData = z.infer<typeof livreBlancsFormSchema>;

interface LivreBlancsFormProps {
  articleId: string;
  articleTitle: string;
}

const LivreBlancsForm = ({ articleId, articleTitle }: LivreBlancsFormProps) => {
  const { toast } = useToast();
  const { trackCTAClick, getSessionId } = useCTATracking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<LivreBlancsFormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    consent_marketing: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LivreBlancsFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      // Validation Zod
      const validatedData = livreBlancsFormSchema.parse(formData);
      
      // Track CTA click
      await trackCTAClick('livre_blanc_download', 'livre_blanc_detail', articleTitle);
      
      // Créer ou mettre à jour le lead (upsert sur email)
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .upsert({
          name: validatedData.name,
          email: validatedData.email,
          company: validatedData.company || null,
          phone: validatedData.phone || null,
          source: 'livre-blanc',
          source_id: articleId,
          source_context: articleTitle,
          consent_marketing: validatedData.consent_marketing,
        }, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (leadError) {
        console.error('Failed to create/update lead:', leadError);
        throw new Error('Erreur lors de l\'enregistrement');
      }

      // Récupérer l'URL du fichier pour l'email
      let fileUrl = null;
      try {
        const { data: articleData } = await supabase
          .from('articles')
          .select('file_url')
          .eq('id', articleId)
          .single();
        fileUrl = articleData?.file_url;
      } catch (err) {
        console.warn('Failed to get file URL:', err);
      }

      // Envoyer notification email admin
      if (leadData) {
        try {
          await supabase.functions.invoke('send-lead-notification', {
            body: {
              lead_id: leadData.id,
              name: validatedData.name,
              email: validatedData.email,
              company: validatedData.company,
              phone: validatedData.phone,
              source: 'livre-blanc',
              source_context: articleTitle,
            },
          });
        } catch (notifError) {
          console.warn('Failed to send lead notification:', notifError);
        }
      }

      // Envoyer email de confirmation avec le PDF à l'utilisateur
      try {
        await supabase.functions.invoke('send-user-confirmation', {
          body: {
            email: validatedData.email,
            name: validatedData.name,
            source_type: 'livre-blanc',
            source_id: articleId,
            source_context: articleTitle,
            livre_blanc_title: articleTitle,
            file_url: fileUrl,
          },
        });
      } catch (confirmError) {
        console.warn('Failed to send user confirmation:', confirmError);
      }

      // Incrémenter le compteur de téléchargements
      try {
        const { data: article } = await supabase
          .from('articles')
          .select('compteur_telechargements')
          .eq('id', articleId)
          .single();
        
        const currentCount = article?.compteur_telechargements || 0;
        
        await supabase
          .from('articles')
          .update({ compteur_telechargements: currentCount + 1 })
          .eq('id', articleId);
      } catch (counterError) {
        console.warn('Failed to update download counter:', counterError);
      }

      // Marquer comme succès
      setIsSuccess(true);

      toast({
        title: "✅ Inscription confirmée",
        description: "Vous allez recevoir le livre blanc par email sous quelques instants.",
      });

      // Push GTM event
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: 'livre_blanc_form_submit',
        livre_blanc_title: articleTitle,
      });

    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Partial<Record<keyof LivreBlancsFormData, string>> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof LivreBlancsFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
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

  // Si inscription réussie, afficher message de confirmation
  if (isSuccess) {
    return (
      <div className="bg-primary/5 rounded-lg p-8 border-2 border-primary/20 text-center animate-fadeIn">
        <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Merci pour votre inscription !
        </h3>
        <p className="text-muted-foreground mb-4">
          Vous allez recevoir le livre blanc <strong>"{articleTitle}"</strong> par email sous quelques instants.
        </p>
        <p className="text-xs text-muted-foreground">
          Pensez à vérifier vos courriers indésirables si vous ne recevez pas l'email rapidement.
        </p>
      </div>
    );
  }

  // Formulaire de capture
  return (
    <div className="bg-secondary/30 rounded-lg p-8 border border-border animate-fadeIn">
      <h3 className="text-2xl font-bold text-foreground mb-2">
        Recevoir ce livre blanc
      </h3>
      <p className="text-muted-foreground mb-6">
        Remplissez ce formulaire pour recevoir le document par email
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Nom *</Label>
          <Input 
            id="name" 
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
          <Label htmlFor="email">Email professionnel *</Label>
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
          <Label htmlFor="company">Entreprise (optionnel)</Label>
          <Input 
            id="company" 
            type="text" 
            placeholder="Nom de votre entreprise" 
            className="mt-2"
            value={formData.company || ''}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          {errors.company && <p className="text-sm text-destructive mt-1">{errors.company}</p>}
        </div>

        <div>
          <Label htmlFor="phone">Téléphone (optionnel)</Label>
          <Input 
            id="phone" 
            type="tel" 
            placeholder="+33 6 12 34 56 78" 
            className="mt-2"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <Checkbox 
            id="consent" 
            checked={formData.consent_marketing}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, consent_marketing: checked as boolean })
            }
          />
          <Label 
            htmlFor="consent" 
            className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
          >
            J'accepte de recevoir des actualités et conseils par email de la part d'IArche (désinscription possible à tout moment)
          </Label>
        </div>

        <GradientLink 
          type="submit" 
          disabled={isSubmitting}
          className="w-full justify-center text-base py-3"
        >
          {isSubmitting ? 'Envoi en cours...' : 'Recevoir le livre blanc'}
        </GradientLink>

        <p className="text-xs text-muted-foreground text-center">
          Vos données sont protégées et ne seront jamais partagées avec des tiers
        </p>
      </form>
    </div>
  );
};

export default LivreBlancsForm;
