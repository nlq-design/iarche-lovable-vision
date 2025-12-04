-- Add views count and custom colors to brochures
ALTER TABLE brochures ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;
ALTER TABLE brochures ADD COLUMN IF NOT EXISTS custom_colors jsonb DEFAULT '{"primary": null, "accent": null}'::jsonb;

-- Create index for views tracking
CREATE INDEX IF NOT EXISTS idx_brochures_views ON brochures(views_count DESC);