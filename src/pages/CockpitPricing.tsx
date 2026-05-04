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

interface Plan {
  id: string;
  slug: string;
  name: string;
  tier: string | null;
  price_monthly_eur: number | null;
  features: unknown;
  limits: unknown;
  active: boolean;
}

const FAQ_ITEMS = [
  {
    q: 'Y a-t-il un essai gratuit ?',
    a: "Oui, chaque plan inclut une période d'essai sans engagement. Vous pouvez explorer IArche et résilier à tout moment depuis votre espace de facturation.",
  },
  {
    q: 'Puis-je changer de plan en cours de route ?',
    a: "À tout moment depuis vos paramètres de facturation. Le passage à un plan supérieur est immédiat ; un passage à un plan inférieur prend effet à la fin de la période en cours.",
  },
  {
    q: "Comment annuler mon abonnement ?",
    a: "Depuis votre portail de facturation, l'annulation est immédiate ou planifiée à la fin de la période. Vos données restent disponibles en lecture pendant 30 jours après la résiliation.",
  },
  {
    q: 'Quels moyens de paiement sont acceptés ?',
    a: 'Cartes bancaires (Visa, Mastercard, Amex) via notre prestataire Stripe. Les paiements sont sécurisés et conformes PCI-DSS. Facturation en EUR.',
  },
];

const formatPrice = (cents: number | null): string => {
  if (cents === null || cents === undefined) return 'Sur devis';
  return `${cents}€`;
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('plans')
        .select('id, slug, name, tier, price_monthly_eur, features, limits, active')
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

  const handleCta = (plan: Plan) => {
    if (plan.slug === 'enterprise') {
      navigate('/contact?subject=demo-enterprise');
    } else {
      navigate(`/signup?plan=${plan.slug}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>Tarifs IArche — Choisissez votre plan</title>
        <meta
          name="description"
          content="Trois plans IArche pour structurer votre activité commerciale. Solo, Pro, Enterprise. Essai gratuit, sans engagement."
        />
        <link rel="canonical" href="https://iarche.fr/cockpit/pricing" />
      </Helmet>

      <main className="min-h-screen bg-background text-foreground">
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
                          {formatPrice(plan.price_monthly_eur)}
                        </span>
                        {plan.price_monthly_eur !== null && (
                          <span className="text-muted-foreground"> / mois</span>
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
                      >
                        {plan.slug === 'enterprise'
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
    </>
  );
};

export default CockpitPricing;
