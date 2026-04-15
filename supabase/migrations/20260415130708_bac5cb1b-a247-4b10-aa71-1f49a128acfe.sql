
-- Fix truncated titles by extracting first sentence from executive_summary
-- Only update titles that are exactly 100 chars (truncated)
UPDATE voice_transcriptions
SET title = CASE
  WHEN summary->>'executive_summary' IS NOT NULL 
    AND length(summary->>'executive_summary') > 0
  THEN substring(summary->>'executive_summary' FROM '^[^.!?]+[.!?]?')
  ELSE title
END
WHERE length(title) = 100
  AND summary->>'executive_summary' IS NOT NULL;
