-- Add export settings to brochures
ALTER TABLE brochures ADD COLUMN IF NOT EXISTS export_settings jsonb DEFAULT '{
  "web_scroll": "vertical",
  "pdf_orientation": "portrait",
  "pdf_auto_pagination": true
}'::jsonb;