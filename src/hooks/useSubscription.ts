import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';

export interface SubscriptionRow {
  id: string;
  workspace_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  tier: string;
  price_monthly_eur: number;
  features: any;
  limits: any;
}

export interface InvoiceRow {
  id: string;
  stripe_invoice_id: string | null;
  amount_total_cents: number | null;
  currency: string | null;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created_at: string;
  period_start: string | null;
  period_end: string | null;
}

interface State {
  subscription: SubscriptionRow | null;
  plan: PlanRow | null;
  invoices: InvoiceRow[];
  loading: boolean;
  error: string | null;
}

export function useSubscription() {
  const workspaceId = useWorkspaceId();
  const [state, setState] = useState<State>({
    subscription: null,
    plan: null,
    invoices: [],
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    if (!workspaceId) {
      setState({ subscription: null, plan: null, invoices: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const { data: sub, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subErr) throw subErr;

      let plan: PlanRow | null = null;
      if (sub?.plan_id) {
        const { data: planRow, error: planErr } = await supabase
          .from('plans')
          .select('id, slug, name, tier, price_monthly_eur, features, limits')
          .eq('id', sub.plan_id)
          .maybeSingle();
        if (planErr) throw planErr;
        plan = planRow as PlanRow | null;
      }

      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select(
          'id, stripe_invoice_id, amount_total_cents, currency, status, hosted_invoice_url, invoice_pdf, created_at, period_start, period_end'
        )
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (invErr) throw invErr;

      setState({
        subscription: (sub as SubscriptionRow | null) ?? null,
        plan,
        invoices: (invoices as InvoiceRow[]) ?? [],
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setState({
        subscription: null,
        plan: null,
        invoices: [],
        loading: false,
        error: e?.message ?? 'Erreur lors du chargement de l’abonnement',
      });
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { ...state, refetch: fetchAll };
}
