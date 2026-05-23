ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS price_yearly_eur integer,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text;

COMMENT ON COLUMN public.plans.price_yearly_eur IS 'Prix annuel HT en euros (généralement -20% vs mensuel x12)';
COMMENT ON COLUMN public.plans.stripe_price_id_yearly IS 'Stripe price_id pour la facturation annuelle';