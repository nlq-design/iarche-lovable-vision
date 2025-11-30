import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import GradientLink from '@/components/ui/GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';
import { CheckCircle, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Schema de validation Zod
const atelierFormSchema = z.object({
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

type AtelierFormData = z.infer<typeof atelierFormSchema>;

interface AtelierInscriptionFormProps {
  articleId: string;
  articleTitle: string;
  eventDate: string | null;
  eventLocation: string | null;
  heureDebut: string | null;
  typeEvenement: string | null;
  maxParticipants: number;
  inscriptionsCount: number;
}

const AtelierInscriptionForm = ({ 
  articleId, 
  articleTitle,
  eventDate,
  eventLocation,
  heureDebut,
  typeEvenement,
  maxParticipants,
  inscriptionsCount,
}: AtelierInscriptionFormProps) => {
  const { toast } = useToast();
  const { trackCTAClick } = useCTATracking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<AtelierFormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    consent_marketing: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AtelierFormData, string>>>({});

  const placesRestantes = maxParticipants - inscriptionsCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      // Validation Zod
      const validatedData = atelierFormSchema.parse(formData);
      
      // Vérifier à nouveau les places disponibles
      if (inscriptionsCount >= maxParticipants) {
        throw new Error('Désolé, l\'événement est complet');
      }
      
      // Track CTA click
      await trackCTAClick('atelier_inscription', 'atelier_detail', articleTitle);
      
      // Créer le lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert([{
          name: validatedData.name,
          email: validatedData.email,
          company: validatedData.company || null,
          phone: validatedData.phone || null,
          source: 'atelier-webinaire',
          source_id: articleId,
          consent_marketing: validatedData.consent_marketing,
        }])
        .select()
        .single();

      if (leadError && leadError.code !== '23505') {
        console.error('Failed to create lead:', leadError);
        throw new Error('Erreur lors de l\'enregistrement');
      }

      // Si lead créé, créer l'inscription dans atelier_inscriptions
      if (leadData) {
        const { error: inscriptionError } = await supabase
          .from('atelier_inscriptions')
          .insert([{
            atelier_id: articleId,
            lead_id: leadData.id,
          }]);

        if (inscriptionError && inscriptionError.code !== '23505') {
          console.error('Failed to create atelier inscription:', inscriptionError);
          throw new Error('Erreur lors de l\'inscription');
        }
      }

      // Envoyer notification email avec détails de l'événement
      try {
        await supabase.functions.invoke('send-lead-notification', {
          body: {
            lead_id: articleId,
            name: validatedData.name,
            email: validatedData.email,
            company: validatedData.company,
            phone: validatedData.phone,
            source: 'atelier-webinaire',
            source_context: articleTitle,
            event_details: {
              date: eventDate,
              location: eventLocation,
              heure_debut: heureDebut,
              type_evenement: typeEvenement,
            },
          },
        });
      } catch (notifError) {
        console.warn('Failed to send lead notification:', notifError);
        // Ne pas bloquer si la notification échoue
      }

      // Marquer comme succès
      setIsSuccess(true);

      toast({
        title: "✅ Inscription confirmée",
        description: "Vous allez recevoir un email de confirmation avec les détails de l'événement.",
      });

      // Push GTM event
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: 'atelier_form_submit',
        atelier_title: articleTitle,
      });

    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Partial<Record<keyof AtelierFormData, string>> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof AtelierFormData] = err.message;
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
          Inscription confirmée !
        </h3>
        <p className="text-muted-foreground mb-4">
          Vous êtes inscrit à <strong>"{articleTitle}"</strong>
        </p>
        <p className="text-sm text-muted-foreground mb-2">
          Un email de confirmation avec tous les détails vous a été envoyé.
        </p>
        <p className="text-xs text-muted-foreground">
          Pensez à vérifier vos courriers indésirables si vous ne recevez pas l'email rapidement.
        </p>
      </div>
    );
  }

  // Formulaire d'inscription avec infos de l'événement
  return (
    <div className="bg-secondary/30 rounded-lg p-8 border border-border animate-fadeIn">
      {/* Informations de l'événement */}
      <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-lg">
        <h3 className="text-xl font-bold text-foreground mb-4">
          Informations de la session
        </h3>
        <div className="space-y-3">
          {eventDate && (
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(eventDate), "EEEE d MMMM yyyy", { locale: fr })}
                  {heureDebut && ` à ${heureDebut}`}
                </p>
              </div>
            </div>
          )}
          
          {eventLocation && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Lieu</p>
                <p className="text-sm text-muted-foreground">{eventLocation}</p>
              </div>
            </div>
          )}
          
          {typeEvenement && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Format</p>
                <p className="text-sm text-muted-foreground">{typeEvenement}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Places disponibles</p>
              <p className="text-sm text-muted-foreground">
                {placesRestantes} place{placesRestantes > 1 ? 's' : ''} restante{placesRestantes > 1 ? 's' : ''} sur {maxParticipants}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <h3 className="text-2xl font-bold text-foreground mb-2">
        Inscription à l'événement
      </h3>
      <p className="text-muted-foreground mb-6">
        Remplissez ce formulaire pour confirmer votre participation
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
          disabled={isSubmitting || placesRestantes <= 0}
          className="w-full justify-center text-base py-3"
        >
          {isSubmitting ? 'Envoi en cours...' : placesRestantes <= 0 ? 'Complet' : 'Confirmer mon inscription'}
        </GradientLink>

        <p className="text-xs text-muted-foreground text-center">
          Vos données sont protégées et ne seront jamais partagées avec des tiers
        </p>
      </form>
    </div>
  );
};

export default AtelierInscriptionForm;
