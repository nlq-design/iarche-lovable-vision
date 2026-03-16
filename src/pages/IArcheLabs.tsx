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
import { Separator } from '@/components/ui/separator';
import GradientButton from '@/components/ui/GradientButton';
import LogoArc from '@/components/ui/LogoArc';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCTATracking } from '@/hooks/useCTATracking';
import {
  Laptop, Users, Scale, Server, MessageSquare, Hotel,
  Check, Rocket, Code, Palette, Plug, Flag,
  UserCheck, RefreshCw, Lightbulb
} from 'lucide-react';

const IArcheLabs = () => {
  const { toast } = useToast();
  const { getSessionId } = useCTATracking();
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
        p_message: `${formData.project} | Formule : ${formData.formula}`,
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
            message: `${formData.project} | Formule : ${formData.formula}`,
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

  const timeline = [
    { day: 'J1', title: 'Cadrage', desc: 'Audit juridique + cadrage projet + architecture + choix stack', icon: Scale },
    { day: 'J2', title: 'Build Sprint #1', desc: 'Auth, data model, feature principale', icon: Code },
    { day: 'J3', title: 'Build Sprint #2', desc: 'UI/UX, flows secondaires', icon: Palette, highlight: true, badge: 'Lovable' },
    { day: 'J4', title: 'Intégrations', desc: 'Stripe, APIs métier, tests, sécurité', icon: Plug },
    { day: 'J5', title: 'Production', desc: 'Mise en production + landing page + introduction réseau', icon: Flag },
  ];

  const includes = [
    { icon: Laptop, text: 'Ordinateur + accès Lovable (crédits inclus)' },
    { icon: Users, text: 'Accompagnement Nick (bizdev) + Aleks (architecture & dev)' },
    { icon: Scale, text: 'Module juridique J1 matin (diagnostic + structure adaptée)' },
    { icon: Server, text: 'Infrastructure Supabase hébergée 12 mois' },
    { icon: MessageSquare, text: 'Suivi Slack 30 jours post-session' },
    { icon: Hotel, text: 'Option hébergement Hôtel Oko à proximité' },
  ];

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
              Construis ton SaaS en 5 jours.<br className="hidden md:block" /> À Bayonne.
            </h1>
            <LogoArc size="md" className="mx-auto mb-6 animate-fadeIn [animation-delay:0.1s]" />
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 animate-fadeIn [animation-delay:0.2s]">
              Une semaine intensive. Tu arrives avec une idée. Tu repars avec un produit en production, accompagné par Nick et Aleks.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn [animation-delay:0.3s]">
              <GradientButton size="lg" onClick={() => scrollTo('candidature')}>
                Candidater
              </GradientButton>
              <GradientButton size="lg" variant="outline" onClick={() => scrollTo('programme')}>
                Voir le programme
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
                { icon: UserCheck, title: 'Consultant expert', desc: 'Tu vends ton temps. Tu veux vendre un outil.' },
                { icon: RefreshCw, title: 'Entrepreneur en pivot', desc: 'Tu as un projet. Tu veux le tester vite, sans 6 mois de dev.' },
                { icon: Lightbulb, title: 'Porteur de MVP', desc: 'Tu veux valider avant d\'investir 50k€ en agence.' },
              ].map((item) => (
                <Card key={item.title} className="p-6 text-center border-border bg-background">
                  <item.icon className="w-10 h-10 text-accent mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </Card>
              ))}
            </div>
            <p className="text-center text-muted-foreground mt-8 text-sm">
              ❌ Pas pour les profils purement techniques qui veulent apprendre à coder.
            </p>
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

        {/* PROGRAMME 5 JOURS */}
        <section id="programme" className="py-16 md:py-20 bg-secondary">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-12">5 jours, un produit.</h2>
            <div className="space-y-4">
              {timeline.map((step) => (
                <Card
                  key={step.day}
                  className={`p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-border ${
                    step.highlight
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                      : 'bg-background'
                  }`}
                >
                  <div className={`text-2xl font-extrabold shrink-0 w-12 ${step.highlight ? 'text-accent' : 'text-primary'}`}>
                    {step.day}
                  </div>
                  <Separator orientation="vertical" className="h-10 hidden sm:block" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className={`w-5 h-5 ${step.highlight ? 'text-accent' : 'text-primary'}`} />
                      <h3 className="font-bold text-foreground">{step.title}</h3>
                      {step.badge && (
                        <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">{step.badge}</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">{step.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FORMULES */}
        <section className="py-16 md:py-20 bg-primary text-primary-foreground">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Deux formules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* BUILD */}
              <Card className="p-8 bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-2">Formule BUILD</h3>
                <p className="text-3xl font-extrabold mb-4">7 000 € <span className="text-base font-normal opacity-80">HT</span></p>
                <p className="opacity-80 mb-6">La semaine complète. Tu repars avec ton SaaS.</p>
                <ul className="space-y-2 text-sm">
                  {['Semaine 5 jours', 'Matériel fourni', 'Infra Supabase 12 mois', 'Suivi 30j'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* BUILD + GROW */}
              <Card className="p-8 bg-primary-foreground/10 border-accent/40 backdrop-blur-sm relative ring-1 ring-accent/30">
                <Badge className="absolute -top-3 right-6 bg-accent text-white border-0">Recommandé</Badge>
                <h3 className="text-2xl font-bold mb-2">Formule BUILD + GROW</h3>
                <p className="text-3xl font-extrabold mb-1">7 000 € <span className="text-base font-normal opacity-80">HT</span></p>
                <p className="text-lg font-bold text-accent mb-4">+ 10%*</p>
                <p className="opacity-80 mb-6">La semaine + notre réseau actif.</p>
                <ul className="space-y-2 text-sm">
                  {[
                    'Tout du Build',
                    'Introductions réseau IArche Labs',
                    'Clubs d\'affaires Pays Basque',
                    'Co-commercialisation active',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <p className="text-center text-sm opacity-60 mt-8 max-w-2xl mx-auto">
              * 10% uniquement sur le CA généré via notre réseau. Si on n'apporte rien un trimestre, on ne touche rien.
            </p>
          </div>
        </section>

        {/* LIEU */}
        <section className="py-16 md:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-12">Où ça se passe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-border">
                <h3 className="text-xl font-bold text-foreground mb-2">Marinadour</h3>
                <p className="text-muted-foreground">Nos locaux à Bayonne, Pays Basque. Espace de travail dédié.</p>
              </Card>
              <Card className="p-6 border-border">
                <h3 className="text-xl font-bold text-foreground mb-2">Hôtel Oko</h3>
                <p className="text-muted-foreground">Hébergement à proximité immédiate, en option.</p>
              </Card>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">3 participants maximum par session.</p>
          </div>
        </section>

        {/* FORMULAIRE CANDIDATURE */}
        <section id="candidature" className="py-16 md:py-20 bg-secondary">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-4">Candidater</h2>
            <p className="text-center text-muted-foreground mb-10">
              On revient vers toi sous 48h pour un premier échange.
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
                    <SelectItem value="Build (7 000€ HT)">Build (7 000€ HT)</SelectItem>
                    <SelectItem value="Build + Grow (7 000€ HT + 10%)">Build + Grow (7 000€ HT + 10%)</SelectItem>
                    <SelectItem value="Je ne sais pas encore">Je ne sais pas encore</SelectItem>
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
