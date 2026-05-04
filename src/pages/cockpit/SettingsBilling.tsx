import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ExternalLink, Loader2, Receipt, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/cockpit/common/LoadingState';
import { EmptyState } from '@/components/cockpit/common/EmptyState';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { CancelSubscriptionModal } from '@/components/cockpit/billing/CancelSubscriptionModal';
import { useSubscription } from '@/hooks/useSubscription';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Essai',
  active: 'Actif',
  past_due: 'Paiement en retard',
  canceled: 'Annulé',
  incomplete: 'Incomplet',
  incomplete_expired: 'Expiré',
  paused: 'En pause',
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

const formatAmount = (cents: number | null, currency: string | null) => {
  if (cents == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
  }).format(cents / 100);
};

export default function SettingsBilling() {
  const workspaceId = useWorkspaceId();
  const { subscription, plan, invoices, loading, error, refetch } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const handleOpenPortal = async () => {
    if (!workspaceId) return;
    setPortalLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('stripe-customer-portal', {
        body: { workspace_id: workspaceId, return_url: window.location.href },
      });
      if (fnErr || !data?.url) {
        toast.error('Impossible d’ouvrir le portail Stripe');
        return;
      }
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur inattendue');
    } finally {
      setPortalLoading(false);
    }
  };

  const usersLimit = plan?.limits?.users ?? null;

  return (
    <CockpitLayout>
      <div className="container max-w-5xl mx-auto py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">Facturation & abonnement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre plan, vos sièges et vos factures.
          </p>
        </header>

        {loading && <LoadingState message="Chargement de votre abonnement..." />}

        {!loading && error && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && !subscription && (
          <EmptyState
            icon={CreditCard}
            message="Aucun abonnement actif"
            description="Choisissez un plan pour activer votre Cockpit."
          >
            <Button asChild>
              <Link to="/cockpit/pricing">Voir les plans</Link>
            </Button>
          </EmptyState>
        )}

        {!loading && !error && subscription && (
          <>
            {/* Mon abonnement */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mon abonnement</CardTitle>
                    <CardDescription>Plan actuel et statut de facturation</CardDescription>
                  </div>
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {STATUS_LABEL[subscription.status] ?? subscription.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="text-sm font-medium text-foreground">
                      {plan?.name ?? 'Inconnu'}
                    </p>
                    {plan?.price_monthly_eur != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.price_monthly_eur} € / mois
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prochaine échéance</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Début de période</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(subscription.current_period_start)}
                    </p>
                  </div>
                </div>
                {subscription.cancel_at_period_end && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                    <p className="text-xs text-foreground">
                      Annulation programmée le {formatDate(subscription.current_period_end)}.
                      Vous gardez l’accès jusqu’à cette date.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" asChild>
                    <Link to="/cockpit/pricing">Changer de plan</Link>
                  </Button>
                  {!subscription.cancel_at_period_end && subscription.status === 'active' && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setCancelOpen(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler l’abonnement
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sièges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sièges utilisés
                </CardTitle>
                <CardDescription>
                  Nombre d’utilisateurs actifs sur votre workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">
                  Limite du plan : <strong>{usersLimit ?? '—'}</strong> utilisateur(s)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Le décompte précis sera disponible prochainement.
                </p>
              </CardContent>
            </Card>

            {/* Méthode paiement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Méthode de paiement
                </CardTitle>
                <CardDescription>
                  Gérez votre carte bancaire et vos coordonnées de facturation via le portail
                  sécurisé Stripe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleOpenPortal} disabled={portalLoading}>
                  {portalLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ouvrir le portail Stripe
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Factures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Factures
                </CardTitle>
                <CardDescription>Vos 10 dernières factures.</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <EmptyState
                    inline
                    icon={Receipt}
                    message="Aucune facture pour le moment"
                    description="Vos factures apparaîtront ici après votre premier paiement."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="text-sm">{formatDate(inv.created_at)}</TableCell>
                          <TableCell className="text-sm">
                            {formatAmount(inv.amount_total_cents, inv.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>
                              {inv.status ?? '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {inv.invoice_pdf && (
                              <a
                                href={inv.invoice_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                              >
                                PDF
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <CancelSubscriptionModal
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          workspaceId={workspaceId}
          onSuccess={refetch}
        />
      </div>
    </CockpitLayout>
  );
}
