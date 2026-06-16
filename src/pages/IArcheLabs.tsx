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
import { Skeleton } from '@/components/ui/skeleton';

import {
  Section, Reveal, Eyebrow, SectionTitle, Particles,
  SolidCard, GlassCard, IconChip, BtnPrimary, FinalCtaPanel,
} from '@/components/brand';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCTATracking } from '@/hooks/useCTATracking';
import { usePageSections } from '@/hooks/usePageSections';
import {
  Laptop, Users, Scale, Server, MessageSquare,
  Check, RefreshCw, ChevronDown,
  Rocket, Globe, MapPin,
  Calendar, Zap, Target, Package
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
        <Section tone="dark" spacing="hero">
          <Particles />
          <Reveal>
            <div className="flex flex-col items-center text-center">
              {/* Logo Labs en BLANC sur fond sombre (règle de marque : jamais le logo couleur sur bleu nuit) */}
              <img
                src="/logos/iarche-labs.svg"
                alt="IArche Labs"
                className="h-20 md:h-24 lg:h-28 w-auto mx-auto mb-8"
                style={{ filter: 'brightness(0) invert(1)' }}
                loading="eager"
                decoding="async"
              />
              <SectionTitle as="h1" center arc eyebrow="IArche Labs" lede={s['hero_subtitle']}>
                {s['hero_title']}
              </SectionTitle>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <BtnPrimary onClick={() => scrollTo('candidature')}>
                  Candidater maintenant
                </BtnPrimary>
                <button
                  type="button"
                  onClick={() => scrollTo('programme')}
                  className="btn-primary !bg-transparent !text-[hsl(var(--cream))] ring-1 ring-[hsl(var(--cream)/0.25)]"
                >
                  Voir le programme
                  <span className="arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </Reveal>
        </Section>

        {/* 2. RÉSULTAT — Ce que tu repars avec */}
        <Section tone="light" spacing="section">
          <SectionTitle center eyebrow="Le livrable" as="h2">
            {s['resultat_titre']}
          </SectionTitle>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[1, 2, 3, 4].map((i, idx) => (
              <Reveal key={i} delay={idx * 70}>
                <div className="flex items-start gap-3">
                  <IconChip variant="terra">
                    <Check className="w-4 h-4" />
                  </IconChip>
                  <p className="text-text-subtle pt-1.5">{s[`resultat_${i}`]}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* 3. POUR QUI */}
        <Section tone="warm" spacing="section">
          <SectionTitle
            center
            eyebrow="Pour qui ?"
            as="h2"
            lede="Deux profils, un même objectif : concrétiser un projet digital."
          >
            Pour <em>qui</em> ?
          </SectionTitle>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Reveal>
              <SolidCard num="01">
                <IconChip variant="navy" className="mb-5">
                  <RefreshCw className="w-6 h-6" />
                </IconChip>
                <h3 className="text-xl font-bold text-foreground mb-3">Tu veux digitaliser ton activité</h3>
                <p className="text-text-subtle">Tu as déjà un métier, tu sais que ton secteur évolue. Tu veux créer un outil digital qui te différencie et prendre de l'avance.</p>
              </SolidCard>
            </Reveal>
            <Reveal delay={90}>
              <SolidCard num="02">
                <IconChip variant="terra" className="mb-5">
                  <Rocket className="w-6 h-6" />
                </IconChip>
                <h3 className="text-xl font-bold text-foreground mb-3">Tu veux te lancer</h3>
                <p className="text-text-subtle">Tu as une idée, un marché en tête. Tu veux un produit concret pour démarrer vite et bien, sans passer par des mois de développement.</p>
              </SolidCard>
            </Reveal>
          </div>
        </Section>

        {/* 4. 5 JOURS, 1 PRODUIT */}
        <Section tone="dark" spacing="section" id="programme">
          <SectionTitle
            center
            eyebrow="Le programme"
            as="h2"
            lede="Une semaine pour transformer ton idée en produit fonctionnel. Avant la semaine, on prépare tout. Pendant, on construit."
          >
            5 jours. <em>1 produit.</em>
          </SectionTitle>

          {/* Préparation amont */}
          <Reveal>
            <div className="mt-12 mb-10">
              <GlassCard>
                <div className="flex items-start gap-4">
                  <IconChip variant="terra" dark>
                    <Calendar className="w-5 h-5" />
                  </IconChip>
                  <div>
                    <h3 className="text-lg font-bold text-[hsl(var(--cream))] mb-1">Préparation en amont</h3>
                    <p className="text-[hsl(var(--cream)/0.72)]">
                      Avant la semaine intensive, notre équipe cadre ton projet : analyse du marché, architecture technique, spécifications fonctionnelles. Pour que chaque minute sur place soit productive.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </Reveal>

          {/* Livrables de la semaine */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Rocket, title: 'Bâtir ton projet', desc: 'De l\'idée au produit fonctionnel déployé en production. Ton SaaS existe et il tourne.' },
              { icon: Target, title: 'Structurer ton offre', desc: 'Positionnement, pricing, proposition de valeur. Tu sais exactement quoi vendre et à qui.' },
              { icon: Scale, title: 'Cadrage juridique', desc: 'CGV, mentions légales, conformité RGPD, contrats. Tout est en ordre pour commercialiser.' },
              { icon: Server, title: 'Gouvernance & sécurité', desc: 'Architecture sécurisée, bonnes pratiques, gestion des données. Ton produit est solide.' },
              { icon: Zap, title: 'IA intégrée', desc: 'Fonctionnalités IA embarquées dans ton produit. Pas un gadget, un vrai avantage compétitif.' },
              { icon: Package, title: 'Tout en 5 jours', desc: 'Grâce au travail préparatoire, la semaine est fluide et compacte. Pas de temps perdu.' },
            ].map((item, idx) => (
              <Reveal key={item.title} delay={(idx % 2) * 90}>
                <GlassCard num={String(idx + 1).padStart(2, '0')}>
                  <IconChip variant={idx % 2 === 0 ? 'terra' : 'navy'} dark className="mb-4">
                    <item.icon className="w-5 h-5" />
                  </IconChip>
                  <h3 className="font-bold text-[hsl(var(--cream))] mb-1">{item.title}</h3>
                  <p className="text-sm text-[hsl(var(--cream)/0.72)]">{item.desc}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* 5. TOUT EST INCLUS */}
        <Section tone="light" spacing="section">
          <SectionTitle center eyebrow="Inclus" as="h2">
            Tout est <em>inclus</em>
          </SectionTitle>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Laptop, text: 'Poste de travail dédié' },
              { icon: Users, text: 'Accompagnement expert (technique + business)' },
              { icon: Scale, text: 'Cadrage juridique (CGV, contrats, conformité)' },
              { icon: Server, text: 'Infrastructure hébergée 12 mois' },
              { icon: MessageSquare, text: 'Suivi post-session 30 jours' },
              { icon: Globe, text: 'Domaine custom + déploiement production' },
            ].map((item, idx) => (
              <Reveal key={item.text} delay={(idx % 3) * 70}>
                <SolidCard>
                  <div className="flex items-start gap-4">
                    <IconChip variant="terra">
                      <item.icon className="w-5 h-5" />
                    </IconChip>
                    <p className="text-foreground pt-2 text-sm">{item.text}</p>
                  </div>
                </SolidCard>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* 6. L'ÉQUIPE */}
        <Section tone="warm" spacing="section">
          <SectionTitle center eyebrow="L'équipe" as="h2">
            {s['equipe_titre']}
          </SectionTitle>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[1, 2].map((i, idx) => (
              <Reveal key={i} delay={idx * 90}>
                <SolidCard className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-secondary-foreground">
                      {(s[`equipe_${i}_nom`] || '')[0]}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{s[`equipe_${i}_nom`]}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{s[`equipe_${i}_role`]}</p>
                  <p className="text-text-subtle text-sm">{s[`equipe_${i}_desc`]}</p>
                </SolidCard>
              </Reveal>
            ))}
          </div>

          {/* Partenaires spécialisés */}
          <Reveal>
            <div className="mt-10 max-w-2xl mx-auto text-center">
              <SolidCard>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Réseau de spécialistes</h3>
                </div>
                <p className="text-sm text-text-subtle">
                  Nous travaillons avec des partenaires experts en droit du numérique, gouvernance et conformité qui interviennent sur les thématiques spécialisées de ton projet.
                </p>
              </SolidCard>
            </div>
          </Reveal>
        </Section>

        {/* 9. FORMULE & TARIF */}
        <Section tone="dark" spacing="section">
          <SectionTitle center eyebrow="La formule" as="h2">
            {s['formule_titre']}
          </SectionTitle>
          <Reveal>
            <div className="mt-12 max-w-xl mx-auto">
              <GlassCard className="text-center">
                <span className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[hsl(var(--accent-soft))] text-[hsl(219_48%_15%)]">IArche Labs</span>
                <h3 className="text-2xl font-bold text-[hsl(var(--cream))] mb-2">{s['formule_nom']}</h3>
                <p className="text-[hsl(var(--cream)/0.72)] mb-6">{s['formule_sous_titre']}</p>
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
                      <Check className="w-4 h-4 text-[hsl(var(--accent-soft))] shrink-0" />
                      <span className="text-[hsl(var(--cream)/0.88)]">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-center">
                  <BtnPrimary onClick={() => scrollTo('candidature')}>
                    Candidater
                  </BtnPrimary>
                </div>
              </GlassCard>
            </div>
          </Reveal>
        </Section>

        {/* 10. LIEU */}
        <Section tone="light" spacing="compact">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <Eyebrow center>Où ça se passe</Eyebrow>
            </div>
            <p className="text-lg text-foreground font-semibold">Marinadour — Bayonne, Pays Basque</p>
            <p className="text-text-subtle mt-2 max-w-lg mx-auto">{s['lieu_texte']}</p>
          </div>
        </Section>

        {/* 11. FAQ */}
        <Section tone="warm" spacing="section" container="narrow">
          <SectionTitle center eyebrow="FAQ" as="h2">
            Questions <em>fréquentes</em>
          </SectionTitle>
          <div className="mt-12 space-y-3">
            {faqItems.map(i => (
              <div key={i} className="border border-border rounded-xl overflow-hidden bg-background/60">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-foreground">{s[`faq_${i}_question`]}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-text-subtle text-sm leading-relaxed">{s[`faq_${i}_reponse`]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* 12. FORMULAIRE CANDIDATURE */}
        <Section tone="dark" spacing="section" id="candidature">
          <SectionTitle center eyebrow="Candidature" as="h2" lede={s['formulaire_sous_titre']}>
            {s['formulaire_titre']}
          </SectionTitle>

          <Reveal>
            <FinalCtaPanel className="mt-12 max-w-2xl mx-auto" info={['3 places par session', 'Réponse sous 48h', 'À Bayonne']}>
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-[hsl(var(--cream)/0.88)]">Prénom *</Label>
                    <Input id="firstName" required className="mt-2" value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                    {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-[hsl(var(--cream)/0.88)]">Nom *</Label>
                    <Input id="lastName" required className="mt-2" value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                    {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="labsEmail" className="text-[hsl(var(--cream)/0.88)]">Email *</Label>
                  <Input id="labsEmail" type="email" required className="mt-2" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="labsCompany" className="text-[hsl(var(--cream)/0.88)]">Entreprise / Projet *</Label>
                  <Input id="labsCompany" required className="mt-2" value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                  {errors.company && <p className="text-sm text-destructive mt-1">{errors.company}</p>}
                </div>

                <div>
                  <Label htmlFor="labsProject" className="text-[hsl(var(--cream)/0.88)]">Ton projet en 2 lignes *</Label>
                  <Textarea id="labsProject" required className="mt-2 min-h-[100px]" placeholder="Décris ton idée de SaaS..."
                    value={formData.project} onChange={(e) => setFormData({ ...formData, project: e.target.value })} />
                  {errors.project && <p className="text-sm text-destructive mt-1">{errors.project}</p>}
                </div>

                <div>
                  <Label htmlFor="labsFormula" className="text-[hsl(var(--cream)/0.88)]">Niveau d'intérêt *</Label>
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
                  <Label htmlFor="labsConsent" className="text-sm text-[hsl(var(--cream)/0.72)] leading-relaxed cursor-pointer">
                    J'accepte que mes données soient traitées par IArche dans le cadre de ma candidature, conformément à la{' '}
                    <a href="/confidentialite" className="text-[hsl(var(--accent-soft))] underline">politique de confidentialité</a>.
                  </Label>
                </div>
                {errors.consent && <p className="text-sm text-destructive -mt-3">{errors.consent}</p>}

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center disabled:opacity-60">
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
                  <span className="arrow" aria-hidden="true">→</span>
                </button>
              </form>
            </FinalCtaPanel>
          </Reveal>
        </Section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default IArcheLabs;
