-- Create performance indexes for admin analytics queries
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_clicked_at ON public.cta_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed_at ON public.newsletter_subscribers(subscribed_at DESC);

-- Add index for article views analytics
CREATE INDEX IF NOT EXISTS idx_article_views_viewed_at ON public.article_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON public.article_views(article_id);

-- Composite index for CTA analytics filtering
CREATE INDEX IF NOT EXISTS idx_cta_clicks_name_date ON public.cta_clicks(cta_name, clicked_at DESC);