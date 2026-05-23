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

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCTATracking } from '@/hooks/useCTATracking';
import { usePageSections } from '@/hooks/usePageSections';
import {
  Laptop, Users, Scale, Server, MessageSquare,
  Check, UserCheck, RefreshCw, Lightbulb, ChevronDown,
  Rocket, Globe, MapPin,
  Quote, Calendar, Zap, Target, Package
} from 'lucide-react';

const IArcheLabs = () => {
  const { toast } = useToast();
  const { getSessionId } = useCTATracking();
  const { sections: s, loading: sectionsLoading } = usePageSections('iarche-labs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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


  const faqItems = [1, 2, 3, 4, 5];

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
        <meta name="description" content="Programme intensif de 5 jours à Bayonne pour construire ton SaaS. Accompagnement technique et business, infrastructure incluse. 3 places par session." />
        <link rel="canonical" href="https://iarche.fr/iarche-labs" />
        <meta property="og:title" content="IArche Labs — Construis ton SaaS en 5 jours" />
        <meta property="og:description" content="Programme intensif de 5 jours à Bayonne. Tu arrives avec une idée, tu repars avec un produit en production." />
        <meta property="og:url" content="https://iarche.fr/iarche-labs" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og/iarche-labs.png" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IArche Labs — Construis ton SaaS en 5 jours" />
        <meta name="twitter:description" content="Programme intensif de 5 jours à Bayonne. Tu arrives avec une idée, tu repars avec un produit en production." />
        <meta name="twitter:image" content="https://iarche.fr/og/iarche-labs.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            "name": "IArche Labs — Semaine Intensive SaaS",
            "description": "Programme intensif de 5 jours pour construire un SaaS en production. Accompagnement technique et business à Bayonne.",
            "provider": {
              "@type": "Organization",
              "name": "IArche",
              "url": "https://iarche.fr"
            },
            "courseMode": "onsite",
            "locationCreated": {
              "@type": "Place",
              "name": "Marinadour",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Bayonne",
                "addressRegion": "Nouvelle-Aquitaine",
                "addressCountry": "FR"
              }
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqItems.map(i => ({
              "@type": "Question",
              "name": s[`faq_${i}_question`],
              "acceptedAnswer": {
                "@type": "Answer",
                "text": s[`faq_${i}_reponse`]
              }
            }))
          })}
        </script>
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main id="main-content" className="min-h-screen">
        {/* 1. HERO */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative max-w-5xl mx-auto px-6 text-center">
            <img 
              src="/logos/iarche-labs.svg" 
              alt="IArche Labs" 
              className="h-20 md:h-24 lg:h-28 w-auto mx-auto mb-8 animate-fadeIn"
              loading="eager"
              decoding="async"
            />
            <h1 className="text-4xl md:text-6xl font-extrabold hero-gradient-text mb-6 leading-tight animate-fadeIn [animation-delay:0.1s]">
              {s['hero_title']}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 animate-fadeIn [animation-delay:0.2s]">
              {s['hero_subtitle']}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn [animation-delay:0.3s]">
              <GradientButton size="lg" onClick={() => scrollTo('candidature')}>
                Candidater maintenant
              </GradientButton>
              <GradientButton size="lg" variant="outline" onClick={() => scrollTo('programme')}>
                Voir le programme
              </GradientButton>
            </div>
          </div>
        </section>

        {/* 2. RÉSULTAT — Ce que tu repars avec */}
        <section className="py-16 md:py-20 bg-primary text-primary-foreground">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{s['resultat_titre']}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-accent" />
                  </div>
                  <p className="text-primary-foreground/90">{s[`resultat_${i}`]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. POUR QUI */}
        <section className="py-16 md:py-20 bg-secondary">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-4">Pour qui ?</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Deux profils, un même objectif : concrétiser un projet digital.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <Card className="p-8 text-center border-border bg-background hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <RefreshCw className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Tu veux digitaliser ton activité</h3>
                <p className="text-muted-foreground">Tu as déjà un métier, tu sais que ton secteur évolue. Tu veux créer un outil digital qui te différencie et prendre de l'avance.</p>
              </Card>
              <Card className="p-8 text-center border-border bg-background hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <Rocket className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Tu veux te lancer</h3>
                <p className="text-muted-foreground">Tu as une idée, un marché en tête. Tu veux un produit concret pour démarrer vite et bien, sans passer par des mois de développement.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* 4. 5 JOURS, 1 PRODUIT */}
        <section id="programme" className="py-16 md:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-4">5 jours. 1 produit.</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Une semaine pour transformer ton idée en produit fonctionnel. Avant la semaine, on prépare tout. Pendant, on construit.
            </p>

            {/* Préparation amont */}
            <div className="mb-10 p-6 rounded-xl border border-accent/20 bg-accent/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Préparation en amont</h3>
                  <p className="text-muted-foreground">
                    Avant la semaine intensive, notre équipe cadre ton projet : analyse du marché, architecture technique, spécifications fonctionnelles. Pour que chaque minute sur place soit productive.
                  </p>
                </div>
              </div>
            </div>

            {/* Livrables de la semaine */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Rocket, title: 'Bâtir ton projet', desc: 'De l\'idée au produit fonctionnel déployé en production. Ton SaaS existe et il tourne.' },
                { icon: Target, title: 'Structurer ton offre', desc: 'Positionnement, pricing, proposition de valeur. Tu sais exactement quoi vendre et à qui.' },
                { icon: Scale, title: 'Cadrage juridique', desc: 'CGV, mentions légales, conformité RGPD, contrats. Tout est en ordre pour commercialiser.' },
                { icon: Server, title: 'Gouvernance & sécurité', desc: 'Architecture sécurisée, bonnes pratiques, gestion des données. Ton produit est solide.' },
                { icon: Zap, title: 'IA intégrée', desc: 'Fonctionnalités IA embarquées dans ton produit. Pas un gadget, un vrai avantage compétitif.' },
                { icon: Package, title: 'Tout en 5 jours', desc: 'Grâce au travail préparatoire, la semaine est fluide et compacte. Pas de temps perdu.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-5 rounded-lg border border-border bg-background hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. TOUT EST INCLUS */}
        <section className="py-16 md:py-20 bg-secondary">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-12">Tout est inclus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Laptop, text: 'Poste de travail dédié' },
                { icon: Users, text: 'Accompagnement expert (technique + business)' },
                { icon: Scale, text: 'Cadrage juridique (CGV, contrats, conformité)' },
                { icon: Server, text: 'Infrastructure hébergée 12 mois' },
                { icon: MessageSquare, text: 'Suivi post-session 30 jours' },
                { icon: Globe, text: 'Domaine custom + déploiement production' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-accent" />
                  </div>
                  <p className="text-foreground pt-2 text-sm">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. L'ÉQUIPE */}
        <section className="py-16 md:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-12">{s['equipe_titre']}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {[1, 2].map(i => (
                <Card key={i} className="p-6 border-border bg-background text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {(s[`equipe_${i}_nom`] || '')[0]}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{s[`equipe_${i}_nom`]}</h3>
                  <p className="text-sm text-accent font-medium mb-3">{s[`equipe_${i}_role`]}</p>
                  <p className="text-muted-foreground text-sm">{s[`equipe_${i}_desc`]}</p>
                </Card>
              ))}
            </div>

            {/* Partenaires spécialisés */}
            <div className="mt-10 max-w-2xl mx-auto text-center p-6 rounded-xl border border-border bg-secondary/50">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Users className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-foreground">Réseau de spécialistes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Nous travaillons avec des partenaires experts en droit du numérique, gouvernance et conformité qui interviennent sur les thématiques spécialisées de ton projet.
              </p>
            </div>
          </div>
        </section>



        {/* 9. FORMULE & TARIF */}
        <section className="py-16 md:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-12">{s['formule_titre']}</h2>
            <Card className="max-w-xl mx-auto p-8 border-2 border-accent/20 bg-background text-center">
              <Badge className="mb-4 bg-accent text-white border-0">IArche Labs</Badge>
              <h3 className="text-2xl font-bold text-foreground mb-2">{s['formule_nom']}</h3>
              <p className="text-muted-foreground mb-6">{s['formule_sous_titre']}</p>
              <ul className="space-y-3 text-sm text-left max-w-sm mx-auto mb-8">
                {[
                  '5 jours en immersion complète',
                  'Matériel et infrastructure fournis',
                  'Cadrage juridique inclus',
                  'Suivi 30 jours post-session',
                  'Infrastructure hébergée 12 mois',
                  'Accès au réseau IArche Labs',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <GradientButton size="lg" onClick={() => scrollTo('candidature')}>
                Candidater
              </GradientButton>
            </Card>
          </div>
        </section>

        {/* 10. LIEU */}
        <section className="py-16 md:py-20 bg-secondary">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-accent" />
              <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text">Où ça se passe</h2>
            </div>
            <p className="text-lg text-foreground font-semibold">Marinadour — Bayonne, Pays Basque</p>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">{s['lieu_texte']}</p>
          </div>
        </section>

        {/* 11. FAQ */}
        <section className="py-16 md:py-20 bg-background">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-12">Questions fréquentes</h2>
            <div className="space-y-3">
              {faqItems.map(i => (
                <div key={i} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <span className="font-medium text-foreground">{s[`faq_${i}_question`]}</span>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-muted-foreground text-sm leading-relaxed">{s[`faq_${i}_reponse`]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 12. FORMULAIRE CANDIDATURE */}
        <section id="candidature" className="py-16 md:py-20 bg-secondary">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold hero-gradient-text text-center mb-4">{s['formulaire_titre']}</h2>
            <p className="text-center text-muted-foreground mb-10">
              {s['formulaire_sous_titre']}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input id="firstName" required className="mt-2" value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input id="lastName" required className="mt-2" value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                  {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="labsEmail">Email *</Label>
                <Input id="labsEmail" type="email" required className="mt-2" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="labsCompany">Entreprise / Projet *</Label>
                <Input id="labsCompany" required className="mt-2" value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                {errors.company && <p className="text-sm text-destructive mt-1">{errors.company}</p>}
              </div>

              <div>
                <Label htmlFor="labsProject">Ton projet en 2 lignes *</Label>
                <Textarea id="labsProject" required className="mt-2 min-h-[100px]" placeholder="Décris ton idée de SaaS..."
                  value={formData.project} onChange={(e) => setFormData({ ...formData, project: e.target.value })} />
                {errors.project && <p className="text-sm text-destructive mt-1">{errors.project}</p>}
              </div>

              <div>
                <Label htmlFor="labsFormula">Niveau d'intérêt *</Label>
                <Select required value={formData.formula} onValueChange={(value) => setFormData({ ...formData, formula: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sélectionne ton intention" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Je souhaite en savoir plus">Je souhaite en savoir plus</SelectItem>
                    <SelectItem value="Je suis prêt(e) à candidater">Je suis prêt(e) à candidater</SelectItem>
                    <SelectItem value="J'ai un projet précis à discuter">J'ai un projet précis à discuter</SelectItem>
                  </SelectContent>
                </Select>
                {errors.formula && <p className="text-sm text-destructive mt-1">{errors.formula}</p>}
              </div>

              <div className="flex items-start gap-3">
                <Checkbox id="labsConsent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} className="mt-1" />
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
