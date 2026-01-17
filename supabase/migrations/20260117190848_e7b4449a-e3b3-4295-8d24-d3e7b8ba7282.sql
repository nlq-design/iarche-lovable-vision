-- Improve prefix LIKE performance on postal_code by adding pattern_ops index
-- Existing btree index may not be used depending on collation; text_pattern_ops is optimized for LIKE 'prefix%'
CREATE INDEX IF NOT EXISTS idx_viviers_postal_code_pattern_ops
ON public.viviers (postal_code text_pattern_ops)
WHERE postal_code IS NOT NULL AND postal_code <> '';