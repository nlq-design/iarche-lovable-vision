-- Add scheduled_publish_at column to articles table
ALTER TABLE public.articles
ADD COLUMN scheduled_publish_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of scheduled articles
CREATE INDEX idx_articles_scheduled_publish 
ON public.articles(scheduled_publish_at) 
WHERE published = false AND scheduled_publish_at IS NOT NULL;