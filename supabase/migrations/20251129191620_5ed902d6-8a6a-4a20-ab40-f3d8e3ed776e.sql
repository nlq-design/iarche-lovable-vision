-- Allow public read access to latest performance metrics for /status page
CREATE POLICY "Public can view latest performance metrics"
ON public.performance_metrics
FOR SELECT
USING (
  recorded_at > NOW() - INTERVAL '7 days'
);