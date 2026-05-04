import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function SubscriptionGracePeriodBanner() {
  const { subscription } = useSubscription();
  const workspaceId = useWorkspaceId();
  const [loading, setLoading] = useState(false);

  if (!subscription) return null;
  if (!subscription.cancel_at_period_end) return null;
  if (subscription.status !== 'active') return null;

  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'la fin de votre période';

  const handleReactivate = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
        body: { workspace_id: workspaceId, return_url: window.location.href },
      });
      if (error || !data?.url) {
        toast.error('Impossible d’ouvrir le portail Stripe');
        return;
      }
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-warning/30 bg-warning/10 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span>
            Votre abonnement se termine le <strong>{endDate}</strong>. Réactivez-le pour conserver
            votre accès.
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={handleReactivate} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Réactiver
        </Button>
      </div>
    </div>
  );
}
