import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface Plan {
  id: string;
  slug: string;
  name: string;
  tier: string | null;
  price_monthly_eur: number | null;
  price_yearly_eur: number | null;
  features: unknown;
  limits: unknown;
  active: boolean;
}

type Period = 'monthly' | 'yearly';

const FAQ_ITEMS = [
  {
    q: 'Comment fonctionne la facturation annuelle ?',
    a: 'En choisissant l\'engagement annuel, vous bénéficiez de 20% de remise par rapport au tarif mensuel. La facture est émise en une fois pour 12 mois.',
  },
  {
    q: 'Puis-je changer de plan en cours de route ?',
    a: 'À tout moment depuis vos paramètres de facturation. Le passage à un plan supérieur est immédiat avec prorata ; un passage à un plan inférieur prend effet à la fin de la période en cours.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: "Depuis votre portail de facturation, l'annulation est planifiée à la fin de la période en cours. Vos données restent disponibles en lecture pendant 30 jours après la résiliation.",
  },
  {
    q: 'Quels moyens de paiement sont acceptés ?',
    a: 'Cartes bancaires (Visa, Mastercard, Amex) via notre prestataire Stripe. Les paiements sont sécurisés et conformes PCI-DSS. Facturation en EUR.',
  },
];

const formatPrice = (eur: number | null): string => {
  if (eur === null || eur === undefined || eur === 0) return 'Sur devis';
  return `${eur}€`;
};

const extractFeatures = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string');
  }
  if (raw && typeof raw === 'object' && 'items' in raw) {
    const items = (raw as Record<string, unknown>).items;
    if (Array.isArray(items)) return items.filter((v): v is string => typeof v === 'string');
  }
  return [];
};

const CockpitPricing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [ctaLoading, setCtaLoading] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('plans')
        .select('id, slug, name, tier, price_monthly_eur, price_yearly_eur, features, limits, active')
        .eq('active', true);
      if (!mounted) return;
      if (err) {
        setError(err.message);
      } else {
        const order = ['starter', 'pro', 'enterprise'];
        const sorted = ((data ?? []) as Plan[]).slice().sort(
          (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
        );
        setPlans(sorted);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCta = async (plan: Plan) => {
    if (plan.slug === 'enterprise') {
      navigate('/contact?subject=demo-enterprise');
      return;
    }

    setCtaLoading(plan.slug);
    try {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;

      if (!user) {
        navigate(`/signup?plan=${plan.slug}&period=${period}`);
        return;
      }

      // Récup workspace courant via membership
      const { data: member, error: memErr } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memErr || !member) {
        navigate(`/signup?plan=${plan.slug}&period=${period}`);
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke('stripe-checkout-session', {
        body: {
          plan_slug: plan.slug,
          workspace_id: member.workspace_id,
          billing_period: period,
          success_url: `${window.location.origin}/cockpit/settings/billing?checkout=success`,
          cancel_url: `${window.location.origin}/cockpit/pricing?checkout=cancel`,
        },
      });

      if (fnErr || !data?.checkout_url) {
        throw new Error(fnErr?.message || 'Impossible de créer la session de paiement');
      }

      window.location.href = data.checkout_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setCtaLoading(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Tarifs IArche — Choisissez votre plan</title>
        <meta
          name="description"
          content="Trois plans IArche pour structurer votre activité commerciale. Starter, Pro, Enterprise. Mensuel ou annuel -20%, sans engagement long."
        />
        <link rel="canonical" href="https://iarche.fr/cockpit/pricing" />
      </Helmet>

      <Header />
      <main className="min-h-screen bg-background text-foreground pt-20">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Choisissez votre plan IArche
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Une plateforme commerciale augmentée par l'IA, pensée pour les indépendants
              et les équipes ambitieuses. L'IA se construit avec vous.
            </p>

            {/* Toggle Mensuel / Annuel */}
            <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-colors ${
                  period === 'monthly'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={period === 'monthly'}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setPeriod('yearly')}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${
                  period === 'yearly'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={period === 'yearly'}
              >
                Annuel
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    period === 'yearly'
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  -20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-muted-foreground">Chargement des plans…</div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-destructive">Impossible de charger les plans.</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Aucun plan disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isHighlighted = plan.slug === 'pro';
                const features = extractFeatures(plan.features);
                const isEnterprise = plan.slug === 'enterprise';
                const displayPrice = isEnterprise
                  ? null
                  : period === 'yearly'
                    ? plan.price_yearly_eur && plan.price_yearly_eur > 0
                      ? Math.round(plan.price_yearly_eur / 12)
                      : plan.price_monthly_eur
                    : plan.price_monthly_eur;
                const yearlyTotal = period === 'yearly' && plan.price_yearly_eur && plan.price_yearly_eur > 0
                  ? plan.price_yearly_eur
                  : null;

                return (
                  <Card
                    key={plan.id}
                    className={
                      isHighlighted
                        ? 'border-primary shadow-lg relative'
                        : 'border-border'
                    }
                  >
                    {isHighlighted && (
                      <Badge
                        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground"
                      >
                        Recommandé
                      </Badge>
                    )}
                    <CardHeader>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>
                        <span className="text-3xl font-semibold text-foreground">
                          {formatPrice(displayPrice ?? null)}
                        </span>
                        {!isEnterprise && displayPrice !== null && (
                          <span className="text-muted-foreground"> / mois</span>
                        )}
                        {yearlyTotal !== null && (
                          <span className="block text-xs text-muted-foreground mt-1">
                            Facturé {yearlyTotal}€ par an
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {features.length === 0 ? (
                          <li className="text-sm text-muted-foreground">
                            Détails communiqués sur demande.
                          </li>
                        ) : (
                          features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-foreground">{f}</span>
                            </li>
                          ))
                        )}
                      </ul>
                      <Button
                        onClick={() => handleCta(plan)}
                        className="w-full"
                        variant={isHighlighted ? 'default' : 'outline'}
                        disabled={ctaLoading === plan.slug}
                      >
                        {ctaLoading === plan.slug
                          ? 'Redirection…'
                          : isEnterprise
                            ? 'Demander une démo'
                            : 'Commencer'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Comparatif rapide */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              Une stack IA complète, sans friction
            </h2>
            <p className="mt-4 text-muted-foreground">
              Pipeline commercial, CRM enrichi, transcriptions intelligentes, intégration
              calendrier et email, copilote IA contextualisé. Une seule plateforme,
              hébergée en France, conçue à Bayonne.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-8">
            Questions fréquentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left text-foreground">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Mention services complémentaires */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center text-sm text-muted-foreground">
            Besoin d'accompagnement sur-mesure, formation ou intégration spécifique ?{' '}
            <button
              onClick={() => navigate('/contact')}
              className="text-primary hover:underline font-medium"
            >
              Parlons-en
            </button>
            .
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default CockpitPricing;
