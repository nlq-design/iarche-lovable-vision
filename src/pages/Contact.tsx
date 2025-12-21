import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Mail, Phone, Linkedin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { contactSchema, type ContactFormData } from '@/schemas/contact';
import GradientLink from '@/components/ui/GradientLink';
import LogoArc from '@/components/ui/LogoArc';
import { useCTATracking } from '@/hooks/useCTATracking';

const Contact = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { getSessionId } = useCTATracking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    subject: 'audit' as const,
    message: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validatedData = contactSchema.parse(formData);
      const sessionId = getSessionId();
      const sourceParam = searchParams.get('source') || 'contact';
      const contextParam = searchParams.get('context');
      
      // Créer le lead (sans .select() car pas de politique SELECT pour anon)
      const { error: leadError } = await supabase
        .from('leads')
        .insert([{
          name: validatedData.name,
          email: validatedData.email,
          company: validatedData.company || null,
          source: 'contact',
          source_context: contextParam || null,
          message: validatedData.message,
          consent_marketing: false
        }]);

      if (leadError && leadError.code !== '23505') {
        console.warn('Failed to create lead:', leadError);
      }

      // Créer le contact (sans .select() car pas de politique SELECT pour anon)
      const { error } = await supabase.from("contacts").insert({
        name: validatedData.name,
        email: validatedData.email,
        company: validatedData.company || null,
        subject: validatedData.subject,
        message: validatedData.message,
        source: sourceParam,
        source_context: contextParam || null,
        user_session: sessionId,
      });

      if (error) throw error;

      // Envoyer notification email pour le nouveau lead
      try {
        await supabase.functions.invoke('send-lead-notification', {
          body: {
            name: validatedData.name,
            email: validatedData.email,
            company: validatedData.company,
            phone: null,
            source: 'contact',
            source_context: contextParam,
            message: validatedData.message,
          },
        });
      } catch (notifError) {
        console.warn('Failed to send lead notification:', notifError);
      }

      // Envoyer email de confirmation à l'utilisateur
      try {
        console.log('Calling send-user-confirmation for contact...');
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke('send-user-confirmation', {
          body: {
            email: validatedData.email,
            name: validatedData.name,
            source_type: 'contact',
            source_context: contextParam || validatedData.subject,
          },
        });
        if (confirmError) {
          console.error('send-user-confirmation error:', confirmError);
        } else {
          console.log('send-user-confirmation success:', confirmData);
        }
      } catch (confirmError) {
        console.error('Failed to send user confirmation:', confirmError);
      }

      toast({
        title: "Message envoyé",
        description: "Nous vous répondrons sous 24h.",
      });

      // Push GTM event
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: 'contact_form_submit',
        form_subject: validatedData.subject,
      });

      setFormData({
        name: '',
        email: '',
        company: '',
        subject: 'audit',
        message: ''
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
    <BackgroundLayout>
      <Helmet>
        <title>Contact · IArche · Agence IA Bayonne</title>
        <meta name="description" content="Une question ? Un projet IA ? Contactez IArche, agence IA à Bayonne. Réponse sous 24h." />
        <link rel="canonical" href="https://iarche.fr/contact" />
        <meta property="og:title" content="Contact · IArche · Agence IA Bayonne" />
        <meta property="og:description" content="Une question ? Un projet IA ? Contactez IArche, agence IA à Bayonne." />
        <meta property="og:url" content="https://iarche.fr/contact" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og-image-v4.png" />
        <meta property="og:image:width" content="1512" />
        <meta property="og:image:height" content="794" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact · IArche" />
        <meta name="twitter:description" content="Contactez IArche, agence IA à Bayonne." />
        <meta name="twitter:image" content="https://iarche.fr/og-image-v4.png" />
        
        {/* Schema.org BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Accueil",
                "item": "https://iarche.fr/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Contact",
                "item": "https://iarche.fr/contact"
              }
            ]
          })}
        </script>

        {/* Schema.org LocalBusiness */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "IArche",
            "image": "https://iarche.fr/og-image-v4.png",
            "url": "https://iarche.fr",
            "email": "nlq@iarche.fr",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bayonne",
              "postalCode": "64100",
              "addressRegion": "Nouvelle-Aquitaine",
              "addressCountry": "FR"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 43.4929,
              "longitude": -1.4748
            },
            "priceRange": "€€",
            "openingHoursSpecification": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              "opens": "09:00",
              "closes": "18:00"
            }
          })}
        </script>
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Contact
            </h1>
            <LogoArc size="md" className="mx-auto mb-6 animate-fadeIn [animation-delay:0.15s]" />
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              Une question ? Un projet ? Parlons-en.
            </p>
          </div>

          {/* 2 colonnes : Formulaire + Coordonnées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Formulaire */}
            <div className="animate-fadeIn [animation-delay:0.3s]">
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
                  <Label htmlFor="sujet">Sujet *</Label>
                  <Select 
                    required
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value as ContactFormData['subject'] })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionnez un sujet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audit">Audit & Conseil</SelectItem>
                      <SelectItem value="developpement">Développement</SelectItem>
                      <SelectItem value="accompagnement">Accompagnement</SelectItem>
                      <SelectItem value="conformite">Conformité</SelectItem>
                      <SelectItem value="autre">Autre demande</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject}</p>}
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Décrivez votre projet ou votre question..." 
                    required 
                    className="mt-2 min-h-[150px]"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                  {errors.message && <p className="text-sm text-destructive mt-1">{errors.message}</p>}
                </div>

                <GradientLink 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full justify-center text-lg py-3"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
                </GradientLink>
              </form>
            </div>

            {/* Coordonnées */}
            <div className="animate-fadeIn [animation-delay:0.4s] space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Nos coordonnées
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-accent shrink-0 mt-1" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Email</p>
                      <a 
                        href="mailto:nlq@iarche.fr" 
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        nlq@iarche.fr
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Phone className="w-6 h-6 text-accent shrink-0 mt-1" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Téléphone</p>
                      <a 
                        href="tel:+33661741381" 
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        06 61 74 13 81
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-accent shrink-0 mt-1" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Localisation</p>
                      <p className="text-muted-foreground">
                        Bayonne, France
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Linkedin className="w-6 h-6 text-accent shrink-0 mt-1" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">LinkedIn</p>
                      <a 
                        href="https://linkedin.com" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        Suivez-nous sur LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Contact;
