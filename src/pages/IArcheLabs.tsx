import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import GradientButton from '@/components/ui/GradientButton';
import LogoArc from '@/components/ui/LogoArc';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCTATracking } from '@/hooks/useCTATracking';
import { usePageSections } from '@/hooks/usePageSections';
import {
  Laptop, Users, Scale, Server, MessageSquare,
  Check, UserCheck, RefreshCw, Lightbulb
} from 'lucide-react';

const IArcheLabs = () => {
  const { toast } = useToast();
  const { getSessionId } = useCTATracking();
  const { sections: s, loading: sectionsLoading } = usePageSections('iarche-labs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    project: '',
    formula: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'Requis';
    if (!formData.lastName.trim()) errs.lastName = 'Requis';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Email invalide';
    if (!formData.company.trim()) errs.company = 'Requis';
    if (formData.project.trim().length < 10) errs.project = 'Minimum 10 caractères';
    if (!formData.formula) errs.formula = 'Sélectionnez une formule';
    if (!consent) errs.consent = 'Consentement requis';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setIsSubmitting(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;
      const sessionId = getSessionId();

      const { error: leadError } = await supabase.rpc('upsert_lead', {
        p_email: formData.email,
        p_name: fullName,
        p_source: 'iarche-labs',
        p_source_context: 'Candidature IArche Labs',
        p_message: `${formData.project} | Intérêt : ${formData.formula}`,
        p_company: formData.company,
        p_consent_marketing: false,
      });

      if (leadError) console.warn('Failed to create/update lead:', leadError);

      const { error } = await supabase.from('contacts').insert({
        name: fullName,
        email: formData.email,
        company: formData.company,
        subject: `Candidature IArche Labs - ${formData.formula}`,
        message: formData.project,
        source: 'iarche-labs',
        source_context: 'Candidature IArche Labs',
        user_session: sessionId,
      });

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-lead-notification', {
          body: {
            name: fullName,
            email: formData.email,
            company: formData.company,
            phone: null,
            source: 'iarche-labs',
            source_context: 'Candidature IArche Labs',
            message: `${formData.project} | Intérêt : ${formData.formula}`,
          },
        });
      } catch (notifError) {
        console.warn('Failed to send lead notification:', notifError);
      }

      toast({
        title: 'Candidature reçue !',
        description: 'On revient vers toi sous 48h.',
      });

      setFormData({ firstName: '', lastName: '', email: '', company: '', project: '', formula: '' });
      setConsent(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue. Contacte-nous directement.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const includes = [
    { icon: Laptop, text: 'Ordinateur + accès Lovable (crédits inclus)' },
    { icon: Users, text: 'Accompagnement expert IArche Labs (technique + go-to-market)' },
    { icon: Scale, text: 'Cadrage juridique par une équipe spécialisée (structure, contrats, conformité)' },
    { icon: Server, text: 'Infrastructure Supabase hébergée 12 mois' },
    { icon: MessageSquare, text: 'Suivi Slack 30 jours post-session' },
  ];

  if (sectionsLoading) {
    return (
      <BackgroundLayout>
        <Header />
        <main className="min-h-screen py-20">
          <div className="max-w-5xl mx-auto px-6 space-y-8">
            <div className="text-center space-y-4">
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-12 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-2/3 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </main>
        <Footer />
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      <Helmet>
        <title>IArche Labs — Construis ton SaaS en 5 jours | IArche</title>
        <meta name="description" content="Une semaine intensive à Bayonne pour construire ton SaaS sur mesure. Accompagnement Nick + Aleks, infrastructure incluse. 3 participants max." />
        <link rel="canonical" href="https://iarche.fr/iarche-labs" />
        <meta property="og:title" content="IArche Labs — Construis ton SaaS en 5 jours" />
        <meta property="og:description" content="Une semaine intensive à Bayonne pour construire ton SaaS sur mesure. 3 participants max." />
        <meta property="og:url" content="https://iarche.fr/iarche-labs" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og-image-v4.png" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IArche Labs — Construis ton SaaS en 5 jours" />
        <meta name="twitter:description" content="Une semaine intensive à Bayonne pour construire ton SaaS sur mesure." />
        <meta name="twitter:image" content="https://iarche.fr/og-image-v4.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://iarche.fr/" },
              { "@type": "ListItem", "position": 2, "name": "IArche Labs", "item": "https://iarche.fr/iarche-labs" }
            ]
          })}
        </script>
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main id="main-content" className="min-h-screen">
        {/* HERO */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative max-w-5xl mx-auto px-6 text-center">
            <Badge className="mb-6 bg-accent/10 text-accent border-accent/20 hover:bg-accent/15">
              IArche Labs — Pays Basque
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold hero-gradient-text mb-6 leading-tight animate-fadeIn">
              {s['hero_title'] || 'Construis ton SaaS en 5 jours. À Bayonne.'}
            </h1>
            <LogoArc size="md" className="mx-auto mb-6 animate-fadeIn [animation-delay:0.1s]" />
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 animate-fadeIn [animation-delay:0.2s]">
              {s['hero_subtitle'] || 'Une semaine intensive à Bayonne. Tu arrives avec une idée. Tu repars avec un produit en production.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn [animation-delay:0.3s]">
              <GradientButton size="lg" onClick={() => scrollTo('candidature')}>
                Candidater
              </GradientButton>
              <GradientButton size="lg" variant="outline" onClick={() => scrollTo('candidature')}>
                En savoir plus
              </GradientButton>
            </div>
          </div>
        </section>

        {/* POUR QUI */}
        <section className="py-16 md:py-20 bg-secondary">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-12">Pour qui ?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: UserCheck, titleKey: 'cible_1_titre', descKey: 'cible_1_texte', defaultTitle: 'Consultant expert', defaultDesc: 'Tu vends ton temps. Tu veux vendre un outil.' },
                { icon: RefreshCw, titleKey: 'cible_2_titre', descKey: 'cible_2_texte', defaultTitle: 'Entrepreneur en pivot', defaultDesc: 'Tu as un projet. Tu veux le tester vite, sans 6 mois de dev.' },
                { icon: Lightbulb, titleKey: 'cible_3_titre', descKey: 'cible_3_texte', defaultTitle: 'Porteur de MVP', defaultDesc: "Tu veux valider avant d'investir 50k€ en agence." },
              ].map((item) => (
                <Card key={item.titleKey} className="p-6 text-center border-border bg-background">
                  <item.icon className="w-10 h-10 text-accent mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">{s[item.titleKey] || item.defaultTitle}</h3>
                  <p className="text-muted-foreground">{s[item.descKey] || item.defaultDesc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* TOUT EST INCLUS */}
        <section className="py-16 md:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-12">Tout est inclus</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {includes.map((item) => (
                <div key={item.text} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-accent" />
                  </div>
                  <p className="text-foreground pt-2">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* UNE FORMULE */}
        <section className="py-16 md:py-20 bg-primary text-primary-foreground">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{s['formule_titre'] || 'Une formule, un engagement.'}</h2>
            <Card className="max-w-xl mx-auto p-8 bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm text-center">
              <Badge className="mb-4 bg-accent text-white border-0">IArche Labs</Badge>
              <h3 className="text-2xl font-bold mb-2">{s['formule_nom'] || 'Semaine Intensive SaaS'}</h3>
              <p className="opacity-80 mb-6">{s['formule_sous_titre'] || "Tarif sur devis — échangeons d'abord."}</p>
              <ul className="space-y-3 text-sm text-left max-w-sm mx-auto mb-8">
                {[
                  '5 jours en immersion complète',
                  'Matériel et infrastructure fournis',
                  'Cadrage juridique inclus',
                  'Suivi 30 jours post-session',
                  'Accès optionnel au réseau IArche Labs',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <GradientButton size="lg" onClick={() => scrollTo('candidature')}>
                Candidater
              </GradientButton>
            </Card>
          </div>
        </section>

        {/* LIEU */}
        <section className="py-16 md:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text mb-4">Où ça se passe</h2>
            <p className="text-lg text-foreground font-semibold">Marinadour — Bayonne, Pays Basque</p>
            <p className="text-muted-foreground mt-2">{s['lieu_texte'] || 'Espace de travail dédié. 3 participants maximum par session.'}</p>
          </div>
        </section>

        {/* FORMULAIRE CANDIDATURE */}
        <section id="candidature" className="py-16 md:py-20 bg-secondary">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-4">{s['formulaire_titre'] || 'Candidater'}</h2>
            <p className="text-center text-muted-foreground mb-10">
              {s['formulaire_sous_titre'] || 'On revient vers toi sous 48h pour un premier échange.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    required
                    className="mt-2"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                  {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    required
                    className="mt-2"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                  {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="labsEmail">Email *</Label>
                <Input
                  id="labsEmail"
                  type="email"
                  required
                  className="mt-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="labsCompany">Entreprise / Projet *</Label>
                <Input
                  id="labsCompany"
                  required
                  className="mt-2"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
                {errors.company && <p className="text-sm text-destructive mt-1">{errors.company}</p>}
              </div>

              <div>
                <Label htmlFor="labsProject">Ton projet en 2 lignes *</Label>
                <Textarea
                  id="labsProject"
                  required
                  className="mt-2 min-h-[100px]"
                  placeholder="Décris ton idée de SaaS..."
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                />
                {errors.project && <p className="text-sm text-destructive mt-1">{errors.project}</p>}
              </div>

              <div>
                <Label htmlFor="labsFormula">Formule souhaitée *</Label>
                <Select
                  required
                  value={formData.formula}
                  onValueChange={(value) => setFormData({ ...formData, formula: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sélectionne une formule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Je souhaite en savoir plus">Je souhaite en savoir plus</SelectItem>
                    <SelectItem value="Je suis prêt(e) à candidater">Je suis prêt(e) à candidater</SelectItem>
                  </SelectContent>
                </Select>
                {errors.formula && <p className="text-sm text-destructive mt-1">{errors.formula}</p>}
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="labsConsent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked === true)}
                  className="mt-1"
                />
                <Label htmlFor="labsConsent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  J'accepte que mes données soient traitées par IArche dans le cadre de ma candidature, conformément à la{' '}
                  <a href="/confidentialite" className="text-accent underline">politique de confidentialité</a>.
                </Label>
              </div>
              {errors.consent && <p className="text-sm text-destructive -mt-3">{errors.consent}</p>}

              <GradientButton type="submit" disabled={isSubmitting} className="w-full" size="lg">
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
              </GradientButton>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default IArcheLabs;
